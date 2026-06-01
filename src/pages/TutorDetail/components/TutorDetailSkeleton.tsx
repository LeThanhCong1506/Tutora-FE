import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const TutorDetailSkeleton = () => (
    <div className="tutor-detail-page">
        <Header />
        <main className="tutor-detail-main">
            <div className="tutor-detail-container">
                <div className="tutor-detail-content">
                    <section className="tutor-hero-section">
                        <div className="component-2" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div className="skeleton-box skeleton-hero-img" />
                            <div className="skeleton-hero-overlay">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div className="skeleton-box skeleton-avatar" />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div className="skeleton-box" style={{ width: 110, height: 14 }} />
                                        <div className="skeleton-box" style={{ width: 180, height: 22 }} />
                                        <div className="skeleton-box" style={{ width: 150, height: 13 }} />
                                    </div>
                                </div>
                                <div className="skeleton-box" style={{ width: 160, height: 52, borderRadius: 12 }} />
                            </div>
                        </div>

                        <div className="skeleton-tags-row">
                            {[88, 104, 76, 96, 68, 80].map((w, i) => (
                                <div key={i} className="skeleton-box" style={{ width: w, height: 34, borderRadius: 20 }} />
                            ))}
                        </div>
                    </section>

                    <section className="about-section">
                        <div className="skeleton-box" style={{ width: 230, height: 28, marginBottom: 24 }} />
                        <div className="skeleton-about-grid">
                            <div className="skeleton-about-text">
                                {[100, 96, 90, 94, 78, 85, 60].map((w, i) => (
                                    <div key={i} className="skeleton-box" style={{ width: `${w}%`, height: 14 }} />
                                ))}
                                <div style={{ height: 12 }} />
                                {[100, 88, 92, 70].map((w, i) => (
                                    <div key={i} className="skeleton-box" style={{ width: `${w}%`, height: 14 }} />
                                ))}
                            </div>
                            <div className="skeleton-creds">
                                <div className="skeleton-box" style={{ height: 96, borderRadius: 14 }} />
                                <div className="skeleton-box" style={{ height: 96, borderRadius: 14 }} />
                            </div>
                        </div>
                    </section>

                    <section className="portfolio-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div className="skeleton-box" style={{ width: 280, height: 28 }} />
                            <div className="skeleton-box" style={{ width: 100, height: 28, borderRadius: 20 }} />
                        </div>
                        <div className="skeleton-cert-grid">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton-box" style={{ height: 76, borderRadius: 14 }} />
                            ))}
                        </div>
                    </section>

                    <section className="section5">
                        <div className="skeleton-box" style={{ width: 200, height: 28, marginBottom: 20 }} />
                        <div className="skeleton-box" style={{ height: 100, borderRadius: 14, marginBottom: 16 }} />
                        <div className="skeleton-box" style={{ height: 220, borderRadius: 16 }} />
                    </section>
                </div>

                <aside className="booking-sidebar">
                    <div className="booking-card">
                        <div className="skeleton-box" style={{ height: 76, borderRadius: 12, marginBottom: 20 }} />
                        <div className="skeleton-box" style={{ width: 80, height: 12, marginBottom: 14 }} />
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton-box" style={{ height: 50, borderRadius: 12, marginBottom: 8 }} />
                        ))}
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="skeleton-box" style={{ height: 50, borderRadius: 12 }} />
                            <div className="skeleton-box" style={{ height: 50, borderRadius: 12 }} />
                        </div>
                    </div>
                    <div className="skeleton-box" style={{ height: 64, borderRadius: 12, marginTop: 16 }} />
                </aside>
            </div>
        </main>
        <Footer />
    </div>
);

export default TutorDetailSkeleton;
