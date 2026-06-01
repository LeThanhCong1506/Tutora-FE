import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPaymentInfo,
    payWithWallet,
    getBookingById,
    getPaymentStatus,
    type PaymentInfoResponse,
    type BookingResponseDTO
} from '../../../services/booking.service';
import { isZaloMiniApp } from '../../../services/zalo-env';
import { storageAdapter } from '../../../services/storage.adapter';
import styles from './styles.module.css';
import {
    CreditCard,
    Wallet,
    ShieldCheck,
    AlertCircle,
    ChevronLeft,
    Clock,
    MapPin,
    GraduationCap,
    CheckCircle2
} from 'lucide-react';
import { message as antMessage, Spin, Button, Radio } from 'antd';

const PaymentPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<BookingResponseDTO | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfoResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const inMiniApp = isZaloMiniApp();
    const [paymentMethod, setPaymentMethod] = useState<'payos' | 'wallet' | 'zalopay'>(
        inMiniApp ? 'zalopay' : 'payos'
    );
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [waitingForPayOS, setWaitingForPayOS] = useState(false);
    const payosWindowRef = useRef<Window | null>(null);

    const bookingId = Number(id);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [bookingRes, paymentRes] = await Promise.all([
                    getBookingById(bookingId),
                    getPaymentInfo(bookingId)
                ]);
                if (!bookingRes?.content || !paymentRes?.content) {
                    throw new Error('Dữ liệu không hợp lệ');
                }
                setBooking(bookingRes.content);
                setPaymentInfo(paymentRes.content);

                // Nếu đã thanh toán, redirect ngay để tránh tạo lại booking khi nhấn Back
                if (bookingRes.content.paymentStatus === 'paid') {
                    navigate(`/parent-portal/booking/${bookingId}`, { replace: true });
                    return;
                }
            } catch (error) {
                antMessage.error('Không thể tải thông tin thanh toán.');
                navigate('/parent-portal/booking');
            } finally {
                setLoading(false);
            }
        };

        if (bookingId) fetchData();
    }, [bookingId, navigate]);

    // Dọn storage khi rời khỏi trang thanh toán
    useEffect(() => {
        return () => { storageAdapter.remove('payos_payment_result'); };
    }, []);

    // Listen for localStorage changes from PaymentCallback page (in new tab)
    useEffect(() => {
        if (!waitingForPayOS) return;

        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'payos_payment_result' && event.newValue) {
                try {
                    const result = JSON.parse(event.newValue);
                    if (result.isPaid) {
                        setWaitingForPayOS(false);
                        localStorage.removeItem('payos_payment_result');
                        setPaymentSuccess(true);
                        antMessage.success('Thanh toán thành công!');
                    } else if (result.cancel) {
                        setWaitingForPayOS(false);
                        localStorage.removeItem('payos_payment_result');
                        antMessage.info('Thanh toán đã bị hủy.');
                    }
                } catch (e) {
                    console.error('[PaymentPage] Failed to parse payment result:', e);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [waitingForPayOS]);

    // Check if new tab was closed by user
    useEffect(() => {
        if (!waitingForPayOS) return;

        const interval = setInterval(() => {
            if (payosWindowRef.current && payosWindowRef.current.closed) {
                const stored = localStorage.getItem('payos_payment_result');
                if (stored) {
                    const result = JSON.parse(stored);
                    if (result.isPaid) {
                        setWaitingForPayOS(false);
                        localStorage.removeItem('payos_payment_result');
                        setPaymentSuccess(true);
                        antMessage.success('Thanh toán thành công!');
                        return;
                    }
                }
                setWaitingForPayOS(false);
                payosWindowRef.current = null;
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [waitingForPayOS]);

    // Polling payment status for PayOS
    useEffect(() => {
        let interval: any;
        if (paymentMethod === 'payos' && !paymentSuccess && !loading) {
            interval = setInterval(async () => {
                try {
                    const res = await getPaymentStatus(bookingId);
                    const data = res?.content;
                    const phaseComplete = paymentInfo?.paymentPhase === 'remaining'
                        ? data?.isRemainingPaid
                        : data?.isDepositPaid;
                    if (data?.isPaid || phaseComplete) {
                        setPaymentSuccess(true);
                        antMessage.success('Thanh toán thành công!');
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [bookingId, paymentMethod, paymentSuccess, loading, paymentInfo?.paymentPhase]);

    const handleWalletPay = async () => {
        if (!paymentInfo || paymentInfo.walletBalance < paymentInfo.amount) {
            antMessage.error('Số dư ví không đủ. Vui lòng nạp thêm tiền.');
            return;
        }

        try {
            setIsPaying(true);
            await payWithWallet(bookingId);
            setPaymentSuccess(true);
            antMessage.success('Thanh toán bằng ví thành công!');
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || 'Có lỗi xảy ra khi thanh toán.');
        } finally {
            setIsPaying(false);
        }
    };

    // ZaloPay — TODO: kích hoạt sau khi có ZaloPay Merchant account
    // const handleZaloPay = async () => {
    //     try {
    //         setIsPaying(true);
    //         const { payment } = await import('zmp-sdk/apis');
    //         const orderRes = await apiClient.post('/payment/zalopay/create-order', { bookingId });
    //         const { zpTransToken, amount } = orderRes.data.content;
    //         const result = await payment.createOrder({
    //             desc: `Tutora - Đặt lịch gia sư #${bookingId}`,
    //             item: [],
    //             amount,
    //         });
    //         if (result.code === 1) {
    //             await apiClient.post('/payment/zalopay/confirm', { bookingId, zpTransToken });
    //             setPaymentSuccess(true);
    //         }
    //     } catch (error: any) {
    //         antMessage.error(error.message || 'ZaloPay thất bại.');
    //     } finally {
    //         setIsPaying(false);
    //     }
    // };

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    if (loading) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.loadingOverlay} style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyItems: 'center', width: '100%', placeContent: 'center' }}>
                    <Spin size="large" tip="Đang chuẩn bị thông tin thanh toán...">
                        <div style={{ padding: '50px' }} />
                    </Spin>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.successContainer}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <CheckCircle2 size={64} color="#059669" />
                        </div>
                        <h1>Thanh toán hoàn tất!</h1>
                        <p>Cảm ơn bạn đã tin tưởng TUTORA. Buổi học của bạn đã được lên lịch.</p>
                        <div className={styles.successActions}>
                            <Button type="primary" size="large" onClick={() => navigate(`/parent-portal/booking/${bookingId}`, { replace: true })}>
                                Xem chi tiết lịch học
                            </Button>
                            <Button size="large" onClick={() => navigate('/parent-portal/booking', { replace: true })}>
                                Quản lý lớp học
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.topNav}>
                <button onClick={() => navigate('/parent-portal/booking', { replace: true })} className={styles.backBtn}>
                    <ChevronLeft size={20} /> Quay lại
                </button>
                <h1>Thanh toán khóa học</h1>
            </div>

            <div className={styles.layout}>
                {/* Left Column: Summary */}
                <div className={styles.sidebar}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Tóm tắt đơn hàng</h2>
                        <div className={styles.tutorBrief}>
                            <img src={booking?.tutor?.avatarUrl} alt="" className={styles.avatar} />
                            <div>
                                <h3>{booking?.tutor?.fullName || 'N/A'}</h3>
                                <p><GraduationCap size={14} /> Gia sư {booking?.subject?.subjectName || 'N/A'}</p>
                            </div>
                        </div>

                        <div className={styles.bookingDetails}>
                            <div className={styles.detailItem}>
                                <Clock size={16} />
                                <span>Gói {booking?.sessionCount} buổi học</span>
                            </div>
                            <div className={styles.detailItem}>
                                <MapPin size={16} />
                                <span>Học {booking?.packageType === 'online' ? 'Trực tuyến' : 'Trực tiếp'}</span>
                            </div>
                        </div>

                        <div className={styles.priceBreakdown}>
                            <div className={styles.priceRow}>
                                <span>Học phí:</span>
                                <span>{formatPrice(booking?.price || 0)}</span>
                            </div>
                            {booking?.discountApplied && booking.discountApplied > 0 ? (
                                <div className={styles.priceRow}>
                                    <span>Giảm giá:</span>
                                    <span className={styles.discount}>-{formatPrice(booking.discountApplied)}</span>
                                </div>
                            ) : null}
                            {(() => {
                                const parentFee = (booking?.finalPrice || 0) - ((booking?.price || 0) - (booking?.discountApplied || 0));
                                return parentFee > 0 ? (
                                    <div className={styles.priceRow}>
                                        <span>Phí dịch vụ (5%):</span>
                                        <span>+{formatPrice(parentFee)}</span>
                                    </div>
                                ) : null;
                            })()}
                            <div className={styles.priceRow}>
                                <span>Tổng:</span>
                                <span>{formatPrice(booking?.finalPrice || 0)}</span>
                            </div>
                            <div className={`${styles.priceRow} ${styles.totalRow}`}>
                                <span>
                                    {paymentInfo?.paymentPhase === 'remaining'
                                        ? 'Thanh toán lần này (50% còn lại):'
                                        : 'Đặt cọc lần này (50%):'}
                                </span>
                                <span className={styles.totalPrice}>{formatPrice(paymentInfo?.amount || 0)}</span>
                            </div>
                        </div>

                        <div className={styles.securityNote}>
                            <ShieldCheck size={16} />
                            <p>TUTORA đảm bảo thanh toán an toàn. Tiền chỉ được chuyển cho gia sư sau khi buổi học hoàn thành.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment Methods */}
                <main className={styles.main}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Chọn phương thức thanh toán</h2>

                        <Radio.Group
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            value={paymentMethod}
                            className={styles.methodGroup}
                        >
                            {/* ZaloPay — chỉ hiển thị trong Zalo Mini App */}
                            {inMiniApp && (
                                <label className={`${styles.methodItem} ${paymentMethod === 'zalopay' ? styles.methodActive : ''}`}>
                                    <Radio value="zalopay" />
                                    <div className={styles.methodContent}>
                                        <div className={styles.methodIcon}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div className={styles.methodInfo}>
                                            <h3>ZaloPay</h3>
                                            <p>Thanh toán nhanh qua ZaloPay trong Zalo</p>
                                        </div>
                                    </div>
                                </label>
                            )}

                            {/* PayOS — ẩn trong Mini App (dùng ZaloPay thay thế) */}
                            {!inMiniApp && (
                                <label className={`${styles.methodItem} ${paymentMethod === 'payos' ? styles.methodActive : ''}`}>
                                    <Radio value="payos" />
                                    <div className={styles.methodContent}>
                                        <div className={styles.methodIcon}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div className={styles.methodInfo}>
                                            <h3>Quét mã QR Ngân hàng (PayOS)</h3>
                                            <p>Hỗ trợ tất cả ứng dụng Mobile Banking</p>
                                        </div>
                                    </div>
                                </label>
                            )}

                            <label className={`${styles.methodItem} ${paymentMethod === 'wallet' ? styles.methodActive : ''}`}>
                                <Radio value="wallet" />
                                <div className={styles.methodContent}>
                                    <div className={styles.methodIcon}>
                                        <Wallet size={24} />
                                    </div>
                                    <div className={styles.methodInfo}>
                                        <h3>Số dư ví TUTORA</h3>
                                        <p>Số dư hiện tại: <strong>{formatPrice(paymentInfo?.walletBalance || 0)}</strong></p>
                                    </div>
                                </div>
                            </label>
                        </Radio.Group>

                        <div className={styles.paymentActionArea}>
                            {paymentMethod === 'zalopay' ? (
                                <div className={styles.walletArea}>
                                    <p className={styles.walletHint}>
                                        Thanh toán <strong>{formatPrice(paymentInfo?.amount || 0)}</strong> qua ZaloPay.
                                    </p>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        disabled
                                        className={styles.payBtn}
                                        style={{ marginTop: '16px' }}
                                    >
                                        ZaloPay (sắp ra mắt)
                                    </Button>
                                    <p style={{ fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' }}>
                                        Tạm thời dùng Ví TUTORA để thanh toán
                                    </p>
                                </div>
                            ) : paymentMethod === 'payos' ? (
                                <div className={styles.payosArea}>
                                    <div className={styles.qrContainer} style={{ marginBottom: '20px' }}>
                                        <p className={styles.qrHint} style={{ fontSize: '16px' }}>
                                            Hệ thống sử dụng cổng thanh toán an toàn PayOS. Vui lòng nhấn nút bên dưới để mở trang thanh toán và lấy mã QR chuyển khoản chính xác.
                                        </p>
                                    </div>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        disabled={!paymentInfo?.checkoutUrl}
                                        onClick={() => {
                                            if (paymentInfo?.checkoutUrl) {
                                                storageAdapter.remove('payos_payment_result');
                                                const w = window.open(paymentInfo.checkoutUrl, '_blank');
                                                payosWindowRef.current = w;
                                                setWaitingForPayOS(true);
                                            }
                                        }}
                                        className={styles.payBtn}
                                        style={{ marginTop: '16px', marginBottom: '16px' }}
                                    >
                                        Chuyển đến trang thanh toán PayOS
                                    </Button>
                                    <div className={styles.waitingStatus}>
                                        <Spin size="small" />
                                        <span>Đang chờ bạn thực hiện thanh toán... Hệ thống sẽ tự động cập nhật.</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.walletArea}>
                                    {paymentInfo && paymentInfo.walletBalance < paymentInfo.amount ? (
                                        <div className={styles.insufficientFunds}>
                                            <AlertCircle size={20} />
                                            <p>Số dư không đủ để thanh toán. Vui lòng chọn phương thức khác hoặc nạp thêm tiền.</p>
                                        </div>
                                    ) : (
                                        <p className={styles.walletHint}>
                                            Hệ thống sẽ khấu trừ trực tiếp <strong>{formatPrice(paymentInfo?.amount || 0)}</strong> từ ví của bạn.
                                        </p>
                                    )}
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        disabled={!paymentInfo || paymentInfo.walletBalance < paymentInfo.amount || isPaying}
                                        loading={isPaying}
                                        onClick={handleWalletPay}
                                        className={styles.payBtn}
                                    >
                                        Xác nhận thanh toán bằng ví
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PaymentPage;
