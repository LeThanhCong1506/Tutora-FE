import type { StudentClassSessionSummaryResponse } from '../../../services/classSession.service';
import { parseUtc } from '../../../utils/datetime';
import type { StatusVariant } from '../../../components/shared';
import { isBookingCancelled, isBookingCompleted, reservedSessionsReason } from '../../../utils/bookingStatus';
import type { CourseProgress } from './types';

/**
 * Bản đối ứng cho học sinh của `ParentStudent/student-components/utils.ts`.
 *
 * Quy ước đếm và đơn vị gộp giữ NGUYÊN như bên phụ huynh (một khoá = một booking; khớp
 * `MV.DomainLayer/Constants/ClassSessionStatus.cs`), để cùng một buổi học không ra hai con số khác
 * nhau ở hai portal. Khác duy nhất: bên phụ huynh còn một tầng nhóm theo từng con, ở đây chỉ có
 * một học sinh nên các khoá nằm phẳng.
 */

/** Buổi đã huỷ không được tính vào bất kỳ con số nào — kể cả mẫu số tiến trình. */
const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_noshow']);
/** Buổi đã MỞ và còn "sống" trên lịch: đã xếp lịch hoặc đang diễn ra. */
const ACTIVE_STATUSES = new Set(['scheduled', 'in_progress']);

const UNKNOWN_SUBJECT = 'Chưa rõ môn học';
const UNKNOWN_TUTOR = 'Chưa rõ gia sư';

const trimmedOr = (value: string | undefined, fallback: string): string => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const startMsOf = (session: StudentClassSessionSummaryResponse): number | null =>
  session.scheduledStart ? (parseUtc(session.scheduledStart)?.getTime() ?? null) : null;

const endMsOf = (session: StudentClassSessionSummaryResponse): number | null =>
  session.scheduledEnd ? (parseUtc(session.scheduledEnd)?.getTime() ?? null) : null;

const startMsOfInfo = (info: { scheduledStart: string } | null): number | null =>
  info ? (parseUtc(info.scheduledStart)?.getTime() ?? null) : null;

const toSessionInfo = (session: StudentClassSessionSummaryResponse) => ({
  classSessionId: session.classSessionId,
  scheduledStart: session.scheduledStart ?? '',
  scheduledEnd: session.scheduledEnd ?? '',
});

/**
 * Gộp danh sách buổi học của học sinh thành tiến trình theo từng khoá (booking).
 *
 * Đếm:
 *  - `completed`            → đã hoàn thành
 *  - `pending_confirmation` → chờ học sinh xác nhận (ưu tiên hiển thị, có hành động kèm theo)
 *  - `scheduled`/`in_progress` mà giờ kết thúc còn ở tương lai → buổi đã mở, sắp tới
 *  - `reserved`             → buổi giữ chỗ, chưa mở (đếm riêng)
 *  - `cancelled*`           → bỏ hẳn, không vào cả tử số lẫn mẫu số
 *
 * Buổi `scheduled` đã trôi qua (gia sư chưa gửi báo cáo) cố ý KHÔNG tính là "sắp tới", để thẻ
 * không hứa một buổi không còn xảy ra. `no_show`/`disputed` không vào con số nào — chúng thuộc
 * luồng khiếu nại, đã có trang riêng.
 *
 * Thứ tự trả về: khoá đang có buổi sắp tới → khoá còn buổi chờ mở → khoá đã xong → khoá đã huỷ.
 * Học sinh mở trang này để biết "sắp tới học gì", nên việc đang diễn ra phải nằm trên.
 */
