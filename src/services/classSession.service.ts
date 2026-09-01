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
    /** Yêu cầu dời lịch đang hiệu lực cho buổi này — "pending"/"approved", null nếu không có. */
    scheduleChangeStatus?: 'pending' | 'approved' | null;
    /** True nếu buổi này đang có đề xuất đổi lịch (tính năng chủ động chọn giờ mới) chờ phản hồi. */
    hasPendingReschedule?: boolean;
    /** True nếu đây là buổi phụ (Link 2), sinh ra khi buổi gốc (`originalClassSessionId`) bị báo ngắt giữa chừng. */
    isContinuation?: boolean;
    /** True nếu đây là buổi học lại (Link 3), sinh ra khi hoà giải dispute chọn "học lại". */
    isDisputeRelearn?: boolean;
    /** Buổi gốc mà buổi bù/buổi phụ/buổi học lại này trỏ về — undefined nếu đây là buổi gốc. */
    originalClassSessionId?: number;
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

/** Một tệp đính kèm của báo cáo buổi học — mirror BE `ReportAttachment`. */
export interface ReportAttachment {
    url: string;
    /** Nhãn gia sư đặt cho tệp; rỗng thì FE hiển thị tên file. */
    description?: string | null;
}

export interface ClassSessionReport {
    reportId: number;
    contentCovered?: string;
    homeworkAssigned?: string;
    studentPerformanceRating?: number;
    /** Chỉ có URL — giữ lại cho code cũ; ưu tiên đọc `attachmentDetails`. */
    attachments?: string[];
    attachmentDetails?: ReportAttachment[];
    createdAt?: string;
}

/** Lịch sử dời lịch của một buổi học — mirror BE `DisputeScheduleChangeAuditResponse`. */
export interface ScheduleChangeAuditDto {
    scheduleChangeId: number;
    status: 'pending' | 'approved' | 'applied' | 'rejected' | 'expired' | string;
    originalScheduledStart: string;
    originalScheduledEnd: string;
    adjustedScheduledStart?: string;
    adjustedScheduledEnd?: string;
    learnerApproverRole: 'Parent' | 'Student' | string;
    tutorConfirmedByName?: string;
    tutorConfirmedAt?: string;
    learnerConfirmedByName?: string;
    learnerConfirmedAt?: string;
    requestedAt?: string;
    approvedAt?: string;
    appliedAt?: string;
}

