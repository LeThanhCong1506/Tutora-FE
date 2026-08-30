import type { StatusVariant } from '../../../../components/shared';
import type { TutorClassStatus } from '../../../../services/classSession.service';

/**
 * Ảnh cover cho card lớp — texture màu nước lấy từ app mobile (assets/images/common).
 * Chỉ để trang trí; chọn theo bookingId nên mỗi lớp giữ nguyên ảnh giữa các lần render.
 */
const COVERS = ['/images/class-covers/cover-blue.jpg', '/images/class-covers/cover-green.jpg'];

export const coverFor = (bookingId: number) => COVERS[bookingId % COVERS.length];

/** Nhãn + tông màu cho trạng thái lớp (DeriveClassStatus của BE trả 4 giá trị này). */
export const classStatusMeta = (
    status: TutorClassStatus,
): { label: string; variant: StatusVariant } => {
    switch (status) {
        case 'in_progress':
            return { label: 'Đang dạy', variant: 'success' };
        case 'pending_confirmation':
            return { label: 'Chờ xác nhận', variant: 'warning' };
        case 'reserved':
            return { label: 'Đang giữ chỗ', variant: 'warning' };
        case 'completed':
            return { label: 'Hoàn thành', variant: 'info' };
        case 'cancelled':
            return { label: 'Đã huỷ', variant: 'error' };
        case 'scheduled':
        default:
            return { label: 'Sắp diễn ra', variant: 'neutral' };
    }
};

export const progressOf = (completed: number, total: number) =>
    total <= 0 ? 0 : Math.round((completed / total) * 100);

export const initialsOf = (name?: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'HS';
    return parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

export const formatDateTime = (iso?: string | null) => (iso ? DATE_TIME.format(new Date(iso)) : '—');

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad = (n: number) => String(n).padStart(2, '0');

const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Tách ngày và khung giờ thành 2 phần để dòng buổi học đọc được ngay:
 * "T6, 22/08" + "20:40 – 21:28" thay vì dồn thành một chuỗi "20:40 22-08 – 21:28".
 */
export const formatSessionTime = (startIso?: string | null, endIso?: string | null) => {
    if (!startIso) return { date: '—', range: '' };

    const start = new Date(startIso);
    const date = `${WEEKDAYS[start.getDay()]}, ${pad(start.getDate())}/${pad(start.getMonth() + 1)}`;
    const range = endIso ? `${timeOf(start)} – ${timeOf(new Date(endIso))}` : timeOf(start);

    return { date, range };
};

export const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Nhãn phân biệt buổi sinh thêm với buổi trong gói. */
export const extraSessionLabel = (session: {
    isContinuation?: boolean;
    isDisputeRelearn?: boolean;
}) => {
    if (session.isContinuation) return 'Buổi phụ';
    if (session.isDisputeRelearn) return 'Học lại';
    return null;
};
