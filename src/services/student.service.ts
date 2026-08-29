/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import type { StudentType } from '../types/student.type';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

export interface ICreateParentStudent {
  fullname: string;
  birthdate: string;
  school?: string;
  // BE đổi: nhận id khối lớp (GradeLevelId) thay vì chuỗi tên lớp.
  gradeLevelId?: number;
  learninggoals?: string;
}

export type IUpdateParentStudent = ICreateParentStudent;

export interface IGetBookingParams {
  page: number;
  pageSize: number;
  status?: string;
}

export const getStudents = async (): Promise<ApiResponse<StudentType[]>> => {
  try {
    const response = await api.get(`/parent/students`, {
      headers: getAuthHeaders(),
    });

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

export const deleteStudent = async (id: string) => {
  try {
    const response = await api.delete(`/parent/students/${id}`, {
      headers: getAuthHeaders(),
    });

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

export const createParentStudent = async (payload: ICreateParentStudent) => {
  try {
    const response = await api.post<ICreateParentStudent>(`/parent/students`, payload, { headers: getAuthHeaders() });

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

export const updateParentStudent = async (id: string, payload: IUpdateParentStudent) => {
  try {
    const response = await api.put<IUpdateParentStudent>(`/parent/students/${id}`, payload, {
      headers: getAuthHeaders(),
    });

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
 * Student tự cập nhật hồ sơ của chính mình (họ tên, ngày sinh, trường, khối lớp, mục tiêu).
 * PUT /api/students/me
 */
export const updateMyStudentProfile = async (payload: IUpdateParentStudent): Promise<ApiResponse<StudentType>> => {
  try {
    const response = await api.put<ApiResponse<StudentType>>(`/students/me`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating own student profile:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

export interface CccdUploadResponse {
  ocrSuccess: boolean;
  identityNumber: string | null; // đã mask, vd "012*****8901"
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  message: string;
}

/** Mã lý do machine-readable khi không đủ điều kiện đặt lịch. */
export type BookingReasonCode =
  | 'STUDENT_MANAGED_BY_PARENT'
  | 'STUDENT_IDENTITY_NOT_VERIFIED'
  | 'STUDENT_UNDERAGE';

export interface StudentBookingEligibility {
  canBook: boolean;
  reasonCode: BookingReasonCode | null;
  reason: string | null;
  isParentManaged: boolean;
  /**
   * Học sinh chọn được gia sư và khung giờ nhưng không tự thanh toán — booking dừng ở
   * pending_payment chờ phụ huynh duyệt. Đi kèm canBook = true.
   */
  requiresParentPayment: boolean;
  needProfile: boolean;
  needAgeVerification: boolean;
  isUnderage: boolean;
  age: number | null;
}

export const verifyStudentCccd = async (
  frontImage: File,
  backImage: File,
): Promise<ApiResponse<CccdUploadResponse>> => {
  const formData = new FormData();
  formData.append('FrontImage', frontImage);
  formData.append('BackImage', backImage);
  const response = await api.post<ApiResponse<CccdUploadResponse>>(
    `/students/me/verify-cccd`,
    formData,
    { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

/** Link xem lại ảnh CCCD đã upload — signed URL, hết hạn sau ~15 phút. */
export interface MyCccdUrls {
  userId: string;
  userFullName?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  isIdentityVerified: boolean;
}

/**
 * Học sinh tự xem lại ảnh CCCD mình đã upload — GET /api/students/me/cccd.
 * Không truyền id — BE luôn lấy đúng userId từ JWT của người gọi.
 */
export const getMyCccdUrls = async (): Promise<ApiResponse<MyCccdUrls>> => {
  const response = await api.get<ApiResponse<MyCccdUrls>>(
    `/students/me/cccd`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/**
 * Trạng thái đủ điều kiện đặt lịch của học sinh — dùng để điều hướng / ẩn hiện nút đặt lịch.
 */
export const getBookingEligibility = async (): Promise<ApiResponse<StudentBookingEligibility>> => {
  const response = await api.get<ApiResponse<StudentBookingEligibility>>(
    `/students/me/booking-eligibility`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/**
 * Học sinh tự đăng ký nhập/cập nhật SĐT phụ huynh (tùy chọn, để nhận ZNS theo dõi).
 */
export const setParentPhone = async (
  parentPhone: string | null,
): Promise<ApiResponse<{ parentPhone: string | null }>> => {
  const response = await api.put<ApiResponse<{ parentPhone: string | null }>>(
    `/students/me/parent-phone`,
    { parentPhone },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/**
 * @deprecated Endpoint này đã bị BE gỡ trong luồng student rule mới.
 * Luồng "liên kết bằng mã" không còn dùng; parent tạo student trực tiếp hoặc student tự đăng ký.
 */
export const generateLinkCode = async (studentId: string): Promise<ApiResponse<StudentType>> => {
  try {
    const response = await api.post(`/parent/students/${studentId}/generate-link-code`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error generating link code:', error.response?.data);
    throw error;
  }
};

/**
 * @deprecated Endpoint đã bị BE gỡ — gọi sẽ trả 404. Xem verifyStudentCccd / getBookingEligibility.
 */
export const linkWithCode = async (code: string): Promise<ApiResponse<StudentType>> => {
  try {
    const response = await api.post(`/parent/students/link`, { code }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error linking with code:', error.response?.data);
    throw error;
  }
};

export const getParentBookings = async (params: IGetBookingParams = { page: 1, pageSize: 10 }) => {
  try {
    const response = await api.get(`/parent/bookings`, {
      headers: getAuthHeaders(),
      params,
    });

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

// === New: Parent-Student Auth Flow ===

export interface StudentCredentials {
  studentId: string;
  userId: string;
  username: string;
  temporaryPassword: string;
  fullName: string;
  parentId: string;
  createdAt: string;
}

/**
 * Create student and returns auto-generated credentials
 */
export const createParentStudentWithCredentials = async (
  payload: ICreateParentStudent,
): Promise<ApiResponse<StudentCredentials>> => {
  try {
    const response = await api.post<ApiResponse<StudentCredentials>>(`/parent/students`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating student with credentials:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * @deprecated Endpoint đã bị BE gỡ — gọi sẽ trả 404.
 * Parent generates an invite code for students to self-link
 */
export const generateParentCode = async (): Promise<ApiResponse<{ parentCode: string }>> => {
  try {
    const response = await api.post(`/parent/students/generate-parent-code`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error generating parent code:', error.response?.data);
    throw error;
  }
};

/**
 * @deprecated Endpoint đã bị BE gỡ — gọi sẽ trả 404.
 * Student uses a parent code to self-link with a parent
 */
export const studentSelfLink = async (parentCode: string): Promise<ApiResponse<StudentType>> => {
  try {
    const response = await api.post(`/students/self-link`, { parentCode }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error self-linking with parent code:', error.response?.data);
    throw error;
  }
};

export interface LinkStatusResponse {
  linked: boolean;
  parentName: string | null;
  parentId: string | null;
  studentProfile: StudentType | null;
}

/**
 * Student checks if they are linked to a parent
 */
export const getMyLinkStatus = async (): Promise<ApiResponse<LinkStatusResponse>> => {
  try {
    const response = await api.get(`/students/link-status`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error getting link status:', error.response?.data);
    throw error;
  }
};

/**
 * Parent resets student password — returns new credentials
 */
export const resetStudentPassword = async (studentId: string): Promise<ApiResponse<StudentCredentials>> => {
  try {
    const response = await api.put<ApiResponse<StudentCredentials>>(
      `/parent/students/${studentId}/reset-password`,
      {},
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error: any) {
    console.error('❌ Error resetting student password:', error.response?.data);
    throw error;
  }
};
