import { useState, useEffect, useCallback } from 'react';
import {
    X,
    Wallet,
    CreditCard,
    Loader2,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowLeft,
    Copy,
    Check,
    Building2,
    UserRound,
    BadgeDollarSign,
    ReceiptText,
    ScanLine,
    ShieldCheck,
    RefreshCw,
} from 'lucide-react';
import styles from './PaymentModal.module.css';
import { getPaymentInfo, getPaymentStatus, payWithWallet, type PaymentInfoDTO } from '../../services/payment.service';
import { toast } from 'react-toastify';

interface PaymentModalProps {
    bookingId: number;
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
}

type PaymentApiError = {
    response?: {
        status?: number;
        data?: {
            errorCode?: string;
            message?: string;
        };
    };
};

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
    const [isExpired, setIsExpired] = useState(false);

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

    // assumeExpired: FE đã biết QR hết hạn (countdown về 0). Khi đó booking có thể đã bị job
    // hủy (BE trả INVALID_BOOKING_STATUS thay vì BOOKING_EXPIRED) — vẫn hiển thị màn "hết hạn"
    // cho rõ ràng, trừ khi BE báo đã thanh toán (vừa kịp trả tiền).
    const fetchPaymentInfo = useCallback(async (assumeExpired = false) => {
        try {
            setLoading(true);
            setError(null);
            const info = await getPaymentInfo(bookingId);
            setPaymentInfo(info);
        } catch (err: unknown) {
            const apiError = err as PaymentApiError;
            console.warn('Failed to fetch payment info:', apiError.response?.status, apiError.response?.data);
            const errorCode = apiError.response?.data?.errorCode;

            if (errorCode === 'BOOKING_ALREADY_PAID') {
                setError('BOOKING_ALREADY_PAID');
                setTimeout(() => {
                    onPaymentSuccess();
                    onClose();
                }, 2000);
            } else if (errorCode === 'BOOKING_EXPIRED' || assumeExpired) {
                setError('BOOKING_EXPIRED');
            } else {
                setError(apiError.response?.data?.message || 'Không thể tải thông tin thanh toán. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    }, [bookingId, onClose, onPaymentSuccess]);

    useEffect(() => {
        if (isOpen) {
            void fetchPaymentInfo();
            setShowQRView(false);
            setPaymentSuccess(false);
            setQrImageError(false);
            setIsExpired(false);
        }
    }, [isOpen, bookingId, fetchPaymentInfo]);

    // Countdown timer for QR view. Khi hết giờ → đánh dấu isExpired để che QR + dừng poll.
    useEffect(() => {
        if (!showQRView || !paymentInfo?.expiredAt) return;

        const expiry = new Date(paymentInfo.expiredAt).getTime();
        const calcRemaining = () => Math.max(0, Math.floor((expiry - Date.now()) / 1000));

        // Cập nhật countdown + isExpired cùng lúc để tránh nháy "hết hạn" 1 frame lúc mở.
        const apply = () => {
            const remaining = calcRemaining();
            setCountdown(remaining);
            setIsExpired(remaining <= 0);
            return remaining;
        };

        if (apply() <= 0) return; // đã hết hạn ngay khi mở → không cần đếm tiếp

        const timer = setInterval(() => {
            if (apply() <= 0) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [showQRView, paymentInfo?.expiredAt]);

    // Poll payment status when QR view is active. Ngừng khi đã hết hạn — không nhận quét mới.
    useEffect(() => {
        if (!showQRView || paymentSuccess || isExpired) return;

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
    }, [showQRView, bookingId, paymentInfo?.paymentPhase, paymentSuccess, isExpired, onClose, onPaymentSuccess]);

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
        } catch (err: unknown) {
            const apiError = err as PaymentApiError;
            console.error('Wallet payment failed:', err);
            toast.error(apiError.response?.data?.message || 'Thanh toán thất bại.');
        } finally {
            setPaying(false);
        }
    };

    const handleOpenQRView = () => {
        setIsExpired(false);
        setShowQRView(true);
    };

    // Hết hạn → quay về màn chọn phương thức và fetch lại; BE sẽ trả BOOKING_EXPIRED
    // (hoặc BOOKING_ALREADY_PAID nếu vừa kịp thanh toán) để hiển thị đúng trạng thái.
    const handleReloadAfterExpiry = () => {
        setShowQRView(false);
        setIsExpired(false);
        void fetchPaymentInfo(true);
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
            ? 'Thanh toán các buổi còn lại'
            : 'Thanh toán buổi học đầu tiên';
    };

    const getPhaseDescription = () => {
        if (!paymentInfo) return 'Hoàn tất thanh toán để xác nhận lịch học của bạn.';
        return paymentInfo.paymentPhase === 'remaining'
            ? 'Hoàn tất phần học phí còn lại để tiếp tục lịch học đã đặt.'
            : 'Thanh toán buổi đầu để gửi yêu cầu đặt lịch tới gia sư.';
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
                        <div className={styles.qrHeaderMain}>
                            <div className={styles.qrHeaderIcon}>
                                <ScanLine size={22} />
                            </div>
                            <div className={styles.qrHeaderTitle}>
                                <span className={styles.qrHeaderLabel}>Thanh toán QR</span>
                                <span className={styles.qrHeaderSub}>Quét mã hoặc chuyển khoản thủ công</span>
                            </div>
                        </div>
                        <div className={styles.qrHeaderAmount}>
                            <span>Số tiền</span>
                            <strong>{formatCurrencyShort(paymentInfo.amount)}</strong>
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

                        {/* Hết hạn → THAY THẾ hẳn nội dung QR (không overlay) để khi scroll
                            không còn lộ lớp QR cũ bên dưới. */}
                        {isExpired && !paymentSuccess && (
                            <div className={styles.qrExpiredState}>
                                <div className={styles.qrExpiredCard}>
                                    <span className={styles.qrExpiredIconWrap}>
                                        <AlertTriangle size={38} />
                                    </span>
                                    <h3>Mã thanh toán đã hết hạn</h3>
                                    <p>
                                        Vui lòng không quét mã cũ để tránh chuyển khoản nhầm. Hãy
                                        tải lại để kiểm tra trạng thái đặt lịch của bạn.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.qrReloadBtn}
                                        onClick={handleReloadAfterExpiry}
                                    >
                                        <RefreshCw size={16} />
                                        Tải lại
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Timer badge */}
                        {!paymentSuccess && !isExpired && (
                            <div className={styles.qrStatusStrip}>
                                {countdown > 0 ? (
                                    <div className={styles.qrTimerBadge}>
                                        <Clock size={15} />
                                        <span>Còn {formatCountdown(countdown)}</span>
                                    </div>
                                ) : isExpired ? (
                                    <div className={`${styles.qrTimerBadge} ${styles.qrTimerExpired}`}>
                                        <AlertTriangle size={15} />
                                        <span>Đã hết hạn thanh toán</span>
                                    </div>
                                ) : null}
                                <div className={styles.qrSecurityNote}>
                                    <ShieldCheck size={15} />
                                    <span>Giao dịch được đối soát tự động</span>
                                </div>
                            </div>
                        )}

                        {/* QR + Bank Info Layout */}
                        {!isExpired && (
                        <div className={styles.qrLayout}>
                            {/* QR Code Side */}
                            <div className={styles.qrCodeSection}>
                                <div className={styles.qrCodeCard}>
                                    <div className={styles.qrCodeTitleRow}>
                                        <div>
                                            <div className={styles.qrCodeTitle}>
                                                Quét mã để hoàn tất thanh toán
                                            </div>
                                            <p className={styles.qrCodeDesc}>
                                                Mở app ngân hàng, quét mã và giữ nguyên nội dung chuyển khoản.
                                            </p>
                                        </div>
                                        <span className={styles.qrCodeBadge}>VietQR</span>
                                    </div>
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
                                    <div className={styles.qrInfoIcon}><Building2 size={18} /></div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Ngân hàng</span>
                                        <span className={styles.qrInfoValue}>{bankName}</span>
                                    </div>
                                </div>

                                {/* Account Name */}
                                <div className={styles.qrInfoCard}>
                                    <div className={styles.qrInfoIcon}><UserRound size={18} /></div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Chủ tài khoản</span>
                                        <span className={styles.qrInfoValue}>{paymentInfo.accountName}</span>
                                    </div>
                                </div>

                                {/* Account Number */}
                                <div className={`${styles.qrInfoCard} ${styles.qrInfoCopyable}`} onClick={() => handleCopy(paymentInfo.accountNumber, 'account')}>
                                    <div className={styles.qrInfoIcon}><CreditCard size={18} /></div>
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
                                    <div className={styles.qrInfoIcon}><BadgeDollarSign size={18} /></div>
                                    <div className={styles.qrInfoContent}>
                                        <span className={styles.qrInfoLabel}>Số tiền</span>
                                        <span className={`${styles.qrInfoValue} ${styles.qrInfoAmount}`}>{formatCurrencyShort(paymentInfo.amount)}</span>
                                    </div>
                                </div>

                                {/* Description / Payment Code */}
                                <div className={`${styles.qrInfoCard} ${styles.qrInfoCopyable}`} onClick={() => handleCopy(paymentInfo.description || paymentInfo.paymentCode, 'desc')}>
                                    <div className={styles.qrInfoIcon}><ReceiptText size={18} /></div>
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
                        )}

                        {/* Polling status indicator */}
                        {!paymentSuccess && !isExpired && (
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
                    <div className={styles.headerTitleGroup}>
                        <div className={styles.headerIconWrap}>
                            <CreditCard size={22} />
                        </div>
                        <div>
                            <span className={styles.headerEyebrow}>TUTORA Secure Pay</span>
                            <h3>{getPhaseTitle()}</h3>
                            <p>{getPhaseDescription()}</p>
                        </div>
                    </div>
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
                            <h3>Booking đã hết hạn thanh toán</h3>
                            <p>
                                Buổi học chưa được thanh toán trong thời gian quy định nên booking đã
                                tự động bị hủy. Vui lòng đặt lịch lại nếu bạn vẫn muốn học với gia sư này.
                            </p>
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
                            <button onClick={() => fetchPaymentInfo()} className={styles.retryBtn}>Thử lại</button>
                        </div>
                    ) : paymentInfo ? (
                        <>
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryTop}>
                                    <div>
                                        <span className={styles.summaryKicker}>Cần thanh toán</span>
                                        <strong className={styles.summaryAmountLarge}>{formatCurrency(paymentInfo.amount)}</strong>
                                    </div>
                                </div>

                                <div className={styles.summaryDetails}>
                                    {paymentInfo.totalAmount != null && paymentInfo.totalAmount > 0 && (
                                        <div className={styles.summaryRow}>
                                            <span>Tổng giá trị booking</span>
                                            <strong>{formatCurrency(paymentInfo.totalAmount)}</strong>
                                        </div>
                                    )}
                                    {paymentInfo.paymentPhase === 'remaining' && paymentInfo.depositAmount != null && (
                                        <div className={styles.summaryRow}>
                                            <span>Đã thanh toán buổi đầu</span>
                                            <strong className={styles.paidAmount}>- {formatCurrency(paymentInfo.depositAmount)}</strong>
                                        </div>
                                    )}
                                    <div className={styles.summaryRow}>
                                        <span>
                                            {paymentInfo.paymentPhase === 'remaining'
                                                ? 'Các buổi còn lại'
                                                : 'Buổi học đầu tiên'}
                                        </span>
                                        <strong>{formatCurrency(paymentInfo.amount)}</strong>
                                    </div>
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
                                    <span className={`${styles.optionBadge} ${paymentInfo.canPayWithWallet ? styles.optionBadgeReady : styles.optionBadgeMuted}`}>
                                        {paymentInfo.canPayWithWallet ? 'Có thể dùng' : 'Không khả dụng'}
                                    </span>
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
                                                type="button"
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
                                <div className={`${styles.optionCard} ${styles.recommendedOption}`} onClick={handleOpenQRView}>
                                    <span className={`${styles.optionBadge} ${styles.optionBadgeRecommended}`}>Khuyên dùng</span>
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
                                        <button type="button" className={styles.payBtn} style={{ background: '#2563eb' }}>
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
