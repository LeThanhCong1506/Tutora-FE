import { useState, useEffect, useCallback } from 'react';
import { X, Wallet, CreditCard, Loader2, CheckCircle2, Clock, AlertTriangle, ArrowLeft, Copy, Check } from 'lucide-react';
import styles from './PaymentModal.module.css';
import { getPaymentInfo, getPaymentStatus, payWithWallet, type PaymentInfoDTO } from '../../services/payment.service';
import { toast } from 'react-toastify';

interface PaymentModalProps {
    bookingId: number;
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
}

// Map bin code to bank name
const BANK_MAP: Record<string, { name: string; logo?: string }> = {
    '970422': { name: 'MB Bank' },
    '970436': { name: 'Vietcombank' },
    '970418': { name: 'BIDV' },
    '970415': { name: 'VietinBank' },
    '970407': { name: 'Techcombank' },
    '970416': { name: 'ACB' },
    '970432': { name: 'VPBank' },
    '970423': { name: 'TPBank' },
    '970448': { name: 'OCB' },
    '970405': { name: 'Agribank' },
    '970441': { name: 'VIB' },
    '970443': { name: 'SHB' },
    '970437': { name: 'HDBank' },
    '970454': { name: 'Viet Capital Bank' },
    '970449': { name: 'LPBank' },
    '970426': { name: 'MSB' },
};

