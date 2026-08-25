import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = setupAuthInterceptor(axios.create({ baseURL: API_BASE_URL }));

/** Mirrors BE `TutorFavoriteResponse`. */
export interface FavoriteTutor {
  tutorId: string;
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  education: string | null;
  degree: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  /** Số buổi đã dạy — cùng định nghĩa với thẻ ở trang tìm kiếm. */
  totalClassSessions: number;
  minPricePerHour: number | null;
  subjects: string[];
  /** false = gia sư đang bị tạm ngưng / ẩn hồ sơ / ngừng nhận lịch. */
  isAvailable: boolean;
  savedAt: string;
}

/** Saved tutors with card data, newest first. Backend: GET /api/favorites/tutors */
export const getFavoriteTutors = async (signal?: AbortSignal): Promise<FavoriteTutor[]> => {
  const { data } = await api.get('/favorites/tutors', { signal });
  return data?.content ?? [];
};

/**
 * Just the ids, for painting the heart on search cards.
 * Backend: GET /api/favorites/tutors/ids
 */
export const getFavoriteTutorIds = async (signal?: AbortSignal): Promise<string[]> => {
  const { data } = await api.get('/favorites/tutors/ids', { signal });
  return data?.content ?? [];
};

/**
 * Save or un-save a tutor. Returns the state AFTER the toggle, so the caller settles on the
 * server's answer instead of trusting its own optimistic flip.
 * Backend: POST /api/favorites/tutors/{tutorId}/toggle
 */
export const toggleFavoriteTutor = async (tutorId: string): Promise<boolean> => {
  const { data } = await api.post(`/favorites/tutors/${tutorId}/toggle`);
  return data?.content === true;
};