/** Đề xuất dời giờ học — mirror BE `ClassSessionRescheduleProposalResponse`. */
export interface RescheduleProposalDto {
    rescheduleProposalId: number;
    classSessionId: number;
    proposedByUserId: string;
    proposedByRole: 'Tutor' | 'Student' | 'Parent' | string;
    proposedByName?: string;
    counterpartUserId: string;
    counterpartRole: 'Tutor' | 'Student' | 'Parent' | string;
    counterpartName?: string;
    originalScheduledStart: string;
    originalScheduledEnd: string;
    proposedScheduledStart: string;
    proposedScheduledEnd: string;
    reason?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | string;
    requestedAt: string;
    expiresAt: string;
    respondedAt?: string;
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
    bookingStatus?: string;
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
    /** True nếu đây là buổi phụ (Link 2), sinh ra khi buổi gốc (`originalClassSessionId`) bị báo ngắt giữa chừng. */
    isContinuation?: boolean;
    /** True nếu đây là buổi học lại (Link 3), sinh ra khi hoà giải dispute chọn "học lại". */
    isDisputeRelearn?: boolean;
    /** Mốc buổi GỐC bị báo ngắt — chỉ có giá trị trên chính buổi gốc, không phải trên buổi phụ. */
    interruptedAt?: string;
    /** Lý do báo ngắt do người báo tự nhập — chỉ có trên buổi gốc. */
    interruptReason?: string;
    /** Tên người đã báo ngắt — chỉ có trên buổi gốc. BE không trả user_id, chỉ trả tên đã resolve. */
    interruptedByName?: string;
    /** ID buổi phụ sinh ra từ chính buổi này khi bị ngắt — chỉ có trên buổi GỐC (status=interrupted). */
    continuationSessionId?: number;
    /** Giờ hẹn của buổi phụ — hiện trực tiếp trên trang buổi gốc, không cần mở thêm trang riêng. */
    continuationScheduledStart?: string;
    continuationScheduledEnd?: string;
    /** True khi cả 2 phía đã đồng ý bỏ hẳn buổi phụ — lúc này canSubmitReport đã tự bật true dù
     * status vẫn là interrupted, không cần FE tự suy luận thêm. */
    continuationSkipBothConfirmed?: boolean;
    /** True khi CHÍNH buổi này là buổi phụ và cả 2 phía đã đồng ý bỏ nó — khoá "Vào học nhanh"/
     * "Đề xuất đổi lịch" trên chính trang buổi phụ dù status vẫn còn Scheduled. */
    skipConfirmedByBothSides?: boolean;
    student?: ClassSessionStudent;
    tutor?: ClassSessionTutor;
    subject?: ClassSessionSubject;
    report?: ClassSessionReport;
    /** `TimeSpan?` on BE — serializes as `"hh:mm:ss"` string, or null. */
    timeUntilStart?: string | null;
    timeRemainingToConfirm?: string | null;
    canCheckIn: boolean;
    canSubmitReport: boolean;
    scheduleChanges?: ScheduleChangeAuditDto[];
    /** Đề xuất đổi lịch đang chờ phản hồi, null nếu không có. */
    pendingRescheduleProposal?: RescheduleProposalDto | null;
    /** Toàn bộ lịch sử đề xuất đổi lịch, mới nhất trước. */
    rescheduleProposals?: RescheduleProposalDto[];
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
    /** @deprecated Gửi `attachmentDetails` để kèm được mô tả từng tệp. */
    attachments?: string[];
    attachmentDetails?: ReportAttachment[];
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
    bookingStatus?: string;
    meetingLink?: string;
    /** Đã check-out (phòng đóng vĩnh viễn) — in_progress + checkOutTime = chờ gửi báo cáo. */
    checkOutTime?: string;
    /** True nếu buổi học đã có video xem lại (đã upload xong lên Drive). */
    hasRecording?: boolean;
    statusColor: string;
    /** Yêu cầu dời lịch đang hiệu lực cho buổi này — "pending"/"approved", null nếu không có. */
    scheduleChangeStatus?: 'pending' | 'approved' | null;
    /** True nếu buổi này đang có đề xuất đổi lịch (tính năng chủ động chọn giờ mới) chờ phản hồi. */
    hasPendingReschedule?: boolean;
    /** True nếu đây là buổi phụ (Link 2), sinh ra khi buổi gốc (`originalClassSessionId`) bị báo ngắt giữa chừng. */
    isContinuation?: boolean;
    /** True nếu đây là buổi học lại (Link 3), sinh ra khi hoà giải dispute chọn "học lại". */
    isDisputeRelearn?: boolean;
    /** Buổi gốc mà buổi bù/buổi phụ/buổi học lại này trỏ về — undefined nếu đây là buổi gốc. */
    originalClassSessionId?: number;
    /** True khi cả gia sư và học sinh đã đồng ý bỏ buổi phụ này — status vẫn "scheduled" cho tới
     * khi báo cáo buổi gốc được nộp, nhưng buổi này coi như đã "chết" nên phải ẩn nút "Vào lớp". */
    skipConfirmedByBothSides?: boolean;
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
    /** Lọc theo 1 lớp (booking) — dùng cho modal chi tiết lớp ở trang "Lớp học". */
    bookingId?: number,
): Promise<ApiResponse<ClassSessionResponse[]>> => {
    const response = await api.get('/tutor/class-sessions', {
        headers: getAuthHeaders(),
        params: { page, pageSize, fromDate, status, bookingId },
    });
    return response.data;
};

export type TutorClassStatus =
    | 'scheduled'
    | 'in_progress'
    | 'pending_confirmation'
    /** Mọi buổi đã mở đều xong nhưng còn buổi giữ chỗ — chờ phụ huynh trả nốt để mở tiếp. */
    | 'reserved'
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

