import axios from 'axios';
import { storageAdapter } from './storage.adapter';
import { MINI_APP_SEARCH_TOKEN_KEY } from '../components/DeeplinkHandler/DeeplinkHandler';

// ============================================
// Gửi tiêu chí tìm gia sư (đã điền trong Mini App) về Zalo OA — bot
// (tutora-zalo-bot) search thật qua agent AI rồi trả 3 card gia sư vào ĐÚNG
// cuộc chat OA của phụ huynh. KHÔNG dùng zalo-auth.service.ts (login Zalo cho
// Mini App khác hẳn — user_id ở đó là Mini App User ID, không phải OA
// user_id bot cần để gửi tin nhắn). Xác thực bằng token bot ký sẵn nhúng
// trong deep link mở Mini App, đọc lại ở DeeplinkHandler.tsx.
// ============================================

const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || '';

export interface MiniAppSearchPayload {
  subjectId: number;
  gradeLevelId: number;
  goal?: string;
  preferences?: string;
  minRate?: number;
  maxRate?: number;
  teachingMode?: 'online' | 'offline' | 'both';
  city?: string;
  tutorGender?: 'male' | 'female';
}

export interface MiniAppSearchResult {
  ok: boolean;
  error?: string;
}

// Shape gọn cho list kết quả trong Mini App (khớp TutorCandidateDto bên bot,
// src/be-client/dto/tutor.dto.ts — chỉ khai lại field FE thực sự dùng).
export interface MiniAppTutorResult {
  tutorId: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  subjects?: string[];
  grades?: string[];
  hourlyRate: number;
  averageRating: number;
  totalReviews: number;
  totalCompletedLessons: number;
  totalStudentsTaught: number;
  subscriptionType: 'standard' | 'pro' | 'premium';
  teachingMode: 'online' | 'offline' | 'both';
  teachingAreaCity?: string;
  teachingAreaDistrict?: string;
}

export interface MiniAppSearchResultsResponse {
  ok: boolean;
  error?: string;
  tutors?: MiniAppTutorResult[];
}

export interface MiniAppPrefill {
  ok: boolean;
  subjectId?: number;
  gradeLevelId?: number;
  goal?: string;
  minRate?: number;
  maxRate?: number;
  teachingMode?: 'online' | 'offline' | 'both';
  city?: string;
  tutorGender?: 'male' | 'female';
}

/**
 * PH mở lại Mini App để SỬA tiêu chí (bot gửi nút khi agent trả reopen_mini_app=true giữa
 * chat) — lấy dữ liệu lần tìm trước để điền sẵn thay vì bắt điền lại từ đầu. Không có gì
 * điền sẵn (lần đầu tìm) → trả {ok:true} không kèm field nào, gọi phía này im lặng bỏ qua.
 */
export async function fetchMiniAppPrefill(): Promise<MiniAppPrefill> {
  const token = await storageAdapter.get(MINI_APP_SEARCH_TOKEN_KEY);
  if (!token || !BOT_API_URL) {
    return { ok: false };
  }
  try {
    const { data } = await axios.get<MiniAppPrefill>(
      `${BOT_API_URL}/webhook/miniapp-search/prefill`,
      { params: { token }, timeout: 10000 },
    );
    return data;
  } catch {
    return { ok: false };
  }
}

/**
 * Gửi form tìm gia sư về bot. Trả { ok:false, error:'missing_token' } nếu Mini App
 * không được mở qua deep link của bot (vd user tự vào thẳng /tutor-search) — nút gọi
 * hàm này ở TutorSearchPage chỉ nên hiện khi biết chắc có token (xem điều kiện render).
 */
export async function submitSearchToZalo(
  payload: MiniAppSearchPayload,
): Promise<MiniAppSearchResult> {
  const token = await storageAdapter.get(MINI_APP_SEARCH_TOKEN_KEY);
  if (!token) {
    return { ok: false, error: 'missing_token' };
  }
  if (!BOT_API_URL) {
    return { ok: false, error: 'bot_api_url_not_configured' };
  }

  try {
    const { data } = await axios.post<MiniAppSearchResult>(
      `${BOT_API_URL}/webhook/miniapp-search`,
      { token, ...payload },
      { timeout: 30000 }, // agent AI xử lý ~10-17s, để dư thời gian
    );
    return data;
  } catch (error) {
    return { ok: false, error: axios.isAxiosError(error) ? error.message : 'unknown_error' };
  }
}

/**
 * Search THẲNG (không qua LLM/hội thoại — xem tutora-zalo-bot MiniAppSearchFlow.getResults)
 * và trả kết quả NGAY để render inline trong Mini App, khác submitSearchToZalo() ở trên vốn
 * chỉ báo "quay lại Zalo xem". Dùng cho cả lượt tìm đầu và nút "Tìm gia sư khác"
 * (truyền excludeTutorIds = id các gia sư đang hiện, để không lặp lại).
 */
export async function fetchMiniAppSearchResults(
  payload: MiniAppSearchPayload & { excludeTutorIds?: string[] },
): Promise<MiniAppSearchResultsResponse> {
  const token = await storageAdapter.get(MINI_APP_SEARCH_TOKEN_KEY);
  if (!token) {
    return { ok: false, error: 'missing_token' };
  }
  if (!BOT_API_URL) {
    return { ok: false, error: 'bot_api_url_not_configured' };
  }

  try {
    const { data } = await axios.post<MiniAppSearchResultsResponse>(
      `${BOT_API_URL}/webhook/miniapp-search/results`,
      { token, ...payload },
      { timeout: 20000 },
    );
    return data;
  } catch (error) {
    return { ok: false, error: axios.isAxiosError(error) ? error.message : 'unknown_error' };
  }
}
