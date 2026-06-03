/**
 * Backend DTO types cho tutor full profile.
 * Copy nguyên xi từ Vite (`src/services/tutorDetail.service.ts`).
 * Khi backend đổi shape, sync 2 chỗ: file này + file Vite tương ứng.
 */

import type { ApiResponse } from './tutorSearch.types';
export type { ApiResponse };

export interface SubjectInfo {
  subjectId: number;
  subjectName?: string | null;
  gradeLevels?: string[] | null;
  tags?: string[] | null;
}

export interface CertificateInfo {
  certificateId: string;
  certificateName: string;
  certificateType: string;
  issuingOrganization: string;
  yearIssued: number | null;
  credentialId: string | null;
  credentialUrl: string | null;
  certificateFileUrl: string;
  createdAt: string;
  verificationStatus: string | null;
  verificationNote: string | null;
}

export interface AvailabilitySlot {
  availabilityid: number;
  tutorid: string;
  dayofweek: number;
  starttime: string;
  endtime: string;
  createdat: string;
  dayName: string;
}

export interface FeedbackItem {
  feedbackId: number;
  fromUserId: string | null;
  fromUserName: string | null;
  fromUserAvatar: string | null;
  rating: number | null;
  comment: string | null;
  replyComment: string | null;
  repliedAt: string | null;
  createdAt: string | null;
  initialGoal: string | null;
  actualResult: string | null;
  courseDuration: string | null;
}

export interface ActiveClassSummary {
  bookingId: number;
  subjectName: string | null;
  studentName: string | null;
  totalLessons: number;
  completedLessons: number;
  status: string | null;
  startDate: string | null;
}

export interface TutorFullProfile {
  videoIntroUrl: string | null;

  avatarUrl: string | null;
  fullName: string | null;
  headline: string | null;
  teachingAreaCity: string | null;
  teachingAreaDistrict: string | null;
  teachingMode: string | null;
  subjects: SubjectInfo[] | null;

  bio: string | null;
  education: string | null;
  gpa: number | null;
  gpaScale: number | null;
  experience: string | null;

  certificates: CertificateInfo[] | null;

  hourlyRate: number | null;
  trialLessonPrice: number | null;
  allowPriceNegotiation: boolean | null;

  availabilities: AvailabilitySlot[] | null;

  totalFeedbacks: number;
  averageRating: number;

  feedbacks: FeedbackItem[] | null;

  totalActiveClasses: number;
  activeClasses: ActiveClassSummary[] | null;
}
