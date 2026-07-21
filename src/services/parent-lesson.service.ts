import type { ApiResponse } from './tutorProfile.service';
import type { PagedList, LessonDetailDto } from './lesson.service';
import {
  getParentPendingClassSessions,
  getParentClassSessionDetail,
  confirmParentClassSession,
  createClassSessionDispute,
  reportClassSessionNoShow,
  processClassSessionNoShowAction,
  getParentCalendar as getParentCalendarReal,
  uploadClassSessionDisputeEvidence,
  getParentDisputesList,
  type PendingClassSessionResponse,
  type ClassSessionDetailResponse,
  type ClassSessionStudent,
  type ClassSessionTutor,
  type SettlementResultResponse,
  type DisputeDetailResponse,
  type NoShowActionResultResponse,
  type DisputeListResponse,
} from './classSession.service';

/**
 * Adapter layer — trước đây gọi `/parent/lessons*` (đã chết, đổi sang
 * `ClassSession` domain trên `Tutora-Backend` nhánh `refactor/Payment`).
 * Giữ nguyên tên hàm/shape DTO cũ để không phải sửa lại toàn bộ UI
 * (`ParentLessonDetail.tsx` và các modal con) — chỉ đổi phần gọi API bên trong.
 */

// ============================================
// Types (giữ nguyên tên cũ — UI đang import các type này)
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
// Mapping helpers — BE `ClassSession*` → FE `*Lesson*` DTO cũ
// ============================================

const mapPending = (r: PendingClassSessionResponse): PendingLessonDto => ({
  lessonId: r.classSessionId,
  bookingId: r.bookingId ?? 0,
  scheduledStart: r.scheduledStart,
  scheduledEnd: r.scheduledEnd,
  confirmDeadline: r.confirmDeadline ?? '',
  lessonPrice: r.classSessionPrice ?? 0,
  lessonContent: r.classSessionContent,
  homework: r.homework,
  status: 'pending_confirmation',
  tutorName: r.tutorName ?? '',
  tutorAvatar: r.tutorAvatarUrl,
  studentName: r.studentName ?? '',
  subjectName: r.subjectName ?? '',
  submittedAt: r.submittedAt,
});

/**
 * Object "lai" — vừa giữ field phẳng cũ (`lessonId`, `subjectName`, `tutorName`...)
 * vừa giữ object lồng mới (`subject`, `tutor`, `student`) vì `ParentLessonDetail.tsx` đọc
 * theo kiểu `lesson.subjectName || lesson.subject?.subjectName` (đã có sẵn fallback 2 chiều).
 */
export interface ParentLessonDetailDto extends Omit<LessonDetailDto, 'lessonId' | 'student' | 'tutor'> {
  lessonId: number;
  student?: ClassSessionStudent;
  tutor?: ClassSessionTutor;
  subjectName?: string;
  tutorName?: string;
  tutorId?: string;
}

const mapDetail = (d: ClassSessionDetailResponse): ParentLessonDetailDto => ({
  lessonId: d.classSessionId,
  bookingId: d.bookingId,
  scheduledStart: d.scheduledStart,
  scheduledEnd: d.scheduledEnd,
  submittedAt: d.submittedAt,
  confirmDeadline: d.confirmDeadline,
  lessonPrice: d.classSessionPrice,
  lessonContent: d.classSessionContent,
  homework: d.homework,
  tutorNotes: d.tutorNotes,
  status: d.status,
  meetingLink: d.meetingLink,
  isTutorPresent: d.isTutorPresent,
  isStudentPresent: d.isStudentPresent,
  checkInTime: d.checkInTime,
  checkOutTime: d.checkOutTime,
  attendanceNote: d.attendanceNote,
  student: d.student,
  subject: d.subject,
  tutor: d.tutor,
  report: d.report
    ? {
        reportId: d.report.reportId,
        contentCovered: d.report.contentCovered ?? '',
        homeworkAssigned: d.report.homeworkAssigned ?? '',
        studentPerformanceRating: d.report.studentPerformanceRating ?? 0,
        attachments: d.report.attachments ?? [],
        createdAt: d.report.createdAt ?? '',
      }
    : undefined,
  // Alias phẳng
  subjectName: d.subject?.subjectName,
  tutorName: d.tutor?.fullName,
  tutorId: d.tutor?.tutorId,
});

const mapSettlement = (r: SettlementResultResponse): SettlementResultDto => ({
  success: r.success,
  lessonId: r.classSessionId,
  bookingId: r.bookingId,
  amountReleased: r.amountReleased,
  amountRefunded: r.amountRefunded,
  settlementType: r.settlementType,
  transactionId: r.transactionId,
  newTutorBalance: r.newTutorBalance,
  sessionsRemaining: r.sessionsRemaining,
  message: r.message,
});

