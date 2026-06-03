import Header from '../../_components/Header';
import Footer from '../../_components/Footer';
import TutorDetailSkeleton from './_components/TutorDetailSkeleton';

/**
 * Route-level loading fallback — shown by Next.js while the entire route
 * (page.tsx) is being prepared on the server.
 *
 * With the Suspense streaming refactor in page.tsx, this loading.tsx is now
 * only triggered on **cold first-paint** (user types URL directly, or
 * browser back/forward without prefetch cache). In most navigation cases
 * (clicking from /tutor-search), PrefetchLink warms the cache and page.tsx's
 * Suspense boundary handles the fallback instead — showing Header/Footer
 * immediately with only the content skeleton.
 *
 * This file renders the FULL shell (Header + Skeleton + Footer) for the
 * cold-start case so the user still gets a meaningful placeholder.
 */
export default function Loading() {
  return (
    <div className="tutor-detail-page">
      <Header />

      {/* Spacer wrapper — matches page.tsx exactly to prevent layout shift */}
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

      <TutorDetailSkeleton />

      <Footer />
    </div>
  );
}
