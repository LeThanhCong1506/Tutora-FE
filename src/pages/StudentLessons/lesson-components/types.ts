import type { Dayjs } from 'dayjs';

export type LessonViewMode = 'calendar' | 'grid' | 'list';
export type StatusFilter = '' | 'scheduled' | 'pending_confirmation' | 'completed';

export interface LessonSummary {
  lessonId: number;
  scheduledStart: string;
  scheduledEnd: string;
  tutorName?: string;
  subjectName?: string;
  status: string;
  meetingLink?: string;
  /** Booking chứa buổi học — trang lịch của gia sư dùng để mở chi tiết lớp. */
  bookingId?: number;
  /**
   * Giờ check-out. Buổi in_progress ĐÃ có checkOutTime = phòng đã đóng vĩnh viễn,
   * chỉ còn chờ gia sư gửi báo cáo → ẩn nút "Vào lớp", badge "Chờ gửi báo cáo".
   */
  checkOutTime?: string;
  /**
   * Đường dẫn tới nơi gửi báo cáo buổi học — chỉ trang lịch GIA SƯ set. Khi buổi
   * đang chờ báo cáo, nút "Vào lớp" được thay bằng link "Gửi báo cáo" tới đây.
   */
  reportPath?: string;
  /**
   * Người "đối diện" hiển thị trên card/tooltip: học sinh thấy gia sư (mặc định),
   * gia sư thấy học sinh. Không set thì fallback về tutorName như cũ.
   */
  counterpartLabel?: string;
  counterpartName?: string;
  /**
   * Người liên quan thứ hai, hiện thêm trên card lưới/danh sách và tooltip. Phụ huynh xem lịch
   * chung của nhiều con: counterpart là con, secondary là gia sư (và ngược lại khi lọc theo 1 con).
   */
  secondaryLabel?: string;
  secondaryName?: string;
  /**
   * Người đang xem có quyền vào phòng học không. Mặc định (undefined) = có, giữ nguyên hành vi
   * cũ của trang học sinh/gia sư. Phụ huynh chỉ theo dõi lịch của con nên set `false`: ẩn hẳn
   * nút "Vào lớp" và dòng trạng thái phòng học trong tooltip.
   */
  canJoin?: boolean;
  /** True nếu buổi học đã có video xem lại (đã upload xong lên Drive). */
  hasRecording?: boolean;
  /** Yêu cầu dời lịch đang hiệu lực cho buổi này — "pending"/"approved", null nếu không có. */
  scheduleChangeStatus?: 'pending' | 'approved' | null;
  /** True nếu buổi này đang có đề xuất đổi lịch (tính năng chủ động chọn giờ mới) chờ phản hồi. */
  hasPendingReschedule?: boolean;
  /** True nếu đây là buổi phụ (Link 2), sinh ra khi buổi gốc (`originalClassSessionId`) bị báo ngắt giữa chừng. */
  isContinuation?: boolean;
  /** True nếu đây là buổi học lại (Link 3), sinh ra khi hoà giải dispute chọn "học lại". */
  isDisputeRelearn?: boolean;
  /** Buổi gốc mà buổi phụ/buổi học lại này trỏ về — undefined nếu đây là buổi gốc. */
  originalClassSessionId?: number;
  /** True khi cả gia sư và học sinh đã đồng ý bỏ buổi phụ này — status vẫn "scheduled" cho tới
   * khi báo cáo buổi gốc được nộp, nhưng buổi này coi như đã "chết" nên phải ẩn nút "Vào lớp"
   * (xem utils/liveSession.ts canJoinLiveSession). */
  skipConfirmedByBothSides?: boolean;
}

export interface LessonGroup {
  dateKey: string;
  date: Dayjs;
  lessons: LessonSummary[];
}

export interface LessonViewProps {
  lessons: LessonSummary[];
  onOpenLesson: (lessonId: number) => void;
}
