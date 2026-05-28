/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { VerificationRequest, VerificationResponse, EKYCContent } from '../types/verification.types';
import { getCurrentUser } from './auth.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// Add token to requests
api.interceptors.request.use((config) => {
    const user = getCurrentUser();
    if (user && user.accessToken) {
        config.headers.Authorization = `Bearer ${user.accessToken}`;
    }
    return config;
});

/**
 * Submit CCCD verification to backend
 * The API returns eKYC result immediately after processing
 * @param frontImagePath - Path to front image in Supabase (e.g., "u123/cccd_front.jpg")
 * @param backImagePath - Path to back image in Supabase (e.g., "u123/cccd_back.jpg")
 * @returns Verification response with eKYC content if successful
 */
export const submitVerification = async (
    frontImagePath: string,
    backImagePath: string
): Promise<VerificationResponse> => {
    try {
        // Backend expects PascalCase field names: FrontImgPath and BackImgPath
        const payload: VerificationRequest = {
            FrontImgPath: frontImagePath,
            BackImgPath: backImagePath
        };

        const response = await api.post('/tutors/verification/submit', payload);

        console.log('✅ Verification API response:', response.data);

        // API returns eKYC result immediately
        // Response format: { message, statusCode, content: { id, name, dob, home, address, sex, id_prob, ... } }
        const ekycContent: EKYCContent | undefined = response.data.content;

        // If we have eKYC content, verification was successful
        const isVerified = ekycContent && ekycContent.id && ekycContent.name;

        return {
            success: true,
            message: response.data.message || (isVerified ? 'Xác thực danh tính thành công!' : 'Gửi xác thực thành công'),
            verificationId: response.data.verificationId,
            status: isVerified ? 'approved' : (response.data.status || 'pending'),
            content: ekycContent
        };

    } catch (error: any) {
        console.error('❌ Verification submission error:', error);
        console.error('📄 Error response data:', error.response?.data);
        console.error('📊 Error response status:', error.response?.status);
        console.error('📋 Error response headers:', error.response?.headers);

        // Log validation errors in detail
        if (error.response?.data?.errors) {
            console.error('🔍 Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }

        const errorMessage = error.response?.data?.message
            || error.response?.data?.Message
            || error.response?.data?.title
            || error.message
            || 'Có lỗi xảy ra khi gửi xác thực';

        return {
            success: false,
            message: errorMessage
        };
    }
};

/**
 * Get current verification status (if backend provides this endpoint)
 * @returns Verification status
 */
export const getVerificationStatus = async (): Promise<VerificationResponse | null> => {
    try {
        // Note: endpoint này không có trong ENDPOINT_MAPPING.md — suy luận theo
        // pattern `/tutor-verification/*` → `/tutors/verification/*`. Nếu BE
        // không expose, hàm gracefully trả null qua catch bên dưới.
        const response = await api.get('/tutors/verification/status');
        return response.data;
    } catch (error: any) {
        console.error('❌ Error getting verification status:', error);
        return null;
    }
};

/**
 * User KYC data from /api/users/{id}
 */
export interface UserKYCData {
    fullName: string | null;
    isIdentityVerified: boolean;
    idCardFrontUrl: string | null;
    idCardBackUrl: string | null;
    ekycData: EKYCContent | null;
}

/**
 * Get user's KYC verification data from /api/users/{id}
 * @param userId - User ID
 * @returns UserKYCData with verification status and eKYC data
 */
export const getUserKYCData = async (userId: string): Promise<UserKYCData | null> => {
    try {
        const response = await api.get(`/users/${userId}`);
        const responseData = response.data;

        // API returns { content: { ... } } format
        const userData = responseData.content || responseData;

        // Get fullname from API response
        const fullName = userData.fullname ||
            userData.fullName ||
            userData.FullName ||
            null;

        // Handle different casing from C# backend
        const isVerified = userData.isidentityverified ||
            userData.IsIdentityVerified ||
            userData.isIdentityVerified ||
            false;

        const idCardFrontUrl = userData.idcardfronturl ||
            userData.idCardFrontUrl ||
            userData.IdCardFrontUrl ||
            null;

        const idCardBackUrl = userData.idcardbackurl ||
            userData.idCardBackUrl ||
            userData.IdCardBackUrl ||
            null;

        // Parse ekycRawData JSON string
        let ekycData: EKYCContent | null = null;
        const ekycRaw = userData.ekycRawData || userData.EkycRawData || userData.ekycrawdata;
        if (ekycRaw && typeof ekycRaw === 'string') {
            try {
                ekycData = JSON.parse(ekycRaw);
            } catch {
                console.error('Failed to parse ekycRawData');
            }
        } else if (ekycRaw && typeof ekycRaw === 'object') {
            ekycData = ekycRaw;
        }

        return {
            fullName,
            isIdentityVerified: isVerified,
            idCardFrontUrl,
            idCardBackUrl,
            ekycData
        };
    } catch (error: any) {
        console.error('❌ Error getting user KYC data:', error);
        return null;
    }
};
