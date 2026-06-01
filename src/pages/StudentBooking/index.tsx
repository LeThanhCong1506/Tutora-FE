/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { Spin } from 'antd';
import { getStudentBookings } from '../../services/student-lesson.service';
import { getPaymentBadge, type PaymentBadgeTone } from '../../utils/paymentBadge';
import s from '../StudentPages.module.css';

// Map shared badge tone → local color values. Keeps the visual decisions
// owned by this page while the labels / when-to-hide rules stay shared.
const TONE_STYLES: Record<PaymentBadgeTone, { bg: string; fg: string }> = {
    success: { bg: '#D1FAE5', fg: '#065F46' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
    neutral: { bg: '#E5E7EB', fg: '#374151' },
};

const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'pending_tutor', label: 'Chờ gia sư' },
    { key: 'accepted', label: 'Chờ đặt cọc' },
    { key: 'active', label: 'Đang học' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending_tutor: { label: 'Chờ gia sư', cls: s.pending },
    accepted: { label: 'Chờ đặt cọc', cls: s.pending },
    pending_deposit: { label: 'Chờ đặt cọc', cls: s.pending },
    pending_remaining_payment: { label: 'Chờ TT còn lại', cls: s.pending },
    active: { label: 'Đang học', cls: s.active },
    completed: { label: 'Hoàn thành', cls: s.completed },
    cancelled: { label: 'Đã hủy', cls: s.cancelled },
    payment_timeout: { label: 'Hết hạn', cls: s.cancelled },
};

const formatPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ';

const StudentBooking = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchBookings();
    }, [page, activeTab]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const params: any = { page, pageSize };
            if (activeTab) params.status = activeTab;
            const res = await getStudentBookings(params);
            const data = res.content;
            setBookings(data?.items || []);
            setTotal(data?.totalCount || 0);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className={s.page}>
            {/* Top Bar */}
            <div className={s.topBar}>
                <div className={s.topBarLeft}>
                    <h1 className={s.pageTitle}>Booking</h1>
                    <p className={s.pageSubtitle}>Quản lý lịch đặt gia sư của bạn</p>
                </div>
            </div>

            {/* Main Content */}
            <div className={s.mainContent}>
                <div className={s.contentPanel}>
                    {/* Tabs */}
                    <div className={s.tabBar}>
                        <div className={s.tabGroup}>
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    className={`${s.tab} ${activeTab === t.key ? s.active : ''}`}
                                    onClick={() => { setActiveTab(t.key); setPage(1); }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className={s.loadingCenter}><Spin size="large" /></div>
                    ) : bookings.length === 0 ? (
                        <div className={s.emptyState}>
                            <div className={s.emptyStateIcon}>📚</div>
                            <div className={s.emptyStateText}>Chưa có booking nào</div>
                            <div className={s.emptyStateSub}>Hãy đặt gia sư mới để bắt đầu học</div>
                        </div>
                    ) : (
                        <>
                            <div className={s.cardList}>
                                {bookings.map((b: any) => {
                                    const st = STATUS_MAP[b.status] || { label: b.status, cls: '' };
                                    return (
                                        <div
                                            key={b.bookingId || b.id}
                                            className={s.card}
                                            onClick={() => navigate(`/student-portal/booking/${b.bookingId || b.id}`)}
                                        >
                                            <div
                                                className={s.cardIcon}
                                                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}
                                            >
                                                <BookOpen size={20} />
                                            </div>
                                            <div className={s.cardBody}>
                                                <div className={s.cardTitle}>
                                                    {b.subjectName || b.subject?.subjectName || `Booking #${b.bookingId || b.id}`}
                                                </div>
                                                <div className={s.cardMeta}>
                                                    <User size={12} /> {b.tutorName || b.tutor?.fullName || 'N/A'}
                                                    <span>•</span>
                                                    <Clock size={12} /> {b.createdAt ? dayjs(b.createdAt).format('DD/MM/YYYY') : 'N/A'}
                                                </div>
                                            </div>
                                            <div className={s.cardRight}>
                                                <span className={`${s.badge} ${st.cls}`}>{st.label}</span>
                                                {(() => {
                                                    // Shared resolver: hides badge for cancelled/rejected/timed-out
                                                    // bookings, returns Vietnamese labels for known statuses, and
                                                    // returns null for unknown values (so we never leak raw English
                                                    // like "Pending" into the UI — see BUG-010).
                                                    const badge = getPaymentBadge(b.status, b.paymentStatus);
                                                    if (badge) {
                                                        const tone = TONE_STYLES[badge.tone];
                                                        return (
                                                            <>
                                                                <span
                                                                    className={s.paymentBadge}
                                                                    style={{ background: tone.bg, color: tone.fg }}
                                                                >
                                                                    {badge.label}
                                                                </span>
                                                                {b.finalPrice != null && (
                                                                    <span className={s.price}>{formatPrice(b.finalPrice)}</span>
                                                                )}
                                                            </>
                                                        );
                                                    }
                                                    // No payment badge → fall back to plain price.
                                                    if (b.totalPrice != null) {
                                                        return <span className={s.price}>{formatPrice(b.totalPrice)}</span>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className={s.pagination}>
                                    <button
                                        className={s.paginationBtn}
                                        disabled={page <= 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className={s.paginationInfo}>{page}/{totalPages}</span>
                                    <button
                                        className={s.paginationBtn}
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentBooking;
