import type { ProfileMenuItem } from '../../components/shared/PortalLayout';

export const tutorProfileMenuItems: ProfileMenuItem[] = [
    { key: '/tutor-portal/dashboard', label: 'Trang gia sư', materialIcon: 'dashboard' },
    { key: '/tutor-portal/account', label: 'Tài khoản của tôi', materialIcon: 'manage_accounts' },
    { key: '/tutor-portal/profile', label: 'Hồ sơ gia sư', materialIcon: 'badge' },
    { key: '/tutor-portal/onboarding', label: 'Thiết lập giảng dạy', materialIcon: 'tune' },
    { key: '/tutor-portal/calendar', label: 'Lịch dạy', materialIcon: 'calendar_month', startsGroup: true },
    { key: '/tutor-portal/bookings', label: 'Yêu cầu đặt lịch', materialIcon: 'event_available' },
    { key: '/tutor-portal/messages', label: 'Tin nhắn', materialIcon: 'chat' },
    { key: '/tutor-portal/finance', label: 'Ví & thu nhập', materialIcon: 'account_balance_wallet' },
    { key: '/tutor-portal/finance/withdraw', label: 'Rút tiền', materialIcon: 'payments' },
    { key: '/tutor-portal/notifications', label: 'Thông báo', materialIcon: 'notifications', startsGroup: true },
    { key: '/tutor-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel' },
];

export const parentProfileMenuItems: ProfileMenuItem[] = [
    { key: '/parent-portal/dashboard', label: 'Trang phụ huynh', materialIcon: 'dashboard' },
    { key: '/parent-portal/account', label: 'Tài khoản của tôi', materialIcon: 'manage_accounts' },
    { key: '/parent-portal/student', label: 'Quản lý con', materialIcon: 'family_restroom' },
    { key: '/parent-portal/lessons', label: 'Thời khóa biểu', materialIcon: 'calendar_month', startsGroup: true },
    { key: '/parent-portal/booking', label: 'Đặt lịch học', materialIcon: 'event_available' },
    { key: '/parent-portal/messages', label: 'Tin nhắn', materialIcon: 'chat' },
    { key: '/parent-portal/wallet', label: 'Ví của tôi', materialIcon: 'account_balance_wallet' },
    { key: '/parent-portal/wallet/transactions', label: 'Lịch sử giao dịch', materialIcon: 'receipt_long' },
    { key: '/parent-portal/wallet/bank-account', label: 'Tài khoản ngân hàng', materialIcon: 'account_balance' },
    { key: '/parent-portal/notifications', label: 'Thông báo', materialIcon: 'notifications', startsGroup: true },
    { key: '/parent-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel' },
];

/** Mục ví & khiếu nại — học sinh do phụ huynh quản lý không có. */
export const studentWalletMenuItem: ProfileMenuItem = {
    key: '/student-portal/wallet',
    label: 'Ví của tôi',
    materialIcon: 'account_balance_wallet',
};

export const studentBankAccountMenuItem: ProfileMenuItem = {
    key: '/student-portal/wallet/bank-account',
    label: 'Tài khoản ngân hàng',
    materialIcon: 'account_balance',
};

export const studentDisputesMenuItem: ProfileMenuItem = {
    key: '/student-portal/disputes',
    label: 'Khiếu nại',
    materialIcon: 'gavel',
};

/**
 * Menu học sinh. Ví và khiếu nại chỉ dành cho học sinh TỰ đăng ký — tài khoản
 * do phụ huynh tạo bị chặn ở route (StudentSelfRegisteredGate)
 */
export const buildStudentProfileMenuItems = (
    options: { showWallet?: boolean; showDisputes?: boolean } = {},
): ProfileMenuItem[] => {
    const { showWallet = false, showDisputes = false } = options;

    return [
        { key: '/student-portal/dashboard', label: 'Trang học sinh', materialIcon: 'dashboard' },
        { key: '/student-portal/account', label: 'Tài khoản của tôi', materialIcon: 'manage_accounts' },
        { key: '/student-portal/profile', label: 'Hồ sơ học sinh', materialIcon: 'school' },
        { key: '/student-portal/calendar', label: 'Thời khóa biểu', materialIcon: 'calendar_month', startsGroup: true },
        { key: '/student-portal/booking', label: 'Đặt lịch học', materialIcon: 'event_available' },
        { key: '/student-portal/messages', label: 'Tin nhắn', materialIcon: 'chat' },
        ...(showWallet ? [studentWalletMenuItem, studentBankAccountMenuItem] : []),
        { key: '/student-portal/notifications', label: 'Thông báo', materialIcon: 'notifications', startsGroup: true },
        ...(showDisputes ? [studentDisputesMenuItem] : []),
    ];
};

export const adminProfileMenuItems: ProfileMenuItem[] = [
    { key: '/admin-portal/dashboard', label: 'Bảng điều khiển', materialIcon: 'dashboard' },
];

export const getProfileMenuItemsByRole = (
    role: string,
    options: { studentSelfRegistered?: boolean } = {},
): ProfileMenuItem[] => {
    switch (role.toLowerCase()) {
        case 'tutor': return tutorProfileMenuItems;
        case 'parent': return parentProfileMenuItems;
        case 'student': return buildStudentProfileMenuItems({
            showWallet: options.studentSelfRegistered,
            showDisputes: options.studentSelfRegistered,
        });
        case 'admin': return adminProfileMenuItems;
        default: return [];
    }
};
