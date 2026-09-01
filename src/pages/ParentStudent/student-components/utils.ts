import type { ClassSessionResponse } from '../../../services/classSession.service';
import { parseUtc } from '../../../utils/datetime';
import type { StatusVariant } from '../../../components/shared';
import { isBookingCancelled, isBookingCompleted, reservedSessionsReason } from '../../../utils/bookingStatus';
import type { BookingProgress, StudentBookingsMap } from './types';

/** Buổi đã huỷ không được tính vào bất kỳ con số nào — kể cả mẫu số tiến trình. */
const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_noshow']);
/** Buổi đã MỞ và còn "sống" trên lịch: đã xếp lịch hoặc đang diễn ra. */
const ACTIVE_STATUSES = new Set(['scheduled', 'in_progress']);

const UNKNOWN_SUBJECT = 'Chưa rõ môn học';
const UNKNOWN_TUTOR = 'Chưa rõ gia sư';

/**
 * `ClassSessionResponse.studentId` là field phẳng mới; các deployment cũ chỉ có object `student`.
 * Đọc cả hai để một BE chưa cập nhật không làm rỗng toàn bộ số liệu.
 */
const readStudentId = (session: ClassSessionResponse): string | null =>
  session.studentId ?? session.student?.studentId ?? null;

const startMsOf = (session: ClassSessionResponse): number | null => parseUtc(session.scheduledStart)?.getTime() ?? null;

const endMsOf = (session: ClassSessionResponse): number | null => parseUtc(session.scheduledEnd)?.getTime() ?? null;

const trimmedOr = (value: string | undefined | null, fallback: string): string => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSessionInfo = (session: ClassSessionResponse) => ({
  classSessionId: session.classSessionId,
  scheduledStart: session.scheduledStart,
  scheduledEnd: session.scheduledEnd,
  subjectName: session.subject?.subjectName,
  tutorName: session.tutor?.fullName,
});

const startMsOfInfo = (info: { scheduledStart: string } | null): number | null =>
  info ? (parseUtc(info.scheduledStart)?.getTime() ?? null) : null;

/**
 * Gộp danh sách buổi học của TẤT CẢ các con thành tiến trình theo từng (con × booking).
 *
 * Quy ước đếm (khớp `MV.DomainLayer/Constants/ClassSessionStatus.cs`):
 *  - `completed`            → đã hoàn thành
 *  - `pending_confirmation` → chờ phụ huynh xác nhận (có hạn chót, ưu tiên hiển thị)
 *  - `scheduled`/`in_progress` mà giờ kết thúc còn ở tương lai → buổi đã mở, sắp tới
 *  - `reserved`             → buổi giữ chỗ, chưa mở (đếm riêng, xem BookingProgress.reserved)
 *  - `cancelled*`           → bỏ hẳn
 *
 * Buổi `scheduled` đã trôi qua (gia sư chưa gửi báo cáo) cố ý KHÔNG tính là "sắp tới", để thẻ
 * không hứa với phụ huynh một buổi không còn xảy ra. Các trạng thái còn lại (`no_show`,
 * `disputed`, `interrupted`) không vào con số nào — chúng thuộc luồng khiếu nại, có trang riêng.
 *
 * Thứ tự trả về trong từng con: khoá còn buổi đã mở sắp tới lên đầu (xếp theo buổi gần nhất), rồi
 * khoá còn buổi chờ mở, cuối cùng là khoá đã xong/đã huỷ — phụ huynh mở trang này để biết việc
 * đang diễn ra và việc cần làm, nên hai nhóm đó phải nằm trên.
 */