/** Trạng thái/kết quả 1 job Gemini phân tích video — dùng chung cho tóm tắt học sinh + auto-fill báo cáo gia sư. */
export interface ClassSessionAiJobResponse {
    jobId?: string;
    status: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
    /**
     * Giai đoạn con của job tóm tắt học sinh:
     * - "analyzing": đang nghe video viết tóm tắt (status="processing").
     * - "transcribing": tóm tắt đã xong và trả về rồi (status="completed"), bản chép lời còn chạy nền.
     */
    stage?: string | null;
    resultText?: string | null;
    /** Bản chép lời (transcript) đầy đủ — sinh ở lượt gọi Gemini riêng, về sau tóm tắt nên có thể còn null. */
    transcriptText?: string | null;
    resultJson?: TutorReportAiFillResult | null;
    errorMessage?: string | null;
}

export interface TutorReportAiFillResult {
    lessonContent: string;
    homework: string;
    tutorNotes: string;
}

/** Gia sư yêu cầu Gemini đọc video buổi học và gợi ý nội dung điền vào báo cáo. */
export const triggerReportAiFill = async (id: number): Promise<ApiResponse<ClassSessionAiJobResponse>> => {
    const response = await api.post(`/tutor/class-sessions/${id}/report/ai-fill`, {}, { headers: getAuthHeaders() });
    return response.data;
};

export const getReportAiFillStatus = async (id: number): Promise<ApiResponse<ClassSessionAiJobResponse>> => {
    const response = await api.get(`/tutor/class-sessions/${id}/report/ai-fill`, { headers: getAuthHeaders() });
    return response.data;
};

export const proposeTutorReschedule = async (
    id: number,
    proposedScheduledStart: string,
    reason?: string,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/tutor/class-sessions/${id}/reschedule-proposal`,
        { proposedScheduledStart, reason },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const respondTutorReschedule = async (
    id: number,
    accepted: boolean,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/tutor/class-sessions/${id}/reschedule-proposal/respond`,
        { accepted },
        { headers: getAuthHeaders() },
    );
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
export interface SessionScheduleChangeResponse {
    classSessionId: number;
    requiresConfirmation: boolean;
    canCurrentUserConfirm: boolean;
    currentUserConfirmed: boolean;
    admissionAllowed: boolean;
    /**
     * True nếu buổi học đang có đề xuất đổi lịch (tính năng chủ động chọn giờ mới) chờ phản hồi —
     * cổng xác nhận vào học ngoài giờ bị khoá hoàn toàn cho tới khi đề xuất đó được xử lý xong.
     * Khi true, KHÔNG được cho vào phòng dù `requiresConfirmation` là false.
     */
    rescheduleProposalPending?: boolean;
    status?: string;
    tutorUserId?: string;
    learnerApproverUserId?: string;
    requiredLearnerRole?: 'Student' | 'Parent';
    requiredLearnerName?: string;
    tutorName?: string;
    studentName?: string;
    originalScheduledStart: string;
    originalScheduledEnd: string;
    durationMinutes: number;
    requestedAt?: string;
    expiresAt?: string;
    tutorConfirmedAt?: string;
    learnerConfirmedAt?: string;
    approvedAt?: string;
    appliedAt?: string;
    adjustedScheduledStart?: string;
    adjustedScheduledEnd?: string;
    scheduleConflict?: {
        classSessionId: number;
        scheduledStart: string;
        scheduledEnd: string;
        conflictingParty: 'tutor' | 'student' | 'tutor_and_student';
        message: string;
    };
}