export function buildCourseProgress(
  sessions: StudentClassSessionSummaryResponse[],
  nowMs: number = Date.now(),
): CourseProgress[] {
  const courses = new Map<number, CourseProgress>();

  for (const session of sessions) {
    const status = (session.status ?? '').toLowerCase();
    if (CANCELLED_STATUSES.has(status)) continue;

    const bookingId = session.bookingId ?? 0;
    let course = courses.get(bookingId);
    if (!course) {
      course = {
        bookingId,
        bookingStatus: undefined,
        subjectName: UNKNOWN_SUBJECT,
        tutorName: UNKNOWN_TUTOR,
        completed: 0,
        upcoming: 0,
        pending: 0,
        reserved: 0,
        next: null,
        nextReserved: null,
        nextPending: null,
      };
      courses.set(bookingId, course);
    }

    // Môn/gia sư/trạng thái booking giống nhau ở mọi buổi của cùng booking — lấy giá trị đầu tiên
    // đọc được, vì buổi đã bị bỏ ở trên có thể là buổi duy nhất mang đủ thông tin.
    if (course.subjectName === UNKNOWN_SUBJECT) {
      course.subjectName = trimmedOr(session.subjectName, UNKNOWN_SUBJECT);
    }
    if (course.tutorName === UNKNOWN_TUTOR) {
      course.tutorName = trimmedOr(session.tutorName, UNKNOWN_TUTOR);
    }
    if (!course.bookingStatus) {
      const bookingStatus = (session.bookingStatus ?? '').trim().toLowerCase();
      if (bookingStatus) course.bookingStatus = bookingStatus;
    }

    if (status === 'completed') course.completed += 1;
    else if (status === 'pending_confirmation') {
      course.pending += 1;
      // Giữ buổi CŨ NHẤT: hạn xác nhận tính từ lúc gia sư gửi báo cáo, nên buổi cũ nhất sắp hết
      // hạn trước tiên — cũng là buổi cần xử lý trước.
      const pendingStartMs = startMsOf(session);
      const currentPendingMs = startMsOfInfo(course.nextPending);
      if (pendingStartMs !== null && (currentPendingMs === null || pendingStartMs < currentPendingMs)) {
        course.nextPending = toSessionInfo(session);
      }
    }

    if (status === 'reserved') {
      course.reserved += 1;
      const reservedStartMs = startMsOf(session);
      const currentMs = startMsOfInfo(course.nextReserved);
      if (reservedStartMs !== null && (currentMs === null || reservedStartMs < currentMs)) {
        course.nextReserved = toSessionInfo(session);
      }
      continue;
    }

    const endMs = endMsOf(session);
    if (!ACTIVE_STATUSES.has(status) || endMs === null || endMs < nowMs) continue;

    course.upcoming += 1;
    const startMs = startMsOf(session);
    const currentNextMs = startMsOfInfo(course.next);
    if (startMs !== null && (currentNextMs === null || startMs < currentNextMs)) {
      course.next = toSessionInfo(session);
    }
  }

  return [...courses.values()].sort(compareCourses);
}

/** Đang có buổi sắp tới → còn buổi chờ mở → đã xong → đã huỷ. Cùng bậc: buổi gần nhất trước. */
function compareCourses(a: CourseProgress, b: CourseProgress): number {
  const rank = (x: CourseProgress) =>
    x.next ? 0 : x.reserved > 0 ? 1 : isBookingCancelled(x.bookingStatus) ? 3 : 2;
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;

  const aMs = startMsOfInfo(a.next ?? a.nextReserved);
  const bMs = startMsOfInfo(b.next ?? b.nextReserved);
  if (aMs !== null && bMs !== null && aMs !== bMs) return aMs - bMs;
  if (aMs !== null && bMs === null) return -1;
  if (aMs === null && bMs !== null) return 1;

  return b.bookingId - a.bookingId; // khoá mới hơn lên trước
}

/** Ảnh cover cho thẻ — dùng chung bộ texture màu nước với thẻ lớp ở portal gia sư/phụ huynh. */
const COVERS = ['/images/class-covers/cover-blue.jpg', '/images/class-covers/cover-green.jpg'];

export const coverForCourse = (bookingId: number): string => COVERS[Math.abs(bookingId) % COVERS.length];

/**
 * Tiến độ của một khoá.
 *
 * Mẫu số = số buổi còn hiệu lực của chính khoá đó: đã học + chờ xác nhận + đã mở sắp tới + chờ mở.
 * Cố ý không lấy "tổng buổi đã đặt" của booking làm mẫu số — buổi đã trôi qua mà gia sư chưa gửi
 * báo cáo sẽ nằm im trong mẫu số và kéo tỉ lệ xuống, khiến thẻ báo học chậm trong khi thực tế là
 * gia sư chậm chốt sổ.
 *
 * Buổi `pending_confirmation` và `reserved` nằm trong MẪU SỐ nhưng chưa vào tử số:
 *  - `pending_confirmation`: đã học xong, chờ bấm xác nhận → có nút riêng ngay trên thanh.
 *  - `reserved`: chưa mở, chờ trả nốt tiền. Nếu loại khỏi mẫu số thì thanh đạt 100% trong khi thẻ
 *    vẫn ghi "còn N buổi chờ mở" — hai câu tự phủ nhận nhau trong cùng một thẻ.
 */
