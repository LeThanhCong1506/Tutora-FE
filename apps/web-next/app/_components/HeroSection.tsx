/**
 * HeroSection — Server Component.
 *
 * CTA buttons dùng `<Link>` thay vì `onClick={navigate(...)}` để SSR ra href thật
 * (Google crawler thấy link, không cần JS). `/register` được rewrite sang Vite
 * qua `next.config.ts`.
 *
 * Bỏ nhánh `isZaloMiniApp()` trong Vite original — Next app chỉ chạy web.
 */

import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Left Content */}
        <div className="hero-left">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            <span className="badge-text">
              Gia sư được xác minh hồ sơ &amp; đánh giá sau mỗi buổi học
            </span>
          </div>

          <h1 className="hero-title">
            <span className="title-line">Tìm gia sư</span>
            <span className="title-line">
              <em className="title-accent">phù hợp.</em>
            </span>
            <span className="title-line">Theo dõi tiến bộ</span>
            <span className="title-line">từng buổi.</span>
          </h1>

          <p className="hero-description">
            Tutora giúp phụ huynh tìm gia sư đã được xác minh, đặt lịch học online, và nhận báo cáo tiến độ sau mỗi buổi
            — tất cả trên một nền tảng duy nhất.
          </p>

          <div className="hero-buttons">
            <Link href="/tutor-search" className="btn-primary">
              TÌM GIA SƯ
            </Link>
            <Link href="/register" className="btn-secondary">
              ĐĂNG KÝ DẠY KÈM
            </Link>
          </div>
        </div>

        {/* Right Content */}
        <div className="hero-right">
          <div className="hero-image-wrapper">
            <Image
              src="/students-studying.png"
              alt="Students studying together"
              className="hero-image"
              width={600}
              height={500}
              priority
            />
            <div className="hero-image-gradient"></div>
            <div className="hero-lms-badge">
              <span className="lms-title">TUTORA — Theo dõi học tập.</span>
              <span className="lms-subtitle">Báo cáo tiến độ tự động sau mỗi buổi học.</span>
            </div>
          </div>

          {/* Rating Badge */}
          <div className="rating-badge">
            <span className="rating-number">4.9/5</span>
            <span className="rating-label">Đánh giá trung bình</span>
          </div>
        </div>
      </div>
    </section>
  );
}
