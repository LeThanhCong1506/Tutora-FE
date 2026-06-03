import type { Metadata } from 'next';
import RootProviders from './providers';
import './globals.css';
import { env } from '@/lib/env';

/* eslint-disable @next/next/no-page-custom-font */

/**
 * Root layout — Server Component.
 *
 * Font loading: dùng raw `<link>` đến Google Fonts thay vì `next/font/google`.
 * Lý do: next/font subset chữ "vietnamese" thiếu một số glyph kết hợp dấu (ề, ồ, ấ...)
 * → render lỗi như "vê`", "đô`ng", "nhâ´t". Vite load full font qua <link> nên không lỗi.
 * Match Vite hoàn toàn cho consistent rendering.
 */

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: 'TUTORA — Nền tảng kết nối gia sư',
    template: '%s | TUTORA',
  },
  description:
    'TUTORA — nền tảng kết nối phụ huynh, học sinh với gia sư chất lượng. Tìm gia sư theo môn, cấp học, khu vực; đặt lịch và thanh toán an toàn.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'TUTORA',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* suppressHydrationWarning ở <body> để bỏ qua attribute do browser extension
          (Grammarly, Backpack, LastPass...) inject sau SSR. Chỉ suppress 1 cấp; React
          vẫn cảnh báo bình thường nếu component bên trong gây hydration mismatch. */}
      <body suppressHydrationWarning>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