export function buildStudentBookings(sessions: ClassSessionResponse[], nowMs: number = Date.now()): StudentBookingsMap {
  const byStudent: Record<string, Map<number, BookingProgress>> = {};

  for (const session of sessions) {
    const studentId = readStudentId(session);
    if (!studentId) continue;

    const status = (session.status ?? '').toLowerCase();
    if (CANCELLED_STATUSES.has(status)) continue;

    const bookings = (byStudent[studentId] ??= new Map());
    const bookingId = session.bookingId ?? 0;

    let booking = bookings.get(bookingId);
    if (!booking) {
      booking = {
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
      bookings.set(bookingId, booking);
    }

    // Môn/gia sư/trạng thái booking giống nhau ở mọi buổi của cùng booking — lấy giá trị đầu tiên
    // đọc được, vì buổi bị huỷ (đã bỏ ở trên) có thể là buổi duy nhất mang đủ thông tin.
    if (booking.subjectName === UNKNOWN_SUBJECT) {
      booking.subjectName = trimmedOr(session.subject?.subjectName, UNKNOWN_SUBJECT);
    }
    if (booking.tutorName === UNKNOWN_TUTOR) {
      booking.tutorName = trimmedOr(session.tutor?.fullName, UNKNOWN_TUTOR);
    }
    if (!booking.bookingStatus) {
      const bookingStatus = (session.bookingStatus ?? '').trim().toLowerCase();
      if (bookingStatus) booking.bookingStatus = bookingStatus;
    }

    if (status === 'completed') booking.completed += 1;
    else if (status === 'pending_confirmation') {
      booking.pending += 1;
      // Giữ buổi CŨ NHẤT: hạn xác nhận tính từ lúc gia sư gửi báo cáo, nên buổi cũ nhất là buổi
      // sắp hết hạn trước tiên — cũng là buổi phụ huynh cần xử lý trước.
      const pendingStartMs = startMsOf(session);
      const currentPendingMs = startMsOfInfo(booking.nextPending);
      if (pendingStartMs !== null && (currentPendingMs === null || pendingStartMs < currentPendingMs)) {
        booking.nextPending = toSessionInfo(session);
      }
    }

    if (status === 'reserved') {
      booking.reserved += 1;
      const reservedStartMs = startMsOf(session);
      const currentMs = startMsOfInfo(booking.nextReserved);
      if (reservedStartMs !== null && (currentMs === null || reservedStartMs < currentMs)) {
        booking.nextReserved = toSessionInfo(session);
      }
      continue;
    }

    const endMs = endMsOf(session);
    if (!ACTIVE_STATUSES.has(status) || endMs === null || endMs < nowMs) continue;

    booking.upcoming += 1;
    const startMs = startMsOf(session);
    const currentNextMs = startMsOfInfo(booking.next);
    if (startMs !== null && (currentNextMs === null || startMs < currentNextMs)) {
      booking.next = toSessionInfo(session);
    }
  }

  const result: StudentBookingsMap = {};
  for (const [studentId, bookings] of Object.entries(byStudent)) {
    result[studentId] = [...bookings.values()].sort(compareBookings);
  }
  return result;
}

/**
 * Đang có buổi sắp tới → còn buổi chờ mở → đã xong → đã huỷ. Trong cùng bậc: buổi gần nhất trước,
 * rồi booking mới hơn trước.
 *
 * Khoá đã huỷ xuống cuối vì không còn việc gì để làm với nó — nhưng vẫn giữ trên trang, không ẩn:
 * phụ huynh cần thấy khoá mình từng đặt đã bị huỷ, nhất là khi con đã học vài buổi trong đó.
 */
function compareBookings(a: BookingProgress, b: BookingProgress): number {
  const rank = (x: BookingProgress) =>
    x.next ? 0 : x.reserved > 0 ? 1 : isBookingCancelled(x.bookingStatus) ? 3 : 2;
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;

  const aMs = startMsOfInfo(a.next ?? a.nextReserved);
  const bMs = startMsOfInfo(b.next ?? b.nextReserved);
  if (aMs !== null && bMs !== null && aMs !== bMs) return aMs - bMs;
  if (aMs !== null && bMs === null) return -1;
  if (aMs === null && bMs !== null) return 1;

  return b.bookingId - a.bookingId; // booking mới hơn lên trước
}

/** Ảnh cover cho thẻ — dùng chung bộ texture màu nước với thẻ lớp ở portal gia sư.
 *  Chỉ để trang trí; chọn theo bookingId nên mỗi khoá giữ nguyên ảnh giữa các lần render. */
const COVERS = ['/images/class-covers/cover-blue.jpg', '/images/class-covers/cover-green.jpg'];

export const coverForBooking = (bookingId: number): string => COVERS[Math.abs(bookingId) % COVERS.length];

/**
 * Tiến độ của MỘT khoá học.
 *
 * Mẫu số = số buổi còn hiệu lực của chính khoá đó: đã học + chờ xác nhận + đã mở sắp tới + chờ mở.
 * Cố ý KHÔNG lấy `total_sessions` của booking làm mẫu số — buổi đã trôi qua mà gia sư chưa gửi báo
 * cáo sẽ nằm im trong mẫu số và kéo tỉ lệ xuống, khiến thẻ báo con học chậm trong khi thực tế là
 * gia sư chậm chốt sổ.
 *
 * Buổi `pending_confirmation` và `reserved` nằm trong MẪU SỐ nhưng chưa vào tử số:
 *  - `pending_confirmation`: đã dạy xong, chờ phụ huynh bấm xác nhận → có nút riêng ngay trên thanh.
 *  - `reserved`: chưa mở, chờ trả nốt tiền. Nếu loại khỏi mẫu số thì thanh đạt 100% trong khi thẻ
 *    vẫn ghi "còn N buổi chờ mở" — hai câu tự phủ nhận nhau trong cùng một thẻ.
 */
export function bookingProgress(booking: BookingProgress): { done: number; total: number; percent: number } {
  const total = booking.completed + booking.pending + booking.upcoming + booking.reserved;
  return {
    done: booking.completed,
    total,
    percent: total <= 0 ? 0 : Math.round((booking.completed / total) * 100),
  };
}

/**
 * Nhãn trạng thái góc phải ảnh cover — bản đối ứng của `classStatusMeta` ở portal gia sư.
 *
 * KHÔNG có nhãn cho `pending_confirmation`: buổi chờ xác nhận đã có nguyên một nút hành động
 * trong thẻ, thêm tag chỉ lặp lại cùng thông tin ở dạng không bấm được.
 *
 * Nguồn cho nhãn "Hoàn thành" là TRẠNG THÁI BOOKING, không phải việc hết buổi đã mở — buổi 2..N
 * có thể đang `reserved` chờ trả nốt tiền. Xem utils/bookingStatus.ts.
 */
export function bookingStatusMeta(booking: BookingProgress): { label: string; variant: StatusVariant } {
  if (booking.upcoming > 0) return { label: 'Đang học', variant: 'success' };

  // Còn buổi giữ chỗ → khoá vẫn đang chạy, chỉ đang chờ một bước của phụ huynh.
  if (booking.reserved > 0) return { label: 'Chờ mở buổi tiếp', variant: 'warning' };

  if (isBookingCompleted(booking.bookingStatus)) return { label: 'Hoàn thành', variant: 'success' };
  if (isBookingCancelled(booking.bookingStatus)) return { label: 'Đã huỷ', variant: 'error' };

  if (booking.completed > 0 || booking.pending > 0) return { label: 'Đã học xong', variant: 'info' };
  return { label: 'Chưa có lịch', variant: 'neutral' };
}

/**
 * Nội dung dòng "Buổi kế tiếp". Không còn buổi đã mở thì nói LÝ DO thay vì in dấu "—": còn buổi
 * chờ mở / khoá đã hoàn thành / khoá đã huỷ là ba tình huống khác nhau, và hai trong số đó có
 * việc để phụ huynh làm.
 */
export function bookingNextSessionLabel(booking: BookingProgress): string {
  if (booking.next) return formatSessionSlot(booking.next.scheduledStart, booking.next.scheduledEnd);

  if (booking.reserved > 0) {
    const reason = reservedSessionsReason(booking.bookingStatus);
    return `${booking.reserved} buổi chờ mở${reason ? ` — ${reason}` : ''}`;
  }

  if (isBookingCompleted(booking.bookingStatus)) return 'Đã học xong toàn bộ khoá';
  if (isBookingCancelled(booking.bookingStatus)) return 'Khoá học đã huỷ';
  return '—';
}

/**
 * Ngày (YYYY-MM-DD theo giờ máy) để mở trang thời khoá biểu đúng tuần chứa buổi kế tiếp của khoá
 * này. Không truyền ngày thì trang luôn mở tuần hiện tại — buổi kế tiếp cách hai tuần là bấm vào
 * vẫn không thấy gì, phụ huynh phải tự lật lịch đi tìm.
 *
 * Chỉ neo theo buổi ĐÃ MỞ. Buổi giữ chỗ không hiện trên lịch, neo vào đó thì mở ra một tuần trống.
 */
export function bookingScheduleAnchor(booking: BookingProgress): string | null {
  if (!booking.next) return null;

  const date = parseUtc(booking.next.scheduledStart);
  if (!date) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Một nhóm trạng thái trong dải chip của chế độ Tổng quát. */
export interface StatusCount {
  label: string;
  variant: StatusVariant;
  count: number;
}

export interface StudentSummary {
  /** Buổi đã học / tổng buổi còn hiệu lực, tính trên các khoá CHƯA huỷ. */
  done: number;
  total: number;
  percent: number;
  /** Số khoá theo từng trạng thái — chỉ giữ nhóm có ít nhất một khoá. */
  statusCounts: StatusCount[];
  /** Khoá chứa buổi đã mở sớm nhất trên toàn bộ khoá của con. */
  nextBooking: BookingProgress | null;
  /** Tổng buổi chờ phụ huynh xác nhận, trên mọi khoá. */
  pending: number;
  /** Buổi chờ xác nhận cũ nhất trên mọi khoá — đích của nút nhắc ở chế độ Tổng quát. */
  pendingSessionId: number | null;
  /** Tổng buổi chờ mở và số khoá đang chờ mở. */
  reservedSessions: number;
  reservedCourses: number;
  /** Mọi khoá của con đều đã huỷ (và có ít nhất một khoá). */
  allCancelled: boolean;
}

/** Thứ tự chip trong dải Tổng quát — việc đang diễn ra và việc cần làm đứng trước. */
const SUMMARY_ORDER = ['Đang học', 'Chờ mở buổi tiếp', 'Hoàn thành', 'Đã học xong', 'Chưa có lịch', 'Đã huỷ'];

/**
 * Gộp các khoá của MỘT con thành số liệu cho chế độ Tổng quát.
 *
 * Thanh tiến độ chung CỐ Ý loại các khoá đã huỷ. Khoá đã huỷ chỉ còn lại đúng những buổi đã dạy,
 * nên nếu tính vào thì mẫu số bằng tử số: một con có 5 khoá đều bị huỷ, mỗi khoá dạy được 1 buổi,
 * sẽ hiện "Tiến độ chung 5/5 · 100%" trong khi thực tế chẳng còn gì đang chạy. Các khoá đó vẫn
 * xuất hiện đầy đủ ở chip "N đã huỷ" nên không có gì bị che.
 */
export function summarizeStudentBookings(bookings: BookingProgress[]): StudentSummary {
  const counts = new Map<string, StatusCount>();
  let done = 0;
  let total = 0;
  let pending = 0;
  let reservedSessions = 0;
  let reservedCourses = 0;
  let cancelledCourses = 0;
  let nextBooking: BookingProgress | null = null;
  let pendingSession: { classSessionId: number; scheduledStart: string } | null = null;

  for (const booking of bookings) {
    const meta = bookingStatusMeta(booking);
    const entry = counts.get(meta.label);
    if (entry) entry.count += 1;
    else counts.set(meta.label, { label: meta.label, variant: meta.variant, count: 1 });

    if (isBookingCancelled(booking.bookingStatus)) {
      cancelledCourses += 1;
    } else {
      const progress = bookingProgress(booking);
      done += progress.done;
      total += progress.total;
    }

    pending += booking.pending;
    if (booking.nextPending) {
      const currentMs = startMsOfInfo(pendingSession);
      const candidateMs = startMsOfInfo(booking.nextPending);
      if (candidateMs !== null && (currentMs === null || candidateMs < currentMs)) {
        pendingSession = booking.nextPending;
      }
    }
    if (booking.reserved > 0) {
      reservedSessions += booking.reserved;
      reservedCourses += 1;
    }

    if (booking.next) {
      const currentMs = startMsOfInfo(nextBooking?.next ?? null);
      const candidateMs = startMsOfInfo(booking.next);
      if (candidateMs !== null && (currentMs === null || candidateMs < currentMs)) nextBooking = booking;
    }
  }

  return {
    done,
    total,
    percent: total <= 0 ? 0 : Math.round((done / total) * 100),
    statusCounts: [...counts.values()].sort(
      (a, b) => SUMMARY_ORDER.indexOf(a.label) - SUMMARY_ORDER.indexOf(b.label),
    ),
    nextBooking,
    pending,
    pendingSessionId: pendingSession?.classSessionId ?? null,
    reservedSessions,
    reservedCourses,
    allCancelled: bookings.length > 0 && cancelledCourses === bookings.length,
  };
}

/**
 * Dòng "Buổi kế tiếp" của chế độ Tổng quát — gộp trên mọi khoá của con.
 * Cùng nguyên tắc với thẻ từng khoá: không có buổi đã mở thì nói LÝ DO, không in dấu "—".
 */
export function summaryNextSessionLabel(summary: StudentSummary): string {
  if (summary.nextBooking?.next) {
    const { next, subjectName, bookingId } = summary.nextBooking;
    return `${formatSessionSlot(next.scheduledStart, next.scheduledEnd)} · ${subjectName} (Mã lớp #${bookingId})`;
  }

  if (summary.reservedCourses > 0) {
    const courses = summary.reservedCourses > 1 ? ` ở ${summary.reservedCourses} khoá` : '';
    return `${summary.reservedSessions} buổi chờ mở${courses} — chờ thanh toán phần còn lại`;
  }

  if (summary.allCancelled) return 'Mọi khoá học đều đã huỷ';
  if (summary.done > 0) return 'Đã học xong các khoá hiện có';
  return '—';
}

/** Ngày để mở thời khoá biểu đúng tuần chứa buổi kế tiếp gần nhất của con. */
export function summaryScheduleAnchor(summary: StudentSummary): string | null {
  return summary.nextBooking ? bookingScheduleAnchor(summary.nextBooking) : null;
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
