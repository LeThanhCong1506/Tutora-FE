/**
 * FeaturesSection — Server Component.
 *
 * Nút "ĐĂNG KÝ DẠY KÈM" ở Vite bản gốc dùng `window.location.href = '/register'`.
 * Ở Next dùng `<Link href="/register">` — SSR-able và tận dụng rewrite sang Vite.
 */

import Link from 'next/link';
import Image from 'next/image';

const BENEFITS = [
  'Tự đặt giá, tự chọn lịch — bạn quyết định dạy bao nhiêu giờ/tuần.',
  'Thanh toán bảo đảm qua Escrow — không lo bị quỵt tiền sau buổi dạy.',
  'Công cụ quản lý sẵn sàng — lịch dạy, báo cáo tự động gửi phụ huynh.',
] as const;

export default function FeaturesSection() {
  return (
    <section className="features-section">
      {/* Left: Cards */}
      <div className="features-cards">
        <div className="feature-column">
          <div className="feature-card-image">
            <Image src="/collaboration-1.png" alt="Tham gia đội ngũ gia sư" width={400} height={300} />
          </div>
          <div className="feature-card green">
            <h3 className="feature-card-title">Tham gia đội ngũ gia sư.</h3>
            <p className="feature-card-description">
              Nền tảng hỗ trợ đầy đủ để bạn tập trung hoàn toàn vào giảng dạy.
            </p>
          </div>
        </div>

        <div className="feature-column offset">
          <div className="feature-card gold">
            <h3 className="feature-card-title">Hiệu quả rõ rệt.</h3>
            <p className="feature-card-description">
              Giúp học sinh tiến bộ thực sự, và phụ huynh sẽ giới thiệu bạn cho người khác.
            </p>
          </div>
          <div className="feature-card-image">
            <Image src="/collaboration-2.png" alt="Hiệu quả rõ rệt" width={400} height={300} />
          </div>
        </div>
      </div>

      {/* Right: Content */}
      <div className="features-content">
        <h2 className="features-title">
          HÀNG TRĂM
          <br />
          PHỤ HUYNH
          <br />
          <span className="title-green">ĐANG TÌM.</span>
          <br />
          HỌ CHỈ THIẾU BẠN.
        </h2>

        <p className="features-description">
          Hàng trăm phụ huynh đang đăng ký tìm gia sư mỗi tháng. Đăng ký ngay để bắt đầu nhận học sinh và có thu nhập ổn
          định theo lịch của bạn.
        </p>

        <ul className="benefits-list">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="benefit-item">
              <span className="benefit-dot">
                <span className="benefit-dot-inner"></span>
              </span>
              <span className="benefit-text">{benefit}</span>
            </li>
          ))}
        </ul>

        <Link href="/register" className="btn-apply">
          ĐĂNG KÝ DẠY KÈM
        </Link>
      </div>
    </section>
  );
}
