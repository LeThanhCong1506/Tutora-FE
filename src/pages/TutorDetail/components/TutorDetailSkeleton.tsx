import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { isZaloMiniApp } from '../../../services/zalo-env';

const tagWidths = [92, 116, 84, 108, 76, 96];
const introLineWidths = [98, 92, 96, 86, 74];
const experienceLineWidths = [95, 88, 91, 68];
// Số "khung giờ" giả lập cho 7 cột T2 → CN — lệch nhau để giống lịch rảnh thật.
const scheduleColumns = [3, 2, 4, 2, 3, 4, 1];

// Phải khớp CHÍNH XÁC cấu trúc ẩn/hiện Header/Footer/booking-sidebar của trang thật
// (TutorDetailPage.tsx) theo isZaloMiniApp() — bug thật 2026-07-17: skeleton luôn render
// Header/Footer bất kể Mini App hay không, khiến lúc loading hiện thanh nav web desktop rồi
// biến mất đột ngột ngay khi load xong → cảm giác giật/lệch layout trong Mini App.
const TutorDetailSkeleton = () => {
    const inMiniApp = isZaloMiniApp();

    return (
    <div className={`tutor-detail-page${inMiniApp ? ' tutor-detail-page--mini-app' : ''}`}>
        {!inMiniApp && <Header />}
        <main className="tutor-detail-main">
            <div className="tutor-detail-container">
                <div className="tutor-detail-content tutor-detail-skeleton" aria-busy="true" aria-label="Dang tai thong tin gia su">
                    <section className="tutor-hero-section">
                        <div className="component-2 skeleton-hero-shell">
                            <div className="skeleton-hero-media">
                                <div className="skeleton-interview-pill">
                                    <span className="skeleton-live-dot" />
                                    <div className="skeleton-box skeleton-pill-line" />
                                </div>

                                <div className="skeleton-play-ring">
                                    <div className="skeleton-play-triangle" />
                                </div>
                            </div>

                            <div className="skeleton-hero-overlay">
                                <div className="skeleton-mentor-block">
                                    <div className="skeleton-box skeleton-avatar" />
                                    <div className="skeleton-mentor-lines">
                                        <div className="skeleton-box skeleton-line skeleton-line-badge" />
                                        <div className="skeleton-box skeleton-line skeleton-line-name" />
                                        <div className="skeleton-box skeleton-line skeleton-line-subtitle" />
                                    </div>
                                </div>

                                <div className="skeleton-rating-card">
                                    <div className="skeleton-star-row">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <span key={i} className="skeleton-star" />
                                        ))}
                                    </div>
                                    <div className="skeleton-box skeleton-line skeleton-line-rating" />
                                    <div className="skeleton-favorite-chip" />
                                </div>
                            </div>
                        </div>

                        <div className="skeleton-tags-row">
                            {tagWidths.map((width, index) => (
                                <div
                                    key={index}
                                    className={`skeleton-box skeleton-tag ${index === 0 ? 'skeleton-tag-primary' : ''}`}
                                    style={{ width }}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="about-section skeleton-section-card">
                        <div className="skeleton-section-heading">
                            <div className="skeleton-box skeleton-heading-line" />
                            <div className="skeleton-box skeleton-heading-pill" />
                        </div>
                        <div className="skeleton-about-grid">
                            <div className="skeleton-about-text">
                                {introLineWidths.map((width, index) => (
                                    <div key={index} className="skeleton-box skeleton-text-line" style={{ width: `${width}%` }} />
                                ))}
                                <div className="skeleton-paragraph-break" />
                                {experienceLineWidths.map((width, index) => (
                                    <div key={index} className="skeleton-box skeleton-text-line skeleton-text-line-muted" style={{ width: `${width}%` }} />
                                ))}
                            </div>
                            <div className="skeleton-credentials-card">
                                {[1, 2].map((item) => (
                                    <div key={item} className="skeleton-credential-item">
                                        <div className="skeleton-box skeleton-credential-icon" />
                                        <div className="skeleton-credential-copy">
                                            <div className="skeleton-box skeleton-credential-label" />
                                            <div className="skeleton-box skeleton-credential-title" />
                                            <div className="skeleton-box skeleton-credential-meta" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="portfolio-section skeleton-section-card skeleton-portfolio-card">
                        <div className="skeleton-portfolio-header">
                            <div>
                                <div className="skeleton-box skeleton-heading-line skeleton-heading-line-wide" />
                                <div className="skeleton-box skeleton-overline-line" />
                            </div>
                            <div className="skeleton-box skeleton-verified-pill" />
                        </div>
                        <div className="skeleton-cert-grid">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="skeleton-cert-card">
                                    <div className="skeleton-box skeleton-cert-icon" />
                                    <div className="skeleton-cert-copy">
                                        <div className="skeleton-box skeleton-cert-title" />
                                        <div className="skeleton-box skeleton-cert-meta" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="active-classes-section skeleton-section-card">
                        <div className="skeleton-section-heading">
                            <div className="skeleton-box skeleton-heading-line skeleton-heading-line-short" />
                            <div className="skeleton-box skeleton-heading-pill skeleton-heading-pill-small" />
                        </div>
                        <div className="skeleton-active-grid">
                            {[1, 2].map((item) => (
                                <div key={item} className="skeleton-active-card">
                                    <div className="skeleton-active-top">
                                        <div className="skeleton-box skeleton-active-title" />
                                        <div className="skeleton-box skeleton-active-status" />
                                    </div>
                                    <div className="skeleton-box skeleton-active-meta" />
                                    <div className="skeleton-box skeleton-progress-track" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {!inMiniApp && (
                    <aside className="booking-sidebar skeleton-booking-sidebar" aria-hidden="true">
                        <div className="booking-card">
                            <div className="skeleton-booking-header">
                                <div className="skeleton-box skeleton-booking-label" />
                            </div>
                            <div className="skeleton-booking-body">
                                <div className="skeleton-schedule-heading">
                                    <div className="skeleton-box skeleton-schedule-icon" />
                                    <div className="skeleton-box skeleton-schedule-label" />
                                </div>
                                <div className="skeleton-schedule-week-grid">
                                    {scheduleColumns.map((chipCount, dayIndex) => (
                                        <div key={dayIndex} className="skeleton-schedule-day-col">
                                            <div className="skeleton-box skeleton-schedule-weekday" />
                                            <div className="skeleton-schedule-chip-list">
                                                {Array.from({ length: chipCount }).map((_, chipIndex) => (
                                                    <div key={chipIndex} className="skeleton-box skeleton-schedule-chip" />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="skeleton-booking-actions">
                                <div className="skeleton-box skeleton-primary-button" />
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </main>
        {!inMiniApp && <Footer />}

        {inMiniApp && (
            <div className="mobile-sticky-cta" aria-hidden="true">
                <div className="skeleton-box skeleton-primary-button" style={{ width: '100%', height: 48 }} />
            </div>
        )}
    </div>
    );
};

export default TutorDetailSkeleton;
