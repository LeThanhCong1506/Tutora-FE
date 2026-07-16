import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import type { LessonDetailDto } from './lesson.service';
import { setupAuthInterceptor } from './apiClient';
import {
    getStudentClassSessions,
    getStudentClassSessionDetail,
    getStudentPendingClassSessions,
    getStudentCalendar as getStudentCalendarReal,
    confirmStudentClassSession,
    type StudentClassSessionSummaryResponse,
    type StudentClassSessionDetailResponse,
} from './classSession.service';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

/**
 * Adapter layer — trước đây gọi `/student/lessons*` (đã chết, đổi sang
 * `ClassSession` domain trên `Tutora-Backend` nhánh `refactor/Payment`).
 * Giữ nguyên tên hàm/shape cũ (`lessonId`, `subjectName`, `tutorName`...) để
 * không phải sửa lại `StudentLessons/index.tsx` và `StudentLessonDetail.tsx`.
 *
 * NOTE: `StudentClassSessionSummaryResponse` (list/pending) KHÔNG có `meetingLink`
 * — field đó chỉ có ở detail. Nút "Vào lớp" ngay trên list sẽ không hiện được
 * cho tới khi BE bổ sung field này vào summary DTO.
 */

const mapSummary = (r: StudentClassSessionSummaryResponse) => ({
    lessonId: r.classSessionId,
    bookingId: r.bookingId,
    scheduledStart: r.scheduledStart,
    scheduledEnd: r.scheduledEnd,
    confirmDeadline: r.confirmDeadline,
    lessonPrice: r.classSessionPrice,
    subjectName: r.subjectName,
    tutorName: r.tutorName,
    status: r.status,
    meetingLink: undefined as string | undefined,
});

export interface StudentLessonDetailDto extends Omit<LessonDetailDto, 'lessonId'> {
    lessonId: number;
    subjectName?: string;
    tutorName?: string;
}

const mapDetail = (d: StudentClassSessionDetailResponse): StudentLessonDetailDto => ({
    lessonId: d.classSessionId,
    bookingId: d.bookingId,
    scheduledStart: d.scheduledStart ?? '',
    scheduledEnd: d.scheduledEnd ?? '',
    confirmDeadline: d.confirmDeadline,
    lessonPrice: d.classSessionPrice,
    status: d.status,
    meetingLink: d.meetingLink,
    checkInTime: d.checkinTime,
    checkOutTime: d.checkoutTime,
    lessonContent: d.report?.topicsCovered,
    homework: d.report?.homeworkAssigned,
    tutorNotes: d.report?.tutorNotes,
    subject: { subjectId: 0, subjectName: d.subjectName },
    tutor: { tutorId: '', fullName: d.tutorName, avatarUrl: d.tutorAvatar },
    report: d.report
        ? {
              reportId: 0,
              contentCovered: d.report.topicsCovered ?? '',
              homeworkAssigned: d.report.homeworkAssigned ?? '',
              studentPerformanceRating: 0,
              attachments: [] as string[],
              createdAt: '',
          }
        : undefined,
    // Alias phẳng — khớp với cách `StudentLessons/index.tsx` đang đọc
    subjectName: d.subjectName,
    tutorName: d.tutorName,
});

// ============================================
// Student Lesson API Functions
// ============================================

type StudentLessonSummaryDto = ReturnType<typeof mapSummary>;

export interface StudentCalendarLessonDto {
    lessonId: number;
    scheduledStart: string;
    scheduledEnd: string;
    studentName?: string;
    tutorName?: string;
    subjectName?: string;
    status: string;
    meetingLink?: string;
}

export interface StudentCalendarDayDto {
    date: string;
    lessons: StudentCalendarLessonDto[];
}

export const getStudentLessons = async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<ApiResponse<{ items: StudentLessonSummaryDto[]; totalCount: number }>> => {
    const response = await getStudentClassSessions(params.page, params.pageSize, params.status);
    const { items, totalCount } = response.content;
    return { ...response, content: { items: items.map(mapSummary), totalCount } };
};

export const getStudentPendingLessons = async (): Promise<ApiResponse<StudentLessonSummaryDto[]>> => {
    const response = await getStudentPendingClassSessions();
    return { ...response, content: (response.content ?? []).map(mapSummary) };
};

export const getStudentLessonDetail = async (
    lessonId: number
): Promise<ApiResponse<StudentLessonDetailDto>> => {
    const response = await getStudentClassSessionDetail(lessonId);
    return { ...response, content: mapDetail(response.content) };
};

/** BE chỉ trả message string (không có `SettlementResultResponse` chi tiết như phía Parent). */
export const confirmStudentLesson = async (
    lessonId: number
): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    const response = await confirmStudentClassSession(lessonId);
    return { ...response, content: { success: true, message: response.content } };
};

export const getStudentCalendar = async (
    startDate?: string,
    endDate?: string
): Promise<ApiResponse<StudentCalendarDayDto[]>> => {
    const response = await getStudentCalendarReal(startDate, endDate);
    return {
        ...response,
        content: (response.content ?? []).map((day) => ({
            date: day.date,
            lessons: day.classSessions.map((c) => ({
                lessonId: c.classSessionId,
                scheduledStart: c.scheduledStart,
                scheduledEnd: c.scheduledEnd,
                studentName: c.studentName,
                tutorName: c.tutorName,
                subjectName: c.subjectName,
                status: c.status ?? '',
                meetingLink: c.meetingLink,
            })),
        })),
    };
};

/**
 * Get student bookings
 * Reuses the same /bookings endpoint — BE filters by role automatically
 */
export const getStudentBookings = async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<ApiResponse<{ items: unknown[]; totalCount: number }>> => {
    try {
        const response = await api.get('/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
    } catch (error: unknown) {
        const e = error as { message?: string };
        console.error('Error fetching student bookings:', e.message);
        throw error;
    }
};
