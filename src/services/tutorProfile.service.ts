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
  /** @deprecated BE không còn trả subjects trong basic-info; môn lấy từ getPricing. */
  subjects?: SubjectSelection[];
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

// BE refactor: pricing is now per subject+grade (xem getPricing / SubjectGradePriceItem).
// Section này trong verification/progress giờ chỉ còn status để theo dõi tiến trình.
export interface PricingSection {
  status: SectionStatus;
  updatedAt: string | null;
}

export interface VerificationSections {
  video: VideoSection;
  basicInfo: BasicInfoSection;
  introduction: IntroductionSection;
  certificates: CertificatesSection;
  identityCard: IdentityCardSection;
  /** BE đã bỏ pricing khỏi response progress (giá theo môn×lớp lấy qua getPricing). Optional để khớp thực tế. */
  pricing?: PricingSection;
}

export interface VerificationProgressResponse {
  content: {
    sections: VerificationSections;
  };
  statusCode: number;
  message: string;
  error: string | null;
}

// ============================================
// Profile completion / overall status
// ============================================

/**
 * Trạng thái tổng thể của hồ sơ gia sư. Khớp BE TutorProfileStatus:
 * - draft: đang điền thông tin
 * - pending_approval: đã gửi, chờ Admin xét duyệt lần đầu (chưa từng lên marketplace)
 * - active: đã duyệt, hiển thị công khai
 * - rejected: bị Admin từ chối
 * - pending_update: đã Active (đang hiển thị công khai với thông tin CŨ) nhưng có 1 bản
 *   chỉnh sửa đang chờ Admin duyệt lại — giá trị tổng hợp, không lưu xuống DB
 */
export type TutorProfileStatus = 'draft' | 'pending_approval' | 'active' | 'rejected' | 'pending_update';

export interface ProfileCompletionSection {
  key: string;
  name: string;
  isComplete: boolean;
  missingReason: string | null;
}

