import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    BookOpen,
    CreditCard,
    Tag,
    CheckCircle2,
    Circle,
    XCircle,
    AlertCircle,
    Copy,
    MessageSquare,
    ArrowRight,
} from 'lucide-react';
import {
    getBookingById,
    cancelBooking,
    type BookingResponseDTO
} from '../../../services/booking.service';
import { canLeaveBookingFeedback } from '../../../services/feedback.service';
import { getPaymentBadge } from '../../../utils/paymentBadge';
import CreateFeedbackModal from '../../ParentLessons/components/CreateFeedbackModal';
import styles from './styles.module.css';
import { message as antMessage, Spin, Modal, Input } from 'antd';

// ===== HELPERS =====
const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const formatPrice = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatPackage = (pkg: string) => {
    const map: Record<string, string> = {
        '4_sessions': '4 buổi',
        '8_sessions': '8 buổi',
        '12_sessions': '12 buổi',
    };
    return map[pkg] || pkg;
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending_tutor: { label: 'Chờ gia sư xác nhận', className: 'statusPending', icon: AlertCircle },
    accepted: { label: 'Chờ đặt cọc', className: 'statusWarning', icon: Clock },
    pending_payment: { label: 'Chờ thanh toán', className: 'statusWarning', icon: Clock },
    deposit_paid: { label: 'Đã cọc (50%)', className: 'statusActive', icon: CheckCircle2 },
    pending_remaining_payment: { label: 'Thanh toán khoản còn lại', className: 'statusWarning', icon: Clock },
    active: { label: 'Đang học', className: 'statusActive', icon: CheckCircle2 },
    completed: { label: 'Hoàn thành', className: 'statusCompleted', icon: CheckCircle2 },
    cancelled: { label: 'Đã hủy', className: 'statusCancelled', icon: XCircle },
    payment_timeout: { label: 'Hết hạn thanh toán', className: 'statusCancelled', icon: XCircle },
};

// Timeline steps
const TIMELINE_STEPS = [
    { key: 'created', label: 'Tạo booking' },
    { key: 'pending_tutor', label: 'Chờ gia sư' },
    { key: 'accepted', label: 'Gia sư xác nhận' },
    { key: 'deposit_paid', label: 'Đã cọc (50%)' },
    { key: 'active', label: 'Bắt đầu học' },
    { key: 'completed', label: 'Hoàn thành' },
];

const getTimelineProgress = (status: string) => {
    const progressMap: Record<string, number> = {
        pending_tutor: 2,
        accepted: 3,
        pending_payment: 3,
        deposit_paid: 4,
        pending_remaining_payment: 4,
        active: 5,
        completed: 6,
        cancelled: 0,
        payment_timeout: 0,
    };
    return progressMap[status] || 1;
};

