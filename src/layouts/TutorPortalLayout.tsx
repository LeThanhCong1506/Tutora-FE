import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PortalLayout } from '../components/shared/PortalLayout';
import type { NavItem } from '../components/shared/PortalLayout';
import styles from '../components/shared/PortalLayout/PortalLayout.module.css';
import { getTourStatus, completeTour } from '../services/auth.service';
import TutorTour, { type TourStep } from '../components/TutorTour/TutorTour';
import { useUnreadMessageBadge } from '../hooks/useUnreadMessageBadge';

const MESSAGES_PATH = '/tutor-portal/messages';

// ─── Tutor-specific SVG Icons ───

const DashboardIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M2 4C2 2.89543 2.89543 2 4 2H7C7.55228 2 8 2.44772 8 3V7C8 7.55228 7.55228 8 7 8H4C2.89543 8 2 7.10457 2 6V4Z" />
        <path d="M2 12C2 10.8954 2.89543 10 4 10H7C7.55228 10 8 10.4477 8 11V15C8 15.5523 7.55228 16 7 16H4C2.89543 16 2 15.1046 2 14V12Z" />
        <path d="M10 3C10 2.44772 10.4477 2 11 2H14C15.1046 2 16 2.89543 16 4V6C16 7.10457 15.1046 8 14 8H11C10.4477 8 10 7.55228 10 7V3Z" />
        <path d="M10 11C10 10.4477 10.4477 10 11 10H14C15.1046 10 16 10.8954 16 12V14C16 15.1046 15.1046 16 14 16H11C10.4477 16 10 15.5523 10 15V11Z" />
    </svg>
);

const ProfileIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M9 8C10.6569 8 12 6.65685 12 5C12 3.34315 10.6569 2 9 2C7.34315 2 6 3.34315 6 5C6 6.65685 7.34315 8 9 8Z" />
        <path d="M2 16C2 12.6863 5.13401 10 9 10C12.866 10 16 12.6863 16 16H2Z" />
    </svg>
);

const ScheduleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M5 1C4.44772 1 4 1.44772 4 2V3H3C1.89543 3 1 3.89543 1 5V15C1 16.1046 1.89543 17 3 17H15C16.1046 17 17 16.1046 17 15V5C17 3.89543 16.1046 3 15 3H14V2C14 1.44772 13.5523 1 13 1C12.4477 1 12 1.44772 12 2V3H6V2C6 1.44772 5.55228 1 5 1ZM3 7H15V15H3V7Z" />
    </svg>
);

const ClassIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M9 2L1 6L9 10L17 6L9 2Z" />
        <path d="M1 12L9 16L17 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
);

const FinanceIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="16" height="12" rx="2" strokeLinecap="round" />
        <path d="M1 8H17" strokeLinecap="round" />
        <path d="M12 12H14" strokeLinecap="round" />
        <path d="M4 4V3C4 2.44772 4.44772 2 5 2H13C13.5523 2 14 2.44772 14 3V4" strokeLinecap="round" />
    </svg>
);

const MessagesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 4L9 9L17 4M1 14V4C1 2.89543 1.89543 2 3 2H15C16.1046 2 17 2.89543 17 4V14C17 15.1046 16.1046 16 15 16H3C1.89543 16 1 15.1046 1 14Z" strokeLinecap="round" />
    </svg>
);

const BookingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M11 3V1M7 3V1M3 13V5C3 3.89543 3.89543 3 5 3H13C14.1046 3 15 3.89543 15 5V13C15 14.1046 14.1046 15 13 15H5C3.89543 15 3 14.1046 3 13Z" strokeLinecap="round" />
        <path d="M7 8L9 10L12 7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 8H15" strokeLinecap="round" />
    </svg>
);

const AccountIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="5.5" r="3" />
        <path d="M2.5 16.5C2.5 13.5 5.18629 11 9 11C12.8137 11 15.5 13.5 15.5 16.5" strokeLinecap="round" />
    </svg>
);

// ─── Navigation items ───

// Static base list — chỉ chứa các field không thay đổi runtime. Badge được
// inject dynamically trong component qua `useUnreadMessageBadge`.
const baseNavItems: NavItem[] = [
    { path: '/tutor-portal/dashboard', label: 'Tổng quan', icon: DashboardIcon, dataTour: 'nav-dashboard' },
    { path: '/tutor-portal/profile', label: 'Hồ sơ công khai', icon: ProfileIcon, dataTour: 'nav-profile' },
    { path: MESSAGES_PATH, label: 'Tin nhắn', icon: MessagesIcon, dataTour: 'nav-messages' },
    { path: '/tutor-portal/bookings', label: 'Yêu cầu đặt lịch', icon: BookingIcon, dataTour: 'nav-bookings' },
    { path: '/tutor-portal/schedule', label: 'Lịch dạy', icon: ScheduleIcon, dataTour: 'nav-schedule' },
    { path: '/tutor-portal/classes', label: 'Quản lý lớp học', icon: ClassIcon, dataTour: 'nav-classes' },
    { path: '/tutor-portal/finance', label: 'Tài chính', icon: FinanceIcon, dataTour: 'nav-finance' },
    { path: '/tutor-portal/account', label: 'Tài khoản', icon: AccountIcon, dataTour: 'nav-account' },
];

