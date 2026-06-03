/**
 * Client-side tutor search service.
 * Dùng cho "Xem thêm" pagination trong browser — fetch tiếp từ frontend
 * mà không cần navigate đổi URL (giữ nguyên scroll position).
 *
 * Endpoint cùng `/api/tutors/search` AllowAnonymous; gọi qua relative URL
 * để tận dụng same-origin (browser → Next 3000 → Vite 5173 proxy → Backend).
 */

import {
  type ApiResponse,
  type TutorSearchPagedResponse,
  type TutorSearchParams,
  paramsToRecord,
} from './tutorSearch.types';

export async function searchTutors(
  params: TutorSearchParams = {}
): Promise<ApiResponse<TutorSearchPagedResponse>> {
  const queryParams = paramsToRecord(params);
  const search = new URLSearchParams(queryParams).toString();
  const res = await fetch(`/api/tutors/search${search ? `?${search}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Tutor search failed: ${res.status}`);
  return (await res.json()) as ApiResponse<TutorSearchPagedResponse>;
}
