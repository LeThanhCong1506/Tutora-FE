'use client';

import type { Tutor } from './types';
import TutorCard from './TutorCard';

interface ResultsSectionProps {
  tutors: Tutor[];
  loading: boolean;
  error: string | null;
  /**
   * `fatal`  → toàn section là error card (BE down, không có data nào)
   * `inline` → giữ danh sách hiện có + show banner ở dưới (vd. load-more failed)
   */
  errorVariant?: 'fatal' | 'inline';
  totalCount: number;
  hasNext: boolean;
  onLoadMore: () => void;
  onRetry?: () => void;
}

export default function ResultsSection({
  tutors,
  loading,
  error,
  errorVariant = 'fatal',
  totalCount,
  hasNext,
  onLoadMore,
  onRetry,
}: ResultsSectionProps) {
  const rows: Tutor[][] = [];
  for (let i = 0; i < tutors.length; i += 3) {
    rows.push(tutors.slice(i, i + 3));
  }

  if (loading && tutors.length === 0) {
    return (
      <section className="results-section">
        <div className="results-header">
          <div className="results-header-left">
            <span className="results-label">TUTORA Selection</span>
            <h2 className="results-title">Đang tải...</h2>
          </div>
        </div>
      </section>
    );
  }

  if (error && errorVariant === 'fatal') {
    return (
      <section className="results-section">
        <div className="results-header">
          <div className="results-header-left">
            <span className="results-label">TUTORA Selection</span>
            <h2 className="results-title">Danh sách gia sư</h2>
          </div>
        </div>
        <ErrorCard message={error} onRetry={onRetry} />
      </section>
    );
  }

  return (
    <section className="results-section">
      <div className="results-header">
        <div className="results-header-left">
          <span className="results-label">TUTORA Selection</span>
          <h2 className="results-title">Danh sách gia sư</h2>
        </div>
        <span className="results-count">{totalCount} Kết quả tìm thấy</span>
      </div>
      <div className="tutor-grid">
        {rows.map((row, rowIndex) => (
          <div className="tutor-row" key={rowIndex}>
            {row.map((tutor, index) => (
              <TutorCard key={`${tutor.id}-${index}`} tutor={tutor} />
            ))}
          </div>
        ))}
      </div>
      {tutors.length === 0 && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: '16px' }}>Không tìm thấy gia sư phù hợp. Hãy thử thay đổi bộ lọc.</p>
        </div>
      )}
      {error && errorVariant === 'inline' && (
        <InlineErrorBanner message={error} onRetry={onRetry} />
      )}
      {hasNext && !error && (
        <div className="load-more-container">
          <button className="btn-load-more" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Đang tải...' : 'Khám phá thêm'}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Full-section error card — dùng khi server-side fetch fail và không có data nào
 * để hiển thị. Đồng bộ với design tokens: navy `#1a2238`, gold `#d4b483`, neutral
 * border `#e5e7eb`, font Bricolage Grotesque (title) + IBM Plex Sans (body).
 */
function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '56px 24px',
        margin: '24px 0',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 72,
          height: 72,
          borderRadius: 999,
          background: 'rgba(212, 180, 131, 0.12)',
          color: '#1a2238',
          marginBottom: 20,
        }}
      >
        <WarningIcon />
      </div>
      <h3
        style={{
          margin: 0,
          marginBottom: 10,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#1a2238',
          letterSpacing: '-0.01em',
        }}
      >
        Đang gặp sự cố tải dữ liệu
      </h3>
      <p
        style={{
          margin: 0,
          marginBottom: 24,
          maxWidth: 460,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15,
          lineHeight: 1.55,
          color: '#6b7280',
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            borderRadius: 999,
            border: '1px solid #1a2238',
            background: '#1a2238',
            color: '#fff',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 8px 18px rgba(26, 34, 56, 0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <RetryIcon />
          Thử lại
        </button>
      )}
    </div>
  );
}

/**
 * Compact inline banner — dùng khi đã có data hiển thị nhưng load-more failed.
 * Không thay thế danh sách, chỉ báo ở dưới + cho retry.
 */
function InlineErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        margin: '24px 0',
        padding: '14px 18px',
        borderRadius: 12,
        border: '1px solid #fecaca',
        background: '#fef2f2',
        color: '#991b1b',
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 13.5,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid #991b1b',
            background: 'transparent',
            color: '#991b1b',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
