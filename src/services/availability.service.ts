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
// Types for Availability API
// ============================================

export interface AvailabilitySlot {
    availabilityid: number;
    tutorid: string;
    dayofweek: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
    starttime: string;  // "HH:mm" format
    endtime: string;    // "HH:mm" format
    createdat: string;
    dayName: string;
}

export interface CreateAvailabilityData {
    dayofweek: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
    starttime: string;  // "HH:mm" format
    endtime: string;    // "HH:mm" format
}

export interface ApiResponse<T = any> {
    content: T;
    statusCode: number;
    message: string;
    error: string | null;
}

// ============================================
// Helper Functions
// ============================================

const getAuthHeaders = () => {
    const user = getCurrentUser();
    return {
        Authorization: `Bearer ${user?.accessToken}`
    };
};

// Day mapping constants
// Backend uses: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
export const DAY_OF_WEEK_MAP: Record<number, string> = {
    0: 'Chủ nhật',
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
};

export const DAY_OF_WEEK_MAP_EN: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
};

// ============================================
// API Functions
// ============================================

/**
 * Get availability slots for the currently authenticated tutor
 * GET /api/tutor/availabilities (requires Auth, tutorId from JWT)
 *
 * Use this when the tutor views their OWN schedule (Tutor Portal).
 * @returns List of availability slots
 */
export const getMyAvailability = async (): Promise<ApiResponse<AvailabilitySlot[]>> => {
    const response = await api.get('/tutor/availabilities', {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Get all availability slots for a specific tutor (public)
 * GET /api/tutor/availabilities/{tutorId}
 *
 * Use this when parents/students view a tutor's schedule.
 * @param tutorId - Tutor ID
 * @returns List of availability slots
 */
export const getAvailability = async (tutorId: string): Promise<ApiResponse<AvailabilitySlot[]>> => {
    const response = await api.get(`/tutor/availabilities/${tutorId}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Create a new availability slot
 * POST /api/tutor/availabilities
 *
 * @param data - Availability slot data
 * @returns Created availability slot
 */
export const createAvailability = async (
    data: CreateAvailabilityData
): Promise<ApiResponse<AvailabilitySlot>> => {
    const response = await api.post(
        '/tutor/availabilities',
        data,
        {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
};

/**
 * Update an availability slot
 * PUT /api/tutor/availabilities/{id}
 *
 * @param availabilityId - Availability slot ID
 * @param data - Updated availability slot data
 * @returns Updated availability slot
 */
export const updateAvailability = async (
    availabilityId: number,
    data: CreateAvailabilityData
): Promise<ApiResponse<AvailabilitySlot>> => {
    const response = await api.put(
        `/tutor/availabilities/${availabilityId}`,
        data,
        {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
};

/**
 * Delete an availability slot
 * DELETE /api/tutor/availabilities/{id}
 *
 * @param availabilityId - Availability slot ID
 * @returns API response
 */
export const deleteAvailability = async (
    availabilityId: number
): Promise<ApiResponse> => {
    const response = await api.delete(`/tutor/availabilities/${availabilityId}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Tạo NHIỀU khung giờ trong 1 request.
 * POST /api/tutor/availabilities/bulk — body { availabilities: [...] }
 * Mỗi phần tử là 1 ô (vd 30 phút). BE yêu cầu tối thiểu 1 phần tử.
 */
export const bulkCreateAvailabilities = async (
    data: CreateAvailabilityData[]
): Promise<ApiResponse<AvailabilitySlot[]>> => {
    const response = await api.post(
        '/tutor/availabilities/bulk',
        { availabilities: data },
        {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
};

/**
 * Xoá NHIỀU khung giờ trong 1 request.
 * DELETE /api/tutor/availabilities/bulk — body { availabilityIds: [...] }
 * BE yêu cầu tối thiểu 1 id.
 */
export const bulkDeleteAvailabilities = async (
    availabilityIds: number[]
): Promise<ApiResponse<{ deletedCount: number }>> => {
    const response = await api.delete('/tutor/availabilities/bulk', {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        data: { availabilityIds }
    });
    return response.data;
};
