'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TutorFullProfile } from '@/services/tutorDetail.types';
import { readStoredUser } from '@/app/_lib/read-auth';
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import AcademicPortfolioSection from './AcademicPortfolioSection';
import ActiveClassesSection from './ActiveClassesSection';
import TestimonialsSection from './TestimonialsSection';
import BookingSidebar from './BookingSidebar';
import BookingModal from './BookingModal';
import { formatCurrency } from './utils';

/**
 * TutorDetailClient — client interactivity for the SEO tutor profile.
 *
 * Mirrors the Vite flow for web:
 *  - chưa login → `/login`
 *  - đã login → mở BookingModal ngay trên Next tutor detail page
 *  - Zalo Mini App vẫn dùng Vite target, không đi qua Next flow này.
 */

interface TutorDetailClientProps {
  profile: TutorFullProfile;
  tutorId: string;
}

export default function TutorDetailClient({ profile, tutorId }: TutorDetailClientProps) {
  const router = useRouter();
  const [showBooking, setShowBooking] = useState(false);
  const activePrices = profile.subjectGradePrices?.filter((item) => item.isActive) ?? [];
  const displayHourlyRate =
    profile.hourlyRate ?? activePrices.sort((a, b) => a.pricePerHour - b.pricePerHour)[0]?.pricePerHour ?? null;

  const handleBooking = useCallback(() => {
    const user = readStoredUser();
    if (!user) {
      // Mirror Vite behavior: chưa login thì đưa sang trang login.
      router.push('/login');
      return;
    }
    setShowBooking(true);
  }, [router]);

  return (
    <>
      <main className="tutor-detail-main" style={{ paddingTop: '24px' }}>
        <div className="tutor-detail-container">
          <div className="tutor-detail-content">
            <HeroSection profile={profile} />
            <AboutSection profile={profile} />

            <div className="portfolio-stats-wrapper">
              <AcademicPortfolioSection certificates={profile.certificates} />
            </div>

            <ActiveClassesSection classes={profile.activeClasses} totalActive={profile.totalActiveClasses} />

            <TestimonialsSection feedbacks={profile.feedbacks} totalFeedbacks={profile.totalFeedbacks} />
          </div>

          <BookingSidebar
            hourlyRate={displayHourlyRate}
            trialLessonPrice={profile.trialLessonPrice}
            availabilities={profile.availabilities}
            onBooking={handleBooking}
          />
        </div>
      </main>

      <div className="mobile-sticky-cta">
        <div className="mobile-cta-price">
          <span className="mobile-cta-price-amount">
            {formatCurrency(displayHourlyRate ? Math.round(displayHourlyRate * 1.05) : null)}
          </span>
          <span className="mobile-cta-price-unit">/ buổi học</span>
        </div>
        <button className="mobile-cta-book" onClick={handleBooking}>
          <b>ĐẶT LỊCH</b>
        </button>
      </div>

      <BookingModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        tutorName={profile.fullName || ''}
        tutorId={tutorId}
        hourlyRate={displayHourlyRate || 0}
        subjects={profile.subjects || []}
        subjectGradePrices={profile.subjectGradePrices || []}
        packages={profile.packages || []}
        availabilities={profile.availabilities}
        tutorTeachingMode={profile.teachingMode}
      />
    </>
  );
}
