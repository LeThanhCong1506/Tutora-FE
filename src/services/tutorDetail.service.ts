import axios from 'axios';
import type { Combo } from '../types/combo.types';
import { utcTimeOfDayToLocal } from '../utils/datetime';

// Lịch rảnh + fixed slot lưu UTC ở BE → convert sang giờ local để hiển thị (giữ nguyên thứ).
const availSlotToLocal = (s: AvailabilitySlot): AvailabilitySlot => ({
    ...s,
    starttime: utcTimeOfDayToLocal(s.starttime),
    endtime: utcTimeOfDayToLocal(s.endtime),
});
const fixedSlotToLocal = (s: TutorPackageFixedSlot): TutorPackageFixedSlot => ({
    ...s,
    startTime: utcTimeOfDayToLocal(s.startTime),
    endTime: utcTimeOfDayToLocal(s.endTime),
});

// ============================================
// Tutor Detail API Service
// GET /api/tutors/{id}/full-profile (AllowAnonymous)
// Uses Vite proxy → backend
// ============================================

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================
// Types matching backend TutorFullProfileResponse
// ============================================

export interface SubjectInfo {
    subjectId: number;
    subjectName?: string | null;
    gradeLevels?: string[] | string | null;
    tags?: string[] | string | null;
}

export interface TutorSubjectGradePrice {
    id: number;
    subjectId: number;
    subjectName?: string | null;
    gradeLevelId: number;
    gradeLevelName?: string | null;
    pricePerHour: number;
    durationMinutesPerSession: number;
    sessionsPerWeek: number;
    currency: string;
    isActive: boolean;
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
    /** Ảnh trang 1 (JPG) — chỉ có khi certificateFileUrl là PDF. Null/undefined thì FE tự fallback icon. */
    thumbnailUrl?: string | null;
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

export interface TutorPackageFixedSlot {
    fixedSlotId?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface TutorPackageResponse {
    packageId: number;
    tutorId?: string;
    name: string;
    packageType: 1 | 2;
    isActive: boolean;
    fixedSlots: TutorPackageFixedSlot[];
}

export interface TutorSchedule {
    tutorId: string;
    availabilities: AvailabilitySlot[];
    packages: TutorPackageResponse[];
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
    // Video
    videoIntroUrl: string | null;

    // Basic Info
    avatarUrl: string | null;
    fullName: string | null;
    headline: string | null;
    teachingAreaCity: string | null;
    teachingAreaDistrict: string | null;
    teachingMode: string | null;
    subjects: SubjectInfo[] | null;
    subjectGradePrices?: TutorSubjectGradePrice[] | null;

    // Introduction
    bio: string | null;
    education: string | null;
    gpa: number | null;
    gpaScale: number | null;
    experience: string | null;

    // Certificates
    certificates: CertificateInfo[] | null;

    // Pricing
    hourlyRate: number | null;
    trialLessonPrice: number | null;
    allowPriceNegotiation: boolean | null;

    // Schedule
    availabilities: AvailabilitySlot[] | null;
    packages?: TutorPackageResponse[] | null;

    // Feedback Statistics
    totalFeedbacks: number;
    averageRating: number;
    totalLessons: number;

    // Feedback List
    feedbacks: FeedbackItem[] | null;

    // Active Classes
    totalActiveClasses: number;
    activeClasses: ActiveClassSummary[] | null;

    // Combos (gói học) — TODO(BE): hiện đang mock trên FE trong TutorDetailPage.
    // Khi BE persist combo, map field này từ API response.
    combos?: Combo[] | null;
}

export interface ApiResponse<T> {
    content: T;
    statusCode: number;
    message: string;
    error: string | null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const normalizeTimeToHHmm = (time: string): string => {
    const trimmed = (time || '').trim();
    const amPm = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (amPm) {
        let hour = Number(amPm[1]);
        const minute = Number(amPm[2]);
        const suffix = amPm[3].toUpperCase();
        if (suffix === 'AM' && hour === 12) hour = 0;
        if (suffix === 'PM' && hour !== 12) hour += 12;
        return `${pad2(hour)}:${pad2(minute)}`;
    }

    const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHour) {
        return `${pad2(Number(twentyFourHour[1]))}:${pad2(Number(twentyFourHour[2]))}`;
    }

