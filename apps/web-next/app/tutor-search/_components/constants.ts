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
  { value: 'under_50', label: 'Dưới 50.000đ/h' },
  { value: '50_100', label: '50.000đ - 100.000đ/h' },
  { value: '100_200', label: '100.000đ - 200.000đ/h' },
  { value: '200_500', label: '200.000đ - 500.000đ/h' },
  { value: 'over_500', label: 'Trên 500.000đ/h' },
];

export const teachingModeOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'online', label: 'ONLINE' },
  { value: 'offline', label: 'OFFLINE' },
  { value: 'hybrid', label: 'LINH HOẠT' },
];

export const cityOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'hochiminh', label: 'TP. Hồ Chí Minh' },
  { value: 'hanoi', label: 'Hà Nội' },
  { value: 'danang', label: 'Đà Nẵng' },
  { value: 'cantho', label: 'Cần Thơ' },
  { value: 'haiphong', label: 'Hải Phòng' },
  { value: 'binhduong', label: 'Bình Dương' },
  { value: 'dongnai', label: 'Đồng Nai' },
];

export const gradeLevelChips = [
  { value: 'Grade_1', label: 'Lớp 1' },
  { value: 'Grade_2', label: 'Lớp 2' },
  { value: 'Grade_3', label: 'Lớp 3' },
  { value: 'Grade_4', label: 'Lớp 4' },
  { value: 'Grade_5', label: 'Lớp 5' },
  { value: 'Grade_6', label: 'Lớp 6' },
  { value: 'Grade_7', label: 'Lớp 7' },
  { value: 'Grade_8', label: 'Lớp 8' },
  { value: 'Grade_9', label: 'Lớp 9' },
  { value: 'Grade_10', label: 'Lớp 10' },
  { value: 'Grade_11', label: 'Lớp 11' },
  { value: 'Grade_12', label: 'Lớp 12' },
];

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

export const statsLabels: Record<TutorType, { experience: string; result: string }> = {
  intensive: { experience: 'THÂM NIÊN', result: 'KẾT QUẢ' },
  guided: { experience: 'THÂM NIÊN', result: 'HÀI LÒNG' },
  basic: { experience: 'THÂM NIÊN', result: 'CHỨNG CHỈ' },
  elite: { experience: 'THÂM NIÊN', result: 'CHUYÊN MÔN' },
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

/**
 * Reverse map: search term/category name → category id.
 * Dùng cho `generateMetadata` server-side khi parse `?subject=Toán` từ URL.
 */
export const categoryIdFromName = (name: string): string | undefined => {
  const normalized = name.trim().toLowerCase();
  for (const [id, label] of Object.entries(categoryNameMap)) {
    if (label.toLowerCase() === normalized || id === normalized) return id;
  }
  return undefined;
};
