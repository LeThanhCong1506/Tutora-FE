import type { NotificationDTO } from '../services/notification.service';

export function getPortalPrefix(): string {
    const parts = window.location.pathname.split('/');
    const portals = ['admin-portal', 'tutor-portal', 'parent-portal', 'student-portal'];
    const found = parts.find(p => portals.includes(p));
    return found ? `/${found}` : '/parent-portal';
}

/**
 * BE notification type constants — phải khớp chính xác với
 * `MV.DomainLayer/Constants/NotificationType.cs` ở BE.
 * Dùng khi BE truyền `type` field — ưu tiên cao hơn keyword match từ title/message.
 */
const NOTIFICATION_TYPE = {
    LessonCheckin: 'lesson_checkin',
    LessonReport: 'lesson_report',
    LessonNoShow: 'lesson_no_show',
    LessonConfirmed: 'lesson_confirmed',
    BookingNew: 'booking_new',
    BookingAccepted: 'booking_accepted',
    BookingDeclined: 'booking_declined',
    PaymentSuccess: 'payment_success',
    Warning: 'warning',
    Message: 'message',
} as const;

/**
 * Resolve route đích cho notification khi user click.
 *
 * Thứ tự ưu tiên:
 *   1. Map theo `type` + `referenceid` (chính xác, dùng cho deep-link)
 *   2. Fallback keyword match trên title + message (cho notification BE chưa truyền type)
 *   3. Fallback /notifications page
 */
export function getNotificationTargetPath(notification: NotificationDTO): string {
    const prefix = getPortalPrefix();
    const title = (notification.title ?? '').toLowerCase();
    const message = (notification.message ?? '').toLowerCase();
    const combined = title + ' ' + message;
    const type = notification.type ?? '';
    const refId = notification.referenceid ?? '';

    // ── Layer 1: Type + Referenceid (deep-link chính xác) ──
    if (type === NOTIFICATION_TYPE.LessonCheckin && refId) {
        return `${prefix}/lessons/${refId}`;
    }
    if (type === NOTIFICATION_TYPE.LessonReport && refId) {
        return `${prefix}/lessons/${refId}`;
    }
    if (type === NOTIFICATION_TYPE.LessonConfirmed && refId) {
        return `${prefix}/lessons/${refId}`;
    }
    if (type === NOTIFICATION_TYPE.LessonNoShow && refId) {
        return `${prefix}/lessons/${refId}`;
    }
    if ((type === NOTIFICATION_TYPE.BookingNew
        || type === NOTIFICATION_TYPE.BookingAccepted
        || type === NOTIFICATION_TYPE.BookingDeclined) && refId) {
        const path = prefix === '/tutor-portal' ? 'bookings' : 'booking';
        return `${prefix}/${path}/${refId}`;
    }
    if (type === NOTIFICATION_TYPE.Message && refId) {
        return `${prefix}/messages`;
    }

    // ── Layer 2: Keyword fallback (cho notification cũ chưa có type) ──

    // Lesson-specific keywords → ưu tiên nếu match được lessonId trong message hoặc referenceid
    const isLessonTitle = title.includes('buổi học đã bắt đầu')
        || title.includes('báo cáo buổi học')
        || title.includes('xác nhận buổi học');
    if (isLessonTitle) {
        // Nếu BE đã truyền referenceid mà chưa truyền type → vẫn dùng được
        if (refId) return `${prefix}/lessons/${refId}`;
        // Best-effort: parse lessonId từ message (vd "#123")
        const idMatch = message.match(/#(\d+)/);
        if (idMatch) return `${prefix}/lessons/${idMatch[1]}`;
        // Fallback: về calendar (entry point duy nhất hiện có cho parent xem scheduled lessons)
        return `${prefix}/calendar`;
    }

    if (combined.includes('booking') || combined.includes('request') || combined.includes('đặt lịch') || combined.includes('cọc')) {
        if (prefix === '/tutor-portal') return `${prefix}/bookings`;
        return `${prefix}/booking`;
    }
    if (combined.includes('message') || combined.includes('tin nhắn')) {
        return `${prefix}/messages`;
    }
    if (combined.includes('payment') || combined.includes('paid') || combined.includes('wallet') || combined.includes('thanh toán')) {
        if (prefix === '/tutor-portal') return `${prefix}/finance`;
        if (prefix === '/parent-portal') return `${prefix}/wallet`;
        return `${prefix}/dashboard`;
    }
    if (combined.includes('schedule') || combined.includes('session') || combined.includes('lịch') || combined.includes('buổi')) {
        if (prefix === '/tutor-portal') return `${prefix}/schedule`;
        return `${prefix}/calendar`;
    }

    // ── Layer 3: Fallback ──
    return `${prefix}/notifications`;
}
