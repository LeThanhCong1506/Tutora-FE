import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/**
 * Generated `/robots.txt` cho TUTORA.
 *
 * - Allow `/` (Home, Tutor Search, Tutor Detail) — public, cần index.
 * - Disallow portal/auth/payment routes — không có giá trị SEO, lộ structure
 *   không cần thiết.
 * - Sitemap URL absolute từ `env.SITE_URL` (tự switch dev/prod).
 *
 * Phase 4 sẽ thêm `app/sitemap.ts` để URL sitemap dưới đây resolve được; tạm
 * thời Googlebot chỉ retry sau, không break crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin-portal/',
        '/tutor-portal/',
        '/parent-portal/',
        '/student-portal/',
        '/login',
        '/register',
        '/reset-password',
        '/payment/',
        '/api/',
        '/zapps/',
      ],
    },
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  };
}
