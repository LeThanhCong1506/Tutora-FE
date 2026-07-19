import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';
import type { LiveSessionIdentity } from '../utils/liveSessionIdentity';

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
  /** ID buổi học hiện tại — dùng để gia hạn token / heartbeat. */
  classSessionId: number;
  uid: string;
  token: string;
  appId: string;
  expireAt: number;
  /** Thời điểm buổi học bắt đầu (UTC, từ server) — để timer 2 màn hình đồng bộ. */
  startedAt?: string;
  /** Hai phía chính của lớp học, dùng cho tiêu đề cố định Tutor – Student. */
  tutorName: string;
  studentName: string;
  /** Bảng tra UID → tên cho video/chat; có thể gồm Parent nếu Parent được phép tham gia. */
  participantNames: Record<string, string>;
  /** Trạng thái buổi học — FE dùng để ép deep-link đi qua phòng chờ khi buổi chưa bắt đầu. */
  status?: string;
  /** True nếu buổi đã được điểm danh vào (check-in). */
  checkedIn?: boolean;
  /** ID của lần tham gia hiện tại — backend dùng cùng lease để chặn nhiều thiết bị. */
  participationId: string;
  /** Lease opaque xác nhận client này đang sở hữu phiên tham gia của user. */
  leaseId: string;
}

/** Trạng thái presence trả về sau mỗi heartbeat. */
export interface SessionPresenceStatus {
  tutorPresent: boolean;
  studentPresent: boolean;
  isCheckedIn: boolean;
  roomClosed: boolean;
  blockedByPayment: boolean;
}

export interface ActiveSessionConflict {
  activeLeaseId: string;
  activeDeviceLabel?: string | null;
}

export interface SessionLeaseCredentials {
  participationId: string;
  leaseId: string;
}

export const SESSION_ACTIVE_ON_ANOTHER_DEVICE = 'SESSION_ACTIVE_ON_ANOTHER_DEVICE';
export const SESSION_LEASE_REVOKED = 'SESSION_LEASE_REVOKED';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;

const firstString = (...values: unknown[]): string | undefined =>
  values.find((value): value is string => typeof value === 'string' && value.length > 0);

const getErrorPayload = (error: unknown): UnknownRecord | null => {
  if (!axios.isAxiosError(error)) return null;
  return asRecord(error.response?.data);
};

/** Đọc code lỗi từ cả envelope chuẩn lẫn error object của response 409/410. */
export const getAgoraErrorCode = (error: unknown): string | undefined => {
  const payload = getErrorPayload(error);
  if (!payload) return undefined;
  const errorNode = asRecord(payload.error);
  const contentNode = asRecord(payload.content);
  return firstString(errorNode?.code, payload.code, contentNode?.code, payload.error);
};

export const getActiveSessionConflict = (error: unknown): ActiveSessionConflict | null => {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  if (getAgoraErrorCode(error) !== SESSION_ACTIVE_ON_ANOTHER_DEVICE) return null;

  const payload = getErrorPayload(error);
  const errorNode = asRecord(payload?.error);
  const contentNode = asRecord(payload?.content);
  const activeLeaseId = firstString(errorNode?.activeLeaseId, payload?.activeLeaseId, contentNode?.activeLeaseId);
  if (!activeLeaseId) return null;

  return {
    activeLeaseId,
    activeDeviceLabel: firstString(
      errorNode?.activeDeviceLabel,
      payload?.activeDeviceLabel,
      contentNode?.activeDeviceLabel,
    ),
  };
};

export const isSessionLeaseRevokedError = (error: unknown): boolean =>
  getAgoraErrorCode(error) === SESSION_LEASE_REVOKED;

/**
 * Claim (hoặc resume idempotent) lease rồi lấy thông tin join Agora.
 * Backend không trả token nếu cùng user đang có lease trên participation khác.
 */
export const joinAgoraRoom = async (
  classSessionId: number,
  identity: LiveSessionIdentity,
): Promise<ApiResponse<AgoraRoomInfo>> => {
  const response = await api.post(`/agora/room/${classSessionId}/join`, identity, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Atomically thay lease cũ bằng participation hiện tại sau khi user xác nhận modal. */
export const takeOverAgoraRoom = async (
  classSessionId: number,
  identity: LiveSessionIdentity,
  expectedActiveLeaseId: string,
): Promise<ApiResponse<AgoraRoomInfo>> => {
  const response = await api.post(
    `/agora/room/${classSessionId}/takeover`,
    { ...identity, expectedActiveLeaseId },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/**
 * Heartbeat presence: báo "tôi đang trong phòng" của buổi học. Gọi định kỳ (~20s) khi đang
 * join. BE tự auto check-in khi cả gia sư và học viên cùng có mặt, và trả về trạng thái để FE
 * hiển thị / tự rời khi phòng đã đóng (roomClosed).
 */
export const sendRoomHeartbeat = async (
  classSessionId: number,
  lease: SessionLeaseCredentials,
): Promise<ApiResponse<SessionPresenceStatus>> => {
  const response = await api.post(`/agora/room/${classSessionId}/heartbeat`, lease, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Báo cho BE rằng mình đã rời phòng (xoá presence ngay). Best-effort — nuốt lỗi mạng để việc
 * rời phòng không bao giờ bị chặn.
 */
export const leaveRoom = async (classSessionId: number, lease: SessionLeaseCredentials): Promise<void> => {
  try {
    await api.post(`/agora/room/${classSessionId}/leave`, lease, {
      headers: getAuthHeaders(),
      timeout: 5_000,
    });
  } catch {
    // ignore
  }
};

/**
 * Ghi hình buổi học được BACKEND tự bật khi buổi vào phòng học chính (cả gia sư + học viên
 * cùng có mặt → auto check-in). FE không cần — và không nên — kích hoạt record thủ công nữa.
 */

/** Thông tin join phòng Agora Interactive Whiteboard (Netless) của một buổi học. */
export interface WhiteboardRoomInfo {
  /** App Identifier để khởi tạo Whiteboard SDK ở client. */
  appIdentifier: string;
  /** Region của phòng (vd "sg"). */
  region: string;
  /** UUID phòng whiteboard. */
  roomUuid: string;
  /** Room token của người dùng (đã gắn role). */
  roomToken: string;
  /** "0" admin (tutor), "1" writer (học viên), "2" reader. */
  role: string;
}

/**
 * Lấy thông tin để join phòng Interactive Whiteboard của buổi học.
 * BE tự tạo phòng nếu chưa có. Chỉ Tutor/Parent/Student thuộc buổi học mới gọi thành công.
 */
export const getWhiteboardRoom = async (
  classSessionId: number,
  lease: SessionLeaseCredentials,
): Promise<ApiResponse<WhiteboardRoomInfo>> => {
  const response = await api.post(`/agora/whiteboard/${classSessionId}`, lease, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
