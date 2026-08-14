import type { ClassSessionResponse } from '../../../services/classSession.service';
import { parseUtc } from '../../../utils/datetime';
import type { StudentInsight, StudentInsightMap } from './types';

/** Buổi đã huỷ không được tính vào bất kỳ con số nào — kể cả mẫu số tiến trình. */
const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_noshow']);
/** Buổi còn "sống" trên lịch: đã xếp lịch hoặc đang diễn ra. */
const ACTIVE_STATUSES = new Set(['scheduled', 'in_progress']);

export const EMPTY_INSIGHT: StudentInsight = {
  completed: 0,
  upcoming: 0,
  pending: 0,
  next: null,
};

/**
 * `ClassSessionResponse.studentId` là field phẳng mới; các deployment cũ chỉ có object `student`.
 * Đọc cả hai để một BE chưa cập nhật không làm rỗng toàn bộ số liệu.
 */
const readStudentId = (session: ClassSessionResponse): string | null =>
  session.studentId ?? session.student?.studentId ?? null;

const startMsOf = (session: ClassSessionResponse): number | null => parseUtc(session.scheduledStart)?.getTime() ?? null;

const endMsOf = (session: ClassSessionResponse): number | null => parseUtc(session.scheduledEnd)?.getTime() ?? null;

/**
 * Gộp danh sách buổi học của TẤT CẢ các con thành số liệu theo từng studentId.
 *
 * Quy ước đếm (khớp `MV.DomainLayer/Constants/ClassSessionStatus.cs`):
 *  - `completed`            → đã hoàn thành
 *  - `pending_confirmation` → chờ phụ huynh xác nhận (có hạn chót, ưu tiên hiển thị)
 *  - `scheduled`/`in_progress` mà giờ kết thúc còn ở tương lai → sắp tới
 *  - `cancelled*`           → bỏ hẳn
 * Buổi `scheduled` đã trôi qua (gia sư chưa gửi báo cáo) cố ý KHÔNG tính là "sắp tới", để card
 * không hứa với phụ huynh một buổi không có thật. Các trạng thái còn lại (`no_show`, `disputed`)
 * không vào con số nào — chúng thuộc luồng khiếu nại, có trang riêng.
 */
export function buildStudentInsights(sessions: ClassSessionResponse[], nowMs: number = Date.now()): StudentInsightMap {
  const insights: StudentInsightMap = {};

  for (const session of sessions) {
    const studentId = readStudentId(session);
    if (!studentId) continue;

    const status = (session.status ?? '').toLowerCase();
    if (CANCELLED_STATUSES.has(status)) continue;

    const insight = (insights[studentId] ??= { ...EMPTY_INSIGHT });

    if (status === 'completed') insight.completed += 1;
    else if (status === 'pending_confirmation') insight.pending += 1;

    const endMs = endMsOf(session);
    if (!ACTIVE_STATUSES.has(status) || endMs === null || endMs < nowMs) continue;

    insight.upcoming += 1;
    const startMs = startMsOf(session);
    const currentNextMs = insight.next ? (parseUtc(insight.next.scheduledStart)?.getTime() ?? null) : null;
    if (startMs !== null && (currentNextMs === null || startMs < currentNextMs)) {
      insight.next = {
        classSessionId: session.classSessionId,
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        subjectName: session.subject?.subjectName,
        tutorName: session.tutor?.fullName,
      };
    }
  }

  return insights;
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * "Hôm nay · 19:00 – 20:30" / "T5, 21/08 · 19:00 – 20:30".
 * Ngày tương đối chỉ dùng cho hôm nay/ngày mai — xa hơn thì phụ huynh cần thấy ngày cụ thể.
 */
export function formatSessionSlot(startIso: string, endIso: string): string {
  const start = parseUtc(startIso);
  if (!start) return '';
  const end = parseUtc(endIso);

  const dayDiff = Math.round((startOfDay(start) - startOfDay(new Date())) / 86_400_000);
  const dayLabel =
    dayDiff === 0
      ? 'Hôm nay'
      : dayDiff === 1
        ? 'Ngày mai'
        : `${WEEKDAY_LABELS[start.getDay()]}, ${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;

  const time = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const endTime = end?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return `${dayLabel} · ${time}${endTime ? ` – ${endTime}` : ''}`;
}

/** Hai chữ cái đầu để làm avatar chữ khi học sinh chưa có ảnh. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Dòng phụ dưới tên: "Lớp 7 · THPT Nguyễn Huệ" — bỏ qua phần chưa có dữ liệu.
 * Cố ý không kèm tuổi: phụ huynh đã biết tuổi con, thêm vào chỉ làm dài dòng meta.
 */
export function buildStudentMeta(student: { gradeLevel?: string | null; school?: string | null }): string {
  return [student.gradeLevel, student.school]
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(' · ');
}
