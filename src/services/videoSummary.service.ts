import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';
import type { ClassSessionAiJobResponse } from './classSession.service';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

export type { ClassSessionAiJobResponse };

export interface VideoSummaryChatMessage {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

/** Học sinh yêu cầu Gemini tóm tắt video buổi học — chỉ chạy khi bấm lần đầu (lazy). */
export const triggerVideoSummary = async (classSessionId: number): Promise<ApiResponse<ClassSessionAiJobResponse>> => {
    const response = await api.post(`/student/class-sessions/${classSessionId}/video-summary`, {}, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const getVideoSummaryStatus = async (classSessionId: number): Promise<ApiResponse<ClassSessionAiJobResponse>> => {
    const response = await api.get(`/student/class-sessions/${classSessionId}/video-summary`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const sendVideoSummaryFollowUp = async (
    classSessionId: number,
    question: string,
): Promise<ApiResponse<string>> => {
    const response = await api.post(
        `/student/class-sessions/${classSessionId}/video-summary/messages`,
        { question },
        { headers: getAuthHeaders() },
    );
    return response.data;
};

export const getVideoSummaryMessages = async (
    classSessionId: number,
): Promise<ApiResponse<VideoSummaryChatMessage[]>> => {
    const response = await api.get(`/student/class-sessions/${classSessionId}/video-summary/messages`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};
