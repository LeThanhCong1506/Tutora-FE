import React, { useMemo } from 'react';
import { PortalLayout } from '../../components/shared/PortalLayout';
import type { NavItem } from '../../components/shared/PortalLayout';
import { useUnreadMessageBadge } from '../../hooks/useUnreadMessageBadge';
import { useUnreadBadgesByTab } from '../../hooks/useUnreadBadgesByTab';

import {
    DashboardIcon, MessagesIcon, BookingIcon,
    AccountIcon, LessonsIcon, CalendarIcon, LinkIcon,
} from '../shared/icons';

const MESSAGES_PATH = '/student-portal/messages';

// Map sidebar path → notification types thuộc tab đó. Đồng bộ với BE
// `MV.DomainLayer/Constants/NotificationType.cs`.
const NOTIFICATION_TYPES_BY_PATH: Record<string, string[]> = {
    '/student-portal/booking': ['booking_new', 'booking_accepted', 'booking_declined'],
    '/student-portal/lessons': [
        'lesson_reminder',
        'lesson_checkin',
        'lesson_confirmed',
        'lesson_no_show',
        'lesson_report',
    ],
};

const baseStudentNavItems: NavItem[] = [
    { path: '/student-portal/dashboard', label: 'Tổng quan', icon: DashboardIcon },
    { path: '/student-portal/booking', label: 'Đặt lịch', icon: BookingIcon },
    { path: '/student-portal/lessons', label: 'Buổi học', icon: LessonsIcon },
    { path: '/student-portal/calendar', label: 'Thời khóa biểu', icon: CalendarIcon },
    { path: MESSAGES_PATH, label: 'Tin nhắn', icon: MessagesIcon },
    { path: '/student-portal/link-account', label: 'Liên kết tài khoản', icon: LinkIcon },
    { path: '/student-portal/account', label: 'Tài khoản', icon: AccountIcon },
];

interface StudentLayoutProps {
    children?: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
    const unreadMessageCount = useUnreadMessageBadge(MESSAGES_PATH);
    const badgesByPath = useUnreadBadgesByTab(NOTIFICATION_TYPES_BY_PATH);

    const navItems = useMemo<NavItem[]>(
        () =>
            baseStudentNavItems.map((item) => {
                if (item.path === MESSAGES_PATH) {
                    return { ...item, badge: unreadMessageCount };
                }
                const count = badgesByPath[item.path];
                return count ? { ...item, badge: count } : item;
            }),
        [unreadMessageCount, badgesByPath],
    );

    return (
        <PortalLayout
            navItems={navItems}
            userRole="STUDENT"
            showSidebarUserCard={false}
            showAvatarImage={false}
        >
            {children}
        </PortalLayout>
    );
};

export default StudentLayout;
