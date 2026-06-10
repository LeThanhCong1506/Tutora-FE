/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import type { ApiResponse } from './tutorProfile.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

// ============================================
// Types — khớp BE SubjectResponse / GradeLevelResponse (public lookup)
// ============================================

export interface SubjectLookup {
  subjectId: number;
  subjectName: string | null;
}

export interface GradeLevelLookup {
  gradeLevelId: number;
  gradeName: string;
  levelOrder: number;
}

// ============================================
// API Functions — public ([AllowAnonymous] ở BE)
// ============================================

/** GET /api/subjects — danh sách môn học. */
export const getSubjects = async (): Promise<ApiResponse<SubjectLookup[]>> => {
  try {
    const response = await api.get('/subjects');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching subjects:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/** GET /api/grade-levels — danh sách khối lớp. */
export const getGradeLevels = async (): Promise<ApiResponse<GradeLevelLookup[]>> => {
  try {
    const response = await api.get('/grade-levels');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching grade levels:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};
