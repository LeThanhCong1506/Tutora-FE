import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '../../_components/Header';
import Footer from '../../_components/Footer';
import TutorDetailClient from './_components/TutorDetailClient';
import TutorDetailSkeleton from './_components/TutorDetailSkeleton';
import { getTutorFullProfileServer, TutorNotFoundError } from '@/services/tutorDetail.server';
import { env } from '@/lib/env';
import { formatCity } from './_components/utils';

/**
 * Cached fetch wrapper — đảm bảo `generateMetadata` và `TutorDetailPage` chia sẻ
 * cùng 1 promise của fetch tutor. Next dedupe fetch() tự động theo URL nhưng
 * `cache()` của React đảm bảo dedupe ở cấp cao hơn (cùng promise reference),
 * giúp metadata resolve cùng lúc với page render → metadata vào được initial
 * `<head>` thay vì stream sang body (Lighthouse SEO audit fail nếu thiếu).
 */
const getTutorCached = cache(getTutorFullProfileServer);

/**
 * /tutor-detail/[id] — Server Component (Phase 4 SEO chủ lực).
 *
 * Strategy:
 *  1. Server fetch tutor profile (revalidate 300s).
 *  2. 404 → notFound() → render `app/not-found.tsx`.
 *  3. generateMetadata: dynamic title, description, OG image (avatar), canonical.
 *  4. JSON-LD `Person` schema → Google Rich Results (star rating + review count
 *     trong search snippet).
 *  5. Render Header + <Suspense fallback={skeleton}> + Footer.
 *
 * Suspense streaming refactor (giải pháp #3):
 *  - Header/Footer render NGAY LẬP TỨC → user có "neo" trực quan, không cảm giác
 *    mất context khi chuyển từ /tutor-search.
 *  - Phần content (TutorDetailServerContent) được wrap trong <Suspense>. Trong lúc
 *    getTutorCached pending, skeleton hiện ra thay vì block toàn bộ route.
 *  - generateMetadata vẫn chạy song song phía server (React cache() dedupe) — KHÔNG
 *    bị Suspense ảnh hưởng vì metadata resolve TRƯỚC khi <head> flush.
 *  - loading.tsx vẫn giữ làm full-shell fallback cho cold first-paint (user gõ URL
 *    trực tiếp, không có prefetch cache).
 *
 * Caching: page-level revalidate KHÔNG cần (searchParams = path params, Next handle
 * naturally). `searchTutorsServer` đã có `revalidate: 300` ở fetch level.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const response = await getTutorCached(id);
    const profile = response.content;

    const subjects =
      profile.subjects
        ?.map((s) => s.subjectName)
        .filter(Boolean)
        .join(', ') || 'mọi môn';
    const city = formatCity(profile.teachingAreaCity);
    const fullName = profile.fullName || 'Gia sư';
    const headline = profile.headline || 'Gia sư đã được xác minh hồ sơ';

    // `title` field cho metadata: KHÔNG add suffix "| TUTORA" — layout.tsx đã set
    // `title.template: '%s | TUTORA'` sẽ tự wrap. Add ở đây sẽ thành "X | TUTORA | TUTORA".
    // OG/Twitter title CẦN suffix manual vì template không apply cho 2 field này.
    //
    // Truncate headline để title (sau khi layout wrap "| TUTORA") ≤ ~60 chars — quá dài
    // Google sẽ cắt giữa từ trong SERP. fullName ưu tiên giữ trọn.
    const TITLE_BUDGET = 50; // ~60 - " | TUTORA".length (9)
    const reserved = fullName.length + 3; // "Name — "
    const headlineMax = Math.max(20, TITLE_BUDGET - reserved);
    const headlineTrimmed =
      headline.length > headlineMax ? headline.slice(0, headlineMax - 1).trimEnd() + '…' : headline;
    const title = `${fullName} — ${headlineTrimmed}`;
    const fullTitle = `${title} | TUTORA`;
    const description = (() => {
      const bio = profile.bio?.trim();
      if (bio && bio.length > 50) {
        return bio.length > 160 ? bio.slice(0, 157) + '...' : bio;
      }
      return `Gia sư ${fullName} — ${subjects} tại ${city}. Đã được xác minh hồ sơ, đặt lịch học online, nhận báo cáo tiến độ tự động sau mỗi buổi.`;
    })();

    const canonical = `/tutor-detail/${id}`;
    const ogImage = profile.avatarUrl || `${env.SITE_URL}/tutora-logo.png`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: fullTitle,
        description,
        url: canonical,
        type: 'profile',
        images: [{ url: ogImage, width: 800, height: 800, alt: fullName }],
      },
      twitter: {
        card: 'summary_large_image',
        title: fullTitle,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    if (!(error instanceof TutorNotFoundError)) {
      throw error;
    }

    return {
      title: 'Gia sư không tồn tại',
      description: 'Không tìm thấy thông tin gia sư.',
      robots: { index: false, follow: false },
    };
  }
}

/**
 * Build JSON-LD Person schema for Google Rich Results.
 * Schema: https://schema.org/Person
 * Helps Google show: name, image, rating stars, review count in SERP.
 */
