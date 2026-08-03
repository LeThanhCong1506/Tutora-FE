import React, { useMemo } from 'react';
import { PortalLayout } from '../../components/shared/PortalLayout';
import type { NavItem } from '../../components/shared/PortalLayout';
import { useUnreadMessageBadge } from '../../hooks/useUnreadMessageBadge';
import { useUnreadBadgesByTab } from '../../hooks/useUnreadBadgesByTab';
import { StudentProfileProvider, useStudentProfile } from '../../contexts/StudentProfileContext';

import {
  DashboardIcon,
  MessagesIcon,
  BookingIcon,
  AccountIcon,
  CalendarIcon,
  ChildrenIcon,
  WalletIcon,
  DisputeIcon,
} from '../shared/icons';

const MESSAGES_PATH = '/student-portal/messages';

// Map sidebar path → notification types thuộc tab đó. Đồng bộ với BE
// `MV.DomainLayer/Constants/NotificationType.cs`.
const NOTIFICATION_TYPES_BY_PATH: Record<string, string[]> = {
  '/student-portal/booking': [
    'booking_new',
    'booking_accepted',
    'booking_declined',
    'booking_cancelled',
    'payment_remaining_required',
    'booking_payment_due_soon',
  ],
  '/student-portal/calendar': [
    'lesson_reminder',
    'lesson_checkin',
    'lesson_confirmed',
    'lesson_no_show',
    'lesson_schedule_change',
    'lesson_report',
  ],
  '/student-portal/wallet': ['withdrawal_request'],
  '/student-portal/disputes': ['dispute_message'],
};

const DISPUTES_PATH = '/student-portal/disputes';

const baseStudentNavItems: NavItem[] = [
  { path: '/student-portal/dashboard', label: 'Tổng quan', icon: DashboardIcon },
  { path: '/student-portal/booking', label: 'Đặt lịch', icon: BookingIcon },
  { path: '/student-portal/calendar', label: 'Thời khóa biểu', icon: CalendarIcon },
  { path: MESSAGES_PATH, label: 'Tin nhắn', icon: MessagesIcon },
  { path: '/student-portal/wallet', label: 'Tài chính', icon: WalletIcon },
  { path: DISPUTES_PATH, label: 'Khiếu nại', icon: DisputeIcon },
  { path: '/student-portal/profile', label: 'Hồ sơ học sinh', icon: ChildrenIcon },
  { path: '/student-portal/account', label: 'Tài khoản', icon: AccountIcon },
];

interface StudentLayoutProps {
  children?: React.ReactNode;
}

const WALLET_PATH = '/student-portal/wallet';

// Inner: nằm TRONG StudentProfileProvider nên đọc được isParentManaged để lọc menu.
const StudentLayoutInner: React.FC<StudentLayoutProps> = ({ children }) => {
  const unreadMessageCount = useUnreadMessageBadge(MESSAGES_PATH);
  const badgesByPath = useUnreadBadgesByTab(NOTIFICATION_TYPES_BY_PATH);
  // Tài khoản do phụ huynh quản lý: chỉ vào học & tương tác → ẩn menu ví (chỉ hiện khi chắc chắn tự đăng ký).
  const { isParentManaged, loading } = useStudentProfile();

  const showWallet = !loading && !isParentManaged;
  // Học sinh do phụ huynh quản lý không tự tạo khiếu nại được (xem StudentLessonDetail) → ẩn luôn mục này.
  const showDisputes = !loading && !isParentManaged;

  const navItems = useMemo<NavItem[]>(
    () =>
      baseStudentNavItems
        .filter((item) => showWallet || item.path !== WALLET_PATH)
        .filter((item) => showDisputes || item.path !== DISPUTES_PATH)
        .map((item) => {
          if (item.path === MESSAGES_PATH) {
            return { ...item, badge: unreadMessageCount };
          }
          const count = badgesByPath[item.path];
          return count ? { ...item, badge: count } : item;
        }),
    [unreadMessageCount, badgesByPath, showWallet, showDisputes],
  );

  return (
    <PortalLayout navItems={navItems} userRole="STUDENT" showSidebarUserCard={false} showAvatarImage={false}>
      {children}
    </PortalLayout>
  );
};

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => (
    <StudentProfileProvider>
        <StudentLayoutInner>{children}</StudentLayoutInner>
    </StudentProfileProvider>
);

export default StudentLayout;
