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
