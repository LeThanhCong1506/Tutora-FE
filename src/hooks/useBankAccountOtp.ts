import { useCallback, useState } from 'react';
import { sendBankAccountOtp, verifyBankAccountOtp } from '../services/bankAccount.service';

export type BankAccountOtpStatus = 'idle' | 'sending' | 'awaiting_otp' | 'verifying' | 'verified' | 'blocked';

interface OtpApiError {
    response?: {
        data?: {
            errorCode?: string;
            message?: string;
            retryAfterSeconds?: number;
        };
    };
}

/**
 * OTP xác thực lưu/xoá tài khoản ngân hàng — gửi tới SĐT riêng của chính người dùng (khác
 * useLargeTransactionOtp, vốn gửi tới SĐT phụ huynh và tự chạy ngay khi mount). Hook này KHÔNG
 * tự chạy — nơi gọi (BankAccountForm) tự bấm `start()` ngay khi người dùng bấm "Lưu"/xác nhận xoá,
 * vì OTP luôn bắt buộc (không có nhánh "not_required" như giao dịch lớn).
 */
export function useBankAccountOtp() {
    const [status, setStatus] = useState<BankAccountOtpStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [initialCooldownSeconds, setInitialCooldownSeconds] = useState(0);
    const [verifying, setVerifying] = useState(false);

    const applySendError = useCallback((err: unknown): boolean => {
        const apiError = err as OtpApiError;
        const errorCode = apiError.response?.data?.errorCode;
        if (errorCode === 'OTP_COOLDOWN_ACTIVE') {
            setInitialCooldownSeconds(apiError.response?.data?.retryAfterSeconds ?? 0);
            return true; // vẫn có OTP còn hiệu lực gửi gần đây — cho nhập luôn
        }
        if (errorCode === 'OTP_DAILY_LIMIT_EXCEEDED') {
            setErrorMessage(
                apiError.response?.data?.message ||
                    'Bạn đã gửi mã OTP quá số lần cho phép trong ngày. Vui lòng thử lại vào ngày mai.',
            );
            return false;
        }
        if (errorCode === 'PHONE_NOT_VERIFIED') {
            setErrorMessage(
                apiError.response?.data?.message ||
                    'Vui lòng xác thực số điện thoại của bạn trước khi thao tác với tài khoản ngân hàng.',
            );
            return false;
        }
        setErrorMessage(apiError.response?.data?.message || 'Không thể gửi mã OTP xác thực. Vui lòng thử lại.');
        return false;
    }, []);

    const start = useCallback(async () => {
        setStatus('sending');
        setErrorMessage(null);
        setInitialCooldownSeconds(0);
        try {
            await sendBankAccountOtp();
            setStatus('awaiting_otp');
        } catch (err: unknown) {
            const stillUsable = applySendError(err);
            setStatus(stillUsable ? 'awaiting_otp' : 'blocked');
        }
    }, [applySendError]);

    const resend = useCallback(async () => {
        try {
            await sendBankAccountOtp();
            setErrorMessage(null);
        } catch (err: unknown) {
            const stillUsable = applySendError(err);
            if (!stillUsable) setStatus('blocked');
        }
    }, [applySendError]);

    const verify = useCallback(async (code: string): Promise<{ ok: boolean; message?: string }> => {
        setVerifying(true);
        try {
            await verifyBankAccountOtp(code);
            setStatus('verified');
            return { ok: true };
        } catch (err: unknown) {
            const apiError = err as OtpApiError;
            return { ok: false, message: apiError.response?.data?.message || 'Xác thực OTP thất bại.' };
        } finally {
            setVerifying(false);
        }
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        setErrorMessage(null);
        setInitialCooldownSeconds(0);
    }, []);

    return { status, errorMessage, initialCooldownSeconds, verifying, start, resend, verify, reset };
}
