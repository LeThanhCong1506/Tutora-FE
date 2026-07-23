import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { apiClient as api } from './apiClient';
/**
 * Service gửi điểm cảm xúc / độ tập trung (đã tổng hợp) lên backend .NET, KHÔNG gửi ảnh
 */

/** Một mẫu điểm đã tổng hợp gửi lên (không có ảnh). */
export interface EngagementSampleItem {
  emotion?: string | null;
  engagementScore: number;
  drowsy: boolean;
}

export interface EngagementAlertPayload {
  /** camera_off/camera_on: học viên chủ động tắt/bật cam — không phải bất thường hành vi. */
  reason: 'away' | 'drowsy' | 'distracted' | 'stressed' | 'camera_off' | 'camera_on';
  level?: 'HIGH' | 'MED';
  message: string;
  engagementScore?: number;
}

export interface EngagementSummary {
  classSessionId: number;
  sampleCount: number;
  avgEngagement: number;
  emotionDistribution: Record<string, number>;
  alertCounts: Record<string, number>;
  totalAlerts: number;
  timeline: Array<{
    sampledAt: string;
    engagementScore: number;
    emotion?: string | null;
    drowsy: boolean;
  }>;
}

export const postEngagementSamples = async (
  classSessionId: number,
  samples: EngagementSampleItem[],
): Promise<void> => {
  if (samples.length === 0) return;
  try {
    await api.post(
      `/agora/room/${classSessionId}/engagement`,
      { samples },
      { headers: getAuthHeaders() },
    );
  } catch {
    // ignore — nhịp sau sẽ gửi lại
  }
};

/** Báo một cảnh báo realtime. */
export const postEngagementAlert = async (
  classSessionId: number,
  alert: EngagementAlertPayload,
): Promise<void> => {
  try {
    await api.post(`/agora/room/${classSessionId}/engagement-alert`, alert, {
      headers: getAuthHeaders(),
    });
  } catch {
    // Best-effort: lỗi lưu không được ảnh hưởng buổi học. Cảnh báo vẫn tới gia sư qua RTM.
  }
};

/** Lấy tổng hợp cho báo cáo sau buổi. */
export const getEngagementSummary = async (
  classSessionId: number,
): Promise<ApiResponse<EngagementSummary>> => {
  const response = await api.get(`/agora/room/${classSessionId}/engagement/summary`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