function buildPersonSchema(
  profile: Awaited<ReturnType<typeof getTutorFullProfileServer>>['content'],
  id: string
) {
  const subjects =
    profile.subjects
      ?.map((s) => s.subjectName)
      .filter((s): s is string => !!s) || [];

  // schema.org expects strings — VN local format OK.
  const baseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.fullName,
    image: profile.avatarUrl || undefined,
    description: profile.bio || profile.headline || undefined,
    jobTitle: 'Gia sư',
    url: `${env.SITE_URL}/tutor-detail/${id}`,
    knowsAbout: subjects.length > 0 ? subjects : undefined,
  };

  if (profile.education) {
    baseSchema.alumniOf = {
      '@type': 'EducationalOrganization',
      name: profile.education,
    };
  }

  if (profile.teachingAreaCity) {
    baseSchema.address = {
      '@type': 'PostalAddress',
      addressLocality: formatCity(profile.teachingAreaCity),
      addressCountry: 'VN',
    };
  }

  if (profile.totalFeedbacks > 0 && profile.averageRating > 0) {
    baseSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: profile.averageRating.toFixed(1),
      reviewCount: profile.totalFeedbacks,
      bestRating: '5',
      worstRating: '1',
    };
  }

  if (profile.hourlyRate) {
    baseSchema.offers = {
      '@type': 'Offer',
      price: Math.round(profile.hourlyRate * 1.05),
      priceCurrency: 'VND',
      availability: 'https://schema.org/InStock',
      itemOffered: {
        '@type': 'Service',
        name: 'Dạy kèm 1-1',
      },
    };
  }

  // Strip undefined fields for clean JSON
  return JSON.parse(JSON.stringify(baseSchema));
}

/**
 * Async Server Component — phần data-dependent, chạy bên trong <Suspense>.
 *
 * Khi promise getTutorCached pending → React stream fallback (TutorDetailSkeleton).
 * Khi resolve → React swap skeleton bằng nội dung thật, client hydrate.
 *
 * 404 handling: notFound() gọi từ đây vẫn hoạt động bình thường trong Suspense —
 * React server sẽ abort stream và redirect tới app/not-found.tsx.
 */
async function TutorDetailServerContent({ id }: { id: string }) {
  let profile;
  try {
    const response = await getTutorCached(id);
    profile = response.content;
  } catch (error) {
    if (error instanceof TutorNotFoundError) {
      notFound();
    }
    throw error; // Other errors → Next error.tsx (or default error UI)
  }

  const personSchema = buildPersonSchema(profile, id);

  return (
    <>
      <TutorDetailClient profile={profile} tutorId={id} />

      {/* JSON-LD Person schema — Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </>
  );
}

export default async function TutorDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="tutor-detail-page">
      <Header />

      {/*
        Spacer-only wrapper — Header là position:fixed/sticky nên hero sẽ bị
        che nếu không có element này push content xuống. Trước đây chứa
        breadcrumb (Trang chủ › Tìm kiếm Gia sư › Hồ sơ {Tên}); user yêu cầu
        bỏ nội dung breadcrumb nhưng phải GIỮ wrapper để bảo toàn padding-top.
      */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          paddingTop: 'var(--header-height, 80px)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
            padding: '0 35px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/*
        Suspense streaming: Header + spacer + Footer render NGAY LẬP TỨC.
        Chỉ phần content (fetch data → TutorDetailClient) được stream sau.
        Skeleton hiện thay vì block toàn bộ route.

        generateMetadata chạy song song phía server bằng React cache() dedupe,
        KHÔNG bị Suspense ảnh hưởng — metadata vào <head> initial flush.
      */}
      <Suspense fallback={<TutorDetailSkeleton />}>
        <TutorDetailServerContent id={id} />
      </Suspense>

      <Footer />
    </div>
  );
}