// ─── Tour Steps ───

const tourSteps: TourStep[] = [
    {
        target: '[data-tour="sidebar"]',
        title: '🎯 Chào mừng đến TUTORA!',
        description: 'Đây là Bảng điều khiển của bạn. Menu bên trái giúp bạn truy cập nhanh mọi chức năng quản lý gia sư.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-dashboard"]',
        title: '📊 Tổng quan',
        description: 'Xem tổng quan hoạt động: thống kê buổi học, đánh giá, doanh thu, và lịch dạy.',
        placement: 'right',
    },
    {
        target: '[data-tour="stats-grid"]',
        title: '📈 Thống kê nhanh',
        description: 'Các thẻ thống kê giúp bạn theo dõi số buổi học, đánh giá trung bình, số dư ví, và doanh thu.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="quick-actions"]',
        title: '⚡ Thao tác nhanh',
        description: 'Điểm danh, thêm lịch rảnh, tạo lớp học, rút tiền — chỉ 1 click!',
        placement: 'bottom',
    },
    {
        target: '[data-tour="calendar-widget"]',
        title: '📅 Lịch mini',
        description: 'Xem nhanh những ngày có lớp (chấm xanh). Click vào ngày để xem chi tiết lịch dạy.',
        placement: 'left',
    },
    {
        target: '[data-tour="nav-profile"]',
        title: '🪪 Hồ sơ công khai',
        description: 'Chỉnh sửa hồ sơ hiển thị cho phụ huynh: ảnh đại diện, giới thiệu, bằng cấp, giá dạy, video giới thiệu.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-messages"]',
        title: '💌 Tin nhắn',
        description: 'Nhắn tin trực tiếp với phụ huynh và học sinh. Hỗ trợ gửi file đính kèm.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-bookings"]',
        title: '📥 Yêu cầu đặt lịch',
        description: 'Xem và phản hồi yêu cầu đặt lịch từ phụ huynh. Chấp nhận hoặc từ chối lịch học.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-schedule"]',
        title: '🗓️ Lịch dạy',
        description: 'Cài đặt lịch rảnh để phụ huynh có thể đặt lịch. Kéo thả trên lưới để tạo nhanh!',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-classes"]',
        title: '🎓 Quản lý lớp học',
        description: 'Xem danh sách lớp, điểm danh học sinh, ghi nhận bài học, theo dõi tiến độ.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-finance"]',
        title: '💳 Tài chính',
        description: 'Xem thu nhập, lịch sử giao dịch, rút tiền về tài khoản ngân hàng của bạn.',
        placement: 'right',
    },
    {
        target: '[data-tour="nav-account"]',
        title: '👤 Tài khoản',
        description: 'Quản lý thông tin cá nhân, cập nhật hồ sơ và đổi mật khẩu tài khoản của bạn.',
        placement: 'right',
    },
    {
        target: '[data-tour="stats-grid"]',
        title: '🎉 Sẵn sàng rồi!',
        description: 'Chúc bạn có trải nghiệm làm gia sư thật tuyệt vời với TUTORA! Nếu cần hỗ trợ, đừng ngần ngại liên hệ đội ngũ của chúng tôi nhé. 💪',
        placement: 'bottom',
    },
];

// ─── Component ───

