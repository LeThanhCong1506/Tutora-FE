import axios from 'axios';

// ============================================
// Tutor Search API Service
// GET /api/tutor-search (AllowAnonymous)
// Uses Vite proxy → backend
// ============================================

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10s timeout cho production
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================
// Types matching backend DTOs
// ============================================

export interface TutorSubjectInfo {
    subjectId: number;
    subjectName: string | null;
    gradeLevels: string[] | null;
    tags: string[] | null;
}

export interface TutorCertificateInfo {
    certificateName: string | null;
    issuingOrganization: string | null;
    yearIssued: number | null;
}

export interface TutorSearchResultResponse {
    tutorId: string;
    fullName: string | null;
    avatarUrl: string | null;
    headline: string | null;
    education: string | null;
    degreeLevel: string | null;
    averageRating: number | null;
    totalReviews: number | null;
    yearsOfExperience: number | null;
    completedHours: number | null;
    subjects: TutorSubjectInfo[] | null;
    hourlyRate: number | null;
    trialLessonPrice: number | null;
    allowPriceNegotiation: boolean | null;
    teachingAreaCity: string | null;
    teachingAreaDistrict: string | null;
    teachingMode: string | null;
    subscriptionType: string | null;
    subscriptionTypeLabel: string | null;
    verificationStatus: string | null;
    certifications: TutorCertificateInfo[] | null;
    successRate: string | null;
    highlights: string[] | null;
    specialty: string | null;
}

export interface FilterOption {
    value: string;
    label: string;
    count: number;
}

export interface TutorSearchFilterMetadata {
    availableCategories: FilterOption[] | null;
    availableGradeLevels: FilterOption[] | null;
    availableBudgetRanges: FilterOption[] | null;
    availableTeachingModes: FilterOption[] | null;
    availableSortOptions: FilterOption[] | null;
    availableSubjects: FilterOption[] | null;
    availableCities: FilterOption[] | null;
    minPriceInResults: number | null;
    maxPriceInResults: number | null;
    minRatingInResults: number | null;
    maxRatingInResults: number | null;
}

export interface TutorSearchPagedResponse {
    items: TutorSearchResultResponse[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
    resultsText: string | null;
    filterMetadata: TutorSearchFilterMetadata | null;
}

export interface ApiResponse<T> {
    content: T;
    statusCode: number;
    message: string;
    error: string | null;
}

// ============================================
// Search Parameters
// ============================================

export interface TutorSearchParams {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    category?: string;
    subjectIds?: number[];
    gradeLevel?: string;
    subscriptionTypes?: string[];
    budgetRange?: string;
    minHourlyRate?: number;
    maxHourlyRate?: number;
    minRating?: number;
    minYearsExperience?: number;
    teachingAreaCity?: string;
    teachingAreaDistrict?: string;
    teachingMode?: string;
    verificationStatus?: string;
    hasTrialLesson?: boolean;
    allowPriceNegotiation?: boolean;
    sortBy?: string;
}

// ============================================
// API Function
// ============================================

/**
 * Search tutors with filters and pagination
 * GET /api/tutor-search
 */
export const searchTutors = async (
    params: TutorSearchParams = {}
): Promise<ApiResponse<TutorSearchPagedResponse>> => {
    try {
        console.log('🔍 Searching tutors with params:', params);

        // Build query params, filtering out undefined values
        const queryParams: Record<string, string> = {};
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    queryParams[key] = value.join(',');
                } else {
                    queryParams[key] = String(value);
                }
            }
        });

        const response = await api.get<ApiResponse<TutorSearchPagedResponse>>(
            '/tutors/search',
            { params: queryParams }
        );

        console.log('✅ Tutor search completed:', response.data);
        return response.data;
    } catch (error: unknown) {
        console.error('❌ Error searching tutors:', error);
        throw error;
    }
};
