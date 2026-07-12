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
  uid: string;
  token: string;
  appId: string;
  expireAt: number;
  participantNames: Record<string, string>;
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
