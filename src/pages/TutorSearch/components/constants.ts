import type { ReactNode } from 'react';
import { SubjectIcons } from './icons';
import type { TutorType } from './types';

export const categories: { id: string; name: string; icon: ReactNode }[] = [
  { id: 'all', name: 'Tất cả', icon: SubjectIcons.all },
  { id: 'math', name: 'Toán Học', icon: SubjectIcons.math },
  { id: 'physics', name: 'Vật Lý', icon: SubjectIcons.physics },
  { id: 'chemistry', name: 'Hóa Học', icon: SubjectIcons.chemistry },
  { id: 'english', name: 'Tiếng Anh', icon: SubjectIcons.english },
  { id: 'science', name: 'Khoa Học', icon: SubjectIcons.science },
  { id: 'language', name: 'Ngoại Ngữ', icon: SubjectIcons.language },
  { id: 'art', name: 'Nghệ Thuật', icon: SubjectIcons.art },
  { id: 'it_tech', name: 'Công Nghệ', icon: SubjectIcons.it_tech },
];

export const trendingTags = ['Toán', 'Vật Lý', 'Hóa Học', 'Tiếng Anh'];

export const budgetRangeOptions = [
  { value: 'all', label: 'MỌI GIÁ' },
  { value: 'under_50', label: 'Dưới 50,000đ/h' },
  { value: '50_100', label: '50,000đ - 100,000đ/h' },
  { value: '100_200', label: '100,000đ - 200,000đ/h' },
  { value: '200_500', label: '200,000đ - 500,000đ/h' },
  { value: 'over_500', label: 'Trên 500,000đ/h' },
];

export const teachingModeOptions = [
  { value: 'online', label: 'ONLINE' },
  { value: 'offline', label: 'OFFLINE', disabled: true, hint: 'Sắp hỗ trợ' },
  { value: 'hybrid', label: 'LINH HOẠT', disabled: true, hint: 'Sắp hỗ trợ' },
];

// cityOptions không còn hardcode tại đây — danh sách tỉnh/thành được lấy từ API v2
// (provinces.open-api.vn) qua hook useProvinces và truyền vào FilterBar dưới dạng prop.

// Danh sách cấp học không còn hardcode tại đây — lấy từ API (GET /api/grade-levels)
// qua hook useGradeLevels và truyền vào FilterBar dưới dạng prop (giống cityOptions).

export const sortByOptions = [
  { value: 'rating_desc', label: 'ĐÁNH GIÁ CAO NHẤT' },
  { value: 'price_asc', label: 'GIÁ THẤP NHẤT' },
  { value: 'price_desc', label: 'GIÁ CAO NHẤT' },
  { value: 'experience_desc', label: 'KINH NGHIỆM' },
  { value: 'reviews_desc', label: 'ĐÁNH GIÁ NHIỀU NHẤT' },
  { value: 'newest', label: 'MỚI NHẤT' },
  { value: 'popularity', label: 'PHỔ BIẾN NHẤT' },
];

export const typeLabels: Record<TutorType, string> = {
  intensive: 'INTENSIVE TUTOR',
  guided: 'GUIDED TUTOR',
  basic: 'BASIC TUTOR',
  elite: 'ELITE TUTOR',
};

export const categoryNameMap: Record<string, string> = {
  math: 'Toán Học',
  physics: 'Vật Lý',
  chemistry: 'Hóa Học',
  english: 'Tiếng Anh',
  science: 'Khoa Học',
  language: 'Ngoại Ngữ',
  art: 'Nghệ Thuật',
  it_tech: 'Công Nghệ',
};
