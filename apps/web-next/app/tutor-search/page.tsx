import type { Metadata } from 'next';
import Header from '../_components/Header';
import Footer from '../_components/Footer';
import SearchClient from './_components/SearchClient';
import { searchTutorsServer } from '@/services/tutorSearch.server';
import { categoryNameMap } from './_components/constants';
import {
  applyMultiSelectFilters,
  buildApiParams,
  needsMultiSelectFilter,
  parseSearchParams,
} from './_components/filters';
import { mapApiTutorToUi } from './_components/utils';
import type { Tutor } from './_components/types';

/**
 * /tutor-search — Server Component (Phase 3 SSR migration).
 *
 * Trang public, cần SEO. Strategy:
 *  1. Read URL `searchParams` (Promise trong Next 16) → parse thành SearchFilters.
 *  2. Server fetch page 1 qua `searchTutorsServer` (revalidate: 120s).
 *  3. Multi-select filter (categories.length > 1) → mirror Vite logic, filter sau fetch.
 *  4. Generate dynamic `<title>` theo filter (e.g., "Gia sư Toán Lớp 10").
 *  5. Render Header/Footer + Client `SearchClient` nhận initial data + URL drives state.
 *
 * `searchParams` opt vào dynamic rendering (Request-time API) — đúng với mục tiêu
 * SEO theo từng filter combination.
 */

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Note: `searchParams` opt vào dynamic rendering — không thể static cache page level.
// Caching xảy ra ở fetch level (xem `searchTutorsServer`, `next.revalidate: 120`).
//
// Title: KHÔNG add suffix "| TUTORA" cho `title` field — `app/layout.tsx` đã set
// `title.template: '%s | TUTORA'` sẽ tự wrap. Add ở đây sẽ thành "X | TUTORA | TUTORA".
// OG/Twitter title CẦN suffix manual vì template không apply cho 2 field này.

const SITE_BASE = 'TUTORA';

function buildTitle(filters: ReturnType<typeof parseSearchParams>): string {
  const parts: string[] = ['Tìm gia sư'];

  // Single category → human-readable Vietnamese name
  if (filters.categories.length === 1) {
    const cat = categoryNameMap[filters.categories[0]];
    if (cat) parts[0] = `Gia sư ${cat}`;
  } else if (filters.searchTerm.trim()) {
    parts[0] = `Gia sư "${filters.searchTerm.trim()}"`;
  }

  // Single grade level → e.g. "Lớp 10"
  if (filters.gradeLevels.length === 1) {
    const m = filters.gradeLevels[0].match(/^Grade_(\d+)$/i);
    if (m) parts.push(`Lớp ${m[1]}`);
  }

  if (filters.city) {
    const cityMap: Record<string, string> = {
      hochiminh: 'TP. Hồ Chí Minh',
      hanoi: 'Hà Nội',
      danang: 'Đà Nẵng',
      cantho: 'Cần Thơ',
      haiphong: 'Hải Phòng',
      binhduong: 'Bình Dương',
      dongnai: 'Đồng Nai',
    };
    const city = cityMap[filters.city];
    if (city) parts.push(`tại ${city}`);
  }

  return parts.join(' ');
}

function buildDescription(
  filters: ReturnType<typeof parseSearchParams>,
  totalCount: number
): string {
  const subject =
    filters.categories.length === 1
      ? categoryNameMap[filters.categories[0]] || 'mọi môn'
      : 'mọi môn học';
  const total = totalCount > 0 ? `${totalCount}+ ` : '';
  return `${total}gia sư ${subject} đã được xác minh hồ sơ. Đặt lịch học online, nhận báo cáo tiến độ tự động sau mỗi buổi. Đảm bảo bằng cơ chế giữ tiền trung gian.`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const raw = await searchParams;
  const filters = parseSearchParams(raw);
  const title = buildTitle(filters);
  const description = buildDescription(filters, 0);

  // Build canonical without `page` param (page 1 = canonical for all paginations)
  const canonicalParams = new URLSearchParams();
  if (filters.categories.length > 0) canonicalParams.set('categories', filters.categories.join(','));
  if (filters.gradeLevels.length > 0)
    canonicalParams.set('gradeLevels', filters.gradeLevels.join(','));
  if (filters.budgetRange !== 'all') canonicalParams.set('budgetRange', filters.budgetRange);
  if (filters.teachingMode) canonicalParams.set('teachingMode', filters.teachingMode);
  if (filters.city) canonicalParams.set('city', filters.city);
  if (filters.searchTerm) canonicalParams.set('searchTerm', filters.searchTerm);
  const canonical = `/tutor-search${canonicalParams.toString() ? `?${canonicalParams}` : ''}`;

  // OG/Twitter title: include suffix vì layout template chỉ apply cho `title` field
  // (Next docs: openGraph.title, twitter.title không inherit template).
  const fullTitle = `${title} | ${SITE_BASE}`;

  return {
    title, // layout template '%s | TUTORA' tự wrap → "Title | TUTORA"
    description,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}

export default async function TutorSearchPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseSearchParams(raw);

  const apiParams = buildApiParams(filters);

  let initialTutors: Tutor[] = [];
  let initialTotalCount = 0;
  let initialHasNext = false;
  let initialError: string | null = null;

  try {
    const response = await searchTutorsServer(apiParams);
    initialTutors = response.content.items.map(mapApiTutorToUi);
    initialTotalCount = response.content.totalCount;
    initialHasNext = response.content.hasNext;

    if (needsMultiSelectFilter(filters)) {
      initialTutors = applyMultiSelectFilters(initialTutors, filters);
      initialTotalCount = initialTutors.length;
      initialHasNext = false; // multi-select chỉ load 1 page
    }
  } catch (err) {
    // Backend unreachable / 5xx / parse error → don't crash the route. Render the
    // same shell (Header/Filter/Footer) and let SearchClient show an error card so
    // user can retry without seeing Vercel's generic 500 page.
    //
    // `error.tsx` ở cùng segment vẫn là backup nếu có throw khác (vd. trong
    // parseSearchParams, generateMetadata) — catch ở đây xử lý case phổ biến nhất.
    console.error('[tutor-search] initial server fetch failed:', err);
    initialError = 'Hệ thống đang tạm thời không phản hồi. Vui lòng thử lại sau ít phút.';
  }

  return (
    <div className="tutor-search-page">
      <Header />
      <main>
        <SearchClient
          initialTutors={initialTutors}
          initialTotalCount={initialTotalCount}
          initialHasNext={initialHasNext}
          initialPage={filters.pageNumber}
          initialError={initialError}
        />
      </main>
      <Footer />
    </div>
  );
}
