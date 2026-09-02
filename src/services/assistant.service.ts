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

/**
 * Filter tích luỹ qua các lượt — do tutora-ai sở hữu, FE chỉ GIỮ HỘ rồi gửi lại nguyên
 * khối (.NET cũng chỉ chuyển tiếp, không mô tả field nào). Khai đủ ở đây để hiển thị chip
 * "đang lọc theo…" cho user tự bỏ; field lạ vẫn đi qua bình thường vì TypeScript chỉ
 * kiểm lúc biên dịch, không xoá dữ liệu lúc chạy.
 *
 * snake_case: đúng như tutora-ai trả về (WebChatResponse.filters), .NET không đổi tên.
 */
export interface AssistantFilters {
  min_rate?: number | null;
  max_rate?: number | null;
  tutor_gender?: string | null;
  subject_id?: number | null;
  grade_level_id?: number | null;
  desired_count?: number | null;
  /** Mã thứ: 1 = Thứ Hai … 7 = Chủ Nhật. */
  available_days?: number[] | null;
  /** "all" = phải rảnh đủ mọi ngày; "any"/null = một trong số đó. */
  available_days_match?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  /** Tiêu chí mềm tích luỹ ("con mất gốc", "cần cô kiên nhẫn") — chỉ ảnh hưởng thứ tự. */
  preferences?: string | null;
  /** Gia sư đã giới thiệu, để "còn ai khác không" không bắn lại người cũ. */
  exclude_tutor_ids?: string[] | null;
}

// Entity memory: gia sư đã hiển thị — FE giữ & gửi lại mỗi lượt (như filters), để AI hiểu
// "thầy A"/"người đầu tiên" trỏ về ai.
export interface ShownTutor {
  tutorId: string;
  name?: string | null;
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
  shownTutors: ShownTutor[];
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
  shownTutors?: ShownTutor[];
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
    shownTutors: payload.shownTutors ?? [],
  });
  // .NET bọc trong APIResponse { content } — bóc ra.
  return (data?.content ?? data) as AssistantResponse;
};
