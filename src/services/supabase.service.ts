/* eslint-disable @typescript-eslint/no-explicit-any */
//
// ID card storage operations.
//
// History: Trước đây file này gọi trực tiếp Supabase Storage bằng service-role
// key ở browser → key bị bundle vào JS, lộ ra tutora.vn. Đã refactor sang
// gọi backend; service-role key chỉ còn sống ở env BE.
//
// Backend endpoints cần (TODO Công):
//   POST   /api/storage/id-cards            multipart {file, side} → { content: { path } }
//   DELETE /api/storage/id-cards?path=...   → 204
//   GET    /api/storage/id-cards/signed-url?path=...&expiresIn=... → { content: { url } }
//
// Toàn bộ 3 endpoint phải auth (Bearer JWT của tutor) và check ownership:
// path phải bắt đầu bằng userId của caller, hoặc caller là admin/staff.
//
import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import { getAuthHeaders } from './tutorProfile.service';
import type { UploadResult } from '../types/verification.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});
setupAuthInterceptor(api);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Upload ID card image via backend (BE writes to private Supabase bucket using
 * its server-side service-role key).
 */
export const uploadIdCard = async (
    file: File,
    side: 'front' | 'back'
): Promise<UploadResult> => {
    if (!file.type.startsWith('image/')) {
        return { path: '', error: 'Vui lòng chỉ upload file ảnh (JPG, PNG, etc.)' };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return { path: '', error: 'Kích thước file không được vượt quá 5MB' };
    }

    const form = new FormData();
    form.append('file', file);
    form.append('side', side);

    try {
        const response = await api.post('/storage/id-cards', form, {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'multipart/form-data',
            },
        });

        const path: string | undefined = response.data?.content?.path;
        if (!path) {
            return { path: '', error: 'Phản hồi từ server không hợp lệ' };
        }

        return { path, publicUrl: path };
    } catch (error: any) {
        const message =
            error.response?.data?.message ||
            error.response?.data?.content ||
            error.message ||
            'Có lỗi xảy ra khi upload';
        console.error('❌ Upload ID card failed:', message);
        return { path: '', error: message };
    }
};

/**
 * Delete an ID card image from storage via backend.
 */
export const deleteIdCard = async (path: string): Promise<boolean> => {
    try {
        await api.delete('/storage/id-cards', {
            headers: getAuthHeaders(),
            params: { path },
        });
        return true;
    } catch (error: any) {
        console.error('❌ Delete ID card failed:', error?.message);
        return false;
    }
};

/**
 * Ask backend for a short-lived signed URL to view an ID card image.
 * `expiresIn` is a hint to backend; backend may clamp to its own max.
 */
export const getIdCardUrl = async (
    path: string,
    expiresIn: number = 31536000
): Promise<string | null> => {
    try {
        const response = await api.get('/storage/id-cards/signed-url', {
            headers: getAuthHeaders(),
            params: { path, expiresIn },
        });
        return response.data?.content?.url || null;
    } catch (error: any) {
        console.error('❌ Get signed URL failed:', error?.message);
        return null;
    }
};
