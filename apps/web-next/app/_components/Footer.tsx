/**
 * Footer — Server Component.
 *
 * Port 1:1 từ `src/components/Footer/Footer.tsx` (pure static, không state).
 * Các link hiện tại đều là `<a href="#">` placeholder; giữ nguyên để pixel-parity
 * với Vite. Khi nào backend có route thực, đổi sang `<Link>`.
 */

import Image from 'next/image';

const footerLinks = {
  academic: ['Tìm gia sư', 'Đăng ký dạy kèm', 'Cách hoạt động', 'Môn học hỗ trợ'],
  platform: ['Theo dõi học tập', 'Báo cáo tiến độ', 'Lộ trình cá nhân', 'Hỗ trợ phụ huynh'],
  resources: ['Về chúng tôi', 'Trở thành Gia sư', 'Liên hệ hỗ trợ', 'Câu hỏi thường gặp'],
} as const;

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          {/* Brand Column */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Image src="/tutora-logo.png" alt="Tutora" width={38} height={38} />
              </div>
              <span className="footer-logo-text">TUTORA.</span>
            </div>
            <p className="footer-tagline">
              &ldquo;Kết nối phụ huynh với gia sư uy tín. Minh bạch — Bảo đảm — Tiện lợi.&rdquo;
            </p>
          </div>

          {/* Links Columns */}
          <div className="footer-links-column">
            <h4 className="footer-links-title">HỌC THUẬT</h4>
            <ul className="footer-links">
              {footerLinks.academic.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-links-title">NỀN TẢNG</h4>
            <ul className="footer-links">
              {footerLinks.platform.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-links-title">TÀI NGUYÊN</h4>
            <ul className="footer-links">
              {footerLinks.resources.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <span className="copyright">© 2026 Tutora. All Rights Reserved.</span>
          <div className="footer-legal">
            <a href="#">Chính sách bảo mật</a>
            <a href="#">Điều khoản sử dụng</a>
            <a href="#">Quy chế hoạt động</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
