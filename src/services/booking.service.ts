/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';
import { utcTimeOfDayToLocal } from '../utils/datetime';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// ===== TYPES =====

export interface ScheduleItemPayload {
    dayOfWeek: number;  // 0 (Sunday) - 6 (Saturday)
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
}

export interface BookedSlotPayload {
    scheduledStart: string;
    scheduledEnd: string;
    /** True nếu gia sư đã accept 1 booking khác trùng khung giờ này — chỉ trường hợp này mới thực sự khóa. */
    isLocked: boolean;
    /** Số booking khác nhau đang chờ gia sư xác nhận (đã đóng cọc) trùng khung giờ này. */
    pendingCount: number;
}

/** Gói flexible: parent tự chọn từng buổi cụ thể (ngày + giờ). */
export interface FlexibleBookingSlotPayload {
    // Thời điểm TUYỆT ĐỐI → UTC ISO-8601 có Z, vd "2026-06-10T11:00:00.000Z" (= 18:00 VN).
    scheduledStart: string;
    scheduledEnd: string;
}

/**
 * Khớp BE CreateBookingRequest.
 * Bắt buộc: tutorId, tutorSubjectGradePriceId, packageId, startDate.
 * - Gói fixed (packageType 2): gửi totalSessions + startDate, BE tự sinh slot từ fixedSlots.
 * - Gói flexible (packageType 1): gửi flexibleSlots[] (totalSessions = số slot).
 * StudentId bắt buộc khi Parent đặt hộ con.
 * Backend tự tính: sessionCount, price, finalPrice, fees.
 */
export interface CreateBookingPayload {
    studentId?: string;
    tutorId: string;
    subjectId?: number;
    tutorSubjectGradePriceId: number;
    packageId: number;
    totalSessions?: number;
    // Ngày-neo lịch (calendar date, "YYYY-MM-DD") — giữ giờ LOCAL vì là mốc của
    // pattern lặp hằng tuần, KHÔNG đổi UTC (đổi sẽ làm lệch ngày).
    startDate: string;
    schedule?: ScheduleItemPayload[];
    flexibleSlots?: FlexibleBookingSlotPayload[];
    locationCity?: string;
    locationDistrict?: string;
    locationWard?: string;
    locationDetail?: string;
    promotionCode?: string;
}

export interface BookingResponseDTO {
    bookingId: number;
    parentId?: string;
    /**
     * Vai trò của người TẠO booking ("Student" / "Parent"). Booking do học sinh tạo dừng ở
     * pending_payment chờ phụ huynh duyệt và thanh toán — dùng để gắn nhãn phân biệt trong cùng
     * danh sách đặt lịch, vì hai loại này trông giống hệt nhau nếu chỉ nhìn trạng thái.
     */
    createdByRole?: string;
    student?: {
        studentId: string;
        fullName: string;
        gradeLevel?: string;
        gradeLevelId?: number;
        gradeLevelName?: string;
    };
    tutor?: { tutorId: string; fullName: string; avatarUrl: string; hourlyRate: number };
    subject?: { subjectId: number; subjectName: string };
    gradeLevel?: { gradeLevelId: number; gradeName?: string; levelOrder: number };
    package?: { packageId: number; name?: string; packageType: number };
    packageType: string | number;
    sessionCount: number;
    totalSessions?: number;
    durationMinutesPerSession?: number;
    teachingMode?: string;
    price: number;
    pricePerHour?: number;
    totalAmount?: number;
    currency?: string;
    discountApplied: number;
    baseAmount?: number;
    parentFee?: number;
    tutorServiceFee?: number;
    tutorReceivable?: number;
    finalPrice: number;
    platformFee: number;
    status: string;
    paymentStatus: string;
    paymentCode: string;
    schedule: ScheduleItemPayload[];
    lessons?: Array<{
        lessonId: number;
        sessionIndex: number;
        scheduledStart: string;
        scheduledEnd: string;
        status?: string;
        lessonPrice?: number;
        isContinuation?: boolean;
        isDisputeRelearn?: boolean;
        originalClassSessionId?: number;
    }>;
    /** Real field name sent by the backend (BookingResponse.ClassSessions) — `lessons` above
     * is never actually populated by the API. bookingToLocal() maps this into `lessons`. */
    classSessions?: Array<{
        classSessionId: number;
        sessionIndex: number;
        scheduledStart: string;
        scheduledEnd: string;
        status?: string;
        classSessionPrice?: number;
        isContinuation?: boolean;
        isDisputeRelearn?: boolean;
        originalClassSessionId?: number;
    }>;
    startDate?: string;
    createdAt: string;
    paymentDueAt: string | null;
    responseDeadline?: string | null;
    // 2-stage payment fields
    depositAmount?: number;
    remainingAmount?: number;
    depositPaidAt?: string | null;
    remainingPaidAt?: string | null;
    escrowStatus?: string | null;
    // Channel navigation
    channelId?: number;
    // Refund fields
    refundAmount?: number | null;
    refundStatus?: string | null;
    cancellationReason?: string | null;
    cancelledBy?: string | null;
    cancelledAt?: string | null;
}

