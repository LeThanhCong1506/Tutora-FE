/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import type { ApiResponse } from './tutorProfile.service';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// ===== TYPES =====

export interface GoogleConnectionStatus {
    isConnected: boolean;
    connectedEmail: string | null;
}

/**
 * Backend error codes returned khi callback fail.
 * BE redirect về FE với ?error=<code>&message=<msg>.
 */
export const GoogleAuthErrorCode = {
    EmailMismatch: 'EMAIL_MISMATCH',
    NotTutorRole: 'NOT_TUTOR_ROLE',
    TokenExchangeFailed: 'TOKEN_EXCHANGE_FAILED',
    EmailFetchFailed: 'EMAIL_FETCH_FAILED',
    SaveTokenFailed: 'SAVE_TOKEN_FAILED',
    MissingParams: 'MISSING_PARAMS',
    AccessDenied: 'access_denied',
} as const;

// ===== API FUNCTIONS =====

/**
 * GET /api/auth/google/authorize
 * Lấy URL Google OAuth consent screen cho tutor.
 */
export const getGoogleAuthorizationUrl = async (): Promise<string> => {
    try {
        const response = await api.get<ApiResponse<{ authorizationUrl: string }>>('/auth/google/authorize');
        return response.data.content.authorizationUrl;
    } catch (error: any) {
        console.error('❌ Error fetching Google authorization URL:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/**
 * GET /api/auth/google/status
 * Kiểm tra tutor đã kết nối Google Calendar chưa.
 */
export const getGoogleConnectionStatus = async (): Promise<GoogleConnectionStatus> => {
    try {
        const response = await api.get<ApiResponse<GoogleConnectionStatus>>('/auth/google/status');
        return response.data.content;
    } catch (error: any) {
        console.error('❌ Error fetching Google connection status:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/**
 * POST /api/auth/google/refresh-meet-links
 * Tạo lại Meet links cho mọi lesson sắp tới chưa có link.
 * Hữu ích khi tutor connect xong nhưng background job lỡ fail.
 */
export const refreshGoogleMeetLinks = async (): Promise<void> => {
    try {
        await api.post('/auth/google/refresh-meet-links');
    } catch (error: any) {
        console.error('❌ Error refreshing Google Meet links:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

/**
 * DELETE /api/auth/google/disconnect
 * Ngắt kết nối Google Calendar khỏi tài khoản tutor (xóa refresh token).
 */
export const disconnectGoogleCalendar = async (): Promise<void> => {
    try {
        await api.delete('/auth/google/disconnect');
    } catch (error: any) {
        console.error('❌ Error disconnecting Google Calendar:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
};

// ===== HELPERS =====

/**
 * Map BE error code → friendly Vietnamese message.
 * Dùng cho callback handler trên TutorAccount.
 */
export const getGoogleAuthErrorMessage = (errorCode: string | null, fallback?: string): string => {
    switch (errorCode) {
        case GoogleAuthErrorCode.EmailMismatch:
            return 'Email Google bạn vừa đăng nhập không khớp với email đăng ký Tutora. Vui lòng dùng đúng email đã đăng ký.';
        case GoogleAuthErrorCode.NotTutorRole:
            return 'Chỉ tài khoản gia sư mới được kết nối Google Calendar.';
        case GoogleAuthErrorCode.TokenExchangeFailed:
            return 'Không lấy được token từ Google. Vui lòng thử lại.';
        case GoogleAuthErrorCode.EmailFetchFailed:
            return 'Không lấy được thông tin tài khoản Google. Vui lòng thử lại.';
        case GoogleAuthErrorCode.SaveTokenFailed:
            return 'Lưu thông tin kết nối thất bại. Vui lòng thử lại.';
        case GoogleAuthErrorCode.MissingParams:
            return 'Thiếu thông tin xác thực từ Google.';
        case GoogleAuthErrorCode.AccessDenied:
            return 'Bạn đã từ chối cấp quyền Google Calendar.';
        default:
            return fallback || 'Kết nối Google Calendar thất bại.';
    }
};

/**
 * Detect xem một meetingLink có phải là Jitsi fallback hay không.
 * Jitsi link có dạng: https://meet.jit.si/tutora-lesson-{id}
 */
export const isJitsiFallbackLink = (meetingLink: string | null | undefined): boolean => {
    if (!meetingLink) return false;
    return meetingLink.includes('meet.jit.si/tutora-lesson-');
};
