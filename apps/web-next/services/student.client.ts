'use client';

import { apiRequest, type ApiResponse } from './auth.client';

export type StudentType = {
  studentId: string;
  parentId: string;
  fullName: string;
  birthDate: string;
  school: string;
  gradeLevel: string;
  learningGoals: string;
  avatarURL: string;
  studentCode: string;
  studentCodeExpiresAt: string;
  createdAt: string;
  age: number;
  username: string;
};

export type LinkStatusResponse = {
  linked: boolean;
  parentName: string | null;
  parentId: string | null;
  studentProfile: StudentType | null;
};

export function getStudents(): Promise<ApiResponse<StudentType[]>> {
  return apiRequest<StudentType[]>('/parent/students');
}

export function getMyLinkStatus(): Promise<ApiResponse<LinkStatusResponse>> {
  return apiRequest<LinkStatusResponse>('/parent/students/link-status');
}
