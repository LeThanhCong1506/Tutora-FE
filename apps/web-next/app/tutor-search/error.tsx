'use client';

import { useEffect } from 'react';
import ErrorPage from '../_components/ErrorPage';

/**
 * Route-segment error boundary cho `/tutor-search`.
 *
 * Bắt error mà `page.tsx` không try/catch được (vd. throw trong `parseSearchParams`,
 * `generateMetadata`, hoặc serialization error). Case phổ biến nhất — backend down
 * khi fetch tutor list — đã được xử lý gracefully trong `page.tsx` bằng try/catch;
 * error.tsx này là safety net cho mọi case còn lại.
 *
 * Next.js 16 props: `unstable_retry` (đổi tên từ `reset` ở Next 13-15).
 */

export default function TutorSearchError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[tutor-search] route error boundary:', error);
  }, [error]);

  return (
    <ErrorPage
      title="Đã có sự cố xảy ra"
      description="Trang tìm gia sư tạm thời không tải được. Vui lòng thử lại sau ít phút, hoặc quay lại trang chủ để tiếp tục."
      onRetry={unstable_retry}
    />
  );
}
