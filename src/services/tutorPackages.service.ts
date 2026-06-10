/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
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
  name: string;
  packageType: PackageType;
  isActive: boolean;
  fixedSlots: TutorPackageFixedSlot[];
}

export interface CreateTutorPackageData {
  name: string;
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
    return response.data;
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
    const response = await api.post(`/tutors/${userId}/profile/packages`, data, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating package:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/** DELETE /api/tutors/{id}/profile/packages/{packageId} — tắt (deactivate) package. */
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
