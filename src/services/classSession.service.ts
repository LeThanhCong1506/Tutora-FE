import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';
import type { ClassSessionStatus } from '../utils/classSessionStatus';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// ── Shared nested DTOs (mirror BE `MV.DomainLayer/DTO/ResponseModel/*.cs` on Tutora-Backend branch `refactor/Payment`) ──

export interface StudentMini {
    studentId: string;
    fullName?: string;
    gradeLevelId?: number;
    gradeLevel?: string;
    gradeLevelName?: string;
}

export interface TutorMini {
    tutorId: string;
    fullName?: string;
    avatarUrl?: string;
    hourlyRate?: number;
}

export interface SubjectInfo {
    subjectId: number;
    subjectName?: string;
}

// ── ClassSessionResponse (list view — `GET /tutor/class-sessions`, `GET /parent/class-sessions`, `GET /class-sessions/{id}`) ──

export interface ClassSessionResponse {
    classSessionId: number;
    bookingId: number;
    tutorId?: string;
    studentId?: string;
    scheduledStart: string;
    scheduledEnd: string;
    meetingLink?: string;
    classSessionPrice?: number;
    status: ClassSessionStatus;
    checkInTime?: string;
    checkOutTime?: string;
    isTutorPresent?: boolean;
    isStudentPresent?: boolean;
    createdAt?: string;
    student?: StudentMini;
    subject?: SubjectInfo;
    tutor?: TutorMini;
}

// ── ClassSessionDetailResponse (rich detail — tutor actions, check-in/out/report) ──

export interface ClassSessionStudent {
    studentId?: string;
    fullName?: string;
    school?: string;
    gradeLevel?: string;
    avatarUrl?: string;
}

export interface ClassSessionTutor {
    tutorId?: string;
    fullName?: string;
    avatarUrl?: string;
    averageRating?: number;
}

export interface ClassSessionSubject {
    subjectId: number;
    subjectName?: string;
}

export interface ClassSessionReport {
    reportId: number;
    contentCovered?: string;
    homeworkAssigned?: string;
    studentPerformanceRating?: number;
    attachments?: string[];
    createdAt?: string;
}

export interface ClassSessionDetailResponse {
    classSessionId: number;
    bookingId?: number;
    scheduledStart: string;
    scheduledEnd: string;
    realStart?: string;
    realEnd?: string;
    checkInTime?: string;
    checkOutTime?: string;
    isTutorPresent?: boolean;
    isStudentPresent?: boolean;
    attendanceNote?: string;
    status?: ClassSessionStatus;
    submittedAt?: string;
    confirmDeadline?: string;
    parentAckAt?: string;
    isSettled?: boolean;
    classSessionContent?: string;
    homework?: string;
    tutorNotes?: string;
    meetingLink?: string;
    classSessionPrice?: number;
    isMakeup?: boolean;
    originalClassSessionId?: number;
    noShowAction?: string;
    student?: ClassSessionStudent;
    tutor?: ClassSessionTutor;
    subject?: ClassSessionSubject;
    report?: ClassSessionReport;
    /** `TimeSpan?` on BE — serializes as `"hh:mm:ss"` string, or null. */
    timeUntilStart?: string | null;
    timeRemainingToConfirm?: string | null;
    canCheckIn: boolean;
    canSubmitReport: boolean;
}

// ── Request DTOs ──

export interface CheckOutRequest {
    note?: string;
}

export interface SubmitReportRequest {
    contentCovered: string;
    homeworkAssigned?: string;
    studentPerformanceRating?: number;
    tutorNotes?: string;
    isTutorPresent?: boolean;
    isStudentPresent?: boolean;
    attendanceNote?: string;
    attachments?: string[];
}

// ── Calendar / dashboard DTOs ──

export interface CalendarClassSessionResponse {
    classSessionId: number;
    /** Booking chứa buổi học — dùng cho các tác vụ cấp lớp như tài liệu. */
    bookingId?: number;
    scheduledStart: string;
    scheduledEnd: string;
    studentName?: string;
    tutorName?: string;
    subjectName?: string;
    status?: ClassSessionStatus;
    meetingLink?: string;
    /** Đã check-out (phòng đóng vĩnh viễn) — in_progress + checkOutTime = chờ gửi báo cáo. */
    checkOutTime?: string;
    statusColor: string;
}

export interface CalendarDayResponse {
    date: string;
    classSessions: CalendarClassSessionResponse[];
}

