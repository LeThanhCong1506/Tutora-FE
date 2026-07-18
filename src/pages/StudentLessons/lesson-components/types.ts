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
