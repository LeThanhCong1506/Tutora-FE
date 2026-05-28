/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
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

// ============================================
// Types for Tutor Verification Progress API
// ============================================

export type SectionStatus = 'in_progress' | 'updated';

export interface SubjectSelection {
  subjectId: number;
  subjectName: string;
  gradeLevels: number[] | string; // API may return as JSON string
  tags: string[] | string | null; // Tags for this subject (may be JSON string from API)
}

export interface VideoSection {
  videoUrl: string | null;
  status: SectionStatus;
  updatedAt: string | null;
}

export interface BasicInfoSection {
  avatarUrl: string | null;
  headline: string | null;
  teachingAreaCity: string | null;
  teachingAreaDistrict: string | null;
  teachingMode: string | null;
  subjects: SubjectSelection[];
  status: SectionStatus;
  updatedAt: string | null;
}

export interface IntroductionSection {
  bio: string | null;
  education: string | null;
  gpa: number | null;
  gpaScale: number | null;
  experience: string | null;
  status: SectionStatus;
  updatedAt: string | null;
}

export interface Certificate {
  certificateId: string;
  certificateName: string;
  certificateType: string;
  issuingOrganization: string;
  yearIssued: number | null;
  credentialId: string | null;
  credentialUrl: string | null;
  certificateFileUrl: string;
  createdAt: string;
  verificationStatus: 'pending_review' | 'verified' | 'rejected';
  verificationNote: string | null;
}

export interface CertificatesSection {
  totalCount: number;
  certificates: Certificate[];
  status: SectionStatus;
  updatedAt: string | null;
}

export interface IdentityCardSection {
  frontImageUrl: string | null;
  backImageUrl: string | null;
  isVerified: boolean;
  status: SectionStatus;
  updatedAt: string | null;
}

export interface PricingSection {
  hourlyRate: number;
  trialLessonPrice: number | null;
  allowPriceNegotiation: boolean;
  status: SectionStatus;
  updatedAt: string | null;
}

export interface VerificationSections {
  video: VideoSection;
  basicInfo: BasicInfoSection;
  introduction: IntroductionSection;
  certificates: CertificatesSection;
  identityCard: IdentityCardSection;
  pricing: PricingSection;
}

export interface VerificationProgressResponse {
  content: {
    sections: VerificationSections;
  };
  statusCode: number;
  message: string;
  error: string | null;
}

// Generic API response type
export interface ApiResponse<T = any> {
  content: T;
  statusCode: number;
  message: string;
  error: string | null;
}

// ============================================
// Helper Functions
// ============================================

export const getAuthHeaders = () => {
  const user = getCurrentUser();
  const token = user?.accessToken || import.meta.env.VITE_TOKEN;
  return {
    Authorization: `Bearer ${token}`,
  };
};

// ============================================
// API Functions
// ============================================

/**
 * Get tutor verification progress
 * GET /api/tutors/{id}/verification/progress
 *
 * @param userId - User ID (same as tutor ID)
 * @returns Verification progress with all sections
 */
export const getVerificationProgress = async (userId: string): Promise<VerificationProgressResponse> => {
  try {
    console.log('📊 Fetching verification progress for:', userId);

    const response = await api.get(`/tutors/${userId}/verification/progress`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Verification progress fetched:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching verification progress:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Upload/Update intro video
 * PUT /api/tutors/{id}/profile/video
 *
 * @param userId - User ID (same as tutor ID)
 * @param videoFile - Video file to upload
 * @returns API response
 */
export const updateVideo = async (userId: string, videoFile: File): Promise<ApiResponse> => {
  try {
    console.log('🎥 Uploading video for:', userId);
    console.log('File info:', {
      name: videoFile.name,
      size: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
      type: videoFile.type,
    });

    const formData = new FormData();
    formData.append('VideoFile', videoFile);

    const response = await api.put(`/tutors/${userId}/profile/video`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Video uploaded successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error uploading video:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// ============================================
// Basic Info Update Types
// ============================================

export interface SubjectInput {
  subjectId: number;
  gradeLevels: string[]; // ["grade_10", "grade_11", ...]
  tags: string[]; // Tags for this subject (max 5, required)
}

export interface BasicInfoUpdateData {
  headline: string;
  teachingAreaCity: string;
  teachingAreaDistrict: string;
  teachingMode: string; // API expects PascalCase: 'Online', 'Offline', 'Both'
  subjects: SubjectInput[];
}

/**
 * Update avatar
 * PUT /api/tutors/{id}/profile/avatar
 *
 * @param userId - User ID (same as tutor ID)
 * @param avatarFile - Avatar image file
 * @returns API response
 */
export const updateAvatar = async (userId: string, avatarFile: File): Promise<ApiResponse> => {
  try {
    console.log('🖼️ Uploading avatar for:', userId);
    console.log('File info:', {
      name: avatarFile.name,
      size: `${(avatarFile.size / 1024).toFixed(2)} KB`,
      type: avatarFile.type,
    });

    const formData = new FormData();
    formData.append('AvatarFile', avatarFile);

    const response = await api.put(`/tutors/${userId}/profile/avatar`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Avatar uploaded successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error uploading avatar:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Update basic info
 * PUT /api/tutors/{id}/profile/basic-info
 *
 * @param userId - User ID (same as tutor ID)
 * @param data - Basic info data to update (JSON)
 * @returns API response
 */
export const updateBasicInfo = async (userId: string, data: BasicInfoUpdateData): Promise<ApiResponse> => {
  try {
    console.log('📝 Updating basic info for:', userId);
    console.log('Data:', data);

    // Send as JSON (application/json)
    const response = await api.put(
      `/tutors/${userId}/profile/basic-info`,
      data, // Send JSON directly
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Basic info updated successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating basic info:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// ============================================
// Introduction Update Types
// ============================================

export interface IntroductionUpdateData {
  bio: string;
  education: string;
  gpa: number | null;
  gpaScale: number | null; // 4 or 10
  experience: string;
}

/**
 * Update introduction (about me)
 * PUT /api/tutors/{id}/profile/introduction
 *
 * @param userId - User ID (same as tutor ID)
 * @param data - Introduction data to update
 * @returns API response
 */
export const updateIntroduction = async (userId: string, data: IntroductionUpdateData): Promise<ApiResponse> => {
  try {
    console.log('📝 Updating introduction for:', userId);
    console.log('Data:', data);

    const response = await api.put(`/tutors/${userId}/profile/introduction`, data, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Introduction updated successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating introduction:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// ============================================
// Pricing Update Types
// ============================================

export interface PricingUpdateData {
  hourlyRate: number;
  trialLessonPrice: number | null;
  allowPriceNegotiation: boolean;
}

/**
 * Update pricing
 * PUT /api/tutors/{id}/profile/pricing
 *
 * @param userId - User ID (same as tutor ID)
 * @param data - Pricing data to update
 * @returns API response
 */
export const updatePricing = async (userId: string, data: PricingUpdateData): Promise<ApiResponse> => {
  try {
    console.log('💰 Updating pricing for:', userId);
    console.log('Data:', data);

    const response = await api.put(`/tutors/${userId}/profile/pricing`, data, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Pricing updated successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating pricing:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// ============================================
// TODO: Add more update endpoints here
// - PUT /api/tutors/{id}/profile/certificates
// - PUT /api/tutors/{id}/profile/identity-card
// ============================================
