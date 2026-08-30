import type { TutorClassSummary } from '../../../../services/classSession.service';

export type ViewMode = 'grid' | 'table';

/** Bộ lọc trạng thái trên thanh công cụ — `status` là chuỗi gửi thẳng cho API. */
export const STATUS_FILTERS = [
    { key: 'all', label: 'Tất cả', status: undefined },
    { key: 'scheduled', label: 'Sắp diễn ra', status: 'scheduled' },
    { key: 'in_progress', label: 'Đang dạy', status: 'in_progress' },
    { key: 'pending_confirmation', label: 'Chờ xác nhận', status: 'pending_confirmation' },
    { key: 'reserved', label: 'Đang giữ chỗ', status: 'reserved' },
    { key: 'completed', label: 'Hoàn thành', status: 'completed' },
] as const;

export type StatusFilterKey = (typeof STATUS_FILTERS)[number]['key'];

export type ClassItem = TutorClassSummary;
