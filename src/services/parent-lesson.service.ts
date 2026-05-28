import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import type { PagedList, LessonDetailDto } from './lesson.service';
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

export interface PendingLessonDto {
  lessonId: number;
  bookingId: number;
  scheduledStart: string;
  scheduledEnd: string;
  confirmDeadline: string;
  lessonPrice: number;
  lessonContent?: string;
  homework?: string;
  status: string;
  tutorName: string;
  tutorAvatar?: string;
  studentName: string;
  subjectName: string;
  submittedAt?: string;
}

export interface SettlementResultDto {
  success: boolean;
  lessonId: number;
  bookingId?: number;
  amountReleased: number;
  amountRefunded: number;
  settlementType?: string;
  transactionId?: number;
  newTutorBalance?: number;
  sessionsRemaining?: number;
  message?: string;
}

export interface DisputeDetailDto {
  disputeId: number;
  bookingId: number;
  lessonId: number;
  createdBy: string;
  reason: string;
  disputeType: string;
  evidence?: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  refundAmount?: number;
}

export interface DisputeListDto {
  disputeId: number;
  bookingId: number;
  lessonId: number;
  disputeType: string;
  status: string;
  reason: string;
  createdAt: string;
  tutorName?: string;
  subjectName?: string;
}

export interface CreateDisputeRequest {
  disputeType: 'no_show' | 'quality' | 'payment' | 'other';
  reason: string;
  evidence?: string[];
}

export interface NoShowActionRequest {
  actionType: 'free_session' | 'makeup' | 'change_tutor';
  newScheduledStart?: string;
  note?: string;
}

export interface NoShowActionResultDto {
  success: boolean;
  action: string;
  message: string;
  newLessonId?: number;
  refundAmount?: number;
}

export interface CalendarLessonDto {
  lessonId: number;
  scheduledStart: string;
  scheduledEnd: string;
  studentName?: string;
  tutorName?: string;
  subjectName?: string;
  status: string;
  meetingLink?: string;
}

export interface CalendarDayDto {
  date: string;
  lessons: CalendarLessonDto[];
}

// ============================================
// API Functions
// ============================================

/**
 * Get lessons pending confirmation
 */
export const getPendingLessons = async (): Promise<ApiResponse<PendingLessonDto[]>> => {
  try {
    const response = await api.get('/parent/lessons/pending', {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching pending lessons:', error.message);
    throw error;
  }
};

/**
 * Get lesson detail for parent
 */
export const getParentLessonDetail = async (
  lessonId: number
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.get(`/parent/lessons/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching lesson detail:', error.message);
    throw error;
  }
};

/**
 * Confirm a lesson (release payment to tutor)
 */
export const confirmLesson = async (
  lessonId: number
): Promise<ApiResponse<SettlementResultDto>> => {
  try {
    const response = await api.put(`/parent/lessons/${lessonId}/confirm`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error confirming lesson:', error.message);
    throw error;
  }
};

/**
 * Create a dispute for a lesson
 */
export const createDispute = async (
  lessonId: number,
  request: CreateDisputeRequest
): Promise<ApiResponse<DisputeDetailDto>> => {
  try {
    const response = await api.post(`/parent/lessons/${lessonId}/dispute`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating dispute:', error.message);
    throw error;
  }
};

/**
 * Get parent's dispute history
 */
export const getParentDisputes = async (
  page: number = 1,
  pageSize: number = 10
): Promise<ApiResponse<PagedList<DisputeListDto>>> => {
  try {
    const response = await api.get('/parent/lessons/disputes', {
      headers: getAuthHeaders(),
      params: { page, pageSize },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching disputes:', error.message);
    throw error;
  }
};

/**
 * Report tutor no-show
 */
export const reportNoShow = async (
  lessonId: number
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.post(`/parent/lessons/${lessonId}/report-noshow`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error reporting no-show:', error.message);
    throw error;
  }
};

/**
 * Process no-show action (free session, makeup, or change tutor)
 */
export const processNoShowAction = async (
  lessonId: number,
  request: NoShowActionRequest
): Promise<ApiResponse<NoShowActionResultDto>> => {
  try {
    const response = await api.put(`/parent/lessons/${lessonId}/noshow-action`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error processing no-show action:', error.message);
    throw error;
  }
};

/**
 * Upload evidence for a dispute
 */
export const uploadDisputeEvidence = async (
  lessonId: number,
  file: File
): Promise<ApiResponse<string>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/parent/lessons/${lessonId}/evidence`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error uploading evidence:', error.message);
    throw error;
  }
};

/**
 * Get parent calendar view
 */
export const getParentCalendar = async (
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<CalendarDayDto[]>> => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get('/parent/lessons/calendar', {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching calendar:', error.message);
    throw error;
  }
};
