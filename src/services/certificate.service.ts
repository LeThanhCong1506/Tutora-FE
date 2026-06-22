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
  // BE trả "pending_review" | "verified" | "rejected"
  verificationStatus?: string | null;
  verificationNote?: string | null;
}

// BE đã bỏ auto-OCR: mọi chứng chỉ được lưu ở trạng thái "pending_review" và đẩy
// thẳng cho admin xét duyệt. Response chỉ trả về certificate vừa tạo (không còn
// validationResult / isProfileActivated).
export interface UploadCertificateResponse {
  content: {
    certificate: CertificateData;
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
  data: UploadCertificateRequest,
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

    const response = await api.post(`/tutors/${userId}/profile/certificates`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

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
  certificateId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/tutors/${userId}/profile/certificates/${certificateId}`);

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
