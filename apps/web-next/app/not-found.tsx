import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

/**
 * Custom 404 page.
 * Render khi:
 *  - User truy cập URL không có route (e.g., /random-path)
 *  - Server Component gọi `notFound()` (e.g., tutor-detail với id không tồn tại)
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: '#fff',
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            margin: 0,
            color: '#1a2238',
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: '16px 0 8px', color: '#1a2238' }}>
          Không tìm thấy trang
        </h2>
        <p style={{ color: '#6b7280', fontSize: 16, margin: '0 0 32px' }}>
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              background: '#1a2238',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Về trang chủ
          </Link>
          <Link
            href="/tutor-search"
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#1a2238',
              border: '1px solid #1a2238',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Tìm gia sư
          </Link>
        </div>
      </div>
    </div>
  );
}
