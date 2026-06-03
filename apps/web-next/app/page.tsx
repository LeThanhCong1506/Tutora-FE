import type { Metadata } from 'next';
import Header from './_components/Header';
import Footer from './_components/Footer';
import TrustedBanner from './_components/TrustedBanner';
import HeroSection from './_components/HeroSection';
import StatisticsSection from './_components/StatisticsSection';
import FeaturesSection from './_components/FeaturesSection';
import TestimonialsSection from './_components/TestimonialsSection';

/**
 * Home page — Server Component.
 *
 * Port từ `src/pages/Home/HomePage.tsx` (Vite). Các khác biệt chính:
 *  - Render SSR thay vì CSR → Google crawler thấy nội dung ngay
 *  - `!inMiniApp` gating bị loại bỏ (Next = web only, Zalo chỉ chạy trên Vite)
 *  - CTA buttons dùng `<Link>` → có href thật cho crawler
 *  - Accordion FAQ tách thành client island (`FaqSection`)
 *  - Header là client (auth state + mobile menu) nhưng prerender vẫn ra markup
 *    "chưa login" để tránh hydration mismatch
 */

export const metadata: Metadata = {
  title: 'TUTORA — Nền tảng kết nối gia sư chất lượng cho K-12',
  description:
    'TUTORA — nền tảng kết nối phụ huynh, học sinh với gia sư chất lượng. Tìm gia sư theo môn, cấp học, khu vực; đặt lịch và thanh toán an toàn qua cơ chế giữ tiền trung gian.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'TUTORA — Nền tảng kết nối gia sư',
    description: 'Tìm gia sư đã được xác minh, đặt lịch học online, nhận báo cáo tiến độ tự động sau mỗi buổi.',
    url: '/',
    images: [
      {
        url: '/collaboration-1.png',
        width: 1200,
        height: 630,
        alt: 'TUTORA — Nền tảng kết nối gia sư',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TUTORA — Nền tảng kết nối gia sư',
    description: 'Tìm gia sư đã được xác minh, đặt lịch học online, nhận báo cáo tiến độ tự động.',
    images: ['/collaboration-1.png'],
  },
};

export default function HomePage() {
  return (
    <div className="homepage">
      <Header />
      <main className="main-content">
        <TrustedBanner />
        <HeroSection />
        <StatisticsSection />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
