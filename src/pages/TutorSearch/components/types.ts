export type TutorType = 'intensive' | 'guided' | 'basic' | 'elite';

export interface SubjectGradeSummary {
  subjectName: string;
  gradeLevels: string[];
  gradeLabel: string;
}

export interface Tutor {
  id: string;
  name: string;
  avatar: string;
  type: TutorType;
  credential: string;
  bio: string;
  rating: number;
  university: string;
  subjects: string[];
  gradeLevels: string[];
  subjectGradeLevels: SubjectGradeSummary[];
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
