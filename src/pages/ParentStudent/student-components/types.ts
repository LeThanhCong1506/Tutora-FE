import type { StudentType } from '../../../types/student.type';

export interface NextSessionInfo {
  classSessionId: number;
  scheduledStart: string;
  scheduledEnd: string;
  subjectName?: string;
  tutorName?: string;
}

/**
 * Tiến trình của MỘT khoá học (một booking) của một con, suy hoàn toàn từ
 * `GET /api/parent/class-sessions`. Chỉ giữ đúng những gì thẻ cần — mọi con số đều có nguồn thật.
 *
 * Vì sao đơn vị là BOOKING chứ không phải con: một con có thể có nhiều khoá cùng lúc (Toán với
 * cô A, Lý với thầy B, và có khi hai lần đặt cùng một môn). Gộp tất cả vào một thanh tiến độ cho
 * ra con số kiểu "12/32" đúng về phép cộng nhưng không trả lời được câu phụ huynh thật sự hỏi:
 * "khoá Toán của con đang đi tới đâu, khoá nào cần tôi thanh toán tiếp".
 */
export interface BookingProgress {
  bookingId: number;
  /** Trạng thái booking (`completed`, `pending_remaining_payment`, `deposit_paid`…). */
  bookingStatus?: string;
  subjectName: string;
  tutorName: string;
  /** Buổi đã hoàn thành (`completed`). */
  completed: number;
  /** Buổi `scheduled`/`in_progress` đã mở và còn ở phía trước. */
  upcoming: number;
  /** Buổi `pending_confirmation` — phụ huynh phải xác nhận thì gia sư mới được nhận tiền. */
  pending: number;
  /**
   * Buổi `reserved` — đã tạo sẵn lúc đặt lịch nhưng CHƯA mở, chờ trả nốt tiền. Không vào tử số
   * tiến độ, nhưng CÓ trong mẫu số: nếu loại hẳn thì thẻ tự mâu thuẫn ("12/12 · 100%" đứng cạnh
   * "20 buổi chờ mở"). Xem utils/bookingStatus.ts.
   */
  reserved: number;
  /** Buổi đã mở, sắp tới gần nhất — nội dung chính của thẻ. */
  next: NextSessionInfo | null;
  /** Buổi giữ chỗ sớm nhất — chỉ để nói lý do, chưa phải lịch chắc chắn. */
  nextReserved: NextSessionInfo | null;
  /**
   * Buổi `pending_confirmation` CŨ NHẤT — tức buổi sắp hết hạn xác nhận trước tiên.
   *
   * Cần `classSessionId` để nút "N buổi chờ bạn xác nhận" dẫn thẳng tới trang chi tiết buổi đó
   * (`/parent-portal/lessons/{id}`), vì nút Xác nhận CHỈ có ở trang chi tiết — danh sách thời
   * khoá biểu không có nút nào để bấm.
   */
  nextPending: NextSessionInfo | null;
}

/** Các khoá học của từng con, khoá theo `studentId`. */
export type StudentBookingsMap = Record<string, BookingProgress[]>;

export interface StudentWithBookings {
  student: StudentType;
  /** Các khoá học của con này, khoá đang chạy xếp trước. Rỗng khi con chưa đặt khoá nào. */
  bookings: BookingProgress[];
}
