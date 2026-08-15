/**
 * Phân loại lỗi getUserMedia / Agora khi mở camera-micro, để hiện thông báo đúng nguyên nhân
 * thay vì một câu chung "không truy cập được camera/micro". Dùng chung cho phòng chờ
 * (useDevicePreview) và phòng học thật (useAgoraCall) — cùng một API trình duyệt nên lỗi
 * ném ra giống nhau, Agora chỉ bọc lại DOMException gốc kèm thêm field `code`.
 */

export type MediaErrorKind = 'denied' | 'not-found' | 'in-use' | 'other';

export interface MediaErrorInfo {
  kind: MediaErrorKind;
  title: string;
  message: string;
}

const DENIED_NAMES = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);
const DENIED_CODES = new Set(['PERMISSION_DENIED']);
const NOT_FOUND_NAMES = new Set(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError']);
const NOT_FOUND_CODES = new Set(['DEVICE_NOT_FOUND', 'INVALID_DEVICE_ID', 'CONSTRAINT_NOT_SATISFIED']);
const IN_USE_NAMES = new Set(['NotReadableError', 'TrackStartError', 'AbortError']);
const IN_USE_CODES = new Set(['NOT_READABLE']);

function classifyMediaError(err: unknown): MediaErrorKind {
  const name = err instanceof Error ? err.name : '';
  const code = (err as { code?: string } | null)?.code ?? '';
  if (DENIED_NAMES.has(name) || DENIED_CODES.has(code)) return 'denied';
  if (NOT_FOUND_NAMES.has(name) || NOT_FOUND_CODES.has(code)) return 'not-found';
  if (IN_USE_NAMES.has(name) || IN_USE_CODES.has(code)) return 'in-use';
  return 'other';
}

/** context: 'preview' = đang ở phòng chờ (chưa vào lớp), 'join' = đang cố vào phòng học thật. */
export function describeMediaError(err: unknown, context: 'preview' | 'join' = 'preview'): MediaErrorInfo {
  const kind = classifyMediaError(err);

  switch (kind) {
    case 'denied':
      return {
        kind,
        title: 'Chưa cấp quyền camera/micro',
        message: 'Mở lại quyền camera, micro cho trang này rồi thử lại nhé.',
      };
    case 'not-found':
      return {
        kind,
        title: 'Không tìm thấy camera/micro',
        message: 'Kiểm tra lại thiết bị đã kết nối chưa rồi thử lại nhé.',
      };
    case 'in-use':
      return {
        kind,
        title: 'Camera/micro đang được dùng',
        message: 'Tắt ứng dụng khác đang dùng camera/micro rồi thử lại nhé.',
      };
    default:
      return {
        kind,
        title: context === 'join' ? 'Không vào được phòng học' : 'Không dùng được camera/micro',
        message: 'Thử lại xem nhé.',
      };
  }
}
