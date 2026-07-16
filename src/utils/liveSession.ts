/**
 * Mirror rule mở phòng Agora của BE (`AgoraController.GetRoomInfo`):
 * phòng mở từ 30 phút trước giờ bắt đầu, KHÔNG cần gia sư check-in trước —
 * ai thuộc buổi học vào trước cũng được.
 *
 * FE chỉ hiện nút "Vào lớp" khi buổi học là online (có meetingLink) và:
 *  - đang diễn ra (in_progress), hoặc
 *  - đã lên lịch (scheduled) và hiện tại nằm trong khung [start − 30ph, end].
 * (BE cho phép tới end + 4h, nhưng UI không mời vào phòng của buổi chưa từng
 * bắt đầu sau khi đã hết giờ.)
 */
export const ROOM_OPENS_BEFORE_MINUTES = 30;

export interface JoinableLesson {
    status?: string | null;
    meetingLink?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
}

export function canJoinLiveSession(lesson: JoinableLesson): boolean {
    if (!lesson.meetingLink) return false; // buổi offline (tại nhà) không có phòng online

    const status = lesson.status?.toLowerCase();
    if (status === 'in_progress') return true;
    if (status !== 'scheduled') return false;

    if (!lesson.scheduledStart || !lesson.scheduledEnd) return false;
    const now = Date.now();
    const opensAt = new Date(lesson.scheduledStart).getTime() - ROOM_OPENS_BEFORE_MINUTES * 60_000;
    const closesAt = new Date(lesson.scheduledEnd).getTime();
    return now >= opensAt && now <= closesAt;
}