export function courseProgressBar(course: CourseProgress): { done: number; total: number; percent: number } {
  const total = course.completed + course.pending + course.upcoming + course.reserved;
  return {
    done: course.completed,
    total,
    percent: total <= 0 ? 0 : Math.round((course.completed / total) * 100),
  };
}

/** Khoá đã huỷ — dùng để bỏ thanh tiến độ (mẫu số lúc đó chỉ còn buổi đã dạy nên thanh luôn đầy
 *  100%, đọc cạnh nhãn "Đã huỷ" thành tự phủ nhận nhau). */
export function isCourseCancelled(course: CourseProgress): boolean {
  return isBookingCancelled(course.bookingStatus);
}

/**
 * Nhãn trạng thái góc phải ảnh cover. Giữ đúng bộ nhãn của bên phụ huynh, kể cả việc KHÔNG có
 * nhãn riêng cho `pending_confirmation`: buổi chờ xác nhận đã có nguyên một nút hành động trong
 * thẻ, thêm tag chỉ lặp lại cùng thông tin ở dạng không bấm được.
 *
 * Nguồn cho nhãn "Hoàn thành" là TRẠNG THÁI BOOKING, không phải việc hết buổi đã mở — buổi 2..N
 * có thể đang `reserved` chờ trả nốt tiền. Xem utils/bookingStatus.ts.
 */
export function courseStatusMeta(course: CourseProgress): { label: string; variant: StatusVariant } {
  if (course.upcoming > 0) return { label: 'Đang học', variant: 'success' };

  // Còn buổi giữ chỗ → khoá vẫn đang chạy, chỉ đang chờ thanh toán phần còn lại.
  if (course.reserved > 0) return { label: 'Chờ mở buổi tiếp', variant: 'warning' };

  if (isBookingCompleted(course.bookingStatus)) return { label: 'Hoàn thành', variant: 'success' };
  if (isBookingCancelled(course.bookingStatus)) return { label: 'Đã huỷ', variant: 'error' };

  if (course.completed > 0 || course.pending > 0) return { label: 'Đã học xong', variant: 'info' };
  return { label: 'Chưa có lịch', variant: 'neutral' };
}

/**
 * Nội dung dòng "Buổi kế tiếp". Không còn buổi đã mở thì nói LÝ DO thay vì in dấu "—".
 */
export function nextSessionLabel(course: CourseProgress): string {
  if (course.next) return formatSessionSlot(course.next.scheduledStart, course.next.scheduledEnd);

  if (course.reserved > 0) {
    const reason = reservedSessionsReason(course.bookingStatus);
    return `${course.reserved} buổi chờ mở${reason ? ` — ${reason}` : ''}`;
  }

  if (isBookingCompleted(course.bookingStatus)) return 'Đã học xong toàn bộ khoá';
  if (isBookingCancelled(course.bookingStatus)) return 'Khoá học đã huỷ';
  return '—';
}

/**
 * Ngày (YYYY-MM-DD theo giờ máy) để mở thời khoá biểu đúng tuần chứa buổi kế tiếp của khoá này.
 * Chỉ neo theo buổi ĐÃ MỞ — buổi giữ chỗ không hiện trên lịch, neo vào đó chỉ mở ra tuần trống.
 */
export function scheduleAnchorDate(course: CourseProgress): string | null {
  if (!course.next) return null;

  const date = parseUtc(course.next.scheduledStart);
  if (!date) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * "Hôm nay · 19:00 – 20:30" / "T5, 21/08 · 19:00 – 20:30".
 * Ngày tương đối chỉ dùng cho hôm nay/ngày mai — xa hơn thì cần thấy ngày cụ thể.
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

/** Hai chữ cái đầu của tên môn, làm huy hiệu tròn đứng đầu thẻ. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
