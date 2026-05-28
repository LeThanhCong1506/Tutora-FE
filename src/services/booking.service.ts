/* eslint-disable @typescript-eslint/no-explicit-any */
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

// ===== TYPES =====

export interface ScheduleItemPayload {
    dayOfWeek: number;  // 0 (Sunday) - 6 (Saturday)
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
}

/**
 * Matches backend CreateBookingDTO exactly.
 * Backend auto-calculates: sessionCount, price, finalPrice, fees.
 */
export interface CreateBookingPayload {
    studentId: string;
    tutorId: string;
    subjectId: number;
    teachingMode: 'online' | 'offline' | 'hybrid';
    startDate: string; // YYYY-MM-DD
    schedule: ScheduleItemPayload[];
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

/** POST /api/bookings — Create a new booking */
export const createBooking = async (payload: CreateBookingPayload): Promise<ApiResponse<BookingResponseDTO>> => {
    try {
        const response = await api.post('/bookings', payload, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        console.error('❌ Error creating booking:', {
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
        return response.data;
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
        return response.data;
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

/** GET /api/bookings — Get list of parent bookings (BE differentiates by JWT role) */
export const getParentBookings = async (params: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<{ items: BookingResponseDTO[], totalCount: number }>> => {
    try {
        const response = await api.get('/bookings', {
            headers: getAuthHeaders(),
            params,
        });
        return response.data;
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
        return response.data;
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