const mapDispute = (r: DisputeDetailResponse): DisputeDetailDto => ({
  disputeId: r.disputeId,
  bookingId: r.bookingId ?? 0,
  lessonId: r.classSessionId ?? 0,
  createdBy: r.createdBy?.userId ?? '',
  reason: r.reason ?? '',
  disputeType: r.disputeType ?? '',
  evidence: r.evidence?.join(','),
  status: r.status ?? '',
  createdAt: r.createdAt ?? '',
  resolvedAt: r.resolvedAt,
  resolutionNote: r.resolutionNote,
  refundAmount: r.refundAmount,
});

const mapNoShowAction = (r: NoShowActionResultResponse): NoShowActionResultDto => ({
  success: r.success,
  action: r.actionType,
  message: r.message ?? '',
  newLessonId: r.makeupClassSessionId,
  refundAmount: r.amountRefunded,
});

// ============================================
// API Functions (tên giữ nguyên — chỉ đổi phần gọi bên trong)
// ============================================

export const getPendingLessons = async (): Promise<ApiResponse<PendingLessonDto[]>> => {
  const response = await getParentPendingClassSessions();
  return { ...response, content: (response.content ?? []).map(mapPending) };
};

export const getParentLessonDetail = async (lessonId: number): Promise<ApiResponse<ParentLessonDetailDto>> => {
  const response = await getParentClassSessionDetail(lessonId);
  return { ...response, content: mapDetail(response.content) };
};

/** Xác nhận buổi học (release tiền cho gia sư). Dùng chung endpoint Parent/Student (`ParentOrStudent`). */
export const confirmLesson = async (lessonId: number): Promise<ApiResponse<SettlementResultDto>> => {
  const response = await confirmParentClassSession(lessonId);
  return { ...response, content: mapSettlement(response.content) };
};

export const createDispute = async (
  lessonId: number,
  request: CreateDisputeRequest,
): Promise<ApiResponse<DisputeDetailDto>> => {
  const response = await createClassSessionDispute(lessonId, request);
  return { ...response, content: mapDispute(response.content) };
};

const mapDisputeListResponse = (r: DisputeListResponse): DisputeListDto => ({
  disputeId: r.disputeId,
  bookingId: r.bookingId ?? 0,
  lessonId: r.classSessionId ?? 0,
  disputeType: r.disputeType ?? '',
  status: r.status ?? '',
  reason: r.reason ?? '',
  createdAt: r.createdAt ?? '',
  tutorName: r.tutorName,
  subjectName: undefined,
});

export const getParentDisputes = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<ApiResponse<PagedList<DisputeListDto>>> => {
  const response = await getParentDisputesList(page, pageSize);
  // BE's PagedList<T> extends List<T>, so System.Text.Json serializes it as a bare array —
  // CurrentPage/TotalPages/TotalCount never actually reach the client. Handle both shapes
  // defensively rather than assume the {items, totalCount} object this was written against.
  const raw = response.content as unknown;
  const rawItems: DisputeListResponse[] = Array.isArray(raw)
    ? raw
    : (raw as { items?: DisputeListResponse[] })?.items ?? [];
  const totalCount = Array.isArray(raw) ? raw.length : (raw as { totalCount?: number })?.totalCount ?? rawItems.length;

  return {
    ...response,
    content: {
      items: rawItems.map(mapDisputeListResponse),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    } as unknown as PagedList<DisputeListDto>,
  };
};

export const reportNoShow = async (lessonId: number): Promise<ApiResponse<ParentLessonDetailDto>> => {
  const response = await reportClassSessionNoShow(lessonId);
  return { ...response, content: mapDetail(response.content) };
};

export const processNoShowAction = async (
  lessonId: number,
  request: NoShowActionRequest,
): Promise<ApiResponse<NoShowActionResultDto>> => {
  const response = await processClassSessionNoShowAction(lessonId, request);
  return { ...response, content: mapNoShowAction(response.content) };
};

export const uploadDisputeEvidence = async (lessonId: number, file: File): Promise<ApiResponse<string>> => {
  const response = await uploadClassSessionDisputeEvidence(lessonId, file);
  return response;
};

export const getParentCalendar = async (
  startDate?: string,
  endDate?: string,
): Promise<ApiResponse<CalendarDayDto[]>> => {
  const response = await getParentCalendarReal(startDate, endDate);
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