export interface UpcomingClassSessionResponse {
    classSessionId: number;
    bookingId?: number;
    scheduledStart: string;
    scheduledEnd: string;
    studentName?: string;
    subjectName?: string;
    meetingLink?: string;
}

export interface TutorDashboardStatsResponse {
    upcomingClassSessions: number;
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
    nextClassSessions: UpcomingClassSessionResponse[];
    profileStatus?: string;
    hasVerifiedCertificates: boolean;
    missingFields?: string[];
}

/**
 * `GET /tutor/class-sessions` returns `PagedList<ClassSessionResponse>`. On BE, `PagedList<T>`
 * extends `List<T>`, so System.Text.Json serializes it as a **bare JSON array** — the
 * CurrentPage/TotalPages/TotalCount properties are NOT included in the response body.
 * `content` below is therefore `ClassSessionResponse[]`, not `{ items, totalCount }`.
 */

// ── Tutor endpoints — `api/tutor/class-sessions` ──

export const getTutorClassSessions = async (
    page: number = 1,
    pageSize: number = 100,
    fromDate?: string,
    status?: string,
): Promise<ApiResponse<ClassSessionResponse[]>> => {
    const response = await api.get('/tutor/class-sessions', {
        headers: getAuthHeaders(),
        params: { page, pageSize, fromDate, status },
    });
    return response.data;
};

export type TutorClassStatus =
    | 'scheduled'
    | 'in_progress'
    | 'pending_confirmation'
    | 'completed'
    | 'cancelled';

export interface TutorClassSummary {
    bookingId: number;
    subjectName?: string;
    studentName?: string;
    totalSessions: number;
    completedSessions: number;
    /** Distinct weekday+time slots, e.g. "T2 18:05, T3 14:30" (max 3). */
    schedule?: string;
    /** ISO start of the next upcoming session, or null. */
    nextSessionStart?: string | null;
    status: TutorClassStatus;
}

