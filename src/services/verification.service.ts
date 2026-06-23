/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { EKYCContent } from '../types/verification.types';
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

// CCCD upload + eKYC giờ đi qua `uploadCccd` (POST /api/tutors/{id}/profile/cccd) trong
// tutorProfile.service.ts — upload file trực tiếp + OCR trong 1 request. Endpoint cũ
// (POST /tutors/verification/submit nhận URL ảnh) đã bị BE gỡ bỏ.

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
 * Get the current user's KYC verification data.
 * BE resolves the user from the auth token — endpoint changed from
 * GET /users/{id} to GET /users/profile.
 * @returns UserKYCData with verification status and eKYC data
 */
export const getUserKYCData = async (): Promise<UserKYCData | null> => {
    try {
        const response = await api.get(`/users/profile`);
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

        // Parse ekycRawData JSON string.
        // BE lưu dạng bọc: { OcrResult: { id, name, dob, home, address, sex, ... }, VerifiedAt }.
        // UI cần dạng phẳng (ekyc.id, ekyc.name…) → bóc lớp OcrResult nếu có; vẫn chấp
        // nhận dạng phẳng sẵn nếu BE trả về trực tiếp.
        let ekycData: EKYCContent | null = null;
        const ekycRaw = userData.ekycRawData || userData.EkycRawData || userData.ekycrawdata;
        let parsed: unknown = null;
        if (ekycRaw && typeof ekycRaw === 'string') {
            try {
                parsed = JSON.parse(ekycRaw);
            } catch {
                console.error('Failed to parse ekycRawData');
            }
        } else if (ekycRaw && typeof ekycRaw === 'object') {
            parsed = ekycRaw;
        }
        if (parsed && typeof parsed === 'object') {
            const wrapper = parsed as { OcrResult?: EKYCContent; ocrResult?: EKYCContent };
            ekycData = (wrapper.OcrResult ?? wrapper.ocrResult ?? (parsed as EKYCContent));
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
