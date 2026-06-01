import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from '../../styles/pages/tutor-portal-dashboard.module.css';
import { getTutorDashboardStats, getTutorCalendar, checkInLesson, type TutorDashboardStats, type CalendarDay, type CalendarLesson } from '../../services/lesson.service';
import { getTutorFeedbacks, type FeedbackDto } from '../../services/feedback.service';
import { getCurrentUser } from '../../services/auth.service';
import { StatCard } from '../../components/shared';
import ReplyFeedbackModal from './components/ReplyFeedbackModal';

// Icons
const ClockIcon = () => (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10.5" cy="10.5" r="8.5" />
        <path d="M10.5 5.5V10.5L14 14" strokeLinecap="round" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M6 1V3M12 1V3M2 7H16M4 3H14C15.1046 3 16 3.89543 16 5V15C16 16.1046 15.1046 17 14 17H4C2.89543 17 2 16.1046 2 15V5C2 3.89543 2.89543 3 4 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
);

const SessionsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 5V9L12 11" strokeLinecap="round" />
    </svg>
);

const StarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M9 1L11.09 6.26L17 6.97L12.82 10.72L14.18 16.5L9 13.27L3.82 16.5L5.18 10.72L1 6.97L6.91 6.26L9 1Z" />
    </svg>
);

const DollarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 1V17M13 4H7C5.34315 4 4 5.34315 4 7C4 8.65685 5.34315 10 7 10H11C12.6569 10 14 11.3431 14 13C14 14.6569 12.6569 16 11 16H4" strokeLinecap="round" />
    </svg>
);

const CheckInIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M11.5 3.5L5.25 9.75L2.5 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 2V12M2 7H12" strokeLinecap="round" />
    </svg>
);

const BookIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 2H5C6.10457 2 7 2.89543 7 4V13C7 12.4477 6.55228 12 6 12H2V2Z" />
        <path d="M12 2H9C7.89543 2 7 2.89543 7 4V13C7 12.4477 7.44772 12 8 12H12V2Z" />
    </svg>
);


const WithdrawIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 10V2M7 2L4 5M7 2L10 5M2 12H12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const WalletIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 5C2 3.89543 2.89543 3 4 3H14C15.1046 3 16 3.89543 16 5V13C16 14.1046 15.1046 15 14 15H4C2.89543 15 2 14.1046 2 13V5Z" />
        <path d="M12 9.5C12 10.0523 11.5523 10.5 11 10.5C10.4477 10.5 10 10.0523 10 9.5C10 8.94772 10.4477 8.5 11 8.5C11.5523 8.5 12 8.94772 12 9.5Z" fill="currentColor" />
    </svg>
);

const FrozenIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 1V17M1 9H17M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" strokeLinecap="round" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 7H12M12 7L8 3M12 7L8 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 11L5 7L9 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3L9 7L5 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);



const TutorPortalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState<'today' | 'tomorrow' | 'week' | 'date'>('today');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // API data states
    const [stats, setStats] = useState<TutorDashboardStats | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackDto[]>([]);
    const [replyModal, setReplyModal] = useState<{ open: boolean; feedback: FeedbackDto | null }>({ open: false, feedback: null });


    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch dashboard stats
                const statsResponse = await getTutorDashboardStats();
                if (statsResponse.content) {
                    setStats(statsResponse.content);
                }

                // Fetch calendar for current month
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                const calendarResponse = await getTutorCalendar(
                    firstDay.toISOString(),
                    lastDay.toISOString()
                );
                if (calendarResponse.content) {
                    setCalendarData(calendarResponse.content);
                }

                // Fetch recent feedbacks
                const user = getCurrentUser();
                if (user?.userId) {
                    try {
                        const fbResponse = await getTutorFeedbacks(user.userId, 1, 3);
                        if (fbResponse.content?.items) {
                            setRecentFeedbacks(fbResponse.content.items);
                        } else if (Array.isArray(fbResponse.content)) {
                            setRecentFeedbacks(fbResponse.content as unknown as FeedbackDto[]);
                        }
                    } catch { /* feedback is optional */ }
                }
            } catch (err: any) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentMonth]);

    // Generate calendar days
    const generateCalendarDays = () => {
        const days = [];
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const today = new Date();

        // Get days with sessions from calendar data
        const daysWithSessions = new Set(
            calendarData
                .filter(day => day.lessons && day.lessons.length > 0)
                .map(day => new Date(day.date).getDate())
        );

        // Days from previous month
        const startDay = firstDay.getDay();
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonth.getDate() - i,
                isCurrentMonth: false,
                hasSession: false
            });
        }

        // Days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const isToday = today.getDate() === i &&
                today.getMonth() === currentMonth.getMonth() &&
                today.getFullYear() === currentMonth.getFullYear();

            days.push({
                day: i,
                isCurrentMonth: true,
                hasSession: daysWithSessions.has(i),
                isToday
            });
        }

        // Days from next month
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                hasSession: false
            });
        }

        return days;
    };

    const calendarDays = generateCalendarDays();
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'starting_soon': return styles.statusStartingSoon;
            case 'ongoing': return styles.statusOngoing;
            case 'completed': return styles.statusCompleted;
            default: return '';
        }
    };


    // Get lessons based on selected tab
    const getFilteredLessons = (): CalendarLesson[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return calendarData
            .filter(day => {
                const dayDate = new Date(day.date);
                dayDate.setHours(0, 0, 0, 0);

                if (selectedTab === 'today') {
                    return dayDate.getTime() === today.getTime();
                } else if (selectedTab === 'tomorrow') {
                    return dayDate.getTime() === tomorrow.getTime();
                } else if (selectedTab === 'date' && selectedDate) {
                    const sel = new Date(selectedDate);
                    sel.setHours(0, 0, 0, 0);
                    return dayDate.getTime() === sel.getTime();
                } else {
                    return dayDate >= today && dayDate <= weekEnd;
                }
            })
            .flatMap(day => day.lessons || [])
            .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    };

    // ── Check-in / Vào lớp helpers (shared với ClassDetail) ──
    const [checkingInLessonId, setCheckingInLessonId] = useState<number | null>(null);

    const canCheckIn = (lesson: CalendarLesson): boolean => {
        if (lesson.status !== 'scheduled') return false;
        const diffMinutes = Math.abs(Date.now() - new Date(lesson.scheduledStart).getTime()) / (1000 * 60);
        return diffMinutes <= 15;
    };

    const handleEnterLesson = async (lesson: CalendarLesson) => {
        // Re-join nếu lesson đang chạy & đã có link
        if (lesson.status === 'in_progress' && lesson.meetingLink) {
            window.open(lesson.meetingLink, '_blank', 'noopener,noreferrer');
            return;
        }

        try {
            setCheckingInLessonId(lesson.lessonId);
            const response = await checkInLesson(lesson.lessonId);
            const link = response.content?.meetingLink;
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
                toast.success('Check-in thành công! Đang mở lớp học…');
            } else {
                toast.success('Check-in thành công!');
            }
            // Refetch calendar — lesson đã đổi sang in_progress + có meetingLink
            try {
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                const calendarResponse = await getTutorCalendar(firstDay.toISOString(), lastDay.toISOString());
                if (calendarResponse.content) setCalendarData(calendarResponse.content);
            } catch { /* non-critical */ }
        } catch (error: unknown) {
            const e = error as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Không thể check-in. Vui lòng thử lại.');
        } finally {
            setCheckingInLessonId(null);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });
    };

    const getSectionTitle = () => {
        if (selectedTab === 'today') return 'Các buổi học hôm nay';
        if (selectedTab === 'tomorrow') return 'Các buổi học ngày mai';
        if (selectedTab === 'date' && selectedDate) {
            return `Lịch dạy ngày ${selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        }
        return 'Các buổi học trong tuần';
    };

    const handleCalendarDayClick = (day: number, isCurrentMonth: boolean) => {
        if (!isCurrentMonth) return;
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        setSelectedDate(clickedDate);
        setSelectedTab('date');
    };

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Bảng điều khiển</h1>
                <span className={styles.date}>
                    {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
            </div>

            {/* Profile Status Banner - only show if NOT active */}
            {stats && stats.profileStatus && stats.profileStatus !== 'active' && (
                <div className={styles.reviewBanner} style={{
                    borderColor: stats.profileStatus === 'rejected' ? 'rgba(220, 38, 38, 0.2)' : undefined,
                    backgroundColor: stats.profileStatus === 'rejected' ? 'rgba(220, 38, 38, 0.05)' : undefined,
                }}>
                    <div className={styles.bannerContent}>
                        <div className={styles.bannerIcon}>
                            <ClockIcon />
                        </div>
                        <div className={styles.bannerText}>
                            <div className={styles.bannerTitleRow}>
                                <span className={styles.bannerTitle}>
                                    {stats.profileStatus === 'draft' && stats.hasVerifiedCertificates && 'Admin đã duyệt chứng chỉ — vui lòng hoàn tất hồ sơ'}
                                    {stats.profileStatus === 'draft' && !stats.hasVerifiedCertificates && 'Hồ sơ của bạn chưa hoàn tất'}
                                    {stats.profileStatus === 'pending_approval' && 'Hồ sơ của bạn đang được xem xét'}
                                    {stats.profileStatus === 'rejected' && 'Hồ sơ của bạn đã bị từ chối'}
                                </span>
                                <span className={styles.pendingBadge} style={{
                                    backgroundColor: stats.profileStatus === 'rejected' ? 'rgba(220, 38, 38, 0.1)' : undefined,
                                    color: stats.profileStatus === 'rejected' ? '#dc2626' : undefined,
                                }}>
                                    {stats.profileStatus === 'draft' && stats.hasVerifiedCertificates && 'Cần hoàn tất'}
                                    {stats.profileStatus === 'draft' && !stats.hasVerifiedCertificates && 'Nháp'}
                                    {stats.profileStatus === 'pending_approval' && 'Đang chờ'}
                                    {stats.profileStatus === 'rejected' && 'Từ chối'}
                                </span>
                            </div>
                            <p className={styles.bannerDescription}>
                                {stats.profileStatus === 'draft' && stats.hasVerifiedCertificates && 'Chứng chỉ của bạn đã được admin phê duyệt. Vui lòng cập nhật đầy đủ thông tin còn thiếu để xuất hiện trên marketplace.'}
                                {stats.profileStatus === 'draft' && !stats.hasVerifiedCertificates && 'Vui lòng hoàn tất hồ sơ gia sư để được xuất hiện trên marketplace và nhận học sinh.'}
                                {stats.profileStatus === 'pending_approval' && 'Admin đang xác minh thông tin của bạn. Bạn sẽ xuất hiện trên marketplace sau khi được phê duyệt.'}
                                {stats.profileStatus === 'rejected' && 'Hồ sơ của bạn chưa đạt yêu cầu. Vui lòng cập nhật lại thông tin và gửi lại để được xem xét.'}
                            </p>

                            {/* Missing fields checklist for draft profiles */}
                            {stats.profileStatus === 'draft' && stats.missingFields && stats.missingFields.length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: '6px 16px',
                                    marginTop: '10px',
                                    padding: '10px 12px',
                                    background: 'rgba(26, 34, 56, 0.03)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}>
                                    {[
                                        { key: 'hourlyRate', label: 'Giá theo giờ' },
                                        { key: 'bio', label: 'Giới thiệu bản thân' },
                                        { key: 'video', label: 'Video giới thiệu' },
                                        { key: 'avatar', label: 'Ảnh đại diện' },
                                        { key: 'education', label: 'Học vấn' },
                                        { key: 'headline', label: 'Tiêu đề hồ sơ' },
                                        { key: 'subjects', label: 'Môn học' },
                                        { key: 'teachingArea', label: 'Khu vực dạy' },
                                        { key: 'teachingMode', label: 'Hình thức dạy' },
                                        { key: 'certificates', label: 'Chứng chỉ' },
                                        { key: 'identity', label: 'Xác minh danh tính' },
                                    ].map(item => {
                                        const isMissing = stats.missingFields!.includes(item.key);
                                        return (
                                            <div key={item.key} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: isMissing ? '#b45309' : '#16a34a',
                                                fontWeight: isMissing ? 500 : 400,
                                            }}>
                                                <span style={{ fontSize: '13px' }}>{isMissing ? '❌' : '✅'}</span>
                                                <span>{item.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className={styles.viewDetailsBtn} onClick={() => navigate('/tutor-portal/profile')}>
                        {stats.profileStatus === 'draft' ? 'Hoàn tất hồ sơ' : stats.profileStatus === 'rejected' ? 'Cập nhật hồ sơ' : 'Xem chi tiết'}
                        <ArrowRightIcon />
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : stats ? (
                <div className={styles.statsGrid} data-tour="stats-grid">
                    <StatCard
                        icon={<CalendarIcon />}
                        value={stats.upcomingLessons}
                        label="Buổi học sắp tới"
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<SessionsIcon />}
                        value={<>{stats.completedThisMonth} <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(62,47,40,0.5)' }}>/ {stats.totalCompleted} tổng</span></>}
                        label="Hoàn thành tháng này"
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<StarIcon />}
                        value={(stats.averageRating || 0).toFixed(1)}
                        label="Đánh giá trung bình"
                        subLabel={`${stats.totalReviews} đánh giá`}
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<WalletIcon />}
                        value={`${new Intl.NumberFormat('vi-VN').format(stats.walletBalance)}đ`}
                        label="Số dư ví"
                        badge={stats.pendingConfirmation > 0 ? `${stats.pendingConfirmation} chờ xác nhận` : undefined}
                        badgeVariant="orange"
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<FrozenIcon />}
                        value={`${new Intl.NumberFormat('vi-VN').format(stats.frozenBalance)}đ`}
                        label="Số dư đóng băng"
                        badge={stats.activeDisputes > 0 ? `${stats.activeDisputes} khiếu nại` : undefined}
                        badgeVariant="red"
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<DollarIcon />}
                        value={`${new Intl.NumberFormat('vi-VN').format(stats.earningsThisMonth)}đ`}
                        label="Doanh thu tháng"
                        subLabel={`/ ${new Intl.NumberFormat('vi-VN').format(stats.totalEarnings)}đ tổng`}
                        className={styles.statCard}
                    />
                </div>
            ) : null}

            {/* Quick Actions */}
            <div className={styles.quickActions} data-tour="quick-actions">
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/classes')}>
                    <CheckInIcon />
                    <span>Bắt đầu điểm danh</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/schedule')}>
                    <PlusIcon />
                    <span>Thêm lịch rảnh</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/classes')}>
                    <BookIcon />
                    <span>Tạo lớp học</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/finance/withdraw')}>
                    <WithdrawIcon />
                    <span>Rút tiền</span>
                </button>
            </div>

            {/* Next Upcoming Lessons from dashboard stats */}
            {stats && stats.nextLessons && stats.nextLessons.length > 0 && (
                <div className={styles.sectionCard} style={{ padding: '20px' }}>
                    <div className={styles.sectionHeader} style={{ marginBottom: '14px' }}>
                        <h2 className={styles.sectionTitle}>Buổi học sắp tới</h2>
                        <button className={styles.outlineBtn} onClick={() => navigate('/tutor-portal/classes')}>
                            Xem tất cả
                            <ArrowRightIcon />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {stats.nextLessons.slice(0, 5).map((lesson) => (
                            <div key={lesson.lessonId} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '14px 16px', borderRadius: '12px',
                                background: '#f9f8f3', border: '1px solid rgba(26,34,56,0.06)',
                            }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        minWidth: '50px', padding: '6px 10px', borderRadius: '8px',
                                        background: '#1a2238', color: '#fff',
                                    }}>
                                        <span style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
                                            {new Date(lesson.scheduledStart).getDate()}
                                        </span>
                                        <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8 }}>
                                            Th{new Date(lesson.scheduledStart).getMonth() + 1}
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2238', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                                            {lesson.subjectName || 'Chưa xác định'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'rgba(62,47,40,0.6)', marginTop: '2px' }}>
                                            {lesson.studentName || 'Chưa có học sinh'} • {formatTime(lesson.scheduledStart)} - {formatTime(lesson.scheduledEnd)}
                                        </div>
                                    </div>
                                </div>
                                <button className={styles.outlineBtn} onClick={() => navigate(`/tutor-portal/classes/${lesson.bookingId}`)}>
                                    Chi tiết
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid - 3 Column Layout */}
            <div className={styles.contentGrid}>
                {/* Left Column - Today's Lessons */}
                <div className={styles.leftColumn}>
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                {getSectionTitle()}
                            </h2>
                            <div className={styles.tabGroup}>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'today' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('today')}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'tomorrow' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('tomorrow')}
                                >
                                    Ngày mai
                                </button>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'week' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('week')}
                                >
                                    Tuần
                                </button>
                            </div>
                        </div>

                        <div className={styles.lessonsList}>
                            {getFilteredLessons().length > 0 ? (
                                getFilteredLessons().map((lesson) => (
                                    <div key={lesson.lessonId} className={styles.lessonItem}>
                                        <div className={styles.lessonInfo}>
                                            <div className={styles.lessonTime}>
                                                <div>{formatTime(lesson.scheduledStart)}</div>
                                                <div className={styles.lessonDate}>{formatDate(lesson.scheduledStart)}</div>
                                            </div>
                                            <div className={styles.lessonDetails}>
                                                <h4 className={styles.lessonSubject}>{lesson.subjectName || 'Chưa xác định'}</h4>
                                                <p className={styles.lessonStudent}>{lesson.studentName || 'Chưa có học sinh'}</p>
                                                <span className={`${styles.lessonStatus} ${getStatusClass(lesson.status || '')}`}>
                                                    {lesson.status || 'Đã lên lịch'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.lessonActions}>
                                            {/* Scheduled & trong cửa sổ 15ph → nút Vào lớp (gọi check-in) */}
                                            {canCheckIn(lesson) && (
                                                <button
                                                    className={styles.primaryBtn}
                                                    onClick={() => handleEnterLesson(lesson)}
                                                    disabled={checkingInLessonId === lesson.lessonId}
                                                >
                                                    {checkingInLessonId === lesson.lessonId ? 'Đang xử lý…' : '▶ Vào lớp'}
                                                </button>
                                            )}
                                            {/* In-progress & đã có link → nút Vào lại lớp (re-open) */}
                                            {lesson.status === 'in_progress' && lesson.meetingLink && (
                                                <button
                                                    className={styles.primaryBtn}
                                                    onClick={() => handleEnterLesson(lesson)}
                                                >
                                                    ▶ Vào lại lớp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                    <p>Không có buổi học nào trong khoảng thời gian này</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Queue - COMMENTED OUT (waiting for API) */}
                    {/* <div className={styles.sectionCard}>
                        <div className={styles.actionQueueSection}>
                            <h2 className={styles.sectionTitle}>Hàng đợi hành động</h2>
                            <div className={styles.actionQueueList}>
                                {actionQueueItems.map((item) => (
                                    <div key={item.id} className={styles.actionQueueItem}>
                                        <div className={styles.actionQueueInfo}>
                                            <div className={`${styles.actionIndicator} ${item.type === 'warning' ? styles.warning : styles.info}`} />
                                            <div className={styles.actionQueueText}>
                                                <h4 className={styles.actionQueueTitle}>{item.title}</h4>
                                                <p className={styles.actionQueueDesc}>{item.description}</p>
                                            </div>
                                        </div>
                                        <button className={styles.actionQueueBtn}>
                                            {item.action}
                                            <ArrowRightIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div> */}

                    {/* Requests - COMMENTED OUT (waiting for API) */}
                    {/* <div className={styles.sectionCard}>
                        <div className={styles.requestsSection}>
                            <h2 className={styles.sectionTitle}>Yêu cầu</h2>
                            <div className={styles.requestsCard}>
                                <div className={styles.requestsList}>
                                    {requestsData.map((request) => (
                                        <div key={request.id} className={styles.requestItem}>
                                            <div className={styles.requestInfo}>
                                                <span className={styles.requestTitle}>{request.title}</span>
                                                <span className={styles.requestCount}>{request.count} đang chờ</span>
                                            </div>
                                            <button className={styles.reviewBtn}>Xem xét</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>

                {/* Right Column - Calendar & Notes */}
                <div className={styles.rightColumn}>
                    {/* Calendar */}
                    <div className={`${styles.sectionCard} ${styles.calendarSection}`} data-tour="calendar-widget">
                        <div className={styles.calendarHeader}>
                            <h3 className={styles.calendarMonth}>
                                {currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className={styles.calendarNav}>
                                <button className={styles.calendarNavBtn} onClick={handlePrevMonth}>
                                    <ChevronLeftIcon />
                                </button>
                                <button className={styles.calendarNavBtn} onClick={handleNextMonth}>
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                        <div className={styles.calendarWeekDays}>
                            {weekDays.map((day, index) => (
                                <div key={index} className={styles.calendarWeekDay}>{day}</div>
                            ))}
                        </div>
                        <div className={styles.calendarGrid}>
                            {calendarDays.map((day, index) => (
                                <div
                                    key={index}
                                    className={`${styles.calendarDay}
                                        ${!day.isCurrentMonth ? styles.otherMonth : ''}
                                        ${day.isToday ? styles.today : ''}
                                        ${day.hasSession ? styles.hasSession : ''}
                                        ${selectedDate && day.isCurrentMonth && day.day === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear() ? styles.selected : ''}`}
                                    onClick={() => handleCalendarDayClick(day.day, day.isCurrentMonth ?? true)}
                                >
                                    {day.day}
                                    {day.hasSession && <div className={styles.sessionDot} />}
                                </div>
                            ))}
                        </div>
                        <div className={styles.calendarLegend}>
                            <div className={styles.legendItem}>
                                <div className={`${styles.legendDot} ${styles.classDay}`} />
                                <span className={styles.legendText}>Ngày có lớp</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={`${styles.legendDot} ${styles.todayDot}`} />
                                <span className={styles.legendText}>Hôm nay</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={`${styles.legendDot} ${styles.selectedDot}`} />
                                <span className={styles.legendText}>Đang chọn</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Feedbacks */}
                    <div className={styles.sectionCard}>
                        <div style={{ padding: '20px' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Đánh giá gần đây</h2>
                            {recentFeedbacks.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {recentFeedbacks.map((fb) => (
                                        <div key={fb.feedbackId} style={{
                                            padding: '12px 16px', borderRadius: '10px',
                                            background: '#f9fafb', border: '1px solid rgba(26,34,56,0.06)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '28px', height: '28px', borderRadius: '50%',
                                                        background: '#E8E5FF', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#4F46E5',
                                                    }}>
                                                        {fb.parentName?.charAt(0)?.toUpperCase() || 'P'}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a2238' }}>
                                                        {fb.parentName || 'Phụ huynh'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <svg key={s} width="12" height="12" viewBox="0 0 18 18" fill={s <= fb.rating ? '#faad14' : '#e8e8e8'}>
                                                            <path d="M9 1L11.09 6.26L17 6.97L12.82 10.72L14.18 16.5L9 13.27L3.82 16.5L5.18 10.72L1 6.97L6.91 6.26L9 1Z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                            </div>
                                            {fb.comment && (
                                                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
                                                    "{fb.comment}"
                                                </p>
                                            )}
                                            {fb.reply ? (
                                                <div style={{
                                                    padding: '8px 12px', background: '#f0f0ff', borderRadius: '8px',
                                                    fontSize: '12px', color: '#4F46E5', fontStyle: 'italic',
                                                }}>
                                                    Đã phản hồi: "{fb.reply}"
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReplyModal({ open: true, feedback: fb })}
                                                    style={{
                                                        padding: '4px 12px', borderRadius: '6px',
                                                        border: '1px solid #4F46E5', background: 'transparent',
                                                        color: '#4F46E5', fontSize: '12px', cursor: 'pointer',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    Phản hồi
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                                    <svg width="32" height="32" viewBox="0 0 18 18" fill="#e8e8e8" style={{ marginBottom: '8px' }}>
                                        <path d="M9 1L11.09 6.26L17 6.97L12.82 10.72L14.18 16.5L9 13.27L3.82 16.5L5.18 10.72L1 6.97L6.91 6.26L9 1Z" />
                                    </svg>
                                    <p style={{ margin: 0, fontSize: '13px' }}>Chưa có đánh giá nào</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reply Feedback Modal */}
                    <ReplyFeedbackModal
                        open={replyModal.open}
                        onClose={() => setReplyModal({ open: false, feedback: null })}
                        onSuccess={async () => {
                            setReplyModal({ open: false, feedback: null });
                            // Refresh feedbacks
                            const user = getCurrentUser();
                            if (user?.userId) {
                                try {
                                    const fbResponse = await getTutorFeedbacks(user.userId, 1, 3);
                                    if (fbResponse.content?.items) {
                                        setRecentFeedbacks(fbResponse.content.items);
                                    }
                                } catch { /* ignore */ }
                            }
                        }}
                        feedbackId={replyModal.feedback?.feedbackId || 0}
                        parentName={replyModal.feedback?.parentName}
                        rating={replyModal.feedback?.rating}
                        comment={replyModal.feedback?.comment}
                        createdAt={replyModal.feedback?.createdAt}
                    />


                </div>
            </div>
        </div>
    );
};

export default TutorPortalDashboard;
