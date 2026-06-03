import Header from '../_components/Header';
import Footer from '../_components/Footer';

/**
 * Route-level loading fallback cho `/tutor-search`.
 *
 * Next.js bật file này khi:
 *  - Cold first-paint (user gõ URL trực tiếp, F5 hard reload)
 *  - Soft nav từ trang khác trong lúc server fetch chưa xong
 *
 * Render full shell (Header + Footer) + spinner trung tâm. Đồng bộ với
 * `tutor-detail/[id]/loading.tsx` (cũng render Header/Footer) và `ErrorPage` —
 * user luôn thấy navigation, không bị "blank screen panic".
 *
 * Trước đây file này dùng skeleton placeholder (animate-pulse). Đổi sang spinner
 * vì skeleton chỉ hợp khi đã biết layout, còn trang search có nhiều variant
 * (multi-select filter, no result...) → spinner đơn giản trung thực hơn.
 */
export default function Loading() {
  return (
    <div className="tutor-search-page">
      <Header />
      <main
        style={{
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '64px 24px',
        }}
      >
        <div
          role="status"
          aria-label="Đang tải"
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '3px solid #e5e7eb',
            borderTopColor: '#1a2238',
            animation: 'tutora-spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: '#6b7280',
            letterSpacing: '0.02em',
          }}
        >
          Đang tải danh sách gia sư...
        </p>
      </main>
      <Footer />
      <style>{`
        @keyframes tutora-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
