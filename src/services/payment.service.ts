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

export interface PaymentInfoDTO {
    bookingId: number;
    paymentLinkId: string;
    paymentCode: string;
    amount: number;
    currency: string;
    checkoutUrl: string;
    qrCode: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    description: string;
    expiredAt: string | null;
    status: string;
    canPayWithWallet: boolean;
    walletBalance: number;
    // 2-stage payment fields
    paymentPhase: 'deposit' | 'remaining';
    totalAmount: number;
    depositAmount: number;
    remainingAmount: number;
    isDepositPaid: boolean;
    isRemainingPaid: boolean;
}

/**
 * Lightweight payment summary for the current unpaid phase. Mirrors backend
 * `PaymentSummaryResponse`. Loading this (instead of getPaymentInfo) on the payment
 * screen means NO PayOS link is created until the user actually picks bank transfer,
 * so paying by wallet leaves no PayOS artifact.
 */
export interface PaymentSummaryDTO {
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

export interface PaymentStatusDTO {
    bookingId: number;
    status: string;
    amount: number;
    amountPaid?: number;
    amountRemaining?: number;
    isPaid: boolean;
    // 2-stage payment fields
    depositAmount?: number;
    remainingAmount?: number;
    isDepositPaid?: boolean;
    isRemainingPaid?: boolean;
}

/**
 * Get the lightweight payment summary (amounts + wallet balance) for a booking's
 * current unpaid phase. Does NOT create a PayOS link — call this to render the
 * payment-method choice screen.
 */
export const getPaymentSummary = async (bookingId: number): Promise<PaymentSummaryDTO> => {
    const response = await api.get(`/bookings/${bookingId}/payment/summary`, {
        headers: getAuthHeaders(),
    });
    return response.data.content ?? response.data;
};

/**
 * Get full payment information for a booking (QR code, checkout URL, bank details).
 * This CREATES a PayOS payment link — only call it when the user chooses bank transfer.
 */
export const getPaymentInfo = async (bookingId: number): Promise<PaymentInfoDTO> => {
    const response = await api.get(`/bookings/${bookingId}/payment`, {
        headers: getAuthHeaders(),
    });
    // Backend wraps in APIResponse<T> with { statusCode, content, ... }
    return response.data.content ?? response.data;
};

/** Get current payment status for a booking */
export const getPaymentStatus = async (bookingId: number): Promise<PaymentStatusDTO> => {
    const response = await api.get(`/bookings/${bookingId}/payment/status`, {
        headers: getAuthHeaders(),
    });
    return response.data.content ?? response.data;
};

/** Pay for a booking using wallet balance */
export const payWithWallet = async (bookingId: number): Promise<ApiResponse<any>> => {
    const response = await api.post(`/bookings/${bookingId}/pay/wallet`, null, {
        headers: getAuthHeaders(),
    });
    return response.data;
};
