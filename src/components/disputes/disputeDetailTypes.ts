import type { DisputeDetailResponse, DisputeMessage } from '../../services/classSession.service';

/**
 * Bối cảnh buổi học đi kèm khiếu nại, đã chuẩn hoá.
 *
 * `DisputeDetailResponse` không mang `studentId` và thiếu nhiều mốc thời gian (check-in,
 * check-out, báo cáo), nên trang chi tiết phải gọi thêm endpoint buổi học của từng vai trò.
 * Ba vai trò trả về ba DTO khác nhau — mỗi trang wrapper tự map về đây để view không phải
 * biết mình đang phục vụ ai.
 */
export interface DisputeSessionContext {
  classSessionId: number;
  bookingId?: number;
  subjectName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  checkInTime?: string;
  checkOutTime?: string;
  /** Thời điểm gia sư gửi báo cáo — một mốc trên dòng thời gian. */
  reportCreatedAt?: string;
  confirmDeadline?: string;
  price?: number;
  isTutorPresent?: boolean;
  isStudentPresent?: boolean;
  /** Bên còn lại so với người đang xem: gia sư thấy học viên, người khiếu nại thấy gia sư. */
  counterpart?: {
    name?: string;
    subtitle?: string;
    avatarUrl?: string;
    /** Đường dẫn hồ sơ, bỏ trống nếu vai trò đó không có trang hồ sơ để mở. */
    profilePath?: string | null;
  };
}

/**
 * Mọi thứ khác nhau giữa gia sư / phụ huynh / học viên đều gom vào đây, để phần hiển thị
 * chỉ có một bản duy nhất — chính vì trước đây có tới ba bản vẽ song song nên chúng đã lệch nhau.
 */
export interface DisputeDetailAdapter {
  /** Quyết định nhãn "bên còn lại" và có hiện khu vực phản hồi của gia sư hay không. */
  viewerRole: 'claimant' | 'tutor';
  fetchDispute: (classSessionId: number) => Promise<DisputeDetailResponse | null>;
  fetchContext: (classSessionId: number) => Promise<DisputeSessionContext | null>;
  fetchThread: (classSessionId: number) => Promise<DisputeMessage[]>;
  sendThreadMessage: (classSessionId: number, message: string) => Promise<void>;
  /** Route danh sách khiếu nại của portal tương ứng. */
  listPath: string;
  /** Route chi tiết buổi học của portal tương ứng. */
  sessionPath: (classSessionId: number) => string;
  /** Chỉ gia sư mới phản hồi khiếu nại và nộp thêm bằng chứng. */
  submitResponse?: (classSessionId: number, message: string) => Promise<DisputeDetailResponse | null>;
  uploadEvidence?: (classSessionId: number, file: File) => Promise<void>;
}
