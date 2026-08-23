import type { StatusVariant } from '../components/shared';

/**
 * Mirrors BE `MV.DomainLayer/Constants/ClassSessionStatus.cs` exactly.
 * Do not add values here that don't exist on the backend enum.
 */
export type ClassSessionStatus =
    | 'scheduled'
    | 'reserved'
    | 'in_progress'
    | 'pending_confirmation'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | 'no_show'
    | 'cancelled_noshow'
    | 'interrupted';

export interface ClassSessionStatusMeta {
    label: string;
    color: string;
    bg: string;
    variant: StatusVariant;
}

export const CLASS_SESSION_STATUS_META: Record<ClassSessionStatus, ClassSessionStatusMeta> = {
    reserved: { label: 'Đang giữ chỗ', color: '#667085', bg: '#F2F4F7', variant: 'neutral' },
    scheduled: { label: 'Đã lên lịch', color: '#2F6F9F', bg: '#EAF3FA', variant: 'info' },
    in_progress: { label: 'Đang diễn ra', color: '#16803C', bg: '#E8F5EC', variant: 'info' },
    pending_confirmation: { label: 'Chờ xác nhận', color: '#A16207', bg: '#FFF6E5', variant: 'warning' },
    completed: { label: 'Hoàn thành', color: '#16803C', bg: '#E8F5EC', variant: 'success' },
    cancelled: { label: 'Đã hủy', color: '#667085', bg: '#F2F4F7', variant: 'neutral' },
    cancelled_noshow: { label: 'Hủy (vắng mặt)', color: '#667085', bg: '#F2F4F7', variant: 'neutral' },
    no_show: { label: 'Vắng mặt', color: '#A43732', bg: '#FBECEA', variant: 'error' },
    disputed: { label: 'Khiếu nại', color: '#A43732', bg: '#FBECEA', variant: 'error' },
    interrupted: { label: 'Bị ngắt giữa buổi', color: '#A16207', bg: '#FFF6E5', variant: 'warning' },
};

const FALLBACK_META: ClassSessionStatusMeta = {
    label: 'Không rõ',
    color: '#667085',
    bg: '#F2F4F7',
    variant: 'neutral',
};

/** Safe lookup — unknown/missing status values fall back to a neutral "Không rõ" badge instead of throwing. */
export function getClassSessionStatusMeta(status?: string | null): ClassSessionStatusMeta {
    if (!status) return FALLBACK_META;
    return CLASS_SESSION_STATUS_META[status.toLowerCase() as ClassSessionStatus] ?? FALLBACK_META;
}
