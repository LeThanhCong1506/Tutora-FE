export type AttachmentKind = 'image' | 'video' | 'file';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|avif|heic)(?:\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv)(?:\?.*)?$/i;

/** Tiền tố storage tự thêm khi upload: `{Guid}_{tên gốc}` (xem `CloudinaryStorageService`). */
const STORAGE_GUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

/**
 * Ảnh/video thì nhúng xem ngay tại chỗ, còn lại coi là tài liệu và chỉ mở link.
 * Ưu tiên `mimeType` khi BE có lưu; nếu không thì đoán theo đuôi file — và phải bỏ qua query string
 * vì URL đã ký của storage luôn kèm token (`...jpg?token=...`).
 */
export const getAttachmentKind = (url?: string | null, mimeType?: string | null): AttachmentKind => {
    const mime = mimeType?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';

    if (!url) return 'file';
    if (IMAGE_EXTENSIONS.test(url)) return 'image';
    if (VIDEO_EXTENSIONS.test(url)) return 'video';
    return 'file';
};

/**
 * Tên hiển thị cho người dùng: bỏ query string và tiền tố GUID của storage để còn lại đúng
 * tên file gốc mà người tải lên đã đặt, thay vì cả chuỗi định danh kỹ thuật.
 */
export const getAttachmentDisplayName = (url?: string | null, fallback = 'Tệp đính kèm'): string => {
    if (!url) return fallback;

    let lastSegment: string;
    try {
        lastSegment = new URL(url, window.location.origin).pathname.split('/').pop() || '';
    } catch {
        lastSegment = url.split('?')[0].split('/').pop() || '';
    }

    let name: string;
    try {
        name = decodeURIComponent(lastSegment);
    } catch {
        name = lastSegment;
    }

    return name.replace(STORAGE_GUID_PREFIX, '').trim() || fallback;
};
