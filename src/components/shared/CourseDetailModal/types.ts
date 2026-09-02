import type { StatusVariant } from '../StatusBadge';

/**
 * Buổi học ở mức tối thiểu mà modal cần đọc.
 *
 * Cố ý KHÔNG dùng thẳng một DTO nào của service: portal học sinh tải
 * `StudentClassSessionSummaryResponse` còn portal phụ huynh tải `ClassSessionResponse` — hai
 * kiểu khác nhau nhưng đều gán được vào kiểu cấu trúc này, nên modal dùng chung được cho cả hai
 * mà không phải map dữ liệu thêm một lần nữa.
 */
export interface CourseSessionLike {
  classSessionId: number;
  status?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  /** Buổi phụ (Link 2) — sinh ra khi buổi gốc bị báo ngắt giữa chừng. */
  isContinuation?: boolean;
  /** Buổi học lại (Link 3) — sinh ra khi hoà giải khiếu nại chọn "học lại". */
  isDisputeRelearn?: boolean;
  /** Buổi gốc mà buổi phụ/học lại trỏ về — undefined nếu đây chính là buổi gốc. */
  originalClassSessionId?: number;
}

/**
 * Số liệu của MỘT khoá học, đã được trang gọi tính sẵn.
 *
 * Modal không tự đếm lại: trang học sinh và trang phụ huynh mỗi bên đã có hàm gộp riêng
 * (`buildCourseProgress` / `buildStudentBookings`) và thẻ trên trang đang hiển thị đúng những
 * con số đó. Đếm lại ở đây chỉ tạo ra cơ hội cho thẻ và modal nói hai con số khác nhau.
 */
export interface CourseDetailSummary {
  bookingId: number;
  subjectName: string;
  tutorName: string;
  /** Nhãn trạng thái khoá học, lấy từ chính hàm sinh nhãn của thẻ trên trang. */
  statusLabel: string;
  statusVariant: StatusVariant;
  /** Tử số / mẫu số / phần trăm của thanh tiến độ — giống hệt thẻ. */
  completed: number;
  total: number;
  percent: number;
  /** Buổi chờ người học xác nhận. */
  pending: number;
  /** Buổi giữ chỗ, chưa mở. */
  reserved: number;
  /** Buổi đang treo (khiếu nại, vắng mặt, bị ngắt, hoặc đã qua giờ mà chưa có báo cáo). */
  onHold: number;
  /** Dòng "Buổi kế tiếp" — cũng lấy từ hàm của thẻ để hai chỗ không lệch nhau. */
  nextSessionLabel: string;
  /** Tên con — chỉ portal phụ huynh truyền, vì một phụ huynh có thể có nhiều con. */
  studentName?: string;
  /** Khoá đã huỷ: bỏ thanh tiến độ (mẫu số lúc đó chỉ còn buổi đã dạy nên luôn đầy 100%). */
  cancelled?: boolean;
}