    return '';
};

const timeToMinutes = (time: string): number => {
    const normalized = normalizeTimeToHHmm(time);
    if (!normalized) return NaN;
    const [hour, minute] = normalized.split(':').map(Number);
    return hour * 60 + minute;
};

const isoDayToComboDay = (dayOfWeek: number): number => (dayOfWeek === 7 ? 0 : dayOfWeek);

export const mapPackagesToFixedCombos = (packages: TutorPackageResponse[] | null | undefined): Combo[] =>
    (packages ?? [])
        .filter((pkg) => pkg.isActive && pkg.packageType === 2 && (pkg.fixedSlots ?? []).length > 0)
        .map((pkg) => {
            const sessions = pkg.fixedSlots
                .map((slot) => {
                    const start = normalizeTimeToHHmm(slot.startTime);
                    const end = normalizeTimeToHHmm(slot.endTime);
                    const startMinutes = timeToMinutes(start);
                    const endMinutes = timeToMinutes(end);
                    return {
                        dayOfWeek: isoDayToComboDay(slot.dayOfWeek),
                        startHour: Math.floor(startMinutes / 60),
                        startMinute: (startMinutes % 60) as 0 | 30,
                        durationHours: (endMinutes - startMinutes) / 60,
                    };
                })
                .filter((slot) => Number.isFinite(slot.durationHours) && slot.durationHours > 0);

            return {
                id: `pkg_${pkg.packageId}`,
                type: 'fixed' as const,
                name: pkg.name,
                sessions,
            };
        })
        .filter((combo) => combo.sessions.length > 0);

// ============================================
// API Function
// ============================================

/**
 * Get full tutor profile for public display (tutor detail / landing page)
 * GET /api/tutors/{tutorId}/full-profile
 */
export const getTutorFullProfile = async (
    tutorId: string
): Promise<ApiResponse<TutorFullProfile>> => {
    try {
        console.log('📄 Fetching tutor full profile for:', tutorId);

        const response = await api.get<ApiResponse<TutorFullProfile>>(
            `/tutors/${tutorId}/full-profile`
        );

        console.log('✅ Tutor full profile fetched:', response.data);
        return response.data;
    } catch (error: unknown) {
        console.error('❌ Error fetching tutor full profile:', error);
        throw error;
    }
};

/**
 * Get fresh public tutor schedule (packages + weekly availability).
 * GET /api/tutors/{tutorId}/schedule
 */
export const getTutorSchedule = async (
    tutorId: string
): Promise<ApiResponse<TutorSchedule>> => {
    try {
        const response = await api.get<ApiResponse<TutorSchedule>>(
            `/tutors/${tutorId}/schedule`
        );

        const data = response.data;
        if (data?.content) {
            data.content.availabilities = (data.content.availabilities ?? []).map(availSlotToLocal);
            data.content.packages = (data.content.packages ?? []).map((p) => ({
                ...p,
                fixedSlots: (p.fixedSlots ?? []).map(fixedSlotToLocal),
            }));
        }
        return data;
    } catch (error: unknown) {
        console.error('❌ Error fetching tutor schedule:', error);
        throw error;
    }
};

/**
 * Get public tutor availability through the dedicated endpoint.
 * This endpoint returns local display time (HH:mm), unlike the schedule field currently cached in full-profile.
 * GET /api/tutor/availabilities/{tutorId}
 */
export const getTutorAvailabilities = async (
    tutorId: string
): Promise<ApiResponse<AvailabilitySlot[]>> => {
    try {
        const response = await api.get<ApiResponse<AvailabilitySlot[]>>(
            `/tutor/availabilities/${tutorId}`
        );

        const data = response.data;
        return { ...data, content: (data.content ?? []).map(availSlotToLocal) };
    } catch (error: unknown) {
        console.error('❌ Error fetching tutor availabilities:', error);
        throw error;
    }
};
