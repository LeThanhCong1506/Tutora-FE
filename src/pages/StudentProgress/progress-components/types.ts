export interface NextSessionInfo {
  classSessionId: number;
  scheduledStart: string;
  scheduledEnd: string;
}

/**
 * Tiến trình của MỘT khoá học (một booking) của học sinh, suy hoàn toàn từ
 * `GET /api/student/class-sessions`.
 *
 * Đơn vị là BOOKING, KHÔNG phải (môn × gia sư). Trước đây gộp theo môn × gia sư nên hai lần đặt
 * cùng môn với cùng gia sư dồn thành một thẻ — cùng dữ liệu mà bên phụ huynh thấy 2 khoá còn bên
 * học sinh thấy 1, và thanh tiến độ lại trộn hai lần mua thành một mẫu số. Giữ đúng một đơn vị
 * (booking) ở cả hai portal thì cùng một buổi học không bao giờ ra hai con số khác nhau.
 * Xem `ParentStudent/student-components/types.ts`.
 */
export interface CourseProgress {
  bookingId: number;
  /** Trạng thái booking (`completed`, `pending_remaining_payment`, `deposit_paid`…). */
  bookingStatus?: string;
  subjectName: string;
  tutorName: string;
  /** Buổi đã hoàn thành (`completed`). */
  completed: number;
  /** Buổi `scheduled`/`in_progress` đã mở và còn ở phía trước. */
  upcoming: number;
  /** Buổi `pending_confirmation` — học sinh phải xác nhận thì gia sư mới được nhận tiền. */
  pending: number;
  /**
   * Buổi `reserved` — đã tạo sẵn lúc đặt lịch nhưng CHƯA mở, chờ thanh toán phần còn lại.
   * Không vào tử số tiến độ, nhưng CÓ trong mẫu số: nếu loại hẳn thì thẻ tự mâu thuẫn
   * ("12/12 · 100%" đứng cạnh "20 buổi chờ mở"). Xem utils/bookingStatus.ts.
   */
  reserved: number;
  /** Buổi đã mở, sắp tới gần nhất — nội dung chính của thẻ. */
  next: NextSessionInfo | null;
  /** Buổi giữ chỗ sớm nhất — chỉ để nói lý do, chưa phải lịch chắc chắn. */
  nextReserved: NextSessionInfo | null;
  /**
   * Buổi `pending_confirmation` CŨ NHẤT — buổi sắp hết hạn xác nhận trước tiên.
   *
   * Cần `classSessionId` để nút "N buổi chờ bạn xác nhận" dẫn thẳng tới trang chi tiết buổi đó
   * (`/student-portal/calendar/{id}`), vì nút Xác nhận CHỈ có ở trang chi tiết.
   */
  nextPending: NextSessionInfo | null;
}
