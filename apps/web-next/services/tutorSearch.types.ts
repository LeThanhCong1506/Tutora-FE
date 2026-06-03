/**
 * Backend DTO types — shared giữa client service và server fetcher.
 * Copy nguyên xi từ Vite (`src/services/tutorSearch.service.ts`).
 * Khi backend đổi shape, sync 2 chỗ: file này + file Vite tương ứng.
 */

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

/**
 * Build query params record from TutorSearchParams.
 * Shared utility cho cả server fetcher (URLSearchParams) và client service (axios params).
 */
export function paramsToRecord(params: TutorSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) out[k] = v.join(',');
    else out[k] = String(v);
  });
  return out;
}
