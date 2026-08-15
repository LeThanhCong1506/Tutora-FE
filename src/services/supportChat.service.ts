import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

export interface ApiResponse<T> {
  content: T;
  statusCode: number;
  message: string;
  error: string | null;
}

export type SupportSenderSide = 'admin' | 'user';
export type SupportMessageType = 'text' | 'image';

export interface SupportMessage {
  supportMessageId: number;
  senderId: string | null;
  senderSide: SupportSenderSide;
  senderName: string | null;
  /** "text" or "image" — when "image", `message` holds the image URL. */
  messageType: SupportMessageType;
  message: string;
  createdAt: string;
}

export interface SupportThread {
  supportThreadId: number;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: string | null;
  userPhone: string | null;
  userEmail: string | null;
  messages: SupportMessage[];
}

/** GET /api/users/me/support/thread — null content if I've never messaged support before. */
export const getMySupportThread = async (): Promise<SupportThread | null> => {
  const res = await api.get<ApiResponse<SupportThread | null>>('/users/me/support/thread');
  return res.data.content;
};

/** POST /api/users/me/support/messages — creates my thread with support on first contact. */
export const sendMySupportMessage = async (message: string): Promise<SupportMessage> => {
  const res = await api.post<ApiResponse<SupportMessage>>('/users/me/support/messages', { message });
  return res.data.content;
};

/** POST /api/users/me/support/images — uploads and sends an image (max 5MB), creating my thread on first contact. */
export const sendMySupportImage = async (file: File): Promise<SupportMessage> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiResponse<SupportMessage>>('/users/me/support/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.content;
};
