import { useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatVNDNumber } from '../../utils/formatters';
import styles from './PaymentOtpStep.module.css';

const RESEND_COOLDOWN = 60; // giây

const DEFAULT_TITLE = 'Xác thực giao dịch lớn';
const DEFAULT_DESCRIPTION = (
    <>
        Đây là giao dịch lớn nên hệ thống cần xác nhận qua <strong>số điện thoại phụ huynh</strong> để bảo vệ
        tài khoản của bạn. Mã OTP đã được gửi qua Zalo tới số điện thoại phụ huynh đã đăng ký.
    </>
);

interface PaymentOtpStepProps {
    /** Chỉ dùng cho ngữ cảnh thanh toán (kèm phase) — bỏ trống để không hiện dòng số tiền. */
    amount?: number;
    phase?: 'deposit' | 'remaining';
    /** Ghi đè tiêu đề/mô tả mặc định — dùng cho ngữ cảnh khác ngoài thanh toán (VD xác thực tài
     * khoản ngân hàng, nơi OTP gửi tới SĐT của chính người dùng chứ không phải phụ huynh). */
    title?: string;
    description?: ReactNode;
    verifying: boolean;
    initialCooldownSeconds: number;
    onVerify: (code: string) => Promise<{ ok: boolean; message?: string }>;
    onResend: () => Promise<void>;
    onVerified: () => void;
}

/**
 * Màn nhập OTP dùng chung cho mọi luồng cần xác thực OTP xong mới cho làm tiếp (thay hẳn UI phía
 * sau, không phải overlay đè lên) — giao dịch lớn (PaymentModal/trang /payment) lẫn xác thực tài
 * khoản ngân hàng (BankAccountForm).
 */
const PaymentOtpStep = ({
    amount,
    phase,
    title,
    description,
    verifying,
    initialCooldownSeconds,
    onVerify,
    onResend,
    onVerified,
}: PaymentOtpStepProps) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(initialCooldownSeconds);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.replace(/\D/g, '');
        if (code.length !== 6) {
            setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
            return;
        }
        setError(null);
        const result = await onVerify(code);
        if (result.ok) {
            onVerified();
        } else {
            setError(result.message || 'Xác thực OTP thất bại.');
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        setError(null);
        try {
            await onResend();
            setCooldown(RESEND_COOLDOWN);
            setOtp('');
        } catch {
            setError('Không gửi lại được mã. Vui lòng thử lại.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.iconWrap}>
                <ShieldCheck size={26} />
            </div>
            <h3 className={styles.title}>{title ?? DEFAULT_TITLE}</h3>
            <p className={styles.desc}>{description ?? DEFAULT_DESCRIPTION}</p>
            {amount != null && phase != null && (
                <p className={styles.amount}>
                    {phase === 'remaining' ? 'Thanh toán các buổi còn lại' : 'Thanh toán buổi học đầu tiên'}:{' '}
                    {formatVNDNumber(amount)} ₫
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="______"
                    className={styles.input}
                    autoFocus
                />

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.verifyBtn} disabled={verifying || otp.length !== 6}>
                    {verifying ? 'Đang xác thực...' : 'Xác nhận'}
                </button>
            </form>

            <div className={styles.resendRow}>
                <button type="button" className={styles.resendBtn} onClick={handleResend} disabled={cooldown > 0 || resending}>
                    {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : resending ? 'Đang gửi...' : 'Gửi lại mã'}
                </button>
            </div>
        </div>
    );
};

export default PaymentOtpStep;
