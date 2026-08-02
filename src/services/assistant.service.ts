import { apiClient } from './apiClient';

export interface AssistantContext {
  subjectId?: number | null;
  gradeLevelId?: number | null;
  teachingMode?: string | null;
  city?: string | null;
  minRate?: number | null;
  maxRate?: number | null;
  tutorGender?: string | null;
}

export interface AssistantFilters {
  minRate?: number | null;
  maxRate?: number | null;
  tutorGender?: string | null;
  subjectId?: number | null;
  desiredCount?: number | null;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 1 card gia sư (mẫu tham khảo card của Kodee: badge, giá nổi bật, list ✓, nút CTA).
export interface TutorCard {
  tutorId: string;
  name: string;
  avatarUrl?: string | null;
  isBestMatch: boolean;
  pricePerHour?: number | null;
  rating?: number | null;
  totalReviews?: number | null;
  highlights: string[];
  profileUrl: string; // path tương đối, vd /tutor-detail/{id}
  ctaLabel: string;
}

export interface AssistantResponse {
  reply: string;
  intent: 'tutor' | 'faq' | 'off_topic';
  cards: TutorCard[];
  filters: AssistantFilters;
  aiRanked: boolean;
  suggestions: string[];
  // Chỉ có khi authed — phiên đang lưu lịch sử; gửi lại lượt sau để nối đúng phiên.
  sessionId?: string | null;
}

export interface AssistantRequest {
  history: AssistantMessage[];
  message: string;
  context?: AssistantContext;
  currentFilters?: AssistantFilters | null;
  // Authed: nối đúng phiên đang lưu ở DB (null → .NET tạo phiên mới, trả sessionId về).
  sessionId?: string | null;
}

/**
 * Gửi 1 lượt chat tới trợ lý AI qua .NET. apiClient tự gắn Bearer token nếu có (interceptor)
 * → .NET biết authed/anonymous. Trả về response đã camelCase chuẩn .NET.
 */
export const askAssistant = async (
  payload: AssistantRequest,
): Promise<AssistantResponse> => {
  const { data } = await apiClient.post('/ai-chat/assistant/respond', {
    message: payload.message,
    history: payload.history,
    context: payload.context ?? null,
    currentFilters: payload.currentFilters ?? null,
    sessionId: payload.sessionId ?? null,
  });
  // .NET bọc trong APIResponse { content } — bóc ra.
  return (data?.content ?? data) as AssistantResponse;
};
