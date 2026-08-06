import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import type { PagedList } from './lesson.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

// ============================================
// Types
// ============================================

export interface CreateFeedbackRequest {
  bookingId: number;
  rating: number;
  comment?: string;
  initialGoal?: string;
  actualResult?: string;
  courseDuration?: string;
}

/** Sửa đánh giá đã gửi — booking không đổi được nên không có bookingId. */
export type UpdateFeedbackRequest = Omit<CreateFeedbackRequest, 'bookingId'>;

export interface ReplyFeedbackRequest {
  replyComment: string;
}

export interface FeedbackDto {
  feedbackId: number;
  bookingId?: number;
  /** Chỉ có ở dữ liệu cũ thời còn đánh giá theo từng buổi. */
  classSessionId?: number;
  rating: number;
  comment?: string;
  feedbackType?: string;
  createdAt: string;
  parentName?: string;
  parentAvatarUrl?: string;
  subjectName?: string;
  reply?: string;
  repliedAt?: string;
  isVisible: boolean;
  initialGoal?: string;
  actualResult?: string;
  courseDuration?: string;
  ratingDisplay?: string;
  timeSinceDisplay?: string;
  /** Tên gia sư nhận đánh giá — chỉ có ở danh sách kiểm duyệt CMS. */
  tutorName?: string;
  /** Tác giả còn sửa được không: chỉ true khi gia sư chưa phản hồi. */
  canEdit?: boolean;
  /** Lý do quản trị viên ẩn đánh giá — chỉ có giá trị khi `isVisible` là false. */
  hiddenReason?: string;
  hiddenAt?: string;
  /**
   * Ai viết đánh giá: `parent` hoặc `student`. `parentName` giữ tên cũ vì tương thích
   * nhưng có thể là tên học sinh tự đăng ký, nên nhãn hiển thị phải dựa vào field này.
   */
  reviewerRole?: 'parent' | 'student';
}

export interface FeedbackStatsDto {
  tutorId?: string;
  averageRating: number;
  totalReviews: number;
  rating5Count: number;
  rating4Count: number;
  rating3Count: number;
  rating2Count: number;
  rating1Count: number;
  rating5Percent: number;
  rating4Percent: number;
  rating3Percent: number;
  rating2Percent: number;
  rating1Percent: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Đánh giá khóa học — chỉ mở khi booking đã hoàn thành, mỗi người một lần cho mỗi booking.
 */
export const createFeedback = async (
  request: CreateFeedbackRequest
): Promise<ApiResponse<FeedbackDto>> => {
  try {
    const response = await api.post('/feedbacks', request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating feedback:', error.message);
    throw error;
  }
};

/**
 * Sửa đánh giá đã gửi. BE từ chối nếu gia sư đã phản hồi.
 */
export const updateFeedback = async (
  feedbackId: number,
  request: UpdateFeedbackRequest
): Promise<ApiResponse<FeedbackDto>> => {
  try {
    const response = await api.put(`/feedbacks/${feedbackId}`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating feedback:', error.message);
    throw error;
  }
};

/**
 * Đánh giá của một booking, kèm phản hồi gia sư. `content` null nếu chưa đánh giá.
 */
export const getBookingFeedback = async (
  bookingId: number
): Promise<ApiResponse<FeedbackDto | null>> => {
  try {
    const response = await api.get(`/feedbacks/bookings/${bookingId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching booking feedback:', error.message);
    throw error;
  }
};

/**
 * Reply to feedback (tutor)
 */
export const replyFeedback = async (
  feedbackId: number,
  request: ReplyFeedbackRequest
): Promise<ApiResponse<FeedbackDto>> => {
  try {
    const response = await api.put(`/feedbacks/${feedbackId}/reply`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error replying to feedback:', error.message);
    throw error;
  }
};

/**
 * Get tutor's feedback list (public)
 */
export const getTutorFeedbacks = async (
  tutorId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<ApiResponse<PagedList<FeedbackDto>>> => {
  try {
    const response = await api.get(`/feedbacks/tutors/${tutorId}`, {
      params: { page, pageSize },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tutor feedbacks:', error.message);
    throw error;
  }
};

/**
 * Get tutor feedback statistics
 */
export const getTutorFeedbackStats = async (
  tutorId: string
): Promise<ApiResponse<FeedbackStatsDto>> => {
  try {
    const response = await api.get(`/feedbacks/tutors/${tutorId}/stats`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching feedback stats:', error.message);
    throw error;
  }
};

/**
 * Check if user can review a booking
 */
export const canLeaveBookingFeedback = async (
  bookingId: number
): Promise<ApiResponse<boolean>> => {
  try {
    const response = await api.get(`/feedbacks/eligibility/bookings/${bookingId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error checking booking feedback eligibility:', error.message);
    throw error;
  }
};

/**
 * Toggle feedback visibility (admin)
 */
export const toggleFeedbackVisibility = async (
  feedbackId: number
): Promise<ApiResponse<boolean>> => {
  try {
    const response = await api.put(`/feedbacks/${feedbackId}/visibility`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error toggling visibility:', error.message);
    throw error;
  }
};
