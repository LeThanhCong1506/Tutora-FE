import Header from './_components/Header';
import Footer from './_components/Footer';

/**
 * Root-level loading fallback — shown trong khi route bất kỳ chưa có
 * `loading.tsx` riêng đang chuẩn bị render. Trang chủ (`/`) static nên file này
 * hiếm khi trigger, nhưng giữ làm fallback an toàn cho mọi route segment
 * không khai báo loading.
 *
 * Đồng bộ với `tutor-search/loading.tsx`: full shell (Header + Footer) + spinner
 * trung tâm, dùng cùng keyframe `tutora-spin`.
 */
export default function Loading() {
  return (
    <div className="homepage">
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
          Đang tải...
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
