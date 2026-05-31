import React, { useMemo } from 'react';
import { PortalLayout } from '../../components/shared/PortalLayout';
import type { NavItem } from '../../components/shared/PortalLayout';
import { useUnreadMessageBadge } from '../../hooks/useUnreadMessageBadge';

import {
    DashboardIcon, MessagesIcon, BookingIcon,
    AccountIcon, LessonsIcon, CalendarIcon, LinkIcon,
} from '../shared/icons';

const MESSAGES_PATH = '/student-portal/messages';

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
    const navItems = useMemo<NavItem[]>(
        () =>
            baseStudentNavItems.map((item) =>
                item.path === MESSAGES_PATH ? { ...item, badge: unreadMessageCount } : item,
            ),
        [unreadMessageCount],
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