export interface TutorClassListResponse {
    items: TutorClassSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export const getTutorClasses = async (
    page: number = 1,
    pageSize: number = 10,
    status?: string,
    search?: string,
): Promise<ApiResponse<TutorClassListResponse>> => {
    const response = await api.get('/tutor/classes', {
        headers: getAuthHeaders(),
        params: { page, pageSize, status, search },
    });
    return response.data;
};

export const getTutorClassSessionDetail = async (id: number): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.get(`/tutor/class-sessions/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

export const getTutorCalendar = async (
    startDate?: string,
    endDate?: string,
): Promise<ApiResponse<CalendarDayResponse[]>> => {
    const response = await api.get('/tutor/class-sessions/calendar', {
        headers: getAuthHeaders(),
        params: { startDate, endDate },
    });
    return response.data;
};

export const getTutorDashboardStats = async (): Promise<ApiResponse<TutorDashboardStatsResponse>> => {
    const response = await api.get('/tutor/class-sessions/dashboard', { headers: getAuthHeaders() });
    return response.data;
};

export const checkOutClassSession = async (
    classSessionId: number,
    request: CheckOutRequest = {},
): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.put(`/tutor/class-sessions/${classSessionId}/checkout`, request, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const submitClassSessionReport = async (
    id: number,
    request: SubmitReportRequest,
): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.put(`/tutor/class-sessions/${id}/report`, request, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const uploadClassSessionAttachment = async (id: number, file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/tutor/class-sessions/${id}/attachments`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// ── Parent endpoints ──

export const getParentClassSessions = async (
    page: number = 1,
    pageSize: number = 20,
    fromDate?: string,
    status?: string,
): Promise<ApiResponse<ClassSessionResponse[]>> => {
    const response = await api.get('/parent/class-sessions', {
        headers: getAuthHeaders(),
        params: { page, pageSize, fromDate, status },
    });
    return response.data;
};

// ── Parent (+ Student, BE authorizes both via `ParentOrStudent`) — `ParentController`, `api/parent/class-sessions/*` ──

export interface PendingClassSessionResponse {
    classSessionId: number;
    bookingId?: number;
    scheduledStart: string;
    scheduledEnd: string;
    submittedAt?: string;
    confirmDeadline?: string;
    tutorName?: string;
    tutorAvatarUrl?: string;
    studentName?: string;
    subjectName?: string;
    classSessionPrice?: number;
    classSessionContent?: string;
    homework?: string;
    tutorNotes?: string;
    timeRemainingDisplay?: string;
    isUrgent: boolean;
}

export const getParentPendingClassSessions = async (): Promise<ApiResponse<PendingClassSessionResponse[]>> => {
    const response = await api.get('/parent/class-sessions/pending', { headers: getAuthHeaders() });
    return response.data;
};

/** Richer than `getClassSessionById` — same `ClassSessionDetailResponse` shape tutor actions use. */
export const getParentClassSessionDetail = async (id: number): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.get(`/parent/class-sessions/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

export interface SettlementResultResponse {
    classSessionId: number;
    bookingId?: number;
    success: boolean;
    message?: string;
    amountReleased: number;
    amountRefunded: number;
    settlementType?: string;
    transactionId?: number;
    newTutorBalance?: number;
    sessionsRemaining?: number;
}

/** Parent or Student confirm — richer response than `confirmStudentClassSession` (which only returns a message string). */
export const confirmParentClassSession = async (id: number): Promise<ApiResponse<SettlementResultResponse>> => {
    const response = await api.put(`/parent/class-sessions/${id}/confirm`, {}, { headers: getAuthHeaders() });
    return response.data;
};

export interface CreateDisputeRequest {
    disputeType: 'no_show' | 'quality' | 'payment' | 'other';
    reason: string;
    evidence?: string[];
}

export interface DisputeUserInfo {
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
}

export interface DisputeClassSessionInfo {
    classSessionId: number;
    scheduledStart: string;
    scheduledEnd: string;
    status?: string;
    classSessionPrice?: number;
    classSessionContent?: string;
    homework?: string;
    isTutorPresent?: boolean;
    isStudentPresent?: boolean;
}

export interface DisputeEvidenceItem {
    disputeEvidenceId: number;
    fileUrl?: string;
    fileType?: string;
    description?: string;
    createdAt?: string;
}

export interface DisputeDetailResponse {
    disputeId: number;
    bookingId?: number;
    classSessionId?: number;
    disputeType?: string;
    reason?: string;
    status?: string;
    evidence?: string[];
    createdAt?: string;
    resolvedAt?: string;
    resolutionNote?: string;
    refundAmount?: number;
    refundPercentage?: number;
    tutorResponse?: string;
    tutorRespondedAt?: string;
    additionalEvidence?: DisputeEvidenceItem[];
    createdBy?: DisputeUserInfo;
    resolvedBy?: DisputeUserInfo;
    classSession?: DisputeClassSessionInfo;
    tutor?: { tutorId?: string; fullName?: string; email?: string; phone?: string; warningCount: number; averageRating?: number };
    timeSinceCreation?: string;
}

/** ClassSession phải ở trạng thái `pending_confirmation` hoặc `completed`, và chưa từng bị khiếu nại. */
export const createClassSessionDispute = async (
    id: number,
    request: CreateDisputeRequest,
): Promise<ApiResponse<DisputeDetailResponse>> => {
    const response = await api.post(`/parent/class-sessions/${id}/dispute`, request, { headers: getAuthHeaders() });
    return response.data;
};

/** Xem lại dispute đã tạo cho classSession này (trạng thái, bằng chứng, phản hồi gia sư khi có). */
export const getClassSessionDispute = async (id: number): Promise<ApiResponse<DisputeDetailResponse>> => {
    const response = await api.get(`/parent/class-sessions/${id}/dispute`, { headers: getAuthHeaders() });
    return response.data;
};

export const getParentCalendar = async (
    startDate?: string,
    endDate?: string,
): Promise<ApiResponse<CalendarDayResponse[]>> => {
    const response = await api.get('/parent/class-sessions/calendar', {
        headers: getAuthHeaders(),
        params: { startDate, endDate },
    });
    return response.data;
};

// ── No-show — `ClassSessionController`, parent-only, `api/class-sessions/{id}/*` ──

export interface ReportNoShowRequest {
    reportedAt?: string;
    reason?: string;
}

export const reportClassSessionNoShow = async (
    id: number,
    request?: ReportNoShowRequest,
): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.post(`/class-sessions/${id}/report-no-show`, request ?? {}, { headers: getAuthHeaders() });
    return response.data;
};

export interface NoShowActionRequest {
    actionType: 'free_session' | 'makeup' | 'change_tutor';
    newScheduledStart?: string;
    note?: string;
}

export interface NoShowActionResultResponse {
    classSessionId: number;
    actionType: string;
    success: boolean;
    message?: string;
    amountRefunded?: number;
    makeupClassSessionId?: number;
    warningCreated: boolean;
}

export const processClassSessionNoShowAction = async (
    id: number,
    request: NoShowActionRequest,
): Promise<ApiResponse<NoShowActionResultResponse>> => {
    const response = await api.post(`/class-sessions/${id}/no-show-action`, request, { headers: getAuthHeaders() });
    return response.data;
};

// ── Generic (any authenticated role with access) ──

export const getClassSessionById = async (id: number): Promise<ApiResponse<ClassSessionResponse>> => {
    const response = await api.get(`/class-sessions/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

// ── Student endpoints — `api/student/class-sessions` ──
// NOTE: these 3 diverge from the generic envelope — BE wraps ad-hoc shapes in `APIResponse<object>`
// rather than the typed `ClassSessionResponse`/`PagedList` used by tutor/parent routes.

export interface StudentClassSessionSummaryResponse {
    classSessionId: number;
    status?: ClassSessionStatus;
    scheduledStart?: string;
    scheduledEnd?: string;
    confirmDeadline?: string;
    classSessionPrice?: number;
    subjectName?: string;
    tutorName?: string;
    bookingId?: number;
}

export interface StudentClassSessionReport {
    topicsCovered?: string;
    homeworkAssigned?: string;
    tutorNotes?: string;
}

export interface StudentClassSessionDetailResponse extends StudentClassSessionSummaryResponse {
    meetingLink?: string;
    checkinTime?: string;
    checkoutTime?: string;
    tutorAvatar?: string;
    report?: StudentClassSessionReport;
}

export const getStudentClassSessions = async (
    page: number = 1,
    pageSize: number = 10,
    status?: string,
): Promise<ApiResponse<{ items: StudentClassSessionSummaryResponse[]; totalCount: number }>> => {
    const response = await api.get('/student/class-sessions', {
        headers: getAuthHeaders(),
        params: { page, pageSize, status },
    });
    return response.data;
};

export const getStudentClassSessionDetail = async (
    id: number,
): Promise<ApiResponse<StudentClassSessionDetailResponse>> => {
    const response = await api.get(`/student/class-sessions/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

export const getStudentPendingClassSessions = async (): Promise<
    ApiResponse<StudentClassSessionSummaryResponse[]>
> => {
    const response = await api.get('/student/class-sessions/pending', { headers: getAuthHeaders() });
    return response.data;
};

export const getStudentCalendar = async (
    startDate?: string,
    endDate?: string,
): Promise<ApiResponse<CalendarDayResponse[]>> => {
    const response = await api.get('/student/class-sessions/calendar', {
        headers: getAuthHeaders(),
        params: { startDate, endDate },
    });
    return response.data;
};

export const confirmStudentClassSession = async (id: number): Promise<ApiResponse<string>> => {
    const response = await api.put(`/student/class-sessions/${id}/confirm`, {}, { headers: getAuthHeaders() });
    return response.data;
};

export interface DisputeListResponse {
    disputeId: number;
    classSessionId: number;
    bookingId?: number;
    disputeType?: string;
    status: string;
    reason: string;
    tutorName?: string;
    classSessionPrice?: number;
    createdAt?: string;
}

export const uploadClassSessionDisputeEvidence = async (
    id: number,
    file: File,
): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/parent/class-sessions/${id}/dispute/evidence`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getParentDisputesList = async (
    page: number = 1,
    pageSize: number = 10,
): Promise<ApiResponse<{ items: DisputeListResponse[]; totalCount: number; page: number; pageSize: number }>> => {
    const response = await api.get('/parent/disputes', {
        headers: getAuthHeaders(),
        params: { page, pageSize },
    });
    return response.data;
};

// ── Tutor dispute rebuttal — `TutorClassSessionController`, `api/tutor/class-sessions/*` + `api/tutor/disputes` ──

export const getTutorClassSessionDispute = async (id: number): Promise<ApiResponse<DisputeDetailResponse>> => {
    const response = await api.get(`/tutor/class-sessions/${id}/dispute`, { headers: getAuthHeaders() });
    return response.data;
};

export const submitTutorDisputeResponse = async (
    id: number,
    responseText: string,
): Promise<ApiResponse<DisputeDetailResponse>> => {
    const result = await api.post(
        `/tutor/class-sessions/${id}/dispute/response`,
        { response: responseText },
        { headers: getAuthHeaders() },
    );
    return result.data;
};

export const uploadTutorDisputeEvidence = async (id: number, file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tutor/class-sessions/${id}/dispute/evidence`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getTutorDisputesList = async (
    page: number = 1,
    pageSize: number = 10,
): Promise<ApiResponse<{ items: DisputeListResponse[]; totalCount: number; page: number; pageSize: number }>> => {
    const response = await api.get('/tutor/disputes', {
        headers: getAuthHeaders(),
        params: { page, pageSize },
    });
    return response.data;
};

