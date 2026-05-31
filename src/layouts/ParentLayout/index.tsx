import React, { useEffect, useMemo } from 'react';
import { PortalLayout } from '../../components/shared/PortalLayout';
import type { NavItem } from '../../components/shared/PortalLayout';
import { getUserInfoFromToken } from '../../services/auth.service';
import { StudentProvider, useStudentContext } from '../../contexts/StudentContext';
import { useNextLesson } from '../shared/useLayoutData';
import { useUnreadMessageBadge } from '../../hooks/useUnreadMessageBadge';
import {
    DashboardIcon, ChildrenIcon, MessagesIcon, BookingIcon,
    AccountIcon, LessonsIcon, CalendarIcon, ClockIcon,
} from '../shared/icons';

const MESSAGES_PATH = '/parent-portal/messages';

const baseParentNavItems: NavItem[] = [
    { path: '/parent-portal/dashboard', label: 'Tổng quan', icon: DashboardIcon },
    { path: '/parent-portal/student', label: 'Quản lý con', icon: ChildrenIcon },
    { path: '/parent-portal/lessons', label: 'Buổi học', icon: LessonsIcon },
    { path: '/parent-portal/calendar', label: 'Thời khóa biểu', icon: CalendarIcon },
    { path: MESSAGES_PATH, label: 'Tin nhắn', icon: MessagesIcon },
    { path: '/parent-portal/booking', label: 'Đặt lịch', icon: BookingIcon },
    { path: '/parent-portal/account', label: 'Tài khoản', icon: AccountIcon },
];

// Next Lesson indicator shown in header
const NextLessonIndicator: React.FC = () => {
    const { nextLesson, loadNextLesson } = useNextLesson();

    useEffect(() => {
        const user = getUserInfoFromToken();
        if (user) loadNextLesson();
    }, [loadNextLesson]);

    if (!nextLesson) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9999,
            backgroundColor: 'rgba(26, 34, 56, 0.06)',
        }}>
            <ClockIcon />
            <span style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, lineHeight: '18px', color: '#525252', whiteSpace: 'nowrap',
            }}>
                Tiếp: {new Date(nextLesson.scheduledStart).toLocaleDateString('vi-VN', {
                    day: '2-digit', month: '2-digit',
                })} {new Date(nextLesson.scheduledStart).toLocaleTimeString('vi-VN', {
                    hour: '2-digit', minute: '2-digit',
                })}
            </span>
        </div>
    );
};

interface ParentLayoutProps {
    children?: React.ReactNode;
}

const ParentLayoutInner: React.FC<ParentLayoutProps> = ({ children }) => {
    // Activate student context (side effects)
    useStudentContext();

    // Tin nhắn unread badge — sidebar nav
    const unreadMessageCount = useUnreadMessageBadge(MESSAGES_PATH);
    const navItems = useMemo<NavItem[]>(
        () =>
            baseParentNavItems.map((item) =>
                item.path === MESSAGES_PATH ? { ...item, badge: unreadMessageCount } : item,
            ),
        [unreadMessageCount],
    );

    return (
        <PortalLayout
            navItems={navItems}
            userRole="PARENT"
            headerLeft={<NextLessonIndicator />}
            showSidebarUserCard={false}
            showAvatarImage={true}
        >
            {children}
        </PortalLayout>
    );
};

const ParentLayout: React.FC<ParentLayoutProps> = ({ children }) => (
    <StudentProvider>
        <ParentLayoutInner>{children}</ParentLayoutInner>
    </StudentProvider>
);

export default ParentLayout;
