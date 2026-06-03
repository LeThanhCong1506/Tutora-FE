import 'server-only';
import { env } from '@/lib/env';
import type { ApiResponse, TutorFullProfile } from './tutorDetail.types';

/**
 * Server-only tutor full profile fetcher.
 *
 * Endpoint: GET /api/tutors/{id}/full-profile (AllowAnonymous).
 *
 * Cache: revalidate 300s (5 phút) — profile gia sư không đổi thường xuyên,
 * cache lâu hơn list search (120s) để giảm tải backend cho trang SEO chủ lực.
 *
 * 404 handling: nếu backend trả 404 (tutor không tồn tại) → throw error
 * với code 'NOT_FOUND' để page.tsx gọi `notFound()`.
 */

const REVALIDATE_SECONDS = 300;

export class TutorNotFoundError extends Error {
  constructor(tutorId: string) {
    super(`Tutor not found: ${tutorId}`);
    this.name = 'TutorNotFoundError';
  }
}

export async function getTutorFullProfileServer(
  tutorId: string
): Promise<ApiResponse<TutorFullProfile>> {
  const url = `${env.BACKEND_URL}/api/tutors/${encodeURIComponent(tutorId)}/full-profile`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (res.status === 404) {
    throw new TutorNotFoundError(tutorId);
  }

  if (!res.ok) {
    throw new Error(`Tutor profile fetch failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as ApiResponse<TutorFullProfile>;
}
