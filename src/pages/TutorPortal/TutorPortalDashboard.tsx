import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactGridLayout from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import styles from '../../styles/pages/tutor-portal-dashboard.module.css';
import {
    getTutorDashboardStats,
    getTutorCalendar,
    type TutorDashboardStatsResponse,
    type CalendarDayResponse,
    type CalendarClassSessionResponse,
} from '../../services/classSession.service';
import { getTutorFeedbacks, type FeedbackDto } from '../../services/feedback.service';
import { getUserInfoFromToken } from '../../services/auth.service';
import { StatCard } from '../../components/shared';
import ReplyFeedbackModal from './components/ReplyFeedbackModal';
import { useTutorProfileForm } from './hooks/useTutorProfileForm';
import { getProfileCompletionItems } from './profileCompletion';
import { formatVNDNumber } from '../../utils/formatters';
import { isWithinJoinWindow } from '../../utils/liveSession';
import { useTabParam } from '../../hooks/useTabParam';

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

const ProfileCheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 8.2 6.4 11 12.5 4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ProfileMissingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 4.2V8.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="1" fill="currentColor" />
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



/**
 * Lấy 3 đánh giá gần nhất của gia sư.
 *
 * Nhánh mảng mới là nhánh chạy thật: `PagedList<T>` ở BE kế thừa `List<T>` nên serialize ra
 * mảng JSON thuần, `content.items` không bao giờ tồn tại. Trước đây chỗ refresh sau khi trả
 * lời chỉ xử lý `content.items` nên danh sách không bao giờ được cập nhật.
 */
const fetchRecentFeedbacks = async (tutorUserId: string): Promise<FeedbackDto[]> => {
    const response = await getTutorFeedbacks(tutorUserId, 1, 3);
    const content = response.content as unknown;

    if (Array.isArray(content)) return content as FeedbackDto[];
    const paged = content as { items?: FeedbackDto[] } | null;
    return paged?.items ?? [];
};

const DASHBOARD_TABS = ['today', 'tomorrow', 'week', 'date'] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

const defaultDashboardGridLayout = [
    { i: 'today', x: 0, y: 0, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'upcoming', x: 5, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'calendar', x: 9, y: 0, w: 3, h: 7, minW: 3, minH: 5 },
    { i: 'feedback', x: 9, y: 7, w: 3, h: 6, minW: 3, minH: 4 },
];
/**
 * Cửa sổ quét "buổi chờ gửi báo cáo". Query riêng chứ không tái dùng calendar của tháng đang
 * xem: gia sư lật sang tháng khác thì buổi còn nợ báo cáo sẽ biến mất khỏi danh sách nhắc.
 */
const PENDING_REPORT_LOOKBACK_DAYS = 14;

/**
 * Buổi `in_progress` mà ĐÃ có `checkOutTime` = phòng đã đóng vĩnh viễn, chỉ còn chờ báo cáo.
 * Status chỉ chuyển sang `pending_confirmation` sau khi báo cáo được gửi, nên đây là cách duy
 * nhất phân biệt "đang dạy" với "dạy xong chưa viết". Cùng quy tắc với `isAwaitingReport`
 * ở StudentLessons/lesson-components — badge trên lịch dạy đã dùng sẵn.
 */
const isAwaitingReport = (session: CalendarClassSessionResponse) =>
    (session.status ?? '').trim().toLowerCase() === 'in_progress' && Boolean(session.checkOutTime);

/** Số buổi liệt kê thẳng trong dải nhắc; dư ra thì đẩy sang link mở lịch dạy. */
const PENDING_REPORT_VISIBLE = 3;

