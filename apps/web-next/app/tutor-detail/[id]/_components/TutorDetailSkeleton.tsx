/**
 * TutorDetailSkeleton — skeleton placeholder khớp pixel-perfect với layout thật
 * của TutorDetailClient (HeroSection + AboutSection + Portfolio + Classes + Testimonials
 * + BookingSidebar).
 *
 * Dùng ở 2 chỗ:
 *  - `loading.tsx` (route-level fallback): kèm Header + Footer + spacer
 *  - `page.tsx` Suspense fallback: KHÔNG kèm Header/Footer (chúng đã render rồi)
 *
 * Tách thành component riêng để tránh duplicate code giữa 2 nơi.
 *
 * Placeholders: Tailwind `animate-pulse` + `bg-stone-200/300` trên nền cream.
 * Trong hero overlay (nền tối): `bg-white/20–25` cho shimmer sáng trên tối.
 */
export default function TutorDetailSkeleton() {
  return (
    <main
      className="tutor-detail-main"
      style={{ paddingTop: '24px' }}
    >
      <div className="tutor-detail-container">
        {/* ===== LEFT: tutor-detail-content (824px) ===== */}
        <div className="tutor-detail-content">
          {/* ----- HERO ----- */}
          <section className="tutor-hero-section">
            <div className="component-2">
              {/* Video thumbnail placeholder (height: 351.4px theo CSS thật) */}
              <div
                className="interview-thumbnail animate-pulse"
                style={{
                  width: '100%',
                  height: '351.4px',
                  display: 'block',
                  backgroundColor: '#d6d3d1', // stone-300
                }}
              />
              {/* Giữ overlay thật để placeholder bên dưới đọc ra trên nền tối */}
              <div className="gradient-overlay" />

              {/* Play button placeholder — vị trí center, 70x70 */}
              <div className="play-button-container">
                <div
                  className="animate-pulse"
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                />
              </div>

              {/* TUTORA badge placeholder — top: 29px, left: 29px */}
              <div className="TUTORA-badge-container">
                <div
                  className="animate-pulse"
                  style={{
                    width: '160px',
                    height: '24px',
                    borderRadius: '10.5px',
                    background: 'rgba(26, 34, 56, 0.55)',
                  }}
                />
              </div>

              {/* Tutor info card — bottom: 31px, left: 36.3px
                  Chứa avatar (90x90) + university badge + name (42px) + credential (24.5px). */}
              <div className="tutor-info-card">
                <div className="tutor-info-content">
                  <div
                    className="tutor-mini-avatar animate-pulse"
                    style={{ backgroundColor: '#e7e5e4' }}
                  />
                  <div className="tutor-info-text">
                    <div
                      className="animate-pulse"
                      style={{
                        width: '110px',
                        height: '21px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.18)',
                      }}
                    />
                    <div
                      className="animate-pulse"
                      style={{
                        width: '240px',
                        height: '42px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.24)',
                      }}
                    />
                    <div
                      className="animate-pulse"
                      style={{
                        width: '180px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Rating card placeholder — right: 36.44px, bottom: 36.02px */}
              <div className="rating-card-container">
                <div
                  className="animate-pulse"
                  style={{
                    width: '186px',
                    height: '62px',
                    borderRadius: '21px',
                    background: 'rgba(255, 255, 255, 0.92)',
                  }}
                />
              </div>
            </div>

            {/* Subject tags row — match gap 14px, padding 0 7px của .subject-tags */}
            <div className="subject-tags">
              {[112, 138, 96, 124, 102].map((w, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    width: `${w}px`,
                    height: '38px',
                    borderRadius: '9999px',
                    backgroundColor: '#e7e5e4', // stone-200
                  }}
                />
              ))}
            </div>
          </section>

          {/* ----- ABOUT ----- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="h-7 w-48 bg-stone-300 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-stone-200 rounded animate-pulse" />
            </div>
          </section>

          {/* ----- PORTFOLIO ----- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="h-7 w-56 bg-stone-300 rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-stone-200 rounded-2xl animate-pulse"
                  style={{ aspectRatio: '4 / 5' }}
                />
              ))}
            </div>
          </section>

          {/* ----- ACTIVE CLASSES ----- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="h-7 w-52 bg-stone-300 rounded animate-pulse" />
            <div className="flex flex-col gap-3">
              <div className="h-24 bg-stone-200 rounded-2xl animate-pulse" />
              <div className="h-24 bg-stone-200 rounded-2xl animate-pulse" />
            </div>
          </section>

          {/* ----- TESTIMONIALS ----- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="h-7 w-44 bg-stone-300 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-40 bg-stone-200 rounded-2xl animate-pulse" />
              <div className="h-40 bg-stone-200 rounded-2xl animate-pulse" />
            </div>
          </section>
        </div>

        {/* ===== RIGHT: booking-sidebar (412px sticky) ===== */}
        <aside className="booking-sidebar">
          <div className="booking-card">
            <div className="booking-header">
              <div className="h-3 w-44 bg-stone-200 rounded animate-pulse" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <div className="h-9 w-32 bg-stone-300 rounded animate-pulse" />
                <div className="h-3 w-14 bg-stone-200 rounded animate-pulse" />
              </div>
              <div className="h-6 w-44 bg-stone-200 rounded-md animate-pulse" style={{ marginTop: '10px' }} />
            </div>

            <div className="booking-card-body" style={{ overflow: 'hidden' }}>
              <div className="h-3 w-20 bg-stone-200 rounded animate-pulse" />
              <div className="schedule-list">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="schedule-day-row"
                    style={{ backgroundColor: 'rgba(242, 240, 228, 0.5)' }}
                  >
                    <div className="schedule-day-name">
                      <div className="h-3 w-12 bg-stone-300 rounded animate-pulse" />
                    </div>
                    <div className="schedule-slots">
                      <div
                        className="animate-pulse"
                        style={{
                          width: '76px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          border: '1px solid rgba(62, 47, 40, 0.1)',
                        }}
                      />
                      <div
                        className="animate-pulse"
                        style={{
                          width: '76px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          border: '1px solid rgba(62, 47, 40, 0.1)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '21px 27.9px 27.9px' }}>
              <div className="h-12 w-full bg-stone-300 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Verification note placeholder */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              backgroundColor: 'rgba(242, 240, 228, 0.5)',
              border: '1px solid rgba(62, 47, 40, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div className="h-4 w-48 bg-stone-200 rounded animate-pulse" />
            <div className="h-3 w-56 bg-stone-200 rounded animate-pulse" />
          </div>
        </aside>
      </div>
    </main>
  );
}
