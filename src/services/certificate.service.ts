/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getCurrentUser } from './auth.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
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

// Types
export interface CertificateValidationChecks {
    nameMatched: boolean;
    nameSimilarity: number;
    issuerTrusted: boolean;
    yearValid: boolean;
    ocrSuccess: boolean;
    ocrConfidence: number;
}

export interface CertificateValidationResult {
    isValid: boolean;
    errors: string[];
    checks: CertificateValidationChecks;
}

export interface CertificateData {
    certificateId: string;
    certificateName: string;
    certificateType: string;
    issuingOrganization: string;
    yearIssued: number | null;
    credentialId: string | null;
    credentialUrl: string | null;
    certificateFileUrl: string;
    createdAt: string;
}

export interface UploadCertificateResponse {
    content: {
        certificate: CertificateData;
        validationResult: CertificateValidationResult;
        isProfileActivated: boolean;
    } | null;
    statusCode: number;
    message: string;
    error: string | null;
}

export interface UploadCertificateRequest {
    CertificateName: string;
    CertificateType: string;
    IssuingOrganization: string;
    YearIssued?: number | null;
    CredentialId?: string | null;
    CredentialUrl?: string | null;
    CertificateFile: File;
}

/**
 * Upload a certificate for tutor verification
 * @param userId - Tutor's user ID
 * @param data - Certificate data including file
 * @returns Response with certificate data and validation result
 */
export const uploadCertificate = async (
    userId: string,
    data: UploadCertificateRequest
): Promise<UploadCertificateResponse> => {
    try {
        const formData = new FormData();

        // Required fields
        formData.append('CertificateName', data.CertificateName);
        formData.append('CertificateType', data.CertificateType);
        formData.append('IssuingOrganization', data.IssuingOrganization);
        formData.append('CertificateFile', data.CertificateFile);

        // Optional fields
        if (data.YearIssued !== null && data.YearIssued !== undefined) {
            formData.append('YearIssued', data.YearIssued.toString());
        }
        if (data.CredentialId) {
            formData.append('CredentialId', data.CredentialId);
        }
        if (data.CredentialUrl) {
            formData.append('CredentialUrl', data.CredentialUrl);
        }

        const response = await api.post(
            `/tutors/${userId}/profile/certificates`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        console.log('✅ Certificate upload response:', response.data);

        return response.data;
    } catch (error: any) {
        console.error('❌ Certificate upload error:', error);
        console.error('📄 Error response data:', error.response?.data);

        return {
            content: null,
            statusCode: error.response?.status || 500,
            message: error.response?.data?.message || 'Có lỗi xảy ra khi tải lên chứng chỉ',
            error: error.response?.data?.error || error.message,
        };
    }
};

/**
 * Submit certificate for admin review (when validation fails)
 * @param userId - Tutor's user ID
 * @param certificateId - Certificate ID to submit for review
 * @returns Response with success status and message
 *
 * Note: If profile is already in 'pending_approval' status, the API returns 400.
 * In this case, we treat it as success since the certificate is already saved
 * and will be reviewed along with the pending profile.
 */
export const submitCertificateForReview = async (
    userId: string,
    certificateId: string
): Promise<{ success: boolean; message: string; alreadyPending?: boolean }> => {
    try {
        const response = await api.post(
            `/tutors/${userId}/submit-for-review`,
            { certificateId }
        );

        console.log('✅ Submit for review response:', response.data);

        return {
            success: true,
            message: response.data.message || 'Đã gửi chứng chỉ để admin duyệt',
        };
    } catch (error: any) {
        console.error('❌ Submit for review error:', error);

        const errorMessage = error.response?.data?.message || '';

        // Check if error is "already pending_approval" - treat as success
        // Because certificate is already saved and profile is waiting for review
        if (error.response?.status === 400 && errorMessage.includes('pending_approval')) {
            console.log('ℹ️ Profile already pending approval - certificate will be reviewed together');
            return {
                success: true,
                message: 'Chứng chỉ đã được thêm vào hồ sơ đang chờ duyệt!',
                alreadyPending: true,
            };
        }

        return {
            success: false,
            message: errorMessage || 'Có lỗi xảy ra khi gửi yêu cầu duyệt',
        };
    }
};

/**
 * Get tutor's certificates
 * @param userId - Tutor's user ID
 * @returns List of certificates
 */
export const getTutorCertificates = async (userId: string): Promise<CertificateData[]> => {
    try {
        const response = await api.get(`/tutors/${userId}/profile/certificates`);
        return response.data.content || [];
    } catch (error: any) {
        console.error('❌ Get certificates error:', error);
        return [];
    }
};

/**
 * Delete a certificate
 * @param userId - Tutor's user ID
 * @param certificateId - Certificate ID to delete
 * @returns Success status
 */
export const deleteCertificate = async (
    userId: string,
    certificateId: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await api.delete(
            `/tutors/${userId}/profile/certificates/${certificateId}`
        );

        return {
            success: true,
            message: response.data.message || 'Đã xóa chứng chỉ',
        };
    } catch (error: any) {
        console.error('❌ Delete certificate error:', error);

        return {
            success: false,
            message: error.response?.data?.message || 'Có lỗi xảy ra khi xóa chứng chỉ',
        };
    }
};
