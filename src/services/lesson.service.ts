import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

export interface StudentMini {
  studentId: string;
  fullName?: string;
  gradeLevel?: string;
}

export interface SubjectInfo {
  subjectId: number;
  subjectName?: string;
}

export interface TutorMini {
  tutorId: string;
  fullName?: string;
  avatarUrl?: string;
  hourlyRate?: number;
}

export interface LessonResponse {
  lessonId: number;
  bookingId?: number;
  scheduledStart: string;
  scheduledEnd: string;
  submittedAt?: string;
  confirmDeadline?: string;
  lessonPrice?: number;
  lessonContent?: string;
  homework?: string;
  tutorNotes?: string;
  status?: string;
  meetingLink?: string;
  isTutorPresent?: boolean;
  isStudentPresent?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  attendanceNote?: string;
  createdAt?: string;
  student?: StudentMini;
  subject?: SubjectInfo;
  tutor?: TutorMini;
}

export interface LessonDetailDto extends LessonResponse {
  report?: {
    reportId: number;
    contentCovered: string;
    homeworkAssigned: string;
    studentPerformanceRating: number;
    attachments: string[];
    createdAt: string;
  };
}

export interface CheckInRequest {
  isStudentPresent?: boolean;
}

export interface CheckOutRequest {
  attendanceNote?: string;
}

export interface SubmitReportRequest {
  contentCovered: string;
  homeworkAssigned?: string;
  tutorNotes?: string;
  isTutorPresent?: boolean;
  isStudentPresent: boolean;
  attendanceNote?: string;
}

export interface PagedList<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface UpcomingLesson {
  lessonId: number;
  bookingId: number;
  scheduledStart: string;
  scheduledEnd: string;
  studentName: string | null;
  subjectName: string | null;
  meetingLink: string | null;
}

export interface TutorDashboardStats {
  upcomingLessons: number;
  completedThisMonth: number;
  totalCompleted: number;
  earningsThisMonth: number;
  totalEarnings: number;
  walletBalance: number;
  frozenBalance: number;
  pendingConfirmation: number;
  activeDisputes: number;
  averageRating: number;
  totalReviews: number;
  nextLessons: UpcomingLesson[];
  profileStatus: string | null;
  hasVerifiedCertificates: boolean;
  missingFields: string[] | null;
}

export interface CalendarLesson {
  lessonId: number;
  scheduledStart: string;
  scheduledEnd: string;
  studentName: string | null;
  subjectName: string | null;
  status: string | null;
  meetingLink: string | null;
  statusColor: string;
}

export interface CalendarDay {
  date: string;
  lessons: CalendarLesson[];
}

/**
 * Get parent's lessons
 */
export const getParentLessons = async (
  page: number = 1,
  pageSize: number = 20,
  fromDate?: string,
  status?: string
): Promise<ApiResponse<PagedList<LessonResponse>>> => {
  try {
    const params: Record<string, any> = { page, pageSize };
    if (fromDate) params.fromDate = fromDate;
    if (status) params.status = status;

    const response = await api.get('/parent/lessons', {
      headers: getAuthHeaders(),
      params,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching parent lessons:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Get upcoming lesson (next lesson)
 */
export const getNextLesson = async (): Promise<LessonResponse | null> => {
  try {
    const now = new Date().toISOString();
    const response = await getParentLessons(1, 1, now, 'upcoming');

    if (response.content && response.content.items && response.content.items.length > 0) {
      return response.content.items[0];
    }

    return null;
  } catch (error) {
    console.error('❌ Error fetching next lesson:', error);
    return null;
  }
};

/**
 * Get tutor dashboard statistics
 */
export const getTutorDashboardStats = async (): Promise<ApiResponse<TutorDashboardStats>> => {
  try {
    const response = await api.get('/tutor/lessons/dashboard', {
      headers: getAuthHeaders(),
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching tutor dashboard stats:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Get tutor calendar
 */
export const getTutorCalendar = async (
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<CalendarDay[]>> => {
  try {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get('/tutor/lessons/calendar', {
      headers: getAuthHeaders(),
      params,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching tutor calendar:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Get tutor's lessons with filters
 */
export const getTutorLessons = async (
  page: number = 1,
  pageSize: number = 10,
  fromDate?: string,
  status?: string
): Promise<ApiResponse<PagedList<LessonResponse>>> => {
  try {
    const params: Record<string, any> = { page, pageSize };
    if (fromDate) params.fromDate = fromDate;
    if (status) params.status = status;

    const response = await api.get('/tutor/lessons', {
      headers: getAuthHeaders(),
      params,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching tutor lessons:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Get tutor lesson detail
 */
export const getTutorLessonDetail = async (
  lessonId: number
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.get(`/tutor/lessons/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching lesson detail:', error.message);
    throw error;
  }
};

/**
 * Check-in to a lesson
 */
export const checkInLesson = async (
  lessonId: number,
  request: CheckInRequest = {}
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.put(`/tutor/lessons/${lessonId}/checkin`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error checking in:', error.message);
    throw error;
  }
};

/**
 * Check-out from a lesson
 */
export const checkOutLesson = async (
  lessonId: number,
  request: CheckOutRequest = {}
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.put(`/tutor/lessons/${lessonId}/checkout`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error checking out:', error.message);
    throw error;
  }
};

/**
 * Submit lesson report
 */
export const submitLessonReport = async (
  lessonId: number,
  request: SubmitReportRequest
): Promise<ApiResponse<LessonDetailDto>> => {
  try {
    const response = await api.put(`/tutor/lessons/${lessonId}/report`, request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Error submitting report:', error.message);
    throw error;
  }
};

/**
 * Upload attachment for a lesson
 */
export const uploadLessonAttachment = async (
  lessonId: number,
  file: File
): Promise<ApiResponse<string>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/tutor/lessons/${lessonId}/attachments`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error uploading attachment:', error.message);
    throw error;
  }
};