export interface PromotionValidateResult {
    valid: boolean;
    code?: string;
    discountType?: string;      // "percentage" | "fixed"
    discountValue?: number;
    maxDiscountAmount?: number;
    minOrderValue?: number;
    message?: string;
}

// ===== API FUNCTIONS =====

// schedule[] (tóm tắt lịch lặp tuần) BE trả theo giờ UTC → đổi sang local để hiển thị
// (giữ nguyên dayOfWeek). Buổi học cụ thể (ISO) hiển thị qua new Date() ở chỗ khác.
const bookingToLocal = (b: BookingResponseDTO): BookingResponseDTO => ({
    ...b,
    schedule: (b.schedule ?? []).map((s) => ({
        ...s,
        startTime: utcTimeOfDayToLocal(s.startTime),
        endTime: utcTimeOfDayToLocal(s.endTime),
    })),
    // Backend renamed lessons -> class_sessions; the API response only ever carries
    // `classSessions`, so `lessons` was always empty. Map the real field so lesson-status
    // dependent UI (lesson list, "X/N buổi hoàn thành", canFinalizeEarly/canCancel) works.
    lessons:
        b.lessons && b.lessons.length > 0
            ? b.lessons
            : (b.classSessions ?? []).map((cs) => ({
                  lessonId: cs.classSessionId,
                  sessionIndex: cs.sessionIndex,
                  scheduledStart: cs.scheduledStart,
                  scheduledEnd: cs.scheduledEnd,
                  status: cs.status,
                  lessonPrice: cs.classSessionPrice,
                  isContinuation: cs.isContinuation,
                  isDisputeRelearn: cs.isDisputeRelearn,
                  originalClassSessionId: cs.originalClassSessionId,
              })),
});