const TutorPortalLayout: React.FC = () => {
    const location = useLocation();
    const [showTour, setShowTour] = useState(false);
    const [showTourPrompt, setShowTourPrompt] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Tin nhắn unread badge — fetch + SignalR real-time + auto-clear khi vào /messages.
    const unreadMessageCount = useUnreadMessageBadge(MESSAGES_PATH);
    const navItems = useMemo<NavItem[]>(
        () =>
            baseNavItems.map((item) =>
                item.path === MESSAGES_PATH ? { ...item, badge: unreadMessageCount } : item,
            ),
        [unreadMessageCount],
    );

    // Show tour prompt only on first visit to dashboard
    useEffect(() => {
        if (location.pathname !== '/tutor-portal/dashboard') return;
        if (localStorage.getItem('tutorTourCompleted')) return;
        let cancelled = false;
        getTourStatus().then(completed => {
            if (cancelled) return;
            if (completed) {
                localStorage.setItem('tutorTourCompleted', 'true');
            } else {
                const timer = setTimeout(() => setShowTourPrompt(true), 800);
                cancelled = true;
                return () => clearTimeout(timer);
            }
        });
        return () => { cancelled = true; };
    }, [location.pathname]);

    const handleAcceptTour = () => {
        setShowTourPrompt(false);
        setShowTour(true);
    };

    const handleSkipTour = () => {
        setShowTourPrompt(false);
        localStorage.setItem('tutorTourCompleted', 'true');
        completeTour();
    };

    const handleReplayTour = () => {
        setSidebarOpen(false);
        setShowTour(true);
    };

    // Prefetch all tutor portal pages after initial load
    useEffect(() => {
        const timer = setTimeout(() => {
            import('../pages/TutorPortal/TutorPortalProfile');
            import('../pages/TutorPortal/TutorPortalDashboard');
            import('../pages/TutorPortal/TutorPortalSchedule');
            import('../pages/TutorPortal/TutorPortalMessages');
            import('../pages/TutorPortal/TutorPortalClasses');
            import('../pages/TutorPortal/TutorPortalBookings');
            import('../pages/TutorFinance/TutorFinanceDashboard/TutorFinanceDashboardPage');
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const isActive = (path: string, pathname: string) => {
        if (path === '/tutor-portal/finance' || path === '/tutor-portal/classes') {
            return pathname.startsWith(path);
        }
        return pathname === path;
    };

    // Replay tour button in sidebar nav footer
    const sidebarNavFooter = (
        <div
            className="" // Inherits navItem styling via parent PortalLayout
            title="Hướng dẫn sử dụng"
            onClick={handleReplayTour}
            style={{
                display: 'flex', alignItems: 'center', gap: '10.5px',
                padding: '10.5px 14px', borderRadius: 7, cursor: 'pointer',
                color: 'rgba(242, 240, 228, 0.7)', marginTop: 8, opacity: 0.7,
                fontSize: 14, lineHeight: '21px', fontWeight: 500,
                fontFamily: "'IBM Plex Sans', sans-serif", minHeight: 40,
                transition: 'all 0.2s ease',
            }}
        >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="7" />
                <path d="M9 6v0.01M9 8.5v4" strokeLinecap="round" />
            </svg>
            <span className={styles.navText}>Hướng dẫn</span>
        </div>
    );

    // Tour-related extras (prompt modal + tour component)
    const tourExtras = (
        <>
            {/* Tour Welcome Prompt */}
            {showTourPrompt && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99998,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: '40px 36px',
                        maxWidth: 420, width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                        <h2 style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            fontSize: 22, fontWeight: 700, color: '#1a2238',
                            margin: '0 0 12px',
                        }}>Chào mừng bạn đến TUTORA!</h2>
                        <p style={{
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 15, color: 'rgba(62,47,40,0.7)',
                            lineHeight: 1.6, margin: '0 0 28px',
                        }}>
                            Hãy để TUTORA hướng dẫn bạn khám phá các tính năng để có trải nghiệm mượt mà nhất nhé!
                        </p>
                        <button
                            onClick={handleAcceptTour}
                            style={{
                                display: 'block', width: '100%', padding: '14px 20px',
                                border: 'none', borderRadius: 12, background: '#1a2238',
                                color: '#fff', fontSize: 15, fontWeight: 700,
                                cursor: 'pointer', marginBottom: 12,
                                fontFamily: "'IBM Plex Sans', sans-serif",
                            }}
                        >Bắt đầu khám phá ✨</button>
                        <button
                            onClick={handleSkipTour}
                            style={{
                                display: 'block', width: '100%', padding: '12px 20px',
                                border: 'none', borderRadius: 12, background: 'transparent',
                                color: 'rgba(62,47,40,0.5)', fontSize: 14, fontWeight: 500,
                                cursor: 'pointer',
                                fontFamily: "'IBM Plex Sans', sans-serif",
                            }}
                        >Bỏ qua</button>
                    </div>
                </div>
            )}

            {/* Tutor Onboarding Tour */}
            {showTour && (
                <TutorTour
                    steps={tourSteps}
                    onComplete={() => {
                        setShowTour(false);
                        setSidebarOpen(false);
                        localStorage.setItem('tutorTourCompleted', 'true');
                        completeTour();
                    }}
                    onSidebarOpen={() => setSidebarOpen(true)}
                    onSidebarClose={() => setSidebarOpen(false)}
                />
            )}
        </>
    );

    return (
        <PortalLayout
            navItems={navItems}
            userRole="TUTOR"
            isActive={isActive}
            sidebarNavFooter={sidebarNavFooter}
            showSidebarUserCard={true}
            showAvatarImage={true}
            sidebarDataTour="sidebar"
            sidebarOpenExternal={sidebarOpen}
            onSidebarOpen={() => setSidebarOpen(true)}
            onSidebarClose={() => setSidebarOpen(false)}
            extras={tourExtras}
        />
    );
};

export default TutorPortalLayout;
