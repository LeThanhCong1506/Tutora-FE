/** Nhãn tiếng Việt cho vai trò*/
const ROLE_LABELS: Record<string, string> = {
    tutor: 'Gia sư',
    parent: 'Phụ huynh',
    student: 'Học sinh',
    admin: 'Quản trị viên',
};

export const getRoleLabel = (role?: string | null, fallback = 'Tài khoản'): string =>
    ROLE_LABELS[(role ?? '').trim().toLowerCase()] ?? fallback;

export default getRoleLabel;