// `?date=` dùng ngày theo giờ local (không phải ISO/UTC) để không lệch múi giờ khi share link.
const toDateParam = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDateParam = (value: string | null): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const TutorPortalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { formData: profileData, isInitialLoading: isProfileLoading } = useTutorProfileForm();

    // Tab + ngày đang chọn sống trên URL (`?tab=`, `?date=`) — reload/share link
    // giữ nguyên khung đang xem thay vì nhảy về "Hôm nay".
    const [searchParams] = useSearchParams();
    const [tabParam, setSelectedTab] = useTabParam<DashboardTab>(DASHBOARD_TABS, 'today');
    const selectedDate = parseDateParam(searchParams.get('date'));
    // `?tab=date` mà thiếu/hỏng `?date=` thì không có gì để lọc — rơi về "Hôm nay".
    const selectedTab: DashboardTab = tabParam === 'date' && !selectedDate ? 'today' : tabParam;

    const [currentMonth, setCurrentMonth] = useState(() => selectedDate ?? new Date());

    // API data states
    const [stats, setStats] = useState<TutorDashboardStatsResponse | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarDayResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentFeedbacks, setRecentFeedbacks] = useState<FeedbackDto[]>([]);
    // Buổi đã dạy xong nhưng chưa gửi báo cáo — lưới an toàn cho gia sư tắt trang giữa chừng
    // hoặc bấm "Để sau" ở modal cuối buổi.
    const [pendingReports, setPendingReports] = useState<CalendarClassSessionResponse[]>([]);
    const [replyModal, setReplyModal] = useState<{ open: boolean; feedback: FeedbackDto | null }>({ open: false, feedback: null });
    const [isLayoutEditing, setIsLayoutEditing] = useState(false);
    const dashboardGridContainerRef = useRef<HTMLDivElement | null>(null);
    const [dashboardGridWidth, setDashboardGridWidth] = useState(1200);
    const [dashboardGridLayout, setDashboardGridLayout] = useState<any[]>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('tutora:tutor-dashboard:grid-layout') ?? '[]');
            return Array.isArray(saved) && saved.length === 4 ? saved : defaultDashboardGridLayout;
        } catch {
            return defaultDashboardGridLayout;
        }
    });

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
                // getCurrentUser() chỉ trả object thô trong localStorage và KHÔNG có userId;
                // userId nằm trong claim của JWT nên phải qua getUserInfoFromToken(), giống
                // các layout/ProtectedRoute đang làm.
                const tutorUserId = getUserInfoFromToken()?.userId;
                if (!tutorUserId) {
                    console.warn('Không lấy được userId từ token — bỏ qua phần đánh giá gần đây.');
                } else {
                    try {
                        setRecentFeedbacks(await fetchRecentFeedbacks(tutorUserId));
                    } catch (err) {
                        // Trước đây lỗi bị nuốt hoàn toàn nên danh sách trống trông y hệt
                        // "chưa có đánh giá nào"; log ra để còn phân biệt được.
                        console.error('Error fetching recent feedbacks:', err);
                    }
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentMonth]);

    useEffect(() => {
        localStorage.setItem('tutora:tutor-dashboard:grid-layout', JSON.stringify(dashboardGridLayout));
    }, [dashboardGridLayout]);

    useEffect(() => {
        const container = dashboardGridContainerRef.current;
        if (!container) return;

        const updateWidth = () => setDashboardGridWidth(Math.max(1, container.clientWidth));
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Tách khỏi fetchDashboardData vì cửa sổ 14 ngày không phụ thuộc tháng đang xem trên lịch —
    // gộp chung sẽ gọi lại thừa mỗi lần gia sư lật tháng.
    useEffect(() => {
        const fetchPendingReports = async () => {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - PENDING_REPORT_LOOKBACK_DAYS);

            try {
                const response = await getTutorCalendar(from.toISOString(), to.toISOString());
                const pending = (response.content ?? [])
                    .flatMap((day) => day.classSessions || [])
                    .filter(isAwaitingReport)
                    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
                setPendingReports(pending);
            } catch (err) {
                // Đây là nhắc nhở phụ — hỏng thì log rồi thôi, không chắn phần còn lại của dashboard.
                console.error('Error fetching sessions awaiting report:', err);
            }
        };

        fetchPendingReports();
    }, []);

    // Generate calendar days
    const generateCalendarDays = () => {
        const days = [];
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const today = new Date();

        // Get days with sessions from calendar data
        const daysWithSessions = new Set(
            calendarData
                .filter(day => day.classSessions && day.classSessions.length > 0)
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
    const getFilteredLessons = (): CalendarClassSessionResponse[] => {
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
            .flatMap(day => day.classSessions || [])
            .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    };

    // ── "Vào lớp" — phòng mở 24/7; check-in tự động khi cả gia sư và học viên cùng vào ──
    const handleEnterLesson = (lesson: CalendarClassSessionResponse) => {
        navigate(`/session-lobby/${lesson.classSessionId}`);
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

    // API dashboard là nguồn chính. Lọc lại tại UI để không tạo một panel rỗng
    // khi payload có phần tử null/thiếu mã buổi học.
    const nextUpcomingLessons = (Array.isArray(stats?.nextClassSessions) ? stats.nextClassSessions : [])
        .filter((lesson) => Number.isFinite(lesson.classSessionId) && Boolean(lesson.scheduledStart))
        .slice(0, 5);


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
        setSelectedTab('date', { date: toDateParam(clickedDate) });
    };

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const profileRequirements = useMemo(() => getProfileCompletionItems(profileData), [profileData]);
    const missingProfileCount = profileRequirements.filter(item => !item.completed).length;
    const completedProfileCount = profileRequirements.length - missingProfileCount;
    const profileCompletionPercent = Math.round((completedProfileCount / profileRequirements.length) * 100);
    const firstMissingProfileField = profileRequirements.find(item => !item.completed);

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Bảng điều khiển</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className={styles.date}>
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Profile Status Banner - only show if NOT active */}
            {stats && stats.profileStatus && stats.profileStatus !== 'active' && (
                <section
                    className={`${styles.reviewBanner} ${stats.profileStatus === 'rejected' ? styles.reviewBannerRejected : ''}`}
                    aria-labelledby="profile-status-title"
                >
                    <div className={styles.bannerMain}>
                        <div className={styles.bannerContent}>
                            <div className={styles.bannerIcon}>
                                <ClockIcon />
                            </div>
                            <div className={styles.bannerText}>
                                <div className={styles.bannerTitleRow}>
                                    <h2 id="profile-status-title" className={styles.bannerTitle}>
                                        {stats.profileStatus === 'draft' && stats.hasVerifiedCertificates && 'Chứng chỉ đã được duyệt, hãy hoàn tất hồ sơ'}
                                        {stats.profileStatus === 'draft' && !stats.hasVerifiedCertificates && 'Hoàn thiện hồ sơ gia sư của bạn'}
                                        {stats.profileStatus === 'pending_approval' && 'Hồ sơ của bạn đang được xem xét'}
                                        {stats.profileStatus === 'rejected' && 'Hồ sơ của bạn cần được cập nhật'}
                                    </h2>
                                    <span className={`${styles.pendingBadge} ${stats.profileStatus === 'rejected' ? styles.pendingBadgeRejected : ''}`}>
                                        {stats.profileStatus === 'draft' && stats.hasVerifiedCertificates && 'Cần hoàn tất'}
                                        {stats.profileStatus === 'draft' && !stats.hasVerifiedCertificates && 'Bản nháp'}
                                        {stats.profileStatus === 'pending_approval' && 'Đang chờ duyệt'}
                                        {stats.profileStatus === 'rejected' && 'Cần chỉnh sửa'}
                                    </span>
                                </div>
                                <p className={styles.bannerDescription}>
                                    {stats.profileStatus === 'draft' && 'Bổ sung các mục còn thiếu để hồ sơ được hiển thị trên marketplace và sẵn sàng nhận học sinh.'}
                                    {stats.profileStatus === 'pending_approval' && 'Admin đang xác minh thông tin. Hồ sơ sẽ xuất hiện trên marketplace sau khi được phê duyệt.'}
                                    {stats.profileStatus === 'rejected' && 'Một số thông tin chưa đạt yêu cầu. Hãy cập nhật hồ sơ trước khi gửi lại để được xem xét.'}
                                </p>
                            </div>
                        </div>

                        {stats.profileStatus === 'draft' && !isProfileLoading && missingProfileCount > 0 && (
                            <div className={styles.profileProgressSection}>
                                <div className={styles.profileProgressHeader}>
                                    <span>Tiến độ hoàn thiện</span>
                                    <strong>{completedProfileCount}/{profileRequirements.length} mục</strong>
                                </div>
                                <div
                                    className={styles.profileProgressTrack}
                                    role="progressbar"
                                    aria-label="Tiến độ hoàn thiện hồ sơ"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={profileCompletionPercent}
                                >
                                    <span style={{ width: `${profileCompletionPercent}%` }} />
                                </div>
                                <div className={styles.profileRequirements}>
                                    {profileRequirements.map(item => {
                                        const isMissing = !item.completed;
                                        return (
                                            <div
                                                key={item.key}
                                                className={`${styles.profileRequirement} ${isMissing ? styles.profileRequirementMissing : styles.profileRequirementDone}`}
                                            >
                                                <span className={styles.requirementIcon}>
                                                    {isMissing ? <ProfileMissingIcon /> : <ProfileCheckIcon />}
                                                </span>
                                                <span>{item.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className={styles.bannerAside}>
                        <span className={styles.nextStepEyebrow}>
                            {stats.profileStatus === 'draft' ? 'Bước tiếp theo' : 'Trạng thái hồ sơ'}
                        </span>
                        <strong className={styles.nextStepTitle}>
                            {stats.profileStatus === 'draft' && firstMissingProfileField &&
                                `Bổ sung ${firstMissingProfileField.label.toLowerCase()}`}
                            {stats.profileStatus === 'draft' && !firstMissingProfileField && 'Kiểm tra và gửi hồ sơ'}
                            {stats.profileStatus === 'pending_approval' && 'Chờ kết quả xét duyệt'}
                            {stats.profileStatus === 'rejected' && 'Kiểm tra nội dung cần sửa'}
                        </strong>
                        {stats.profileStatus === 'draft' && missingProfileCount > 0 && (
                            <span className={styles.nextStepMeta}>Còn {missingProfileCount} mục cần hoàn thành</span>
                        )}
                        <button className={styles.viewDetailsBtn} onClick={() => navigate('/tutor-portal/profile')}>
                            {stats.profileStatus === 'draft' ? 'Hoàn tất hồ sơ' : stats.profileStatus === 'rejected' ? 'Cập nhật hồ sơ' : 'Xem chi tiết'}
                            <ArrowRightIcon />
                        </button>
                    </aside>
                </section>
            )}

            {/* Buổi đã dạy xong nhưng chưa gửi báo cáo. Modal cuối buổi trong phòng live chỉ bắt
                được gia sư còn đang mở trang — dải này là lưới đỡ cho ca tắt tab hoặc bấm "Để sau". */}
            {pendingReports.length > 0 && (
                <section className={styles.reportBanner} aria-labelledby="pending-report-title">
                    <div className={styles.reportBannerHead}>
                        <div className={styles.bannerIcon}>
                            <ClockIcon />
                        </div>
                        <div className={styles.bannerText}>
                            <div className={styles.bannerTitleRow}>
                                <h2 id="pending-report-title" className={styles.bannerTitle}>
                                    {pendingReports.length} buổi học chờ gửi báo cáo
                                </h2>
                                <span className={styles.reportBadge}>Cần xử lý</span>
                            </div>
                            <p className={styles.bannerDescription}>
                                Các buổi này đã kết thúc nhưng chưa có báo cáo. Buổi học chỉ được ghi nhận hoàn tất
                                sau khi bạn gửi báo cáo.
                            </p>
                        </div>
                    </div>

                    <ul className={styles.reportList}>
                        {pendingReports.slice(0, PENDING_REPORT_VISIBLE).map((session) => (
                            <li key={session.classSessionId} className={styles.reportListItem}>
                                <div className={styles.reportListInfo}>
                                    <span className={styles.reportListSubject}>
                                        {session.subjectName || 'Buổi học'}
                                    </span>
                                    <span className={styles.reportListMeta}>
                                        {session.studentName || 'Chưa có học sinh'} · {formatDate(session.scheduledStart)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.outlineBtn}
                                    onClick={() => navigate(`/tutor-portal/class-sessions/${session.classSessionId}`)}
                                >
                                    Viết báo cáo
                                </button>
                            </li>
                        ))}
                    </ul>

                    {pendingReports.length > PENDING_REPORT_VISIBLE && (
                        <button
                            type="button"
                            className={styles.reportMoreBtn}
                            onClick={() => navigate('/tutor-portal/calendar')}
                        >
                            Xem {pendingReports.length - PENDING_REPORT_VISIBLE} buổi còn lại trên lịch dạy
                            <ArrowRightIcon />
                        </button>
                    )}
                </section>
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
                        value={stats.upcomingClassSessions}
                        label="Buổi học sắp tới"
                        infoTooltip="Số buổi học đã lên lịch, chưa diễn ra."
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<SessionsIcon />}
                        value={<>{stats.completedThisMonth} <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(62,47,40,0.5)' }}>/ {stats.totalCompleted} tổng</span></>}
                        label="Hoàn thành tháng này"
                        infoTooltip="Số buổi học bạn đã hoàn thành trong tháng này, trên tổng số buổi đã hoàn thành."
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<StarIcon />}
                        value={(stats.averageRating || 0).toFixed(1)}
                        label="Đánh giá trung bình"
                        subLabel={`${stats.totalReviews} đánh giá`}
                        infoTooltip="Điểm đánh giá trung bình từ học viên và phụ huynh."
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<WalletIcon />}
                        value={`${formatVNDNumber(stats.walletBalance)}đ`}
                        label="Số dư ví"
                        badge={stats.pendingConfirmation > 0 ? `${stats.pendingConfirmation} chờ xác nhận` : undefined}
                        badgeVariant="orange"
                        infoTooltip="Số tiền đã được giải ngân, có thể rút về bất cứ lúc nào."
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<FrozenIcon />}
                        value={`${formatVNDNumber(stats.frozenBalance)}đ`}
                        label="Số dư đóng băng"
                        badge={stats.activeDisputes > 0 ? `${stats.activeDisputes} khiếu nại` : undefined}
                        badgeVariant="red"
                        infoTooltip="Số tiền đang tạm giữ cho các buổi học chưa được xác nhận hoàn thành, sẽ chuyển vào ví sau khi giải ngân."
                        className={styles.statCard}
                    />
                    <StatCard
                        icon={<DollarIcon />}
                        value={`${formatVNDNumber(stats.earningsThisMonth)}đ`}
                        label="Doanh thu tháng"
                        subLabel={`/ ${formatVNDNumber(stats.totalEarnings)}đ tổng`}
                        infoTooltip="Tổng thu nhập từ các buổi học trong tháng này."
                        className={styles.statCard}
                    />
                </div>
            ) : null}

            {/* Quick Actions */}
            <div className={styles.quickActions} data-tour="quick-actions">
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/calendar')}>
                    <CheckInIcon />
                    <span>Bắt đầu điểm danh</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/onboarding')}>
                    <PlusIcon />
                    <span>Thêm lịch rảnh</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/tutor-portal/finance/withdraw')}>
                    <WithdrawIcon />
                    <span>Rút tiền</span>
                </button>
                <button className={styles.layoutEditButton} onClick={() => setIsLayoutEditing((value) => !value)}>
                    {isLayoutEditing ? '✓ Xong chỉnh sửa' : '⠿ Tùy chỉnh bố cục'}
                </button>
                {isLayoutEditing && (
                    <button className={styles.layoutResetButton} onClick={() => setDashboardGridLayout(defaultDashboardGridLayout)}>
                        Đặt lại
                    </button>
                )}
            </div>

            {/* Main Content Grid - 3 Column Layout */}
            <div ref={dashboardGridContainerRef} className={styles.dashboardGridContainer}>
            <ReactGridLayout
                width={dashboardGridWidth}
                layout={dashboardGridLayout}
                cols={12}
                rowHeight={52}
                margin={[16, 16]}
                containerPadding={[16, 16]}
                isDraggable={isLayoutEditing}
                isResizable={isLayoutEditing}
                onLayoutChange={(layout) => setDashboardGridLayout([...layout])}
                className={`${styles.dashboardGrid} ${isLayoutEditing ? styles.dashboardGridEditing : ''}`}
                style={isLayoutEditing ? {
                    '--dashboard-grid-column': `${(dashboardGridWidth - 32 - (16 * 11)) / 12 + 16}px`,
                } as React.CSSProperties : undefined}
                draggableCancel="button, a, input"
            >
                {/* Left Column - Today's Lessons */}
                <div key="today" className={styles.dashboardGridWidget}>
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                {getSectionTitle()}
                            </h2>
                            <div className={styles.tabGroup}>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'today' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('today', { date: null })}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'tomorrow' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('tomorrow', { date: null })}
                                >
                                    Ngày mai
                                </button>
                                <button
                                    className={`${styles.tabBtn} ${selectedTab === 'week' ? styles.active : ''}`}
                                    onClick={() => setSelectedTab('week', { date: null })}
                                >
                                    Tuần
                                </button>
                            </div>
                        </div>

                        <div className={styles.lessonsList}>
                            {getFilteredLessons().length > 0 ? (
                                getFilteredLessons().map((lesson) => (
                                    <div key={lesson.classSessionId} className={styles.lessonItem}>
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
                                            {/* Scheduled & online: chỉ hiện nút khi đã gần giờ học (trong 15 phút) — còn xa thì ẩn
                                                hẳn, tránh rối mắt trên danh sách buổi học sắp tới. */}
                                            {lesson.status === 'scheduled' && lesson.meetingLink && isWithinJoinWindow(lesson.scheduledStart) && (
                                                <button
                                                    className={styles.primaryBtn}
                                                    onClick={() => handleEnterLesson(lesson)}
                                                >
                                                    ▶ Vào nhanh
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

                {/* Middle Column — danh sách dọc, cao đúng theo số buổi thay vì chiếm một hàng ngang riêng. */}
                <div key="upcoming" className={styles.dashboardGridWidget}>
                        <section style={upcomingLessonsPanel} aria-label="Buổi học sắp tới">
                            <div style={upcomingLessonsPanelHeader}>
                                <div>
                                    <span style={upcomingLessonsEyebrow}>LỊCH GIẢNG</span>
                                    <h2 style={upcomingLessonsTitle}>Buổi học sắp tới</h2>
                                </div>
                                <button className={styles.outlineBtn} onClick={() => navigate('/tutor-portal/calendar')}>
                                    Xem tất cả
                                    <ArrowRightIcon />
                                </button>
                            </div>
                            <div style={upcomingLessonsList}>
                                {nextUpcomingLessons.length > 0 ? nextUpcomingLessons.map((lesson) => (
                                    <div key={lesson.classSessionId} style={upcomingLessonItem}>
                                        <div style={upcomingLessonDate}>
                                            <span style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.1 }}>{new Date(lesson.scheduledStart).getDate()}</span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.72 }}>Th {new Date(lesson.scheduledStart).getMonth() + 1}</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={upcomingLessonSubject}>{lesson.subjectName || 'Chưa xác định'}</div>
                                            <div style={upcomingLessonMeta}>{lesson.studentName || 'Chưa có học sinh'} · {formatTime(lesson.scheduledStart)} – {formatTime(lesson.scheduledEnd)}</div>
                                        </div>
                                        <button className={styles.outlineBtn} onClick={() => navigate(`/tutor-portal/class-sessions/${lesson.classSessionId}`)}>Chi tiết</button>
                                    </div>
                                )) : (
                                    <p style={{ margin: 0, color: '#667085', fontSize: '14px', textAlign: 'center', padding: '18px 0' }}>
                                        Chưa có buổi học sắp tới
                                    </p>
                                )}
                            </div>
                        </section>
                </div>

                {/* Calendar widget */}
                <div key="calendar" className={styles.dashboardGridWidget}>
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
                </div>

                {/* Feedback widget */}
                <div key="feedback" className={styles.dashboardGridWidget}>
                    <div className={styles.sectionCard}>
                        <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
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
                                                        {fb.parentName
                                                            || (fb.reviewerRole === 'student' ? 'Học viên' : 'Phụ huynh')}
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
                </div>
            </ReactGridLayout>
            </div>
            <ReplyFeedbackModal
                open={replyModal.open}
                onClose={() => setReplyModal({ open: false, feedback: null })}
                onSuccess={async () => {
                    setReplyModal({ open: false, feedback: null });
                    const tutorUserId = getUserInfoFromToken()?.userId;
                    if (tutorUserId) {
                        try {
                            setRecentFeedbacks(await fetchRecentFeedbacks(tutorUserId));
                        } catch (err) {
                            console.error('Error refreshing feedbacks after reply:', err);
                        }
                    }
                }}
                feedbackId={replyModal.feedback?.feedbackId || 0}
                parentName={replyModal.feedback?.parentName}
                reviewerRole={replyModal.feedback?.reviewerRole}
                rating={replyModal.feedback?.rating}
                comment={replyModal.feedback?.comment}
                createdAt={replyModal.feedback?.createdAt}
            />
        </div>
    );
};

const upcomingLessonsPanel: React.CSSProperties = {
    background: '#fff',
    border: '1px solid rgba(62,47,40,0.12)',
    borderRadius: 16,
    boxShadow: '0 4px 14px rgba(45,55,47,0.06)',
    padding: 16,
    marginBottom: 0,
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
};

const upcomingLessonsPanelHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
};

const upcomingLessonsEyebrow: React.CSSProperties = {
    display: 'block',
    color: '#64705B',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.1em',
    marginBottom: 3,
};

const upcomingLessonsTitle: React.CSSProperties = {
    color: '#1A2238',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: 19,
    lineHeight: 1.25,
    margin: 0,
};

const upcomingLessonsList: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    minHeight: 0,
};

const upcomingLessonItem: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '11px 12px',
    background: '#FAF9F7',
    border: '1px solid #ECE7DF',
    borderRadius: 12,
};

const upcomingLessonDate: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 44,
    color: '#fff',
    background: '#2D372F',
    borderRadius: 10,
};

const upcomingLessonSubject: React.CSSProperties = {
    color: '#1A2238',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

const upcomingLessonMeta: React.CSSProperties = {
    color: '#697287',
    fontSize: 12.5,
    marginTop: 3,
};

export default TutorPortalDashboard;
