export type TutorType = 'intensive' | 'guided' | 'basic' | 'elite';

export interface SubjectGradeSummary {
  subjectName: string;
  gradeLevels: string[];
  gradeLabel: string;
  minPrice: number | null;
}

export interface Tutor {
  id: string;
  name: string;
  avatar: string;
  type: TutorType;
  credential: string;
  bio: string;
  videoUrl: string | null;
  rating: number;
  totalReviews: number;
  totalLessons: number;
  university: string;
  subjects: string[];
  gradeLevels: string[];
  subjectGradeLevels: SubjectGradeSummary[];
  minPrice: number | null;
}

export interface SearchFilters {
  searchTerm: string;
  subjectIds: number[];
  gradeLevels: string[];
  budgetRange: string;
  teachingMode: string;
  city: string;
  sortBy: string;
  pageNumber: number;
  pageSize: number;
}

export const defaultFilters: SearchFilters = {
  searchTerm: '',
  subjectIds: [],
  gradeLevels: [],
  budgetRange: 'all',
  teachingMode: 'online',
  city: '',
  sortBy: 'rating_desc',
  pageNumber: 1,
  pageSize: 9,
};
