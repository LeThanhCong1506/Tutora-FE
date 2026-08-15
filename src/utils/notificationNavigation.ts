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
    LessonScheduleChange: 'lesson_schedule_change',
    LessonConfirmed: 'lesson_confirmed',
    LessonConfirmDeadline: 'lesson_confirm_deadline',
    LessonReminder: 'lesson_reminder',
    LessonRecordingReady: 'lesson_recording_ready',
    LessonVideoSummaryReady: 'lesson_video_summary_ready',
    LessonReportAiFillReady: 'lesson_report_ai_fill_ready',
    RescheduleProposed: 'reschedule_proposed',
    RescheduleAccepted: 'reschedule_accepted',
    RescheduleRejected: 'reschedule_rejected',
    RescheduleExpired: 'reschedule_expired',
    BookingNew: 'booking_new',
    BookingAccepted: 'booking_accepted',
    BookingDeclined: 'booking_declined',
    BookingCancelled: 'booking_cancelled',
    PaymentSuccess: 'payment_success',
    PaymentRemainingRequired: 'payment_remaining_required',
    WithdrawalRequest: 'withdrawal_request',
    BookingPaymentDueSoon: 'booking_payment_due_soon',
    FeedbackRequest: 'feedback_request',
    FeedbackReply: 'feedback_reply',
    FeedbackReceived: 'feedback_received',
    FeedbackModerated: 'feedback_moderated',
    Warning: 'warning',
    Message: 'message',
    SupportMessage: 'support_message',
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
    const lessonDetailPath = (lessonId: string) =>
        prefix === '/student-portal'
            ? `${prefix}/calendar/${lessonId}`
            : prefix === '/tutor-portal'
                ? `${prefix}/class-sessions/${lessonId}`
                : `${prefix}/lessons/${lessonId}`;
    const lessonListPath =
        prefix === '/student-portal'
            ? `${prefix}/calendar`
            : prefix === '/tutor-portal'
                ? `${prefix}/schedule`
                : `${prefix}/lessons`;

    // ── Layer 1: Type + Referenceid (deep-link chính xác) ──
    if (type === NOTIFICATION_TYPE.LessonScheduleChange && refId) {
        return prefix === '/parent-portal'
            ? lessonDetailPath(refId)
            : `/session-lobby/${refId}`;
    }
    if ((type === NOTIFICATION_TYPE.LessonCheckin
        || type === NOTIFICATION_TYPE.LessonReport
        || type === NOTIFICATION_TYPE.LessonConfirmed
        || type === NOTIFICATION_TYPE.LessonConfirmDeadline
        || type === NOTIFICATION_TYPE.LessonNoShow
        || type === NOTIFICATION_TYPE.LessonRecordingReady
        || type === NOTIFICATION_TYPE.LessonVideoSummaryReady
        || type === NOTIFICATION_TYPE.LessonReportAiFillReady) && refId) {
        return lessonDetailPath(refId);
    }
    if ((type === NOTIFICATION_TYPE.RescheduleProposed
        || type === NOTIFICATION_TYPE.RescheduleAccepted
        || type === NOTIFICATION_TYPE.RescheduleRejected
        || type === NOTIFICATION_TYPE.RescheduleExpired) && refId) {
        return lessonDetailPath(refId);
    }
    // Nhắc sắp tới giờ học: tutor/student bấm vào là vào thẳng phòng học; phụ huynh không có
    // UI vào học nên vẫn dẫn về trang chi tiết như LessonScheduleChange.
    if (type === NOTIFICATION_TYPE.LessonReminder && refId) {
        return prefix === '/parent-portal'
            ? lessonDetailPath(refId)
            : `/session-lobby/${refId}`;
    }
    if ((type === NOTIFICATION_TYPE.BookingNew
        || type === NOTIFICATION_TYPE.BookingAccepted
        || type === NOTIFICATION_TYPE.BookingDeclined
        || type === NOTIFICATION_TYPE.BookingCancelled
        || type === NOTIFICATION_TYPE.PaymentRemainingRequired
        || type === NOTIFICATION_TYPE.BookingPaymentDueSoon) && refId) {
        // Tutor portal hiện xử lý yêu cầu trực tiếp trên trang danh sách và không có
        // route `bookings/:id`, nên không tạo deep-link dẫn tới trang 404.
        if (prefix === '/tutor-portal') return `${prefix}/bookings`;
        return `${prefix}/booking/${refId}`;
    }
    // Đánh giá khóa học nằm trên trang chi tiết booking, cho cả parent lẫn student portal.
    // Gia sư không nhận hai loại này nên không cần nhánh riêng cho tutor-portal.
    if ((type === NOTIFICATION_TYPE.FeedbackRequest
        || type === NOTIFICATION_TYPE.FeedbackReply) && refId) {
        return `${prefix}/booking/${refId}`;
    }
    // Đánh giá mới / bị ẩn / hiện lại: gia sư về danh sách booking vì tutor portal không có
    // route `booking/:id`; phụ huynh và học sinh vào thẳng chi tiết booking để đọc lý do.
    if (type === NOTIFICATION_TYPE.FeedbackReceived
        || type === NOTIFICATION_TYPE.FeedbackModerated) {
        if (prefix === '/tutor-portal') return `${prefix}/bookings`;
        return refId ? `${prefix}/booking/${refId}` : lessonListPath;
    }
    if (type === NOTIFICATION_TYPE.Message && refId) {
        return `${prefix}/messages`;
    }
    if (type === NOTIFICATION_TYPE.SupportMessage) {
        return prefix === '/student-portal' ? `${prefix}/messages` : `${prefix}/support`;
    }

    if (type === NOTIFICATION_TYPE.WithdrawalRequest) {
        if (prefix === '/tutor-portal') return `${prefix}/finance/withdrawals`;
        if (prefix === '/parent-portal' || prefix === '/student-portal') return `${prefix}/wallet/withdrawals`;
    }
    // ── Layer 2: Keyword fallback (cho notification cũ chưa có type) ──

    // Lesson-specific keywords → ưu tiên nếu match được lessonId trong message hoặc referenceid
    const isLessonTitle = title.includes('buổi học đã bắt đầu')
        || title.includes('báo cáo buổi học')
        || title.includes('xác nhận buổi học');
    if (isLessonTitle) {
        // Nếu BE đã truyền referenceid mà chưa truyền type → vẫn dùng được
        if (refId) return lessonDetailPath(refId);
        // Best-effort: parse lessonId từ message (vd "#123")
        const idMatch = message.match(/#(\d+)/);
        if (idMatch) return lessonDetailPath(idMatch[1]);
        return lessonListPath;
    }

    if (combined.includes('rút tiền') || combined.includes('withdrawal')) {
        if (prefix === '/tutor-portal') return `${prefix}/finance/withdrawals`;
        if (prefix === '/parent-portal' || prefix === '/student-portal') return `${prefix}/wallet/withdrawals`;
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
        return lessonListPath;
    }

    // ── Layer 3: Fallback ──
    return `${prefix}/notifications`;
}
