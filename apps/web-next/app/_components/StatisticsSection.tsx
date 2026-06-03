/**
 * StatisticsSection — Server Component.
 * Inline SVG icons; pure static content.
 */

type Stat = {
  value: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
};

const STATS: Stat[] = [
  {
    value: '01',
    label: 'Xác minh hồ sơ',
    sublabel: 'CMND, bằng cấp & phỏng vấn trước khi dạy',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
    ),
  },
  {
    value: '02',
    label: 'Giữ tiền an toàn',
    sublabel: 'Tiền chỉ chuyển sau khi buổi học hoàn tất',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0110 0v4"></path>
      </svg>
    ),
  },
  {
    value: '03',
    label: 'Báo cáo tự động',
    sublabel: 'Phụ huynh nhận báo cáo ngay sau buổi học',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
  },
  {
    value: '04',
    label: 'Đổi gia sư dễ dàng',
    sublabel: 'Không hài lòng? Đổi mà không mất lịch sử học',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 1l4 4-4 4"></path>
        <path d="M3 11V9a4 4 0 014-4h14"></path>
        <path d="M7 23l-4-4 4-4"></path>
        <path d="M21 13v2a4 4 0 01-4 4H3"></path>
      </svg>
    ),
  },
];

export default function StatisticsSection() {
  return (
    <section className="statistics-section">
      <div className="statistics-glow-bg"></div>
      <div className="statistics-container">
        {/* Left Content */}
        <div className="statistics-left">
          <div className="security-badge">
            <span className="security-icon">🛡️</span>
            <span>An tâm tuyệt đối</span>
          </div>
          <h2 className="statistics-title">
            TUTORA BẢO VỆ
            <br />
            CẢ PHỤ HUYNH <span className="title-gold">LẪN GIA SƯ.</span>
          </h2>
          <p className="statistics-description">
            &ldquo;Cơ chế giữ tiền trung gian, xác minh gia sư, và báo cáo buổi học tự động — được thiết kế để bảo vệ
            quyền lợi của bạn từ ngày đầu.&rdquo;
          </p>
        </div>

        {/* Right Content - Stats Grid */}
        <div className="statistics-grid">
          {STATS.map((stat) => (
            <div key={stat.value} className="stat-card">
              <span className="stat-value">{stat.value}</span>
              <div className="stat-icon-wrapper">{stat.icon}</div>
              <div className="stat-content">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-sublabel">{stat.sublabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
