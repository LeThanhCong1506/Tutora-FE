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
    | 'cancelled_noshow';

export interface ClassSessionStatusMeta {
    label: string;
    color: string;
    bg: string;
    variant: StatusVariant;
}

export const CLASS_SESSION_STATUS_META: Record<ClassSessionStatus, ClassSessionStatusMeta> = {
    reserved: { label: 'Đang giữ chỗ', color: '#697287', bg: '#f2f3f5', variant: 'neutral' },
    scheduled: { label: 'Đã lên lịch', color: '#6366F1', bg: 'rgba(99,102,241,0.10)', variant: 'info' },
    in_progress: { label: 'Đang diễn ra', color: '#0d9488', bg: 'rgba(13,148,136,0.12)', variant: 'info' },
    pending_confirmation: { label: 'Chờ xác nhận', color: '#d97706', bg: 'rgba(217,119,6,0.10)', variant: 'warning' },
    completed: { label: 'Hoàn thành', color: '#059669', bg: 'rgba(5,150,105,0.10)', variant: 'success' },
    cancelled: { label: 'Đã hủy', color: '#737373', bg: '#f5f5f5', variant: 'neutral' },
    cancelled_noshow: { label: 'Hủy (vắng mặt)', color: '#737373', bg: '#f5f5f5', variant: 'neutral' },
    no_show: { label: 'Vắng mặt', color: '#DC2626', bg: '#FEF2F2', variant: 'error' },
    disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEF2F2', variant: 'error' },
};

const FALLBACK_META: ClassSessionStatusMeta = {
    label: 'Không rõ',
    color: '#737373',
    bg: '#f5f5f5',
    variant: 'neutral',
};

/** Safe lookup — unknown/missing status values fall back to a neutral "Không rõ" badge instead of throwing. */
export function getClassSessionStatusMeta(status?: string | null): ClassSessionStatusMeta {
    if (!status) return FALLBACK_META;
    return CLASS_SESSION_STATUS_META[status.toLowerCase() as ClassSessionStatus] ?? FALLBACK_META;
}
