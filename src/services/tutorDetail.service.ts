import axios from 'axios';

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

    // Feedback Statistics
    totalFeedbacks: number;
    averageRating: number;

    // Feedback List
    feedbacks: FeedbackItem[] | null;

    // Active Classes
    totalActiveClasses: number;
    activeClasses: ActiveClassSummary[] | null;
}

export interface ApiResponse<T> {
    content: T;
    statusCode: number;
    message: string;
    error: string | null;
}

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
