import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUserRole } from '../services/auth.service';
import { getMyLinkStatus } from '../services/student.service';
import { sendPaymentOtp, verifyPaymentOtp, type PaymentOtpPhase } from '../services/paymentOtp.service';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Mirror của MV.DomainLayer.Constants.LargeTransactionPolicy.ThresholdAmount ở BE. BE luôn là
 * chốt chặn thật (PayWithWalletCoreAsync / GetOrCreatePaymentRequestInfoAsync) — ngưỡng này ở FE
 * chỉ để quyết định có cần chủ động hiện màn OTP ngay hay không, tránh gọi API thừa cho giao dịch nhỏ.
 */
export const LARGE_TRANSACTION_THRESHOLD = 2_000_000;

export type LargeTransactionOtpStatus =
    | 'idle'
    | 'checking'
    | 'not_required'
    | 'need_parent_phone'
    | 'awaiting_otp'
    | 'verified'
    | 'blocked';

interface OtpApiError {
    response?: {
        data?: {
            errorCode?: string;
            message?: string;
            retryAfterSeconds?: number;
        };
    };
}

interface UseLargeTransactionOtpArgs {
    bookingId: number | null;
    amount: number;
    phase: PaymentOtpPhase | null;
    /** Chỉ bắt đầu kiểm tra khi true — ví dụ sau khi đã tải xong payment summary. */
    ready: boolean;
    /** BE báo thiếu SĐT phụ huynh — nơi gọi hook tự quyết định cách điều hướng (popup hay trang riêng). */
    onNeedParentPhone: () => void;
}

/**
 * Chạy TỰ ĐỘNG ngay khi payment screen mount (không đợi người dùng chọn phương thức thanh toán —
 * đây là "Cách B" đã chốt với người dùng). Với giao dịch ≥ ngưỡng của học sinh tự đăng ký (không
 * bị phụ huynh quản lý): gửi OTP ngay nếu đã có SĐT phụ huynh, hoặc gọi `onNeedParentPhone` để nơi
 * dùng hook tự điều hướng đi nhập SĐT.
 */
export function useLargeTransactionOtp({ bookingId, amount, phase, ready, onNeedParentPhone }: UseLargeTransactionOtpArgs) {
    const [status, setStatus] = useState<LargeTransactionOtpStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [initialCooldownSeconds, setInitialCooldownSeconds] = useState(0);
    const [verifying, setVerifying] = useState(false);
    // Tránh gửi OTP lặp lại cho cùng 1 booking+phase khi effect re-run do re-render.
    const checkedKeyRef = useRef<string | null>(null);

    const runCheck = useCallback(async () => {
        if (bookingId == null || phase == null) return;
        setStatus('checking');
        setErrorMessage(null);

        if (amount < LARGE_TRANSACTION_THRESHOLD || getCurrentUserRole() !== 'Student') {
            setStatus('not_required');
            return;
        }

        try {
            const linkStatus = await getMyLinkStatus();
            const p = linkStatus.content?.studentProfile;
            const isParentManaged = linkStatus.content?.linked === true || !!p?.parentId;
            if (isParentManaged) {
                setStatus('not_required');
                return;
            }
        } catch {
            // Không xác định được vai trò → không chặn ở FE; BE vẫn là chốt chặn thật lúc trả tiền.
            setStatus('not_required');
            return;
        }

        try {
            await sendPaymentOtp(bookingId, phase);
            setInitialCooldownSeconds(0);
            setStatus('awaiting_otp');
        } catch (err: unknown) {
            const apiError = err as OtpApiError;
            const errorCode = apiError.response?.data?.errorCode;
            if (errorCode === 'PARENT_PHONE_REQUIRED') {
                setStatus('need_parent_phone');
                onNeedParentPhone();
            } else if (errorCode === 'OTP_COOLDOWN_ACTIVE') {
                // Đã có OTP còn hiệu lực gửi gần đây (VD: mở lại màn thanh toán) — vẫn cho nhập.
                setInitialCooldownSeconds(apiError.response?.data?.retryAfterSeconds ?? 0);
                setStatus('awaiting_otp');
            } else if (errorCode === 'OTP_DAILY_LIMIT_EXCEEDED') {
                setErrorMessage(
                    apiError.response?.data?.message ||
                        'Đã vượt quá số lần gửi OTP trong ngày. Vui lòng thử lại vào ngày mai.',
                );
                setStatus('blocked');
            } else {
                setErrorMessage(apiError.response?.data?.message || 'Không thể gửi mã OTP xác thực. Vui lòng thử lại.');
                setStatus('blocked');
            }
        }
    }, [bookingId, phase, amount, onNeedParentPhone]);

    useEffect(() => {
        if (!ready || bookingId == null || phase == null) return;
        const key = `${bookingId}:${phase}`;
        if (checkedKeyRef.current === key) return;
        checkedKeyRef.current = key;
        void runCheck();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, bookingId, phase]);

    const resend = useCallback(async () => {
        if (bookingId == null || phase == null) return;
        try {
            await sendPaymentOtp(bookingId, phase);
            setErrorMessage(null);
        } catch (err: unknown) {
            const apiError = err as OtpApiError;
            const errorCode = apiError.response?.data?.errorCode;
            if (errorCode === 'OTP_COOLDOWN_ACTIVE') {
                setInitialCooldownSeconds(apiError.response?.data?.retryAfterSeconds ?? 0);
            } else if (errorCode === 'OTP_DAILY_LIMIT_EXCEEDED') {
                setErrorMessage(
                    apiError.response?.data?.message ||
                        'Đã vượt quá số lần gửi OTP trong ngày. Vui lòng thử lại vào ngày mai.',
                );
                setStatus('blocked');
            } else {
                throw err;
            }
        }
    }, [bookingId, phase]);

    const verify = useCallback(
        async (code: string): Promise<{ ok: boolean; message?: string }> => {
            if (bookingId == null || phase == null) return { ok: false, message: 'Thiếu thông tin booking.' };
            setVerifying(true);
            try {
                await verifyPaymentOtp(bookingId, phase, code);
                setStatus('verified');
                return { ok: true };
            } catch (err: unknown) {
                return { ok: false, message: getApiErrorMessage(err, 'Xác thực OTP thất bại.') };
            } finally {
                setVerifying(false);
            }
        },
        [bookingId, phase],
    );

    /**
     * Lưới an toàn: nếu API trả tiền thật (payWithWallet/getPaymentInfo) trả về OTP_REQUIRED dù
     * hook đã cho qua trước đó (race condition, v.v.), gọi hàm này để quay lại luồng OTP thay vì
     * chỉ hiện lỗi chung chung.
     */
    const handlePaymentOtpRequired = useCallback(() => {
        checkedKeyRef.current = null;
        void runCheck();
    }, [runCheck]);

    return {
        status,
        errorMessage,
        initialCooldownSeconds,
        verifying,
        resend,
        verify,
        handlePaymentOtpRequired,
    };
}