// ===== COMPONENT =====
const BookingDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const basePath = pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';
    const [booking, setBooking] = useState<BookingResponseDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [canReview, setCanReview] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Cancellation state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    const bookingId = Number(id);

    // Redirect to 404 if bookingId is not a valid positive integer
    if (!id || isNaN(bookingId) || bookingId <= 0 || !Number.isInteger(bookingId)) {
        return <Navigate to="/404" replace />;
    }

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const res = await getBookingById(bookingId);
                setBooking(res.content);

                // Check early termination feedback eligibility
                if (['cancelled', 'completed', 'payment_timeout'].includes(res.content.status)) {
                    if (['Escrowed', 'paid'].includes(res.content.paymentStatus)) {
                        const feedbackRes = await canLeaveBookingFeedback(bookingId);
                        setCanReview(feedbackRes.content);
                    }
                }
            } catch {
                antMessage.error('Không thể tải chi tiết đặt lịch.');
            } finally {
                setLoading(false);
            }
        };

        if (bookingId) fetchBooking();
    }, [bookingId]);

    if (loading) {
        return (
            <div className={styles.loadingOverlay}>
                <Spin size="large" tip="Đang tải chi tiết..." />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className={styles.page}>
                <div className={styles.notFound}>
                    <AlertCircle size={48} />
                    <h2>Không tìm thấy booking</h2>
                    <p>Booking #{id} không tồn tại hoặc bạn không có quyền xem.</p>
                    <button className={styles.backBtnPrimary} onClick={() => navigate(`${basePath}/booking`)} type="button">
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending_tutor;
    const StatusIcon = statusCfg.icon;
    const timelineProgress = getTimelineProgress(booking.status);
    const isCancelled = booking.status === 'cancelled' || booking.status === 'payment_timeout';

    return (
        <div className={styles.page}>
            {/* Top Bar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate(`${basePath}/booking`)} type="button">
                    <ArrowLeft size={18} />
                    <span>Quay lại</span>
                </button>
                <div className={styles.topBarRight}>
                    <span className={styles.bookingCode}>
                        <Copy size={12} />
                        BK-{booking.bookingId}
                    </span>
                    <span className={`${styles.statusBadgeLg} ${styles[statusCfg.className]}`}>
                        <StatusIcon size={14} />
                        {statusCfg.label}
                    </span>
                </div>
            </div>

            {/* Main Grid */}
            <div className={styles.detailGrid}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                    {/* Tutor & Subject Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <BookOpen size={16} className={styles.cardHeadIcon} />
                            <h3 className={styles.cardHeadTitle}>Thông tin khóa học</h3>
                        </div>
                        <div className={styles.tutorRow}>
                            <div className={styles.tutorAvatar}>
                                {booking.tutor?.avatarUrl ? (
                                    <img src={booking.tutor.avatarUrl} alt={booking.tutor?.fullName} />
                                ) : (
                                    <span>{booking.tutor?.fullName?.charAt(0) || 'G'}</span>
                                )}
                            </div>
                            <div className={styles.tutorInfo}>
                                <h4 className={styles.tutorName}>{booking.tutor?.fullName || 'N/A'}</h4>
                                <p className={styles.tutorRate}>{formatPrice(booking.tutor?.hourlyRate || 0)}/giờ</p>
                            </div>
                        </div>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Môn học</span>
                                <span className={styles.infoValue}>{booking.subject?.subjectName || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Gói</span>
                                <span className={styles.infoValue}>{formatPackage(booking.packageType)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Số buổi</span>
                                <span className={styles.infoValue}>{booking.sessionCount} buổi</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Ngày tạo</span>
                                <span className={styles.infoValue}>{formatDate(booking.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Student Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <User size={16} className={styles.cardHeadIcon} />
                            <h3 className={styles.cardHeadTitle}>Học sinh</h3>
                        </div>
                        <div className={styles.studentInfo}>
                            <div className={styles.studentAvatar}>
                                <span>{booking.student?.fullName?.charAt(0) || 'H'}</span>
                            </div>
                            <div>
                                <h4 className={styles.studentName}>{booking.student?.fullName || 'N/A'}</h4>
                                <p className={styles.studentGrade}>{booking.student?.gradeLevel || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <Calendar size={16} className={styles.cardHeadIcon} />
                            <h3 className={styles.cardHeadTitle}>Lịch học</h3>
                        </div>
                        <div className={styles.scheduleList}>
                            {booking.schedule.map((s, i) => (
                                <div key={i} className={styles.scheduleItem}>
                                    <div className={styles.scheduleDayBadge}>{DAY_NAMES[s.dayOfWeek]}</div>
                                    <div className={styles.scheduleTime}>
                                        <Clock size={14} />
                                        <span>
                                            {s.startTime} — {s.endTime}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightColumn}>
                    {/* Price Breakdown */}
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <CreditCard size={16} className={styles.cardHeadIcon} />
                            <h3 className={styles.cardHeadTitle}>Chi tiết thanh toán</h3>
                        </div>
                        <div className={styles.priceBreakdown}>
                            <div className={styles.priceRow}>
                                <span>Giá gốc khóa học</span>
                                <span>{formatPrice(booking.price)}</span>
                            </div>
                            <div className={styles.priceRow}>
                                <span>Phí dịch vụ</span>
                                <span>{formatPrice(booking.platformFee)}</span>
                            </div>
                            {booking.discountApplied > 0 && (
                                <div className={`${styles.priceRow} ${styles.priceDiscount}`}>
                                    <span>
                                        <Tag size={12} /> Giảm giá
                                    </span>
                                    <span>-{formatPrice(booking.discountApplied)}</span>
                                </div>
                            )}
                            <div className={styles.priceDivider} />
                            <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                                <span>Tổng thanh toán</span>
                                <span>{formatPrice(booking.finalPrice)}</span>
                            </div>
                            <div className={styles.priceRow} style={{ marginTop: '8px', color: '#6b7280' }}>
                                <span><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Số tiền đặt cọc (50%)</span>
                                <span>{formatPrice(booking.depositAmount || 0)}</span>
                            </div>
                            <div className={styles.priceRow} style={{ color: '#6b7280' }}>
                                <span><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Số tiền còn lại (50%)</span>
                                <span>{formatPrice(booking.remainingAmount || 0)}</span>
                            </div>
                        </div>

                        {/* Payment Status — hidden for cancelled bookings (the
                            booking is dead so its payment state is moot, see
                            BUG-010). The shared helper also avoids leaking raw
                            BE values like "Pending" to the UI. */}
                        {(() => {
                            const badge = getPaymentBadge(booking.status, booking.paymentStatus);
                            if (!badge) return null;
                            const isPaid = badge.tone === 'success';
                            const Icon = isPaid ? CheckCircle2 : AlertCircle;
                            const cls = isPaid ? styles.paymentPaid : styles.paymentUnpaid;
                            return (
                                <div className={styles.paymentStatusBox}>
                                    <Icon size={18} className={cls} />
                                    <span className={cls}>{badge.label}</span>
                                </div>
                            );
                        })()}

                        {booking.paymentDueAt && (
                            <div className={styles.paymentDue}>
                                <Clock size={14} />
                                <span>Hạn thanh toán: {formatDate(booking.paymentDueAt)}</span>
                            </div>
                        )}
                    </div>

                    {/* Status Timeline */}
                    {!isCancelled && (
                        <div className={styles.card}>
                            <div className={styles.cardHead}>
                                <CheckCircle2 size={16} className={styles.cardHeadIcon} />
                                <h3 className={styles.cardHeadTitle}>Tiến trình</h3>
                            </div>
                            <div className={styles.timeline}>
                                {TIMELINE_STEPS.map((step, i) => {
                                    const isCompleted = i < timelineProgress;
                                    const isCurrent = i === timelineProgress - 1;
                                    return (
                                        <div key={step.key} className={styles.timelineStep}>
                                            <div className={styles.timelineIndicator}>
                                                {isCompleted ? (
                                                    <CheckCircle2
                                                        size={20}
                                                        className={`${styles.timelineIcon} ${styles.timelineCompleted}`}
                                                    />
                                                ) : (
                                                    <Circle size={20} className={styles.timelineIcon} />
                                                )}
                                                {i < TIMELINE_STEPS.length - 1 && (
                                                    <div
                                                        className={`${styles.timelineLine} ${isCompleted && !isCurrent ? styles.timelineLineCompleted : ''}`}
                                                    />
                                                )}
                                            </div>
                                            <span
                                                className={`${styles.timelineLabel} ${isCurrent ? styles.timelineLabelCurrent : ''} ${isCompleted && !isCurrent ? styles.timelineLabelCompleted : ''}`}
                                            >
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Cancelled notice */}
                    {isCancelled && (
                        <div className={styles.cancelledCard}>
                            <XCircle size={20} />
                            <div>
                                <h4>Booking đã bị hủy</h4>
                                <p>
                                    {booking.status === 'payment_timeout'
                                        ? 'Booking bị hủy tự động do quá hạn thanh toán 24h.'
                                        : 'Booking đã được hủy theo yêu cầu.'}
                                </p>
                                {booking.refundAmount != null && booking.refundAmount > 0 && (
                                    <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                                        <div style={{ fontWeight: 500, color: '#333' }}>Tiền hoàn lại: {formatPrice(booking.refundAmount)}</div>
                                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                            Trạng thái: {booking.refundStatus === 'refunded' ? 'Đã hoàn trả' : 'Đang xử lý (Chờ Admin duyệt)'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                        {canReview && (
                            <button
                                className={styles.payBtn}
                                style={{ background: '#4F46E5', color: 'white', marginBottom: '10px' }}
                                type="button"
                                onClick={() => setShowReviewModal(true)}
                            >
                                <MessageSquare size={16} />
                                <span>Đánh giá khóa học</span>
                            </button>
                        )}
                        {['pending_tutor', 'accepted', 'pending_payment', 'deposit_paid', 'pending_remaining_payment', 'ongoing', 'paid'].includes(booking.status) && (
                            <button
                                className={styles.cancelBtn}
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                            >
                                <XCircle size={16} />
                                <span>Hủy booking</span>
                            </button>
                        )}
                        {['accepted', 'pending_payment'].includes(booking.status) && (
                            <button
                                className={styles.payBtn}
                                type="button"
                                onClick={() => navigate(`${basePath}/booking/${booking.bookingId}/payment`)}
                            >
                                <CreditCard size={16} />
                                <span>Thanh toán cọc (50%)</span>
                            </button>
                        )}
                        {['deposit_paid', 'pending_remaining_payment'].includes(booking.status) && (
                            <button
                                className={styles.payBtn}
                                type="button"
                                onClick={() => navigate(`${basePath}/booking/${booking.bookingId}/payment`)}
                            >
                                <CreditCard size={16} />
                                <span>Thanh toán khoản còn lại</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Feedback Modal */}
            <CreateFeedbackModal
                open={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSuccess={() => {
                    setShowReviewModal(false);
                    setCanReview(false);
                }}
                feedbackType="early_termination"
                bookingId={booking.bookingId}
                tutorId={booking.tutor?.tutorId || ''}
                tutorName={booking.tutor?.fullName}
                subjectName={booking.subject?.subjectName}
            />

            {/* Cancel Booking Modal */}
            <Modal
                title="Hủy Booking"
                open={showCancelModal}
                onCancel={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                }}
                confirmLoading={cancelLoading}
                onOk={async () => {
                    if (!cancelReason.trim()) {
                        antMessage.warning('Vui lòng nhập lý do hủy booking');
                        return;
                    }
                    setCancelLoading(true);
                    try {
                        await cancelBooking(booking.bookingId, cancelReason.trim());
                        antMessage.success('Hủy booking thành công');
                        setShowCancelModal(false);
                        const res = await getBookingById(booking.bookingId);
                        setBooking(res.content);
                        if (['cancelled', 'completed', 'payment_timeout'].includes(res.content.status)) {
                            if (['Escrowed', 'paid'].includes(res.content.paymentStatus)) {
                                const feedbackRes = await canLeaveBookingFeedback(booking.bookingId);
                                setCanReview(feedbackRes.content);
                            }
                        }
                    } catch (err: any) {
                        antMessage.error(err.response?.data?.message || 'Không thể hủy booking');
                    } finally {
                        setCancelLoading(false);
                    }
                }}
                okText="Xác nhận hủy"
                cancelText="Đóng"
                okButtonProps={{ danger: true }}
            >
                <div style={{ marginBottom: 16 }}>
                    <p>Bạn có chắc chắn muốn hủy booking <strong>BK-{booking.bookingId}</strong> không?</p>
                    {['deposit_paid', 'ongoing', 'Escrowed', 'paid'].includes(booking.status) || ['DepositEscrowed', 'Escrowed', 'paid'].includes(booking.paymentStatus) ? (
                        <p style={{ color: '#d97706', fontSize: 13 }}>
                            Lưu ý: Bạn đã thanh toán cho khóa học này. Hệ thống sẽ tính toán số tiền hoàn lại (nếu có) dựa trên số buổi học gia sư đã dạy.
                        </p>
                    ) : null}
                </div>
                <Input.TextArea
                    rows={4}
                    placeholder="Vui lòng nhập lý do hủy booking..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                />
            </Modal>
        </div>
    );
};

export default BookingDetailPage;
