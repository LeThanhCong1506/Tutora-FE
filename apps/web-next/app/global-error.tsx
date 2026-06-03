'use client';

import { useEffect } from 'react';

/**
 * Root-layout error boundary — last-resort safety net.
 *
 * Bắt error trong `app/layout.tsx` (font loading, provider crash, v.v.) mà `error.tsx`
 * thông thường KHÔNG bắt được vì nó nằm bên dưới layout. Phải tự render `<html>` và
 * `<body>` vì component này thay thế hoàn toàn root layout khi active.
 *
 * Không thể import Header/Footer ở đây — chúng giả định layout context (fonts,
 * providers) mà global-error chạy ngoài. Inline minimal UI tự đủ.
 *
 * Tokens vẫn giữ design system: navy `#1a2238`, neutral `#6b7280`, gold tint icon.
 */

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[global] root layout error:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#fafafa',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 520,
            padding: '48px 32px',
            borderRadius: 20,
            border: '1px solid #e5e7eb',
            background: '#fff',
            boxShadow: '0 20px 48px -16px rgba(15, 23, 42, 0.12)',
          }}
        >
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 80,
              height: 80,
              borderRadius: 999,
              background: 'rgba(212, 180, 131, 0.14)',
              color: '#1a2238',
              marginBottom: 22,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 28,
              fontWeight: 700,
              color: '#1a2238',
              letterSpacing: '-0.01em',
            }}
          >
            Hệ thống đang gặp sự cố
          </h1>
          <p
            style={{
              margin: 0,
              marginBottom: 28,
              fontSize: 15,
              lineHeight: 1.6,
              color: '#6b7280',
            }}
          >
            Đã xảy ra lỗi nghiêm trọng. Vui lòng tải lại trang. Nếu sự cố vẫn tiếp diễn, vui lòng
            liên hệ hỗ trợ.
          </p>
          <button
            type="button"
            onClick={unstable_retry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #1a2238',
              background: '#1a2238',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 12a9 9 0 0 1 15.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.36L3 16M3 21v-5h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
