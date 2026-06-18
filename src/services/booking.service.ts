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
    student?: { studentId: string; fullName: string; gradeLevel: string };
    tutor?: { tutorId: string; fullName: string; avatarUrl: string; hourlyRate: number };
    subject?: { subjectId: number; subjectName: string };
    packageType: string;
    sessionCount: number;
    teachingMode?: string;
    price: number;
    discountApplied: number;
    finalPrice: number;
    platformFee: number;
    status: string;
    paymentStatus: string;
    paymentCode: string;
    schedule: ScheduleItemPayload[];
    startDate?: string;
    createdAt: string;
    paymentDueAt: string | null;
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
