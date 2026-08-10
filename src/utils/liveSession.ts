/**
 * Mirror rule mở phòng Agora của BE (`AgoraController.GetRoomInfo`):
 * phòng mở 24/7 — KHÔNG còn chặn theo khung giờ. BE chỉ chặn theo TRẠNG THÁI buổi học.
 *
 * FE hiện nút "Vào lớp" khi buổi học là online (có meetingLink) và trạng thái là:
 *  - đã lên lịch (scheduled), hoặc
 *  - đang diễn ra (in_progress).
 * Các trạng thái khác (reserved, pending_confirmation, completed, cancelled, no_show...)
 * đều ẩn nút — khớp với việc BE trả 400 "Phòng học không khả dụng".
 */
export interface JoinableLesson {
    status?: string | null;
    meetingLink?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    /** Buổi đã check-out → BE đóng phòng vĩnh viễn (kể cả khi status còn in_progress). */
    checkOutTime?: string | null;
}

export function canJoinLiveSession(lesson: JoinableLesson): boolean {
    if (!lesson.meetingLink) return false; // buổi offline (tại nhà) không có phòng online
    if (lesson.checkOutTime) return false; // đã kết thúc — BE trả lobbyClosed/"Buổi học đã kết thúc"

    const status = lesson.status?.toLowerCase();
    return status === 'scheduled' || status === 'in_progress';
}

/**
 * Còn bao nhiêu phút nữa mới coi là "gần tới giờ học" — khớp đúng `EarlyJoinToleranceMinutes`
 * mà BE dùng để quyết có bật cổng xác nhận vào học ngoài giờ hay không
 * (`ClassSessionScheduleChangeService.cs`). Cố tình khớp số này để nhãn nút không "nói dối":
 * nếu FE đã hiện "Vào học" (tức đang trong khung này) thì bấm vào chắc chắn được vào thẳng,
 * không bị BE hỏi xác nhận ngoài giờ.
 */
const JOIN_WINDOW_TOLERANCE_MINUTES = 15;

/** True khi đã trong khung ±15 phút quanh giờ học — dùng để đổi nhãn nút vào học và hiện badge trạng thái. */
export function isWithinJoinWindow(scheduledStart?: string | null, toleranceMinutes = JOIN_WINDOW_TOLERANCE_MINUTES): boolean {
    if (!scheduledStart) return false;
    const start = new Date(scheduledStart).getTime();
    if (Number.isNaN(start)) return false;
    return Date.now() >= start - toleranceMinutes * 60_000;
}
