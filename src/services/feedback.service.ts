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
  lessonId?: number;
  bookingId?: number;
  toUserId: string;
  rating: number;
  comment?: string;
  feedbackType: 'post_lesson' | 'early_termination';
  initialGoal?: string;
  actualResult?: string;
  courseDuration?: string;
}

export interface ReplyFeedbackRequest {
  replyComment: string;
}

export interface FeedbackDto {
  feedbackId: number;
  bookingId?: number;
  lessonId?: number;
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
 * Create feedback for a lesson (parent)
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
 * Check if user can leave feedback for a lesson
 */
export const canLeaveFeedback = async (
  lessonId: number
): Promise<ApiResponse<boolean>> => {
  try {
    const response = await api.get(`/feedbacks/eligibility/lessons/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error checking feedback eligibility:', error.message);
    throw error;
  }
};

/**
 * Check if user can leave early termination feedback for a booking
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