export interface ProfileCompletionResponse {
  completedSections: number;
  totalSections: number;
  canSubmit: boolean;
  profileStatus: TutorProfileStatus | string;
  sections: ProfileCompletionSection[];
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
 * Lấy tiến trình hoàn thiện + trạng thái tổng thể của hồ sơ gia sư.
 * GET /api/tutors/{id}/profile-completion — owner-only.
 *
 * Endpoint nhẹ, trả `profileStatus` (draft / pending_approval / active / rejected)
 * cùng số mục đã hoàn thành. Dùng để hiển thị banner trạng thái ở trang profile.
 *
 * @param userId - User ID (cũng là tutor ID, phải khớp người đang đăng nhập)
 */
export const getProfileCompletion = async (
  userId: string,
): Promise<ApiResponse<ProfileCompletionResponse>> => {
  try {
    const response = await api.get(`/tutors/${userId}/profile-completion`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching profile completion:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Update intro video (YouTube link)
 * PUT /api/tutors/{id}/profile/video — body: { videoUrl: string }
 *
 * BE đã đổi: không còn upload file nữa, chỉ nhận 1 URL YouTube.
 *
 * @param userId - User ID (same as tutor ID)
 * @param videoUrl - Link YouTube video giới thiệu
 * @returns API response
 */
export const updateVideo = async (userId: string, videoUrl: string): Promise<ApiResponse> => {
  try {
    console.log('🎥 Updating intro video URL for:', userId, videoUrl);

    const response = await api.put(
      `/tutors/${userId}/profile/video`,
      { videoUrl },
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Video URL updated successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating video URL:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// ============================================
// CCCD (Citizen ID) Upload
// ============================================

/**
 * Kết quả xác minh CCCD trả về từ BE. BE upload ảnh lên Cloudinary (private) VÀ
 * chạy OCR/eKYC ngay trong cùng 1 request — không cần gọi thêm verify nữa.
 * - ocrSuccess = true: đọc được CCCD và tên khớp hồ sơ → đã xác minh.
 * - ocrSuccess = false: không đọc được → ảnh đã lưu, chờ admin xác minh thủ công.
 * Lưu ý: BE KHÔNG trả URL ảnh (ảnh lưu private trên Cloudinary).
 */
export interface CccdUploadResult {
  ocrSuccess: boolean;
  identityNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  message: string;
}

/**
 * Upload + xác minh CCCD chỉ với MỘT request duy nhất.
 * POST /api/tutors/{id}/profile/cccd — multipart: FrontImage + BackImage (JPG/PNG, ≤5MB mỗi ảnh).
 * BE tự upload Cloudinary, chạy OCR và đối chiếu tên với hồ sơ.
 *
 * @param userId - User ID (cũng là tutor ID, phải khớp người đang đăng nhập)
 * @param frontImage - Ảnh mặt trước CCCD
 * @param backImage - Ảnh mặt sau CCCD
 * @returns Kết quả OCR/eKYC (CccdUploadResult)
 */
export const uploadCccd = async (
  userId: string,
  frontImage: File,
  backImage: File,
): Promise<ApiResponse<CccdUploadResult>> => {
  try {
    const formData = new FormData();
    formData.append('FrontImage', frontImage);
    formData.append('BackImage', backImage);

    const response = await api.post(`/tutors/${userId}/profile/cccd`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ CCCD uploaded successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error uploading CCCD:', {
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

// BE refactor: basic-info KHÔNG còn nhận subjects nữa. Môn học được set qua pricing
// (SubjectGradePrices) ở trang Onboarding. Xem updatePricing / getPricing.
export interface BasicInfoUpdateData {
  headline: string;
  teachingAreaCity: string;
  teachingAreaDistrict: string;
  teachingMode: string; // API expects PascalCase: 'Online', 'Offline', 'Both'
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
// Pricing Types (per subject + grade level)
// ============================================

/**
 * 1 dòng giá theo (môn × lớp). Khớp BE TutorSubjectGradePriceResponse.
 * `id` chính là TutorSubjectGradePriceId mà luồng booking bắt buộc.
 */
export interface SubjectGradePriceItem {
  id: number;
  subjectId: number;
  subjectName?: string | null;
  gradeLevelId: number;
  gradeLevelName?: string | null;
  pricePerHour: number;
  durationMinutesPerSession: number;
  sessionsPerWeek: number;
  currency: string;
  isActive: boolean;
}

export interface TutorPricingResponse {
  subjectGradePrices: SubjectGradePriceItem[];
}

/** Payload PUT pricing — khớp BE UpdateTutorPricingRequest (chỉ SubjectGradePrices[]). */
export interface UpdatePricingData {
  subjectGradePrices: Array<{
    subjectId: number;
    gradeLevelId: number;
    pricePerHour: number;
    durationMinutesPerSession: number;
    sessionsPerWeek: number;
    currency: string;
    isActive: boolean;
  }>;
}

export interface SubjectGradePriceData {
  subjectId: number;
  gradeLevelId: number;
  pricePerHour: number;
  durationMinutesPerSession: number;
  sessionsPerWeek: number;
  currency?: string;
  isActive: boolean;
}

/**
 * Lấy bảng giá theo môn/lớp của gia sư.
 * GET /api/tutors/{id}/profile/pricing — owner-only (gia sư xem của chính mình).
 */
export const getPricing = async (userId: string): Promise<ApiResponse<TutorPricingResponse>> => {
  try {
    const response = await api.get(`/tutors/${userId}/profile/pricing`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching pricing:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Cập nhật bảng giá theo môn/lớp (thay toàn bộ).
 * PUT /api/tutors/{id}/profile/pricing
 *
 * Đây cũng là nguồn duy nhất để môn của gia sư xuất hiện trên marketplace
 * (BE suy danh sách môn từ chính các dòng SubjectGradePrices).
 */
export const updatePricing = async (userId: string, data: UpdatePricingData): Promise<ApiResponse> => {
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

/**
 * Thêm một cấu hình môn × khối lớp.
 * POST /api/tutors/{id}/profile/pricing
 */
export const addSubjectGradePrice = async (
  userId: string,
  data: SubjectGradePriceData,
): Promise<ApiResponse<SubjectGradePriceItem>> => {
  try {
    const response = await api.post(`/tutors/${userId}/profile/pricing`, data, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding subject grade price:', {
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
