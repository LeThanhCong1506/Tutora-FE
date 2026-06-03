'use client';

import { useEffect } from 'react';
import ErrorPage from './_components/ErrorPage';

/**
 * App-root error boundary — fallback cho mọi route segment KHÔNG có `error.tsx` riêng.
 *
 * Hiện tại: home page (`/`) là static, hiếm khi throw. Nhưng nếu một client component
 * trong home (vd. TestimonialsSection, FaqSection) throw runtime → file này bắt.
 *
 * Routes có `error.tsx` riêng (`/tutor-search`, `/tutor-detail/[id]`) sẽ ưu tiên
 * dùng file đó vì gần segment hơn.
 *
 * Errors trong root `layout.tsx` không được bắt ở đây — phải dùng `global-error.tsx`.
 */

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[app] route error boundary:', error);
  }, [error]);

  return <ErrorPage onRetry={unstable_retry} />;
}
