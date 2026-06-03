'use client';

import { useEffect } from 'react';
import ErrorPage from '../../_components/ErrorPage';

/**
 * Route-segment error boundary cho `/tutor-detail/[id]`.
 *
 * Bắt mọi throw từ `TutorDetailServerContent` mà KHÔNG phải `TutorNotFoundError`
 * (case đó được route sang `app/not-found.tsx` qua `notFound()`). Case phổ biến:
 *  - Backend `api.tutora.vn` down → fetch throw network error
 *  - Backend 5xx → fetch throw HTTPError
 *  - JSON parse fail
 *
 * `home` button trỏ về `/tutor-search` thay vì `/` — user đang tìm gia sư, hợp lý
 * hơn là quay danh sách tìm kiếm.
 */

export default function TutorDetailError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[tutor-detail] route error boundary:', error);
  }, [error]);

  return (
    <ErrorPage
      title="Không tải được thông tin gia sư"
      description="Trang hồ sơ gia sư tạm thời không khả dụng. Vui lòng thử lại sau ít phút, hoặc quay về danh sách để xem gia sư khác."
      onRetry={unstable_retry}
      homeHref="/tutor-search"
      homeLabel="Quay lại danh sách"
    />
  );
}
