import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import type { ApiResponse } from './tutorProfile.service';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
setupAuthInterceptor(api);

// DTO (khớp MV.DomainLayer/DTO/*/SessionPractice*.cs)
export interface PracticeAnswerOption {
  key: string;
  text: string;
}

export interface PracticeMyAnswer {
  answer: string;
  /** Chỉ trắc nghiệm mới có đúng/sai; tự luận luôn null. */
  isCorrect: boolean | null;
  answeredAt: string;
  correctAnswer?: string | null;
  explanation?: string | null;
}

export interface PracticeQuestion {
  id: string;
  setId: string;
  displayOrder: number;
  /** 'mc' = trắc nghiệm | 'essay' = tự luận. */
  questionFormat: 'mc' | 'essay';
  content: string;
  answerOptions: PracticeAnswerOption[] | null;
  /** BE CHE với học sinh cho tới khi em trả lời câu đó — đừng dựa vào đây để chấm. */
  correctAnswer: string | null;
  explanation: string | null;
  sourceMaterialId: number | null;
  sourceMaterialTitle: string | null;
  sourcePage: number | null;
  /** Null = chưa gửi (chỉ gia sư thấy). Có giá trị = học sinh làm được. */
  sentAt: string | null;
  myAnswer: PracticeMyAnswer | null;
}

export interface PracticeSetMaterial {
  materialId: number;
  title: string;
}

export interface PracticeSet {
  id: string;
  bookingId: number;
  classSessionId: number | null;
  title: string;
  prompt: string | null;
  /** 'draft' = chỉ gia sư thấy | 'sent' = học sinh thấy và làm được. */
  status: 'draft' | 'sent';
  sentAt: string | null;
  createdAt: string;
  materials: PracticeSetMaterial[];
  questions: PracticeQuestion[];
}

export interface GeneratePracticePayload {
  materialIds: number[];
  prompt: string;
  classSessionId?: number;
}

export interface UpdatePracticeQuestionPayload {
  content: string;
  answerOptions?: PracticeAnswerOption[];
  correctAnswer?: string;
  explanation?: string;
}

// API
/** Gia sư nhận cả bộ nháp; học sinh chỉ nhận bộ đã gửi, kèm bài làm của chính em. */
export const getPracticeSets = async (bookingId: number): Promise<PracticeSet[]> => {
  const { data } = await api.get<ApiResponse<PracticeSet[]>>(
    `/bookings/${bookingId}/practice-sets`,
  );
  return data.content ?? [];
};

/** Gia sư bấm "Tạo câu hỏi" — AI sinh bộ NHÁP, chưa tới tay học sinh. */
export const generatePracticeSet = async (
  bookingId: number,
  payload: GeneratePracticePayload,
): Promise<PracticeSet> => {
  const { data } = await api.post<ApiResponse<PracticeSet>>(
    `/bookings/${bookingId}/practice-sets`,
    payload,
  );
  return data.content as PracticeSet;
};

/** Sửa 1 câu — BE chặn nếu bộ đã gửi (học sinh có thể đang làm dở). */
export const updatePracticeQuestion = async (
  questionId: string,
  payload: UpdatePracticeQuestionPayload,
): Promise<PracticeQuestion> => {
  const { data } = await api.put<ApiResponse<PracticeQuestion>>(
    `/practice-questions/${questionId}`,
    payload,
  );
  return data.content as PracticeQuestion;
};

export const deletePracticeQuestion = async (questionId: string): Promise<void> => {
  await api.delete(`/practice-questions/${questionId}`);
};

/** Gửi RIÊNG 1 câu — các câu khác trong bộ vẫn ở trạng thái nháp. */
export const sendPracticeQuestion = async (questionId: string): Promise<PracticeQuestion> => {
  const { data } = await api.post<ApiResponse<PracticeQuestion>>(
    `/practice-questions/${questionId}/send`,
  );
  return data.content as PracticeQuestion;
};

/** Gửi mọi câu CHƯA gửi trong bộ. */
export const sendPracticeSet = async (setId: string): Promise<PracticeSet> => {
  const { data } = await api.post<ApiResponse<PracticeSet>>(`/practice-sets/${setId}/send`);
  return data.content as PracticeSet;
};

/** Học sinh trả lời. Làm lại thì ghi đè bài cũ. */
export const submitPracticeAnswer = async (
  questionId: string,
  answer: string,
): Promise<PracticeMyAnswer> => {
  const { data } = await api.post<ApiResponse<PracticeMyAnswer>>(
    `/practice-questions/${questionId}/answer`,
    { answer },
  );
  return data.content as PracticeMyAnswer;
};
