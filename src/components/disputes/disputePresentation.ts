import type { ThemeConfig } from 'antd';
import type { StatusVariant } from '../shared';
import type { PortalDisputeListParams } from '../../services/classSession.service';

export type DisputeStatusFilter = NonNullable<PortalDisputeListParams['status']> | '';
export type DisputeTypeFilter = NonNullable<PortalDisputeListParams['disputeType']> | '';
export type DisputeSortDirection = NonNullable<PortalDisputeListParams['sortDirection']>;

export const DISPUTE_PAGE_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#1a2238',
    colorPrimaryHover: '#303a54',
    colorPrimaryActive: '#11182a',
    colorText: '#1a2238',
    colorTextHeading: '#1a2238',
    colorBorder: 'rgba(62, 47, 40, 0.14)',
    colorBorderSecondary: 'rgba(62, 47, 40, 0.08)',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f2f0e4',
    controlItemBgHover: 'rgba(242, 240, 228, 0.45)',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

export const DISPUTE_STATUS_TABS: Array<{ key: DisputeStatusFilter; label: string }> = [
  { key: '', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'investigating', label: 'Đang xem xét' },
  { key: 'confirmed_no_show', label: 'Xác nhận vắng mặt' },
  { key: 'resolved', label: 'Đã giải quyết' },
  { key: 'closed', label: 'Đã đóng' },
];

export const DISPUTE_TYPE_LABELS: Record<string, string> = {
  no_show: 'Vắng mặt',
  quality: 'Chất lượng',
  payment: 'Thanh toán',
  other: 'Khác',
};

export const DISPUTE_STATUS_META: Record<string, { label: string; variant: StatusVariant }> = {
  pending: { label: 'Chờ xử lý', variant: 'warning' },
  investigating: { label: 'Đang xem xét', variant: 'info' },
  confirmed_no_show: { label: 'Đã xác nhận vắng mặt', variant: 'success' },
  resolved: { label: 'Đã giải quyết', variant: 'success' },
  closed: { label: 'Đã đóng', variant: 'neutral' },
};

export const DISPUTE_PRIORITY_META: Record<string, { label: string; variant: StatusVariant }> = {
  high: { label: 'Cao', variant: 'error' },
  medium: { label: 'Trung bình', variant: 'warning' },
  low: { label: 'Thấp', variant: 'success' },
};

export const DISPUTE_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại khiếu nại' },
  { value: 'no_show', label: 'Vắng mặt' },
  { value: 'quality', label: 'Chất lượng' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'other', label: 'Khác' },
];

export const DISPUTE_SORT_OPTIONS = [
  { value: 'desc', label: 'Mới nhất trước' },
  { value: 'asc', label: 'Cũ nhất trước' },
];

export const getDisputeTypeLabel = (type?: string | null, display?: string | null) =>
  DISPUTE_TYPE_LABELS[type ?? ''] || display || 'Chưa phân loại';

export const getDisputeStatusMeta = (status?: string | null, display?: string | null) =>
  DISPUTE_STATUS_META[status ?? ''] ?? {
    label: display || status || 'Chưa xác định',
    variant: 'neutral' as const,
  };

export const getDisputePriorityMeta = (priority?: string | null, display?: string | null) =>
  DISPUTE_PRIORITY_META[priority ?? ''] ?? {
    label: display || 'Chưa phân loại',
    variant: 'neutral' as const,
  };

export type DisputeEvidenceKind = 'image' | 'video' | 'file';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|avif|heic)(?:\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv)(?:\?.*)?$/i;

/**
 * Ảnh/video thì nhúng xem ngay trong popup, còn lại coi là tài liệu và chỉ mở link.
 * Ưu tiên `mimeType` (BE lưu `file.ContentType` cho bằng chứng gia sư tải lên); bằng chứng ban đầu
 * của phụ huynh chỉ có URL nên phải đoán theo đuôi file — và phải bỏ qua query string vì URL đã ký
 * của storage luôn kèm token (`...jpg?token=...`).
 */
export const getDisputeEvidenceKind = (url?: string | null, mimeType?: string | null): DisputeEvidenceKind => {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';

  if (!url) return 'file';
  if (IMAGE_EXTENSIONS.test(url)) return 'image';
  if (VIDEO_EXTENSIONS.test(url)) return 'video';
  return 'file';
};