const PaymentModal = ({ bookingId, isOpen, onClose, onPaymentSuccess }: PaymentModalProps) => {
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfoDTO | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showQRView, setShowQRView] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(0);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [qrImageError, setQrImageError] = useState(false);

    // Build VietQR image URL from bank details
    const getQRCodeUrl = (info: PaymentInfoDTO): string => {
        if (info.bin && info.accountNumber) {
            const params = new URLSearchParams();
            if (info.amount) params.set('amount', String(info.amount));
            if (info.description) params.set('addInfo', info.description);
            if (info.accountName) params.set('accountName', info.accountName);
            return `https://img.vietqr.io/image/${info.bin}-${info.accountNumber}-compact2.png?${params.toString()}`;
        }
        // Fallback to original qrCode URL from PayOS
        return info.qrCode;
    };

    useEffect(() => {
        if (isOpen) {
            fetchPaymentInfo();
            setShowQRView(false);
            setPaymentSuccess(false);
            setQrImageError(false);
        }
    }, [isOpen, bookingId]);

    const fetchPaymentInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const info = await getPaymentInfo(bookingId);
            setPaymentInfo(info);
        } catch (err: any) {
            console.warn('Failed to fetch payment info:', err?.response?.status, err?.response?.data);
            const errorCode = err.response?.data?.errorCode;

            if (errorCode === 'BOOKING_EXPIRED') {
                setError('BOOKING_EXPIRED');
            } else if (errorCode === 'BOOKING_ALREADY_PAID') {
                setError('BOOKING_ALREADY_PAID');
                setTimeout(() => {
                    onPaymentSuccess();
                    onClose();
                }, 2000);
            } else {
                setError(err.response?.data?.message || 'Không thể tải thông tin thanh toán. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Countdown timer for QR view
    useEffect(() => {
        if (!showQRView || !paymentInfo?.expiredAt) return;

        const calcRemaining = () => {
            const expiry = new Date(paymentInfo.expiredAt!).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((expiry - now) / 1000));
        };

        setCountdown(calcRemaining());

        const timer = setInterval(() => {
            const remaining = calcRemaining();
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [showQRView, paymentInfo?.expiredAt]);

    // Poll payment status when QR view is active
    useEffect(() => {
        if (!showQRView || paymentSuccess) return;

        const interval = setInterval(async () => {
            try {
                const statusData = await getPaymentStatus(bookingId);
                const isPhaseComplete = paymentInfo?.paymentPhase === 'deposit'
                    ? statusData.isDepositPaid
                    : statusData.isRemainingPaid || statusData.isPaid;

                if (isPhaseComplete || statusData.status === 'PAID') {
                    clearInterval(interval);
                    setPaymentSuccess(true);
                    toast.success('Thanh toán thành công! Đang cập nhật...');
                    setTimeout(() => {
                        onPaymentSuccess();
                        onClose();
                    }, 2500);
                }
            } catch (err) {
                console.error('[PaymentModal] Status poll failed:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [showQRView, bookingId, paymentInfo?.paymentPhase, paymentSuccess]);

    const handleWalletPayment = async () => {
        if (!paymentInfo?.canPayWithWallet) return;

        try {
            setPaying(true);
            await payWithWallet(bookingId);
            toast.success(
                paymentInfo.paymentPhase === 'deposit'
                    ? 'Đặt cọc thành công!'
                    : 'Thanh toán phần còn lại thành công!'
            );
            onPaymentSuccess();
            onClose();
        } catch (err: any) {
            console.error('Wallet payment failed:', err);
            toast.error(err.response?.data?.message || 'Thanh toán thất bại.');
        } finally {
            setPaying(false);
        }
    };

    const handleOpenQRView = () => {
        setShowQRView(true);
    };

    const handleCopy = useCallback((text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            toast.success('Đã sao chép!');
            setTimeout(() => setCopiedField(null), 2000);
        });
    }, []);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const formatCurrencyShort = (amount: number) =>
        new Intl.NumberFormat('vi-VN').format(amount) + ' VND';

    const getPhaseTitle = () => {
        if (!paymentInfo) return 'Hoàn tất thanh toán';
        return paymentInfo.paymentPhase === 'remaining'
            ? '💰 Thanh toán phần còn lại'
            : '🔒 Thanh toán đặt cọc (50%)';
    };

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const bankName = paymentInfo?.bin ? (BANK_MAP[paymentInfo.bin]?.name || `Ngân hàng (${paymentInfo.bin})`) : 'Ngân hàng';

    // ====== QR CODE PAYMENT VIEW ======
    if (showQRView && paymentInfo) {
        return (
            <div className={styles.overlay}>
                <div className={`${styles.modal} ${styles.qrModal}`}>
                    {/* Header */}
                    <div className={styles.qrHeader}>
                        <button onClick={() => setShowQRView(false)} className={styles.qrBackBtn} type="button">
                            <ArrowLeft size={18} />
                            Quay lại
                        </button>
                        <div className={styles.qrHeaderTitle}>
                            <span className={styles.qrHeaderLabel}>Thanh toán</span>
                            <span className={styles.qrHeaderSub}>Quét mã QR để thanh toán</span>
                        </div>
                    </div>

                    <div className={styles.qrBody}>
                        {/* Payment Success Overlay */}
                        {paymentSuccess && (
                            <div className={styles.qrSuccessOverlay}>
                                <div className={styles.qrSuccessContent}>
                                    <CheckCircle2 size={64} className={styles.qrSuccessIcon} />
                                    <h3>Thanh toán thành công!</h3>
                                    <p>Đang cập nhật trạng thái...</p>
                                </div>
                            </div>
                        )}

                        {/* Timer badge */}
                        {countdown > 0 && !paymentSuccess && (
                            <div className={styles.qrTimerBadge}>
                                <Clock size={14} />
                                <span>Thời gian còn lại: {formatCountdown(countdown)}</span>
                            </div>
                        )}

                        {countdown <= 0 && paymentInfo.expiredAt && !paymentSuccess && (
                            <div className={`${styles.qrTimerBadge} ${styles.qrTimerExpired}`}>
                                <AlertTriangle size={14} />
                                <span>Đã hết hạn thanh toán</span>
                            </div>
                        )}

                        {/* QR + Bank Info Layout */}
                        <div className={styles.qrLayout}>
                            {/* QR Code Side */}
                            <div className={styles.qrCodeSection}>
                                <div className={styles.qrCodeCard}>
                                    <div className={styles.qrCodeTitle}>
                                        Quét mã để hoàn tất thanh toán
                                    </div>
                                    <p className={styles.qrCodeDesc}>
                                        Sử dụng ứng dụng ngân hàng để quét mã QR và xác nhận giao dịch.
                                    </p>
                                    <div className={styles.qrCodeImageWrapper}>
                                        {!qrImageError ? (
                                            <img
                                                src={getQRCodeUrl(paymentInfo)}
                                                alt="QR Code thanh toán"
                                                className={styles.qrCodeImage}
                                                onError={() => setQrImageError(true)}
                                            />
                                        ) : paymentInfo.qrCode && !qrImageError ? (
                                            <img
                                                src={paymentInfo.qrCode}
                                                alt="QR Code thanh toán"
                                                className={styles.qrCodeImage}
                                            />
                                        ) : (
                                            <div className={styles.qrCodePlaceholder}>
                                                <span style={{ fontSize: 48, marginBottom: 8 }}>📱</span>
                                                <span>Vui lòng chuyển khoản theo thông tin bên cạnh</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details Side */}
                            <div className={styles.qrDetailsSection}>
                                {/* Bank Name */}
                                <div className={styles.qrInfoCard}>
                                    <div className={styles.qrInfoIcon}>🏦</div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Ngân hàng</span>
                                        <span className={styles.qrInfoValue}>{bankName}</span>
                                    </div>
                                </div>

                                {/* Account Name */}
                                <div className={styles.qrInfoCard}>
                                    <div className={styles.qrInfoIcon}>👤</div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Chủ tài khoản</span>
                                        <span className={styles.qrInfoValue}>{paymentInfo.accountName}</span>
                                    </div>
                                </div>

                                {/* Account Number */}
                                <div className={`${styles.qrInfoCard} ${styles.qrInfoCopyable}`} onClick={() => handleCopy(paymentInfo.accountNumber, 'account')}>
                                    <div className={styles.qrInfoIcon}>📋</div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Số tài khoản</span>
                                        <span className={styles.qrInfoValue}>{paymentInfo.accountNumber}</span>
                                    </div>
                                    <div className={styles.qrCopyBtn}>
                                        {copiedField === 'account' ? <Check size={14} /> : <Copy size={14} />}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className={`${styles.qrInfoCard} ${styles.qrInfoHighlight}`}>
                                    <div className={styles.qrInfoIcon}>💰</div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Số tiền</span>
                                        <span className={`${styles.qrInfoValue} ${styles.qrInfoAmount}`}>{formatCurrencyShort(paymentInfo.amount)}</span>
                                    </div>
                                </div>

                                {/* Description / Payment Code */}
                                <div className={`${styles.qrInfoCard} ${styles.qrInfoCopyable}`} onClick={() => handleCopy(paymentInfo.description || paymentInfo.paymentCode, 'desc')}>
                                    <div className={styles.qrInfoIcon}>📝</div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Nội dung</span>
                                        <span className={styles.qrInfoValue}>{paymentInfo.description || paymentInfo.paymentCode}</span>
                                    </div>
                                    <div className={styles.qrCopyBtn}>
                                        {copiedField === 'desc' ? <Check size={14} /> : <Copy size={14} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Polling status indicator */}
                        {!paymentSuccess && (
                            <div className={styles.qrPollingStatus}>
                                <Loader2 size={14} className={styles.spinnerSlow} />
                                <span>Đang chờ xác nhận thanh toán...</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.secureInfo}>
                            <CheckCircle2 size={14} />
                            <span>Thanh toán an toàn &amp; bảo mật bởi TUTORA</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ====== NORMAL PAYMENT MODAL ======
    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{getPhaseTitle()}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loaderContainer}>
                            <Loader2 className={styles.spinner} />
                            <p>Đang tải thông tin thanh toán...</p>
                        </div>
                    ) : error === 'BOOKING_EXPIRED' ? (
                        <div className={styles.errorContainer}>
                            <AlertTriangle className={styles.errorIcon} size={48} />
                            <h3>Yêu cầu thanh toán đã hết hạn</h3>
                            <p>Booking này đã quá hạn thanh toán và đã bị hủy tự động.</p>
                            <button onClick={onClose} className={styles.retryBtn}>Đóng</button>
                        </div>
                    ) : error === 'BOOKING_ALREADY_PAID' ? (
                        <div className={styles.successContainer}>
                            <CheckCircle2 className={styles.successIcon} size={48} />
                            <h3>Đã thanh toán thành công!</h3>
                            <p>Booking này đã được thanh toán trước đó.</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorContainer}>
                            <AlertTriangle className={styles.errorIcon} />
                            <p>{error}</p>
                            <button onClick={fetchPaymentInfo} className={styles.retryBtn}>Thử lại</button>
                        </div>
                    ) : paymentInfo ? (
                        <>
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryRow}>
                                    <span>Mã đơn hàng:</span>
                                    <strong>#{bookingId}</strong>
                                </div>
                                {/* 2-stage breakdown */}
                                {paymentInfo.totalAmount != null && paymentInfo.totalAmount > 0 && (
                                    <div className={styles.summaryRow}>
                                        <span>Tổng giá trị booking:</span>
                                        <span>{formatCurrency(paymentInfo.totalAmount)}</span>
                                    </div>
                                )}
                                {paymentInfo.paymentPhase === 'remaining' && paymentInfo.depositAmount != null && (
                                    <div className={styles.summaryRow}>
                                        <span>Đã đặt cọc (50%):</span>
                                        <span style={{ color: '#16a34a' }}>- {formatCurrency(paymentInfo.depositAmount)}</span>
                                    </div>
                                )}
                                <div className={styles.summaryRow}>
                                    <span>
                                        {paymentInfo.paymentPhase === 'remaining'
                                            ? 'Số tiền còn lại cần thanh toán:'
                                            : 'Số tiền đặt cọc (50%):'}
                                    </span>
                                    <strong className={styles.amount}>{formatCurrency(paymentInfo.amount)}</strong>
                                </div>
                                {paymentInfo.expiredAt && (
                                    <div className={styles.deadlineRow}>
                                        <Clock size={14} />
                                        <span>Hết hạn: {new Date(paymentInfo.expiredAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.sectionTitle}>Chọn phương thức thanh toán</div>

                            <div className={styles.paymentOptions}>
                                {/* Option 1: Wallet */}
                                <div className={`${styles.optionCard} ${!paymentInfo.canPayWithWallet ? styles.disabled : ''}`}>
                                    <div className={styles.optionHeader}>
                                        <div className={styles.optionIconWrap}>
                                            <Wallet size={24} />
                                        </div>
                                        <div className={styles.optionInfo}>
                                            <div className={styles.optionName}>Thanh toán bằng ví</div>
                                            <div className={styles.walletBalance}>Số dư: {formatCurrency(paymentInfo.walletBalance)}</div>
                                        </div>
                                    </div>
                                    {!paymentInfo.canPayWithWallet ? (
                                        <div className={styles.insufficientText}>Số dư không đủ</div>
                                    ) : (
                                        <div className={styles.payAction}>
                                            <button
                                                className={styles.payBtn}
                                                onClick={handleWalletPayment}
                                                disabled={paying}
                                            >
                                                {paying ? 'Đang xử lý...' : 'Thanh toán ngay'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Option 2: Bank Transfer / QR Code — opens in-app view */}
                                <div className={styles.optionCard} onClick={handleOpenQRView}>
                                    <div className={styles.optionHeader}>
                                        <div className={styles.optionIconWrap} style={{ background: '#eff6ff', color: '#2563eb' }}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div className={styles.optionInfo}>
                                            <div className={styles.optionName}>Chuyển khoản ngân hàng</div>
                                            <div className={styles.payosSub}>Quét QR hoặc chuyển khoản thủ công</div>
                                        </div>
                                    </div>
                                    <div className={styles.payAction}>
                                        <button className={styles.payBtn} style={{ background: '#2563eb' }}>
                                            Thanh toán chuyển khoản
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                <div className={styles.footer}>
                    <div className={styles.secureInfo}>
                        <CheckCircle2 size={14} />
                        <span>Thanh toán an toàn &amp; bảo mật bởi TUTORA</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
