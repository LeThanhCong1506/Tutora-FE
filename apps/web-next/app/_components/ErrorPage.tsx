'use client';

import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';

/**
 * Shared full-page error UI — dùng bởi mọi `error.tsx` trong app.
 *
 * Thiết kế:
 *  - Header + Footer giữ navigation, user không bị kẹt trong dead-end.
 *  - Card trung tâm với icon cảnh báo, title, description, 2 CTA (Thử lại / Về trang chủ).
 *  - Tokens đồng bộ với `not-found.tsx` + Header/Footer: navy `#1a2238`,
 *    gold-tint `rgba(212,180,131,0.14)` cho icon background, neutral border `#e5e7eb`,
 *    font Bricolage Grotesque (title) + IBM Plex Sans (body).
 *
 * Lưu ý Next.js 16: route-segment error.tsx nhận `unstable_retry` (đổi tên từ
 * `reset` ở Next 13-15). Wrapper component này nhận `onRetry` chung để caller
 * mỗi nơi tự bind đúng prop.
 */

interface ErrorPageProps {
  /** Default: "Đã có sự cố xảy ra" */
  title?: string;
  /** Default: generic backend-down message */
  description?: string;
  /** Bắt buộc nếu muốn hiện nút "Thử lại" — caller bind `unstable_retry()` */
  onRetry?: () => void;
  /** Mặc định true. Set false nếu trang muốn ẩn nút "Về trang chủ" */
  showHomeLink?: boolean;
  /** Default href cho "Về trang chủ"; có thể đổi thành "/tutor-search" cho tutor-detail */
  homeHref?: string;
  /** Default "Về trang chủ" */
  homeLabel?: string;
}

export default function ErrorPage({
  title = 'Đã có sự cố xảy ra',
  description = 'Trang tạm thời không tải được. Vui lòng thử lại sau ít phút, hoặc quay lại trang chủ để tiếp tục.',
  onRetry,
  showHomeLink = true,
  homeHref = '/',
  homeLabel = 'Về trang chủ',
}: ErrorPageProps) {
  return (
    <div className="error-page">
      <Header />
      <main
        style={{
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
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
            <WarningIcon size={36} />
          </div>
          <h1
            style={{
              margin: 0,
              marginBottom: 12,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#1a2238',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              marginBottom: 28,
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 15,
              lineHeight: 1.6,
              color: '#6b7280',
            }}
          >
            {description}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #1a2238',
                  background: '#1a2238',
                  color: '#fff',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RetryIcon />
                Thử lại
              </button>
            )}
            {showHomeLink && (
              <Link
                href={homeHref}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #1a2238',
                  background: '#fff',
                  color: '#1a2238',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {homeLabel}
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function WarningIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12a9 9 0 0 1 15.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.36L3 16M3 21v-5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