/** POST /api/bookings — Create a new booking */
export const createBooking = async (payload: CreateBookingPayload): Promise<ApiResponse<BookingResponseDTO>> => {
    try {
        const response = await api.post('/bookings', payload, {
            headers: getAuthHeaders(),
        });
        const data = response.data as ApiResponse<BookingResponseDTO>;
        return data.content ? { ...data, content: bookingToLocal(data.content) } : data;
    } catch (error: any) {
        console.error('❌ Error creating booking:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/**
 * GET /api/bookings/tutor/:tutorId/booked-slots?startDate=&endDate=
 * Trả các khoảng thời gian tuyệt đối đã book để FE disable đúng ngày/giờ.
 * Role: Parent,Student.
 */
export const getTutorBookedSlots = async (
    tutorId: string,
    startDate: string,
    endDate: string,
): Promise<ApiResponse<BookedSlotPayload[]>> => {
    try {
        const response = await api.get(`/bookings/tutor/${tutorId}/booked-slots`, {
            headers: getAuthHeaders(),
            params: { startDate, endDate },
        });
        return response.data as ApiResponse<BookedSlotPayload[]>;
    } catch (error: any) {
        console.error('❌ Error fetching booked slots:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/** GET /api/promotions/validate — Validate a promotion code */
export const validatePromotion = async (code: string, orderValue: number): Promise<ApiResponse<PromotionValidateResult>> => {
    try {
        const response = await api.get('/promotions/validate', {
            headers: getAuthHeaders(),
            params: { code, orderValue },
        });
        return response.data;
    } catch (error: any) {
        console.error('❌ Error validating promotion:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/** GET /api/bookings/:id — Get booking detail */
export const getBookingById = async (id: number): Promise<ApiResponse<BookingResponseDTO>> => {
    try {
        const response = await api.get(`/bookings/${id}`, {
            headers: getAuthHeaders(),
        });
        const data = response.data as ApiResponse<BookingResponseDTO>;
        return data.content ? { ...data, content: bookingToLocal(data.content) } : data;
    } catch (error: any) {
        if (error.response?.status !== 404) {
            console.error('❌ Error fetching booking:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
        }
        throw error;
    }
};

/** POST /api/bookings/:id/apply-promotion — Apply promotion to existing booking */
export const applyPromotion = async (bookingId: number, promotionCode: string): Promise<ApiResponse<BookingResponseDTO>> => {
    try {
        const response = await api.post(`/bookings/${bookingId}/apply-promotion`, { promotionCode }, {
            headers: getAuthHeaders(),
        });
        const data = response.data as ApiResponse<BookingResponseDTO>;
        return data.content ? { ...data, content: bookingToLocal(data.content) } : data;
    } catch (error: any) {
        console.error('❌ Error applying promotion:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/** DELETE /api/bookings/:id — Cancel a pending booking */
export const cancelBooking = async (bookingId: number, reason?: string): Promise<ApiResponse<string>> => {
    try {
        const response = await api.delete(`/bookings/${bookingId}`, {
            headers: getAuthHeaders(),
            params: reason ? { reason } : undefined,
        });
        return response.data;
    } catch (error: any) {
        console.error('❌ Error cancelling booking:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};


/** POST /api/bookings/:id/finalize-early — End a course early after delivered sessions, before paying the remaining amount. */
export const finalizeBookingEarly = async (bookingId: number, reason?: string): Promise<ApiResponse<string>> => {
    try {
        const response = await api.post(`/bookings/${bookingId}/finalize-early`, null, {
            headers: getAuthHeaders(),
            params: reason ? { reason } : undefined,
        });
        return response.data;
    } catch (error: any) {
        console.error('❌ Error finalizing booking early:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};
/** GET /api/parent/bookings — Get list of parent bookings (BE differentiates by JWT role) */
export const getParentBookings = async (params: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<{ items: BookingResponseDTO[], totalCount: number }>> => {
    try {
        const response = await api.get('/parent/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        const data = response.data as ApiResponse<{ items: BookingResponseDTO[]; totalCount: number }>;
        if (data.content?.items) data.content.items = data.content.items.map(bookingToLocal);
        return data;
    } catch (error: any) {
        throw error;
    }
};

/**
 * GET /api/student/bookings — Get list of the current student's bookings (self-registered or
 * parent-managed). Hits the same backend action as getParentBookings (BE differentiates by JWT
 * role), so kept as a sibling function here rather than reusing getParentBookings directly —
 * this file's convention is one typed function per portal (see getTutorBookings below).
 *
 * There is also a `getStudentBookings` in student-lesson.service.ts used by StudentDashboard;
 * that one skips bookingToLocal (no schedule/lessons normalization), so it isn't a drop-in
 * replacement for pages that need booking.lessons / booking.schedule, like this one.
 */
export const getStudentBookings = async (params: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<{ items: BookingResponseDTO[], totalCount: number }>> => {
    try {
        const response = await api.get('/student/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        const data = response.data as ApiResponse<{ items: BookingResponseDTO[]; totalCount: number }>;
        if (data.content?.items) data.content.items = data.content.items.map(bookingToLocal);
        return data;
    } catch (error: any) {
        throw error;
    }
};

/** GET /api/tutors/bookings — Get list of tutor booking requests */
export const getTutorBookings = async (params: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<{ items: BookingResponseDTO[], totalCount: number }>> => {
    try {
        const response = await api.get('/tutors/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        const data = response.data as ApiResponse<{ items: BookingResponseDTO[]; totalCount: number }>;
        if (data.content?.items) data.content.items = data.content.items.map(bookingToLocal);
        return data;
    } catch (error: any) {
        throw error;
    }
};

/** POST /api/tutors/bookings/:id/accept — Accept a booking request */
export const acceptBooking = async (bookingId: number): Promise<ApiResponse<any>> => {
    try {
        const response = await api.post(`/tutors/bookings/${bookingId}/accept`, {}, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

/** POST /api/tutors/bookings/:id/decline — Decline a booking request */
export const declineBooking = async (bookingId: number, reason: string): Promise<ApiResponse<any>> => {
    try {
        const response = await api.post(`/tutors/bookings/${bookingId}/decline`, { reason }, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

/** GET /api/bookings/:id/payment — Get payment link or wallet info */
export interface PaymentInfoResponse {
    bookingId: number;
    paymentLinkId?: string;
    paymentCode?: string;
    amount: number;
    currency?: string;
    checkoutUrl?: string;
    qrCode?: string;
    accountName?: string;
    accountNumber?: string;
    bin?: string;
    description?: string;
    expiredAt?: string;
    status?: string;
    canPayWithWallet?: boolean;
    walletBalance: number;
    // 2-stage payment fields
    paymentPhase?: 'deposit' | 'remaining';
    totalAmount?: number;
    depositAmount?: number;
    remainingAmount?: number;
    isDepositPaid?: boolean;
    isRemainingPaid?: boolean;
}

/**
 * Lightweight payment summary (amounts + wallet balance) for the current unpaid phase.
 * Does NOT create a PayOS link — use it to render the payment-method choice; the link
 * is created lazily via {@link getPaymentInfo} only when the user picks bank transfer.
 */
export interface PaymentSummaryResponse {
    bookingId: number;
    amount: number;
    paymentPhase: 'deposit' | 'remaining';
    totalAmount: number;
    depositAmount: number;
    remainingAmount: number;
    isDepositPaid: boolean;
    isRemainingPaid: boolean;
    walletBalance: number;
    canPayWithWallet: boolean;
    expiredAt: string | null;
}

export const getPaymentSummary = async (bookingId: number): Promise<ApiResponse<PaymentSummaryResponse>> => {
    const response = await api.get(`/bookings/${bookingId}/payment/summary`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/** Creates a PayOS link — only call when the user chooses bank transfer. */
export const getPaymentInfo = async (bookingId: number): Promise<ApiResponse<PaymentInfoResponse>> => {
    try {
        const response = await api.get(`/bookings/${bookingId}/payment`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

/** POST /api/bookings/:id/pay/wallet — Pay using internal wallet */
export const payWithWallet = async (bookingId: number): Promise<ApiResponse<any>> => {
    try {
        const response = await api.post(`/bookings/${bookingId}/pay/wallet`, {}, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

export interface PaymentStatusResponse {
    bookingId: number;
    status: string;
    amount: number;
    amountPaid?: number;
    amountRemaining?: number;
    isPaid: boolean;
    depositAmount?: number;
    remainingAmount?: number;
    isDepositPaid?: boolean;
    isRemainingPaid?: boolean;
}

/** GET /api/bookings/:id/payment/status — Check payment status */
export const getPaymentStatus = async (bookingId: number): Promise<ApiResponse<PaymentStatusResponse>> => {
    try {
        const response = await api.get(`/bookings/${bookingId}/payment/status`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        throw error;
    }
};

/**
 * Buổi học đầu tiên đã kết thúc chưa? Dùng để CHẶN thanh toán đợt 2 (các buổi còn lại)
 * khi buổi học đầu tiên chưa diễn ra xong.
 * - `pending_remaining_payment`: BE chỉ mở trạng thái này SAU khi buổi 1 hoàn tất + xác nhận
 *   → luôn coi là đã xong.
 * - Các trạng thái khác (deposit_paid/ongoing): xét theo lịch — buổi sớm nhất (chưa hủy)
 *   phải đã qua giờ kết thúc, hoặc đã/đang được xác nhận (completed / pending_confirmation).
 */
export const isFirstLessonFinished = (booking: BookingResponseDTO): boolean => {
    if (booking.status === 'pending_remaining_payment') return true;
    const lessons = (booking.lessons ?? [])
        .filter((l) => l.status !== 'cancelled' && l.status !== 'cancelled_noshow')
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    const first = lessons[0];
    if (!first) return false;
    if (first.status === 'completed' || first.status === 'pending_confirmation') return true;
    return new Date(first.scheduledEnd).getTime() < Date.now();
};
