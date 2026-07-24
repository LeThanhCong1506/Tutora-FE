/** Các pha của phòng chờ — mỗi pha render một trạng thái UI riêng. */
export type LobbyPhase =
  | 'connecting' // đang kết nối SignalR / đang join lobby
  | 'waiting' // đã vào lobby, chờ phía còn lại
  | 'ready' // đủ cả hai phía — chuẩn bị chuyển vào lớp
  | 'ended' // buổi học đã kết thúc (gia sư đã check-out)
  | 'unavailable' // trạng thái buổi học không cho vào (cancelled, completed, ...)
  | 'blocked-payment' // phụ huynh chưa thanh toán các buổi còn lại
  | 'error'; // lỗi kết nối / không có quyền / không tìm thấy buổi học

/** Thông tin tĩnh của buổi học — server gửi một lần khi join lobby (event `lobbyInfo`). */
export interface LobbyInfo {
  classSessionId: number;
  tutorName: string;
  studentName: string;
  scheduledStart: string;
  scheduledEnd: string;
}

/** Trạng thái chờ động — server broadcast mỗi khi có người vào/ra lobby (event `lobbyState`). */
export interface LobbyWaitingState {
  classSessionId: number;
  tutorWaiting: boolean;
  studentWaiting: boolean;
}
export interface ScheduleChangeState {
  classSessionId: number;
  requiresConfirmation: boolean;
  canCurrentUserConfirm: boolean;
  currentUserConfirmed: boolean;
  admissionAllowed: boolean;
  status: 'pending' | 'approved' | 'applied' | 'rejected' | 'expired' | null;
  requiredLearnerRole: 'Student' | 'Parent' | null;
  requiredLearnerName: string | null;
  tutorName: string | null;
  studentName: string | null;
  originalScheduledStart: string;
  originalScheduledEnd: string;
  durationMinutes: number;
  requestedAt: string | null;
  expiresAt: string | null;
  tutorConfirmedAt: string | null;
  learnerConfirmedAt: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
  adjustedScheduledStart: string | null;
  adjustedScheduledEnd: string | null;
}
