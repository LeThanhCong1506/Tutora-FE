import type { MetadataRoute } from 'next';
import { searchTutorsServer } from '@/services/tutorSearch.server';
import { env } from '@/lib/env';

/**
 * Generated /sitemap.xml.
 *
 * Strategy: enumerate tutor IDs qua search endpoint paginate (Vite không expose
 * dedicated "list all tutor IDs" endpoint). Page size 100 — đủ rộng để giảm số
 * round-trip; backend giới hạn tự động nếu pageSize lớn quá.
 *
 * Cache: Next tự cache sitemap (staleness do `searchTutorsServer.revalidate: 120s`).
 * Nếu backend lỗi, route phải fail để Google retry thay vì cache sitemap thiếu URL.
 *
 * SEO:
 *  - `/`, `/tutor-search` → priority cao (entry points)
 *  - `/tutor-detail/{id}` → priority thấp hơn nhưng nhiều URLs (long-tail)
 *
 * Trang portal/auth: KHÔNG đưa vào sitemap (đã `Disallow` trong robots.ts).
 */

const SITE = env.SITE_URL;
const MAX_PAGES = 50; // safety cap: 50 × 100 = 5000 tutors max

// Avoid build-time prerender with a partial/empty tutor list when the backend is unavailable.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE}/tutor-search`,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  const tutorEntries: MetadataRoute.Sitemap = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const res = await searchTutorsServer({ pageNumber: page, pageSize: 100 });
    const items = res.content.items || [];
    for (const tutor of items) {
      if (!tutor.tutorId) continue;
      tutorEntries.push({
        url: `${SITE}/tutor-detail/${tutor.tutorId}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    if (!res.content.hasNext) break;
    page++;
  }

  return [...staticEntries, ...tutorEntries];
}
