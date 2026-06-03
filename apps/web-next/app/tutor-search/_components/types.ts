export type TutorType = 'intensive' | 'guided' | 'basic' | 'elite';

export interface Tutor {
  id: string;
  name: string;
  avatar: string;
  type: TutorType;
  credential: string;
  rating: number;
  university: string;
  subjects: string[];
  gradeLevels: string[];
  experience: string;
  result: string;
  resultType: 'success' | 'primary' | 'muted' | 'warning';
  highlights: string[];
  price: number;
  trialLessonPrice: number | null;
  allowPriceNegotiation: boolean;
}

export interface SearchFilters {
  searchTerm: string;
  categories: string[];
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
  categories: [],
  gradeLevels: [],
  budgetRange: 'all',
  teachingMode: '',
  city: '',
  sortBy: 'rating_desc',
  pageNumber: 1,
  pageSize: 10,
};