export const getParentScheduleChange = async (
    id: number,
): Promise<ApiResponse<SessionScheduleChangeResponse>> => {
    const response = await api.get(`/parent/class-sessions/${id}/schedule-change`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const respondParentScheduleChange = async (
    id: number,
    confirmed: boolean,
): Promise<ApiResponse<SessionScheduleChangeResponse>> => {
    const response = await api.post(
        `/parent/class-sessions/${id}/schedule-change/respond`,
        { confirmed },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const proposeParentReschedule = async (
    id: number,
    proposedScheduledStart: string,
    reason?: string,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/parent/class-sessions/${id}/reschedule-proposal`,
        { proposedScheduledStart, reason },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const respondParentReschedule = async (
    id: number,
    accepted: boolean,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/parent/class-sessions/${id}/reschedule-proposal/respond`,
        { accepted },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

/** Học sinh tự quản lý (>16, không có phụ huynh) — cùng luồng xác nhận dời lịch, khác route. */
export const getStudentScheduleChange = async (
    id: number,
): Promise<ApiResponse<SessionScheduleChangeResponse>> => {
    const response = await api.get(`/student/class-sessions/${id}/schedule-change`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const respondStudentScheduleChange = async (
    id: number,
    confirmed: boolean,
): Promise<ApiResponse<SessionScheduleChangeResponse>> => {
    const response = await api.post(
        `/student/class-sessions/${id}/schedule-change/respond`,
        { confirmed },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const proposeStudentReschedule = async (
    id: number,
    proposedScheduledStart: string,
    reason?: string,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/student/class-sessions/${id}/reschedule-proposal`,
        { proposedScheduledStart, reason },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const respondStudentReschedule = async (
    id: number,
    accepted: boolean,
): Promise<ApiResponse<RescheduleProposalDto>> => {
    const response = await api.post(
        `/student/class-sessions/${id}/reschedule-proposal/respond`,
        { accepted },
        { headers: getAuthHeaders() },
    );
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
    /** Phản hồi của phụ huynh/học sinh khi dispute do GIA SƯ tạo (chiều ngược với tutorResponse). */
    respondentResponse?: string;
    respondentRespondedAt?: string;
    additionalEvidence?: DisputeEvidenceItem[];
    createdBy?: DisputeUserInfo;
    resolvedBy?: DisputeUserInfo;
    classSession?: DisputeClassSessionInfo;
    tutor?: { tutorId?: string; fullName?: string; email?: string; phone?: string; warningCount: number; averageRating?: number };
    timeSinceCreation?: string;
    /** Earliest time admin can start investigating (createdAt + 48h) — after this, response/evidence lock. */
    tutorResponseDeadline?: string;
    /** Thời điểm quản trị viên xác nhận báo cáo tutor no-show. */
    noShowConfirmedAt?: string;
    /** User id của quản trị viên đã xác nhận tutor no-show. */
    noShowConfirmedBy?: string;
}

/** ClassSession phải ở trạng thái `pending_confirmation` hoặc `completed`, và chưa từng bị khiếu nại. */
export const createClassSessionDispute = async (
    id: number,
    request: CreateDisputeRequest,
    files: File[] = [],
): Promise<ApiResponse<DisputeDetailResponse>> => {
    const formData = new FormData();
    formData.append('disputeType', request.disputeType);
    formData.append('reason', request.reason);
    files.forEach((file) => formData.append('files', file));

    const response = await api.post(`/parent/class-sessions/${id}/dispute`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
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
    files: File[] = [],
): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const formData = new FormData();
    if (request?.reportedAt) formData.append('reportedAt', request.reportedAt);
    if (request?.reason) formData.append('reason', request.reason);
    files.forEach((file) => formData.append('files', file));

    const response = await api.post(`/class-sessions/${id}/report-no-show`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
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

/**
 * Gia sư/học sinh/phụ huynh báo buổi đang `in_progress` bị ngắt giữa chừng vì sự cố đột xuất.
 * Buổi gốc chuyển `interrupted`; hệ thống tạo 1 buổi phụ (`isContinuation=true`) để học nốt trong ngày.
 */
export const requestClassSessionInterruption = async (
    id: number,
    reason?: string,
): Promise<ApiResponse<ClassSessionDetailResponse>> => {
    const response = await api.post(
        `/class-sessions/${id}/request-interruption`,
        { reason },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

/**
 * Đã đủ % thời lượng thật (dữ liệu Agora, không phải đồng hồ tường) để báo ngắt giữa chừng chưa —
 * gọi định kỳ trong lúc đang học để FE hiện/khoá nút "Báo buổi học bị ngắt" đúng lúc, không phải
 * đoán bằng elapsed time. `currentRatio`/`requiredRatio` là số 0.0–1.0.
 */
export interface ClassSessionInterruptionEligibilityResponse {
    eligible: boolean;
    currentRatio: number;
    requiredRatio: number;
    /** False cho buổi phụ/buổi học lại do hoà giải — 2 loại này KHÔNG BAO GIỜ báo ngắt được, nên ẩn
     * hẳn nút thay vì hiện nút khoá vĩnh viễn. Khác `eligible`: `eligible` có thể đổi thành true khi
     * đạt đủ %, còn cờ này thì cố định suốt buổi. */
    canEverBeInterrupted: boolean;
}

export const getClassSessionInterruptionEligibility = async (
    id: number,
): Promise<ApiResponse<ClassSessionInterruptionEligibilityResponse>> => {
    const response = await api.get(`/class-sessions/${id}/interruption-eligibility`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * Trạng thái đồng ý bỏ buổi phụ (link 2) — cần CẢ HAI phía (gia sư + học sinh/phụ huynh) cùng xác
 * nhận thì buổi phụ mới bị huỷ và buổi GỐC (đang `interrupted`) mới nhận được báo cáo. `id` là ID
 * của chính buổi phụ, không phải buổi gốc.
 */
export interface ClassSessionSkipContinuationResponse {
    tutorConfirmed: boolean;
    studentConfirmed: boolean;
    bothConfirmed: boolean;
}

export const getSkipContinuationStatus = async (
    id: number,
): Promise<ApiResponse<ClassSessionSkipContinuationResponse>> => {
    const response = await api.get(`/class-sessions/${id}/skip-continuation`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/** Gia sư HOẶC học sinh/phụ huynh xác nhận đồng ý bỏ hẳn buổi phụ này (không học nốt phần còn lại). */
export const confirmSkipContinuation = async (
    id: number,
): Promise<ApiResponse<ClassSessionSkipContinuationResponse>> => {
    const response = await api.post(`/class-sessions/${id}/skip-continuation`, {}, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * available (đã ghi xong, xem được) | processing (đang đẩy lên lưu trữ) | recording (đang ghi) |
 * failed (buổi đã đóng phòng nhưng Agora không trả về file nào — bản ghi hỏng, không có gì để xem) | none.
 */
export type RecordingStatus = 'available' | 'processing' | 'recording' | 'failed' | 'none';

export interface ClassSessionRecordingResponse {
    classSessionId: number;
    status: RecordingStatus;
    /**
     * Đường dẫn tương đối tới endpoint proxy (vd `/api/class-sessions/1/recording/stream?token=...`).
     * KHÔNG phải link Drive trực tiếp — chỉ có khi `status === 'available'`. Token hết hạn sau ít
     * phút, nên gọi lại `getClassSessionRecording` mỗi lần vào lại trang thay vì lưu cache.
     */
    streamUrl?: string;
    available: boolean;
}

/** `GET /class-sessions/{id}/recording` — dùng chung cho Tutor/Student/Parent, quyền xem được BE tự kiểm tra. */
export const getClassSessionRecording = async (
    id: number,
): Promise<ApiResponse<ClassSessionRecordingResponse>> => {
    const response = await api.get(`/class-sessions/${id}/recording`, { headers: getAuthHeaders() });
    return response.data;
};

/** Một buổi trong chuỗi buổi liên kết (bù/phụ/học lại), kèm trạng thái ghi hình riêng buổi đó. */
export interface ClassSessionRecordingChainItem {
    classSessionId: number;
    /** "Buổi 1", "Buổi 2"... đánh số theo thứ tự thời gian, không phân biệt lý do liên kết. */
    label: string;
    scheduledStart: string;
    /** True nếu đây là buổi đang xem trên trang gọi API này. */
    isCurrent: boolean;
    status: RecordingStatus;
    streamUrl?: string;
    available: boolean;
}

/**
 * `GET /class-sessions/{id}/recording-chain` — toàn bộ chuỗi buổi liên kết (bù/phụ/học lại) chứa
 * buổi này. Mảng chỉ có 1 phần tử (chính buổi này) khi chưa từng liên kết — dùng chung 1 endpoint
 * cho cả trường hợp bình thường và có chuỗi, không cần gọi `/recording` riêng nữa.
 */
export const getClassSessionRecordingChain = async (
    id: number,
): Promise<ApiResponse<ClassSessionRecordingChainItem[]>> => {
    const response = await api.get(`/class-sessions/${id}/recording-chain`, { headers: getAuthHeaders() });
    return response.data;
};

/**
 * `streamUrl` từ BE là đường dẫn tương đối (dùng chung được cả dev-proxy lẫn production đa origin).
 * Ghép với gốc backend thật trước khi gán vào `<video src>` — thẻ video không đi qua Vite/axios proxy.
 */
export const resolveRecordingStreamUrl = (streamUrl: string): string => {
    if (/^https?:\/\//i.test(streamUrl)) return streamUrl;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:5166';
    return `${backendUrl.replace(/\/$/, '')}${streamUrl}`;
};

// ── Student endpoints — `api/student/class-sessions` ──
// NOTE: these 3 diverge from the generic envelope — BE wraps ad-hoc shapes in `APIResponse<object>`
// rather than the typed `ClassSessionResponse`/`PagedList` used by tutor/parent routes.

export interface StudentClassSessionSummaryResponse {
    classSessionId: number;
    status?: ClassSessionStatus;
    bookingStatus?: string;
    isSettled?: boolean;
    scheduledStart?: string;
    scheduledEnd?: string;
    confirmDeadline?: string;
    classSessionPrice?: number;
    subjectName?: string;
    tutorName?: string;
    bookingId?: number;
    /** True nếu đây là buổi phụ (Link 2), sinh ra khi buổi gốc (`originalClassSessionId`) bị báo ngắt giữa chừng. */
    isContinuation?: boolean;
    /** True nếu đây là buổi học lại (Link 3), sinh ra khi hoà giải dispute chọn "học lại". */
    isDisputeRelearn?: boolean;
    /** Buổi gốc mà buổi phụ/buổi học lại này trỏ về — undefined nếu đây là buổi gốc. */
    originalClassSessionId?: number;
}

export interface StudentClassSessionReport {
    topicsCovered?: string;
    homeworkAssigned?: string;
    tutorNotes?: string;
    studentPerformanceRating?: number;
    attachments?: string[];
}

export interface StudentClassSessionDetailResponse extends StudentClassSessionSummaryResponse {
    meetingLink?: string;
    checkinTime?: string;
    checkoutTime?: string;
    tutorAvatar?: string;
    report?: StudentClassSessionReport;
    scheduleChanges?: ScheduleChangeAuditDto[];
    /** Đề xuất đổi lịch đang chờ phản hồi, null nếu không có. */
    pendingRescheduleProposal?: RescheduleProposalDto | null;
    /** Toàn bộ lịch sử đề xuất đổi lịch, mới nhất trước. */
    rescheduleProposals?: RescheduleProposalDto[];
    /** True khi CHÍNH buổi này là buổi phụ và cả 2 phía đã đồng ý bỏ nó. */
    skipConfirmedByBothSides?: boolean;
    /** ID buổi phụ sinh ra từ chính buổi này khi bị ngắt — chỉ có trên buổi GỐC (status=interrupted). */
    continuationSessionId?: number;
    /** Giờ hẹn của buổi phụ — hiện trực tiếp trên trang buổi gốc, không cần mở thêm trang riêng. */
    continuationScheduledStart?: string;
    continuationScheduledEnd?: string;
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
    classSessionId?: number | null;
    bookingId?: number | null;
    disputeType?: string | null;
    status?: string | null;
    reason?: string | null;
    createdByName?: string | null;
    tutorName?: string | null;
    classSessionPrice?: number | null;
    createdAt?: string | null;
    priority?: string | null;
    priorityReason?: string | null;
    disputeTypeDisplay?: string | null;
    statusDisplay?: string | null;
    statusColor?: string | null;
    priorityDisplay?: string | null;
}

export interface PortalDisputeListParams {
    page?: number;
    pageSize?: number;
    status?: 'pending' | 'investigating' | 'confirmed_no_show' | 'resolved' | 'closed';
    disputeType?: 'no_show' | 'quality' | 'payment' | 'other';
    search?: string;
    sortDirection?: 'asc' | 'desc';
}

export interface PortalDisputeListContent {
    items: DisputeListResponse[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export type TutorDisputeListParams = PortalDisputeListParams;
export type TutorDisputeListContent = PortalDisputeListContent;

export const getParentDisputesList = async (
    params: PortalDisputeListParams = {},
): Promise<ApiResponse<PortalDisputeListContent | DisputeListResponse[]>> => {
    const { page = 1, pageSize = 10, status, disputeType, search, sortDirection = 'desc' } = params;
    const response = await api.get('/parent/disputes', {
        headers: getAuthHeaders(),
        params: { page, pageSize, status, disputeType, search, sortDirection },
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

// ── Tutor creates a dispute / parent-student responds — mirror of the two blocks above,
// reversed. Same endpoints/entities, gia sư giờ cũng mở dispute mới được. ──

/** Gia sư tự mở dispute mới cho buổi học của mình. Cùng điều kiện session (pending_confirmation/completed, chưa có dispute) như phía phụ huynh/học sinh. */
export const createTutorClassSessionDispute = async (
    id: number,
    request: CreateDisputeRequest,
    files: File[] = [],
): Promise<ApiResponse<DisputeDetailResponse>> => {
    const formData = new FormData();
    formData.append('disputeType', request.disputeType);
    formData.append('reason', request.reason);
    files.forEach((file) => formData.append('files', file));

    const response = await api.post(`/tutor/class-sessions/${id}/dispute`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/** Phụ huynh/học sinh phản hồi 1 dispute do GIA SƯ tạo — đối xứng submitTutorDisputeResponse. */
export const submitParentDisputeResponse = async (
    id: number,
    responseText: string,
): Promise<ApiResponse<DisputeDetailResponse>> => {
    const result = await api.post(
        `/parent/class-sessions/${id}/dispute/response`,
        { response: responseText },
        { headers: getAuthHeaders() },
    );
    return result.data;
};

/** Đối xứng uploadTutorDisputeEvidence, dùng khi gia sư là người tạo dispute. */
export const uploadParentDisputeEvidence = async (id: number, file: File): Promise<ApiResponse<string>> => {
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

export const getTutorDisputesList = async (
    params: PortalDisputeListParams = {},
): Promise<ApiResponse<PortalDisputeListContent | DisputeListResponse[]>> => {
    const { page = 1, pageSize = 10, status, disputeType, search, sortDirection = 'desc' } = params;
    const response = await api.get('/tutor/disputes', {
        headers: getAuthHeaders(),
        params: { page, pageSize, status, disputeType, search, sortDirection },
    });
    return response.data;
};

// ── Dispute private chat threads (admin<->tutor, admin<->parent/student) ──

export interface DisputeMessage {
    disputeMessageId: number;
    disputeId: number;
    threadType: 'tutor' | 'parent';
    senderId?: string;
    senderName?: string;
    senderRole?: string;
    message: string;
    createdAt?: string;
}

export const getTutorDisputeThread = async (id: number): Promise<ApiResponse<DisputeMessage[]>> => {
    const response = await api.get(`/tutor/class-sessions/${id}/dispute/thread`, { headers: getAuthHeaders() });
    return response.data;
};

export const sendTutorDisputeThreadMessage = async (id: number, message: string): Promise<ApiResponse<DisputeMessage>> => {
    const response = await api.post(`/tutor/class-sessions/${id}/dispute/thread/messages`, { message }, { headers: getAuthHeaders() });
    return response.data;
};

export const getClassSessionDisputeThread = async (id: number): Promise<ApiResponse<DisputeMessage[]>> => {
    const response = await api.get(`/parent/class-sessions/${id}/dispute/thread`, { headers: getAuthHeaders() });
    return response.data;
};

export const sendClassSessionDisputeThreadMessage = async (id: number, message: string): Promise<ApiResponse<DisputeMessage>> => {
    const response = await api.post(`/parent/class-sessions/${id}/dispute/thread/messages`, { message }, { headers: getAuthHeaders() });
    return response.data;
};
