import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import type { LessonDetailDto } from './lesson.service';
import { setupAuthInterceptor } from './apiClient';
import type {
    PendingLessonDto,
    SettlementResultDto,
    CalendarDayDto,
} from './parent-lesson.service';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// ============================================
// Student Lesson API Functions
// ============================================

/**
 * Get all lessons for a student
 */
export const getStudentLessons = async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<ApiResponse<{ items: any[]; totalCount: number }>> => {
    try {
        const response = await api.get('/student/lessons', {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching student lessons:', error.message);
        throw error;
    }
};

/**
 * Get lessons pending confirmation (Student)
 */
export const getStudentPendingLessons = async (): Promise<ApiResponse<PendingLessonDto[]>> => {
    try {
        const response = await api.get('/student/lessons/pending', {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching student pending lessons:', error.message);
        throw error;
    }
};

/**
 * Get lesson detail (Student)
 */
export const getStudentLessonDetail = async (
    lessonId: number
): Promise<ApiResponse<LessonDetailDto>> => {
    try {
        const response = await api.get(`/student/lessons/${lessonId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching student lesson detail:', error.message);
        throw error;
    }
};

/**
 * Confirm a lesson (Student)
 */
export const confirmStudentLesson = async (
    lessonId: number
): Promise<ApiResponse<SettlementResultDto>> => {
    try {
        const response = await api.put(`/student/lessons/${lessonId}/confirm`, {}, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        console.error('Error confirming student lesson:', error.message);
        throw error;
    }
};

/**
 * Get student calendar view.
 *
 * NOTE: BE chưa có endpoint `/api/student/lessons/calendar` (chỉ tutor + parent có).
 * Tạm gọi path consistent với pattern — sẽ trả 404 cho đến khi BE add endpoint
 * tương tự ParentLessonController.GetCalendar / TutorLessonController.GetCalendar.
 * Caller (StudentDashboard) đã wrap trong try/catch nên không crash UI.
 */
export const getStudentCalendar = async (
    startDate?: string,
    endDate?: string
): Promise<ApiResponse<CalendarDayDto[]>> => {
    try {
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get('/student/lessons/calendar', {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching student calendar:', error.message);
        throw error;
    }
};

/**
 * Get student bookings
 * Reuses the same /bookings endpoint — BE filters by role automatically
 */
export const getStudentBookings = async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<ApiResponse<{ items: any[]; totalCount: number }>> => {
    try {
        const response = await api.get('/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching student bookings:', error.message);
        throw error;
    }
};
