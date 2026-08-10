import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatVNDNumber } from '../../utils/formatters';
import styles from './PaymentOtpStep.module.css';

const RESEND_COOLDOWN = 60; // giây

interface PaymentOtpStepProps {
    amount: number;
    phase: 'deposit' | 'remaining';
    verifying: boolean;
    initialCooldownSeconds: number;
    onVerify: (code: string) => Promise<{ ok: boolean; message?: string }>;
    onResend: () => Promise<void>;
    onVerified: () => void;
}

/**
 * Màn nhập OTP xác thực giao dịch lớn — thay hẳn màn chọn phương thức thanh toán cho tới khi
 * xác thực xong. Dùng chung cho cả PaymentModal (popup) và trang /payment riêng.
 */
const PaymentOtpStep = ({ amount, phase, verifying, initialCooldownSeconds, onVerify, onResend, onVerified }: PaymentOtpStepProps) => {
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
            <h3 className={styles.title}>Xác thực giao dịch lớn</h3>
            <p className={styles.desc}>
                Đây là giao dịch lớn nên hệ thống cần xác nhận qua <strong>số điện thoại phụ huynh</strong> để bảo
                vệ tài khoản của bạn. Mã OTP đã được gửi qua Zalo tới số điện thoại phụ huynh đã đăng ký.
            </p>
            <p className={styles.amount}>
                {phase === 'remaining' ? 'Thanh toán các buổi còn lại' : 'Thanh toán buổi học đầu tiên'}:{' '}
                {formatVNDNumber(amount)} ₫
            </p>

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
