import 'server-only';
import { env } from '@/lib/env';
import {
  type ApiResponse,
  type TutorSearchPagedResponse,
  type TutorSearchParams,
  paramsToRecord,
} from './tutorSearch.types';

/**
 * Server-only tutor search fetcher.
 *
 * Dùng `fetch` native (không axios) để Next có thể attach `revalidate` directive
 * vào HTTP cache. Cùng request từ nhiều user trong vòng `revalidate` giây sẽ chia
 * sẻ cùng response → giảm tải backend cho trang public.
 *
 * Endpoint: GET /api/tutors/search (AllowAnonymous, không cần auth header).
 */

const REVALIDATE_SECONDS = 120; // 2 phút — đủ tươi cho danh sách tutor public

export async function searchTutorsServer(
  params: TutorSearchParams = {}
): Promise<ApiResponse<TutorSearchPagedResponse>> {
  const url = new URL('/api/tutors/search', env.BACKEND_URL);
  const queryParams = paramsToRecord(params);
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`Tutor search failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as ApiResponse<TutorSearchPagedResponse>;
}
