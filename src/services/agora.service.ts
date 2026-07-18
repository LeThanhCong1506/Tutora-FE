import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

export interface AgoraRoomInfo {
  channel: string;
  /** ID buổi học hiện tại — dùng để gia hạn token / heartbeat (channel dùng chung theo booking). */
  classSessionId: number;
  uid: string;
  token: string;
  appId: string;
  expireAt: number;
  /** Hai phía chính của lớp học, dùng cho tiêu đề cố định Tutor – Student. */
  tutorName: string;
  studentName: string;
  /** Bảng tra UID → tên cho video/chat; có thể gồm Parent nếu Parent được phép tham gia. */
  participantNames: Record<string, string>;
  /** Trạng thái buổi học — FE dùng để ép deep-link đi qua phòng chờ khi buổi chưa bắt đầu. */
  status?: string;
  /** True nếu buổi đã được điểm danh vào (check-in). */
  checkedIn?: boolean;
}

/** Trạng thái presence trả về sau mỗi heartbeat. */
export interface SessionPresenceStatus {
  tutorPresent: boolean;
  studentPresent: boolean;
  isCheckedIn: boolean;
  roomClosed: boolean;
  blockedByPayment: boolean;
}

/**
 * Lấy thông tin để join kênh Agora RTC của một buổi học.
 * Chỉ Tutor/Parent/Student thuộc buổi học mới gọi thành công.
 */
export const getAgoraRoom = async (classSessionId: number): Promise<ApiResponse<AgoraRoomInfo>> => {
  const response = await api.get(`/agora/room/${classSessionId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Heartbeat presence: báo "tôi đang trong phòng" của buổi học. Gọi định kỳ (~20s) khi đang
 * join. BE tự auto check-in khi cả gia sư và học viên cùng có mặt, và trả về trạng thái để FE
 * hiển thị / tự rời khi phòng đã đóng (roomClosed).
 */
export const sendRoomHeartbeat = async (classSessionId: number): Promise<ApiResponse<SessionPresenceStatus>> => {
  const response = await api.post(
    `/agora/room/${classSessionId}/heartbeat`,
    {},
    {
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

/**
 * Báo cho BE rằng mình đã rời phòng (xoá presence ngay). Best-effort — nuốt lỗi mạng để việc
 * rời phòng không bao giờ bị chặn.
 */
export const leaveRoom = async (classSessionId: number): Promise<void> => {
  try {
    await api.post(`/agora/room/${classSessionId}/leave`, {}, { headers: getAuthHeaders() });
  } catch {
    // ignore
  }
};
