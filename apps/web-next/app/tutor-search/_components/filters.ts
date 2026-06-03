/**
 * Pure utilities — chia sẻ giữa Server `page.tsx` và Client `SearchClient.tsx`.
 * Không có browser API ở đây để cả 2 environment dùng được.
 */

import type { TutorSearchParams } from '@/services/tutorSearch.types';
import { categoryNameMap } from './constants';
import type { SearchFilters, Tutor } from './types';
import { defaultFilters } from './types';

/**
 * Parse URL searchParams → SearchFilters object.
 * Hỗ trợ multi-select dạng comma-separated (`?categories=math,physics`).
 *
 * Cũng accept legacy `?subject=Toán` (single Vietnamese name) để URL share-able
 * dạng human-readable cho SEO.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): SearchFilters {
  const get = (key: string): string => {
    const v = raw[key];
    if (Array.isArray(v)) return v[0] ?? '';
    return v ?? '';
  };
  const getArr = (key: string): string[] => {
    const v = get(key);
    if (!v) return [];
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  };

  // Support `?subject=Toán` (Vietnamese name → category id)
  let categories = getArr('categories');
  const subjectAlias = get('subject');
  if (categories.length === 0 && subjectAlias) {
    const lc = subjectAlias.trim().toLowerCase();
    for (const [id, name] of Object.entries(categoryNameMap)) {
      if (name.toLowerCase() === lc || id === lc) {
        categories = [id];
        break;
      }
    }
  }

  return {
    searchTerm: get('searchTerm') || get('q'),
    categories,
    gradeLevels: getArr('gradeLevels'),
    budgetRange: get('budgetRange') || 'all',
    teachingMode: get('teachingMode'),
    city: get('city'),
    sortBy: get('sortBy') || 'rating_desc',
    pageNumber: parseInt(get('page') || '1', 10) || 1,
    pageSize: defaultFilters.pageSize,
  };
}

/**
 * Build query string từ SearchFilters → URL.
 * Bỏ qua filter có giá trị mặc định để URL ngắn gọn.
 */
export function filtersToQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
  if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
  if (filters.gradeLevels.length > 0) params.set('gradeLevels', filters.gradeLevels.join(','));
  if (filters.budgetRange && filters.budgetRange !== 'all') params.set('budgetRange', filters.budgetRange);
  if (filters.teachingMode) params.set('teachingMode', filters.teachingMode);
  if (filters.city) params.set('city', filters.city);
  if (filters.sortBy && filters.sortBy !== 'rating_desc') params.set('sortBy', filters.sortBy);
  if (filters.pageNumber > 1) params.set('page', String(filters.pageNumber));
  return params.toString();
}

/**
 * Build API params for backend — single-value filters chỉ.
 * Multi-select (categories/gradeLevels.length > 1) → backend trả full list,
 * filter sẽ apply ở `applyMultiSelectFilters` SAU khi fetch.
 */
export function buildApiParams(filters: SearchFilters): TutorSearchParams {
  const params: TutorSearchParams = {
    pageNumber: filters.pageNumber,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
  };

  if (filters.searchTerm.trim()) params.searchTerm = filters.searchTerm.trim();
  if (filters.categories.length === 1) params.category = filters.categories[0];
  if (filters.gradeLevels.length === 1) params.gradeLevel = filters.gradeLevels[0];
  if (filters.budgetRange && filters.budgetRange !== 'all') params.budgetRange = filters.budgetRange;
  if (filters.teachingMode) params.teachingMode = filters.teachingMode;
  if (filters.city) params.teachingAreaCity = filters.city;

  return params;
}

/**
 * Apply multi-select filter sau khi fetch (mirror Vite logic).
 * Chỉ chạy khi user chọn > 1 category hoặc > 1 gradeLevel.
 */
export function applyMultiSelectFilters(tutors: Tutor[], filters: SearchFilters): Tutor[] {
  let filtered = tutors;

  if (filters.categories.length > 1) {
    const selectedNames = filters.categories
      .map((id) => categoryNameMap[id])
      .filter(Boolean);
    filtered = filtered.filter((tutor) =>
      selectedNames.every((name) => tutor.subjects.includes(name))
    );
  }

  if (filters.gradeLevels.length > 1) {
    const selectedGradeLabels = filters.gradeLevels.map((gl) => {
      const match = gl.match(/^Grade_(\d+)$/i);
      return match ? `Lớp ${match[1]}` : gl;
    });
    filtered = filtered.filter((tutor) =>
      selectedGradeLabels.every((gl) => tutor.gradeLevels.includes(gl))
    );
  }

  return filtered;
}

/**
 * True nếu user đang chọn multi-select (cần client-side filter sau fetch).
 */
export function needsMultiSelectFilter(filters: SearchFilters): boolean {
  return filters.categories.length > 1 || filters.gradeLevels.length > 1;
}
