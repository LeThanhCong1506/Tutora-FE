import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

/**
 * Mirrors backend `LearningMaterialResponse` (`MV.DomainLayer/DTO/ResponseModel/LearningMaterialResponse.cs`
 * on Tutora-Backend, `LearningMaterialController` at `api/bookings/{bookingId}/materials`) field-for-field.
 */
export interface LearningMaterialResponse {
    materialId: number;
    studentId?: string;
    bookingId?: number;
    uploadedBy?: string;
    ownerType: string;
    title: string;
    description?: string;
    fileType?: string;
    fileUrl: string;
    fileSize?: number;
    isPublic?: boolean;
    createdAt?: string;
}

export const getMaterials = async (bookingId: number): Promise<ApiResponse<LearningMaterialResponse[]>> => {
    const response = await api.get(`/bookings/${bookingId}/materials`, { headers: getAuthHeaders() });
    return response.data;
};

export const uploadMaterial = async (
    bookingId: number,
    file: File,
    title: string,
    description?: string,
    isPublic = false,
): Promise<ApiResponse<LearningMaterialResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('isPublic', String(isPublic));

    const response = await api.post(`/bookings/${bookingId}/materials`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deleteMaterial = async (bookingId: number, materialId: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/bookings/${bookingId}/materials/${materialId}`, { headers: getAuthHeaders() });
    return response.data;
};
