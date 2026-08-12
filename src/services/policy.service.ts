import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

/**
 * Không gắn `setupAuthInterceptor`: văn bản pháp lý là công khai và phải đọc được TRƯỚC khi
 * đăng ký — các ô tick đồng ý ở màn đăng ký đều trỏ vào đây.
 */
const api = axios.create({ baseURL: API_BASE_URL });

export interface PolicyDocumentSummary {
  policyDocumentId: number;
  slug: string;
  title: string;
  summary?: string;
  version: string;
  effectiveDate?: string;
  displayOrder: number;
}

export interface PolicyDocument extends PolicyDocumentSummary {
  contentMarkdown: string;
}

interface ApiEnvelope<T> {
  content: T;
  statusCode: number;
  message: string;
}

/** Danh sách văn bản đang phát hành, đã sắp theo thứ tự hiển thị. */
export const getPolicyDocuments = async (): Promise<PolicyDocumentSummary[]> => {
  const response = await api.get<ApiEnvelope<PolicyDocumentSummary[]>>('/policies');
  return response.data.content ?? [];
};

/** Trả về null khi slug không tồn tại hoặc văn bản chưa phát hành (BE trả 404). */
export const getPolicyDocument = async (slug: string): Promise<PolicyDocument | null> => {
  try {
    const response = await api.get<ApiEnvelope<PolicyDocument>>(`/policies/${encodeURIComponent(slug)}`);
    return response.data.content ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};
