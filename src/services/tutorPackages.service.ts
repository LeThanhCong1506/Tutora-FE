/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';
import { localTimeOfDayToUtc, utcTimeOfDayToLocal } from '../utils/datetime';

// Fixed slot là giờ recurring → gửi UTC, nhận về convert sang local (giữ nguyên thứ).
const fixedSlotToUtc = <T extends { startTime: string; endTime: string }>(s: T): T => ({
  ...s,
  startTime: localTimeOfDayToUtc(s.startTime),
  endTime: localTimeOfDayToUtc(s.endTime),
});
const fixedSlotToLocal = <T extends { startTime: string; endTime: string }>(s: T): T => ({
  ...s,
  startTime: utcTimeOfDayToLocal(s.startTime),
  endTime: utcTimeOfDayToLocal(s.endTime),
});

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

// ============================================
// Types — khớp BE TutorPackageResponse / CreateTutorPackageRequest
// ============================================

/** 1 = flexible (parent tự chọn slot), 2 = fixed (gói cố định theo fixedSlots). */
export type PackageType = 1 | 2;

export interface TutorPackageFixedSlot {
  fixedSlotId?: number;
  dayOfWeek: number; // 0=Sunday..6=Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface TutorPackageResponse {
  packageId: number;
  tutorId?: string;
  subjectId: number | null;
  subjectName?: string | null;
  name: string;
  packageType: PackageType;
  isActive: boolean;
  /** true = package đang có buổi dạy được đặt & chưa hoàn tất → BE khóa sửa/xóa (409). */
  hasActiveBooking: boolean;
  fixedSlots: TutorPackageFixedSlot[];
}

export interface CreateTutorPackageData {
  name: string;
  /** Required for fixed packages; optional for the legacy flexible package. */
  subjectId?: number | null;
  packageType: PackageType;
  fixedSlots: Array<{
    dayOfWeek: number;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
  }>;
}

// ============================================
// API Functions — base: /tutors/{id}/profile/packages (owner-only)
// ============================================

/** GET /api/tutors/{id}/profile/packages?includeInactive= */
export const getPackages = async (
  userId: string,
  includeInactive = false,
): Promise<ApiResponse<TutorPackageResponse[]>> => {
  try {
    const response = await api.get(`/tutors/${userId}/profile/packages`, {
      headers: getAuthHeaders(),
      params: { includeInactive },
    });
    const data = response.data as ApiResponse<TutorPackageResponse[]>;
    return {
      ...data,
      content: (data.content ?? []).map((p) => ({ ...p, fixedSlots: (p.fixedSlots ?? []).map(fixedSlotToLocal) })),
    };
  } catch (error: any) {
    console.error('❌ Error fetching packages:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/** POST /api/tutors/{id}/profile/packages */
export const createPackage = async (
  userId: string,
  data: CreateTutorPackageData,
): Promise<ApiResponse<TutorPackageResponse>> => {
  try {
    const response = await api.post(
      `/tutors/${userId}/profile/packages`,
      { ...data, fixedSlots: data.fixedSlots.map(fixedSlotToUtc) },
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      },
    );
    // Response cũng trả fixedSlots theo UTC → convert ngược về local (đối xứng với getPackages),
    // để combo dựng từ response hiển thị đúng giờ local.
    const resp = response.data as ApiResponse<TutorPackageResponse>;
    return resp.content
      ? { ...resp, content: { ...resp.content, fixedSlots: (resp.content.fixedSlots ?? []).map(fixedSlotToLocal) } }
      : resp;
  } catch (error: any) {
    console.error('❌ Error creating package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * PUT /api/tutors/{id}/profile/packages/{packageId} — cập nhật package tại chỗ (giữ nguyên packageId).
 * BE trả 409 nếu package đang có buổi dạy được đặt chưa hoàn tất, hoặc khung mới đè buổi đã cam kết.
 */
export const updatePackage = async (
  userId: string,
  packageId: number,
  data: CreateTutorPackageData,
): Promise<ApiResponse<TutorPackageResponse>> => {
  try {
    const response = await api.put(
      `/tutors/${userId}/profile/packages/${packageId}`,
      { ...data, fixedSlots: data.fixedSlots.map(fixedSlotToUtc) },
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      },
    );
    // Response trả fixedSlots theo UTC → convert về local (đối xứng với createPackage/getPackages).
    const resp = response.data as ApiResponse<TutorPackageResponse>;
    return resp.content
      ? { ...resp, content: { ...resp.content, fixedSlots: (resp.content.fixedSlots ?? []).map(fixedSlotToLocal) } }
      : resp;
  } catch (error: any) {
    console.error('❌ Error updating package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/** DELETE /api/tutors/{id}/profile/packages/{packageId} — tắt (deactivate) package, tức ẩn khỏi marketplace. */
export const deactivatePackage = async (userId: string, packageId: number): Promise<ApiResponse> => {
  try {
    const response = await api.delete(`/tutors/${userId}/profile/packages/${packageId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error deactivating package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/** PUT /api/tutors/{id}/profile/packages/{packageId}/activate — bật lại (hiện lại trên marketplace) package đã ẩn. */
export const activatePackage = async (userId: string, packageId: number): Promise<ApiResponse> => {
  try {
    const response = await api.put(
      `/tutors/${userId}/profile/packages/${packageId}/activate`,
      {},
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error: any) {
    console.error('❌ Error activating package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/**
 * DELETE /api/tutors/{id}/profile/packages/{packageId}/permanent — xóa vĩnh viễn package.
 * BE trả 409 nếu package đang bật (chưa ẩn) hoặc đã từng có booking tham chiếu.
 */
export const deletePackage = async (userId: string, packageId: number): Promise<ApiResponse> => {
  try {
    const response = await api.delete(`/tutors/${userId}/profile/packages/${packageId}/permanent`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error deleting package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};
