import type { StudentType } from '../../../types/student.type';

export interface NextSessionInfo {
  classSessionId: number;
  scheduledStart: string;
  scheduledEnd: string;
  subjectName?: string;
  tutorName?: string;
}

/**
 * Số liệu học tập của MỘT học sinh, suy ra hoàn toàn từ `GET /api/parent/class-sessions`.
 * Chỉ giữ đúng những gì card cần hiển thị — mọi con số ở đây đều có nguồn thật.
 */
export interface StudentInsight {
  /** Buổi đã hoàn thành (`completed`). */
  completed: number;
  /** Buổi `scheduled`/`in_progress` còn ở phía trước. */
  upcoming: number;
  /** Buổi `pending_confirmation` — phụ huynh phải xác nhận thì gia sư mới được nhận tiền. */
  pending: number;
  /** Buổi sắp tới gần nhất — nội dung chính của card. */
  next: NextSessionInfo | null;
}

export type StudentInsightMap = Record<string, StudentInsight>;

export interface StudentWithInsight {
  student: StudentType;
  insight: StudentInsight;
}
