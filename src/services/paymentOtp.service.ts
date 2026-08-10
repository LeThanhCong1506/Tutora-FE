import axios from 'axios';
import { getAuthHeaders } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

export type PaymentOtpPhase = 'deposit' | 'remaining';

/** Gửi OTP xác thực giao dịch lớn (>= ngưỡng) tới SĐT phụ huynh của học sinh tự đăng ký. */
export const sendPaymentOtp = async (bookingId: number, phase: PaymentOtpPhase): Promise<void> => {
    await api.post(
        `/bookings/${bookingId}/payment-otp/send`,
        { phase },
        { headers: getAuthHeaders() },
    );
};

/** Xác thực mã OTP giao dịch lớn. Đúng thì BE ghi cờ duyệt cho phép trừ ví / tạo link PayOS. */
export const verifyPaymentOtp = async (bookingId: number, phase: PaymentOtpPhase, code: string): Promise<void> => {
    await api.post(
        `/bookings/${bookingId}/payment-otp/verify`,
        { phase, code },
        { headers: getAuthHeaders() },
    );
};
