'use client';

import { apiRequest, type ApiResponse } from './auth.client';

export type ScheduleItemPayload = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type CreateBookingPayload = {
  studentId: string;
  tutorId: string;
  subjectId: number;
  teachingMode: 'online' | 'offline' | 'hybrid';
  startDate: string;
  schedule: ScheduleItemPayload[];
  locationCity?: string;
  locationDistrict?: string;
  locationWard?: string;
  locationDetail?: string;
  promotionCode?: string;
};

export type BookingResponseDTO = {
  bookingId: number;
  parentId?: string;
  student?: { studentId: string; fullName: string; gradeLevel: string };
  tutor?: { tutorId: string; fullName: string; avatarUrl: string; hourlyRate: number };
  subject?: { subjectId: number; subjectName: string };
  packageType: string;
  sessionCount: number;
  teachingMode?: string;
  price: number;
  discountApplied: number;
  finalPrice: number;
  platformFee: number;
  status: string;
  paymentStatus: string;
  paymentCode: string;
  schedule: ScheduleItemPayload[];
  startDate?: string;
  createdAt: string;
  paymentDueAt: string | null;
};

export type PromotionValidateResult = {
  valid: boolean;
  code?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  message?: string;
};

export function createBooking(
  payload: CreateBookingPayload
): Promise<ApiResponse<BookingResponseDTO>> {
  return apiRequest<BookingResponseDTO>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function validatePromotion(
  code: string,
  orderValue: number
): Promise<ApiResponse<PromotionValidateResult>> {
  const params = new URLSearchParams({
    code,
    orderValue: String(orderValue),
  });

  return apiRequest<PromotionValidateResult>(`/promotions/validate?${params}`);
}
