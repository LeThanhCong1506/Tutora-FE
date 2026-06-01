import React, { useState } from 'react';
import type { TutorProfileFormData } from '../hooks/useTutorProfileForm';
import '../../../styles/pages/tutor-detail.css';

// Close Icon for modal
const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ===== SVG Icons (reused from TutorDetailPage) =====
const PlayIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.667 9.333L19.334 14L11.667 18.667V9.333Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
    <svg width="10.5" height="10.5" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.5 1L6.939 3.915L10 4.365L7.75 6.555L8.378 9.6L5.5 8.085L2.622 9.6L3.25 6.555L1 4.365L4.061 3.915L5.5 1Z"
            fill={filled ? "#D4B483" : "none"}
            stroke="#D4B483"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const HeartIcon = () => (
    <svg width="17.5" height="17.5" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.75 3.375C14.85 2.475 13.65 2.025 12.375 2.025C11.1 2.025 9.9 2.475 9 3.375L8.25 4.125L7.5 3.375C5.625 1.5 2.625 1.5 0.75 3.375C-1.125 5.25 -1.125 8.25 0.75 10.125L8.25 17.625L15.75 10.125C17.625 8.25 17.625 5.25 15.75 3.375Z" fill="white" />
    </svg>
);

const GraduationIcon = () => (
    <svg width="17.5" height="17.5" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 1.5L1 5.5L9 9.5L17 5.5L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1 5.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 7V12C4 13.5 6 15 9 15C12 15 14 13.5 14 12V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon = () => (
    <svg width="8.8" height="8.8" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 2.25L3.5625 6.1875L1.5 4.125" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CertificateIcon = () => (
    <svg width="17.5" height="17.5" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H4C2.9 2 2 2.9 2 4V14C2 15.1 2.9 16 4 16H14C15.1 16 16 15.1 16 14V4C16 2.9 15.1 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const VerifyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4L5.5 10.5L2 7" stroke="#3D4A3E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="10.5" height="10.5" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 1L2 2.5V5C2 7.5 3.5 9.5 5.5 10C7.5 9.5 9 7.5 9 5V2.5L5.5 1Z" stroke="#3D4A3E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// QuoteIcon - commented out to avoid TS6133 (noUnusedLocals)
// const QuoteIcon = () => (
//     <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
//         <text x="5" y="32" fontSize="36" fontFamily="Georgia, serif" fill="#E4DED5">"</text>
//     </svg>
// );

// ===== Label mappings =====
const CITY_LABELS: Record<string, string> = {
    'hanoi': 'Hà Nội',
    'hcm': 'TP. Hồ Chí Minh',
    'hochiminh': 'TP. Hồ Chí Minh',
    'danang': 'Đà Nẵng',
    'haiphong': 'Hải Phòng',
    'cantho': 'Cần Thơ',
    'binhduong': 'Bình Dương',
    'dongnai': 'Đồng Nai',
};

const formatTeachingModePreview = (mode: string | null | undefined): string => {
    const m = (mode || '').toLowerCase();
    if (m === 'both' || m === 'hybrid') return 'Linh hoạt';
    if (m === 'online') return 'Online';
    if (m === 'offline') return 'Tại nhà';
    return mode || '—';
};

const DISTRICT_LABELS: Record<string, Record<string, string>> = {
    'hanoi': {
        'ba-dinh': 'Ba Đình',
        'hoan-kiem': 'Hoàn Kiếm',
        'dong-da': 'Đống Đa',
        'hai-ba-trung': 'Hai Bà Trưng',
        'cau-giay': 'Cầu Giấy',
        'thanh-xuan': 'Thanh Xuân',
    },
    'hcm': {
        'quan-1': 'Quận 1',
        'quan-2': 'Quận 2',
        'quan-3': 'Quận 3',
        'quan-7': 'Quận 7',
        'binh-thanh': 'Bình Thạnh',
        'phu-nhuan': 'Phú Nhuận',
    },
};

// ===== Props =====
interface TutorProfilePreviewProps {
    formData: TutorProfileFormData;
}

// ===== Video Modal Component =====
const VideoModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
}> = ({ isOpen, onClose, videoUrl }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.3s'
                }}
            >
                <CloseIcon />
            </button>
            <video
                src={videoUrl}
                controls
                autoPlay
                style={{
                    maxWidth: '90%',
                    maxHeight: '80vh',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// ===== Sub-components =====

const HeroSection: React.FC<{ data: TutorProfileFormData; onPlayVideo: () => void }> = ({ data, onPlayVideo }) => {
    const locationDisplay = (() => {
        const city = CITY_LABELS[data.teachingAreaCity] || data.teachingAreaCity;
        const district = DISTRICT_LABELS[data.teachingAreaCity]?.[data.teachingAreaDistrict] || data.teachingAreaDistrict;
        if (district && city) return `${district}, ${city}`;
        return city || district || '';
    })();

    // Build subject groups: each subject with its associated tags + grade levels
    const subjectGroups = data.subjects
        .filter(s => s.subjectName && s.subjectName.trim())
        .map(s => ({
            name: s.subjectName,
            tags: s.tags || [],
            gradeLevels: s.gradeLevels || [],
        }));

    return (
        <section className="tutor-hero-section">
            <div className="component-2">
                {/* Video thumbnail or gradient background */}
                {data.videoIntroUrl ? (
                    <video
                        className="interview-thumbnail"
                        src={data.videoIntroUrl}
                        style={{ objectFit: 'cover', width: '100%', height: '351.4px' }}
                        muted
                    />
                ) : (
                    <div
                        className="interview-thumbnail"
                        style={{
                            background: 'linear-gradient(135deg, #1a2238, #0d1220)',
                            width: '100%',
                            height: '351.4px'
                        }}
                    />
                )}
                <div className="gradient-overlay"></div>

                {/* Play Button */}
                {data.videoIntroUrl && (
                    <div className="play-button-container" onClick={onPlayVideo} style={{ cursor: 'pointer' }}>
                        <div className="play-button">
                            <PlayIcon />
                        </div>
                        <b className="click-to-view">Click để xem phỏng vấn học thuật</b>
                    </div>
                )}

                {/* TUTORA Badge */}
                <div className="TUTORA-badge-container">
                    <div className="TUTORA-badge">
                        <div className="TUTORA-badge-dot"></div>
                        <b className="TUTORA-badge-text">TUTORA Original Interview</b>
                    </div>
                </div>

                {/* Tutor Info Card */}
                <div className="tutor-info-card">
                    <div className="tutor-info-content">
                        <div className="tutor-mini-avatar">
                            {data.avatarUrl ? (
                                <img src={data.avatarUrl} alt={data.fullName} />
                            ) : (
                                <div className="tutor-mini-avatar-placeholder">
                                    {data.fullName ? data.fullName.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                            <div className="mini-avatar-gradient"></div>
                        </div>
                        <div className="tutor-info-text">
                            {data.education && (
                                <div className="university-badge">
                                    <b>{data.education}</b>
                                </div>
                            )}
                            <h1 className="tutor-name">{data.fullName || 'Chưa cập nhật tên'}</h1>
                            <p className="tutor-credential">
                                {data.headline || 'Chưa cập nhật tiêu đề'}
                                {locationDisplay && ` · ${locationDisplay}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rating Card */}
                <div className="rating-card-container">
                    <div className="rating-card">
                        <div className="rating-stars">
                            <div className="stars-row">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <StarIcon key={i} filled={i <= Math.round(data.averageRating)} />
                                ))}
                            </div>
                            <b className="rating-text">
                                {data.averageRating > 0
                                    ? `${data.averageRating} (${data.totalReviews} REVIEWS)`
                                    : 'CHƯA CÓ ĐÁNH GIÁ'}
                            </b>
                        </div>
                        <div className="rating-divider"></div>
                        <div className="favorite-button">
                            <HeartIcon />
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Tags — grouped by subject */}
            <div className="subject-tags">
                {subjectGroups.length > 0 ? subjectGroups.map((group, index) => (
                    <div key={index} className="subject-group">
                        <div className="subject-tag subject-name-tag">
                            <b>{group.name}</b>
                        </div>
                        {group.tags.length > 0 && group.tags.map((tag, tIdx) => (
                            <div key={tIdx} className="subject-tag child-tag">
                                <b>{tag}</b>
                            </div>
                        ))}
                    </div>
                )) : (
                    <div className="subject-tag"><b>Chưa cập nhật môn học</b></div>
                )}
            </div>

                {/* Grade Levels — separate section */}
                {subjectGroups.some(g => g.gradeLevels.length > 0) && (
                    <div className="grade-levels-section">
                        <span className="grade-levels-label">Cấp lớp giảng dạy</span>
                        <div className="grade-levels-list">
                            {subjectGroups.map((group, index) => (
                                group.gradeLevels.length > 0 && (
                                    <div key={index} className="grade-level-group">
                                        <span className="grade-level-subject">{group.name}:</span>
                                        {group.gradeLevels.map((level, gIdx) => (
                                            <div key={gIdx} className="subject-tag grade-level-tag">
                                                <b>{level.replace(/^Grade_(\d+)$/i, 'Lớp $1')}</b>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

            {/* Mobile Rating Bar (visible only on mobile) */}
            <div className="mobile-rating-bar">
                <div className="rating-stars">
                    <div className="stars-row">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <StarIcon key={i} filled={i <= Math.round(data.averageRating)} />
                        ))}
                    </div>
                    <b className="rating-text">
                        {data.averageRating > 0
                            ? `${data.averageRating} (${data.totalReviews} đánh giá)`
                            : 'Chưa có đánh giá'}
                    </b>
                </div>
                <div className="favorite-button">
                    <HeartIcon />
                </div>
            </div>
        </section>
    );
};

const AboutSection: React.FC<{ data: TutorProfileFormData }> = ({ data }) => {
    const hasContent = data.bio || data.experience || data.education;
    // Get first name from full name, or use empty string if no name
    const nameParts = data.fullName?.trim().split(' ') || [];
    const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
    // Title: "Về Mentor" if no name, or "Về {firstName}" if has name
    const sectionTitle = firstName ? `Về ${firstName}` : 'Về Mentor';

    // Show empty state if no content
    if (!hasContent) {
        return (
            <section className="about-section">
                <h2 className="section-title">{sectionTitle}</h2>
                <div className="about-content">
                    <div style={{
                        textAlign: 'center',
                        padding: '30px 20px',
                        color: 'rgba(62, 47, 40, 0.5)',
                        fontStyle: 'italic',
                        width: '100%'
                    }}>
                        Chưa có thông tin giới thiệu
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="about-section">
            <h2 className="section-title">{sectionTitle}</h2>
            <div className="about-content">
                <div className="about-text">
                    {data.bio && <p className="about-intro">{data.bio}</p>}
                    {data.experience && <p className="about-experience">{data.experience}</p>}
                </div>
                <div className="credentials-card">
                    <div className="credential-item">
                        <div className="credential-icon-row">
                            <span className="credential-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                            </span>
                            <span className="credential-label">Học vấn</span>
                        </div>
                        <b className="credential-institution">{data.education || '—'}</b>
                        <i className="credential-detail">GPA: {data.gpa || '—'}/{data.gpaScale || '—'}</i>
                    </div>
                    <div className="credential-divider"></div>
                    <div className="credential-item">
                        <div className="credential-icon-row">
                            <span className="credential-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                            </span>
                            <span className="credential-label">Hình thức & khu vực</span>
                        </div>
                        <b className="credential-institution">{formatTeachingModePreview(data.teachingMode)}</b>
                        <i className="credential-detail">
                            {CITY_LABELS[data.teachingAreaCity] || data.teachingAreaCity || 'Toàn quốc'}
                        </i>
                    </div>
                </div>
            </div>
        </section>
    );
};

const AcademicPortfolioSection: React.FC<{ data: TutorProfileFormData }> = ({ data }) => {
    // Split credentials: degrees (education-related) vs certificates
    const degrees = data.credentials.filter(c =>
        ['degree', 'diploma', 'bachelor', 'master', 'phd', 'doctorate'].some(
            keyword => (c.certificateType || '').toLowerCase().includes(keyword)
        )
    );
    const certificates = data.credentials.filter(c => !degrees.includes(c));

    const verifiedCount = data.credentials.filter(c => c.verificationStatus === 'verified').length;
    const totalCount = data.credentials.length;
    const verifiedPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

    // Show empty state if no credentials
    if (data.credentials.length === 0) {
        return (
            <section className="portfolio-section">
                <div className="portfolio-header">
                    <div className="portfolio-title-group">
                        <h2 className="section-title">Hồ sơ năng lực học thuật</h2>
                        <span className="portfolio-subtitle">Hệ thống TUTORA Academic Ledger</span>
                    </div>
                </div>
                <div className="portfolio-content">
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'rgba(62, 47, 40, 0.5)',
                        fontStyle: 'italic'
                    }}>
                        Chưa có bằng cấp hoặc chứng chỉ nào được thêm
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="portfolio-section">
            <div className="portfolio-header">
                <div className="portfolio-title-group">
                    <h2 className="section-title">Hồ sơ năng lực học thuật</h2>
                    <span className="portfolio-subtitle">Hệ thống TUTORA Academic Ledger</span>
                </div>
                {verifiedCount > 0 && (
                    <div className="verified-badge-green">
                        <b>Xác thực {verifiedPercent}%</b>
                    </div>
                )}
            </div>

            <div className="portfolio-content">
                {/* Academic Degrees */}
                {degrees.length > 0 && (
                    <div className="portfolio-category">
                        <div className="category-header">
                            <div className="category-indicator navy"></div>
                            <span className="category-title">I. Văn bằng học thuật</span>
                            <div className="category-divider"></div>
                        </div>
                        <div className="degrees-grid">
                            {degrees.map((degree) => (
                                <div key={degree.id} className="degree-card">
                                    <div className="degree-icon navy">
                                        <GraduationIcon />
                                    </div>
                                    <div className="degree-info">
                                        <div className="degree-title-row">
                                            <b className="degree-title">{degree.name}</b>
                                            {degree.verificationStatus === 'verified' && (
                                                <div className="verified-check">
                                                    <CheckIcon />
                                                </div>
                                            )}
                                        </div>
                                        <span className="degree-institution">{degree.institution}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certificates */}
                {certificates.length > 0 && (
                    <div className="portfolio-category">
                        <div className="category-header">
                            <div className="category-indicator gold"></div>
                            <span className="category-title">
                                {degrees.length > 0 ? 'II. Chứng chỉ & Khảo thí' : 'I. Chứng chỉ & Khảo thí'}
                            </span>
                            <div className="category-divider"></div>
                        </div>
                        <div className="certificates-grid">
                            {certificates.map((cert) => (
                                <div key={cert.id} className="certificate-card">
                                    <div className="certificate-icon">
                                        <CertificateIcon />
                                    </div>
                                    <div className="certificate-info">
                                        <div className="certificate-title-row">
                                            <b className="certificate-title">{cert.name}</b>
                                            {cert.verificationStatus === 'verified' && (
                                                <div className="verified-check">
                                                    <CheckIcon />
                                                </div>
                                            )}
                                        </div>
                                        <span className="certificate-institution">{cert.institution}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Portfolio Footer */}
                {verifiedCount > 0 && (
                    <div className="portfolio-footer">
                        <div className="portfolio-note">
                            <div className="note-dot green"></div>
                            <b>Hồ sơ gốc lưu trữ bởi TUTORA</b>
                        </div>
                        <div className="portfolio-note">
                            <div className="note-dot green"></div>
                            <b>Đã kiểm tra chéo (Cross-checked)</b>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

// Stats Section - Shows training effectiveness data
const StatsSection: React.FC<{ data: TutorProfileFormData }> = ({ data }) => {
    // For now, stats are placeholders since tutor doesn't have this data yet
    // In the future, this could be pulled from actual teaching metrics
    const hasStats = data.totalReviews > 0;

    // Default placeholder stats
    const stats = [
        { value: '+1.5', label: 'GPA trung bình tăng', sublabel: 'Sau 12 tuần giảng dạy' },
        { value: '95%', label: 'Học sinh hài lòng', sublabel: 'Dựa trên đánh giá' },
        { value: `${data.totalReviews || 0}`, label: 'Học sinh đã dạy', sublabel: 'Tổng số học sinh' },
        { value: '12w', label: 'Thời gian đạt mục tiêu', sublabel: 'Lộ trình cá nhân hóa' }
    ];

    return (
        <section className="stats-section">
            <div className="stats-header">
                <h2 className="section-title">Hiệu quả đào tạo thực tế</h2>
                <div className="stats-badge">
                    <ShieldIcon />
                    <b>Dữ liệu xác thực từ TUTORA LMS</b>
                </div>
            </div>
            {hasStats ? (
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-card">
                            <b className="stat-value">{stat.value}</b>
                            <b className="stat-label">{stat.label}</b>
                            <i className="stat-sublabel">{stat.sublabel}</i>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'rgba(62, 47, 40, 0.5)',
                    fontStyle: 'italic',
                    backgroundColor: 'rgba(242, 240, 228, 0.5)',
                    borderRadius: '14px'
                }}>
                    Dữ liệu thống kê sẽ được hiển thị sau khi có đánh giá từ học sinh
                </div>
            )}
        </section>
    );
};

// Testimonials Section - Shows student success stories (same style as StatsSection)
const TestimonialsSection: React.FC<{ data: TutorProfileFormData }> = ({ data }) => {
    const hasTestimonials = data.totalReviews > 0;

    return (
        <section className="stats-section">
            <div className="stats-header">
                <h2 className="section-title">Nhật ký thành công</h2>
                <div className="stats-badge">
                    <ShieldIcon />
                    <b>Xác thực bởi TUTORA LMS</b>
                </div>
            </div>
            {hasTestimonials ? (
                <div className="stats-grid">
                    <div className="stat-card">
                        <b className="stat-value">{data.totalReviews}</b>
                        <b className="stat-label">Đánh giá</b>
                        <i className="stat-sublabel">Từ học sinh</i>
                    </div>
                    <div className="stat-card">
                        <b className="stat-value">{data.averageRating}</b>
                        <b className="stat-label">Điểm trung bình</b>
                        <i className="stat-sublabel">Trên thang 5 sao</i>
                    </div>
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'rgba(62, 47, 40, 0.5)',
                    fontStyle: 'italic',
                    backgroundColor: 'rgba(242, 240, 228, 0.5)',
                    borderRadius: '14px'
                }}>
                    Nhật ký thành công sẽ được hiển thị khi có đánh giá từ học sinh
                </div>
            )}
        </section>
    );
};

const BookingSidebar: React.FC<{ data: TutorProfileFormData }> = ({ data }) => {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Group availability by day
    const availabilityByDay = data.availability.reduce((acc, slot) => {
        const key = slot.dayName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
    }, {} as Record<string, typeof data.availability>);

    const hasAvailability = Object.keys(availabilityByDay).length > 0;

    return (
        <aside className="booking-sidebar" style={{ position: 'relative', top: 0 }}>
            <div className="booking-card">
                {/* Fixed Header */}
                <div className="booking-header">
                    <span className="booking-label">Bắt đầu lộ trình học thuật</span>
                    <div className="price-display">
                        <b className="price-amount">
                            {data.hourlyRate > 0
                                ? formatPrice(Math.round(data.hourlyRate * 1.05))
                                : 'Liên hệ'}
                        </b>
                        <b className="price-unit">/ GIỜ HỌC</b>
                    </div>
                    {data.trialLessonPrice && data.trialLessonPrice > 0 && (
                        <div className="trial-price-label" title="Học phí ưu đãi cho buổi học đầu tiên">
                            ✨ Buổi học thử: {formatPrice(data.trialLessonPrice)}
                        </div>
                    )}
                </div>

                {/* Scrollable Body */}
                <div className="booking-card-body">
                    {/* Availability Schedule */}
                    {hasAvailability ? (
                        <div className="availability-schedule-container">
                            <div className="schedule-label">LỊCH DẠY</div>
                            <div className="schedule-list">
                                {Object.entries(availabilityByDay).map(([dayName, slots]) => (
                                    <div key={dayName} className="schedule-day-row">
                                        <div className="schedule-day-name">{dayName}</div>
                                        <div className="schedule-slots">
                                            {slots.map((s, idx) => (
                                                <span key={idx} className="schedule-time-chip">
                                                    {s.startTime} - {s.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-availability">
                            Chưa cập nhật lịch dạy
                        </div>
                    )}

                </div>

                {/* Fixed Footer — Action Buttons */}
                <div className="booking-actions">
                    <button className="btn-start">
                        <b>ĐẶT LỊCH NGAY</b>
                    </button>
                    <button className="btn-chat">
                        <b>CHAT TƯ VẤN</b>
                    </button>
                </div>
            </div>

            {/* Verification Note */}
            <div className="verification-note">
                <div className="note-header">
                    <VerifyIcon />
                    <b>Đã xác minh bởi TUTORA Council</b>
                </div>
                <i className="note-text">Hoàn học phí nếu không hài lòng sau buổi học đầu tiên.</i>
            </div>
        </aside>
    );
};

// ===== Main Preview Component =====
const TutorProfilePreview: React.FC<TutorProfilePreviewProps> = ({ formData }) => {
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    const handlePlayVideo = () => {
        if (formData.videoIntroUrl) {
            setIsVideoModalOpen(true);
        }
    };

    return (
        <div className="tutor-detail-page" style={{
            background: 'var(--color-cream, #faf5ee)',
            minHeight: 'auto',
            width: '100%',
            flex: 1
        }}>
            <main className="tutor-detail-main" style={{ paddingTop: '30px', paddingBottom: '80px' }}>
                <div className="tutor-detail-container">
                    <div className="tutor-detail-content">
                        <HeroSection data={formData} onPlayVideo={handlePlayVideo} />
                        <AboutSection data={formData} />
                        <div className="portfolio-stats-wrapper">
                            <AcademicPortfolioSection data={formData} />
                            <StatsSection data={formData} />
                        </div>
                        <TestimonialsSection data={formData} />
                    </div>
                    <BookingSidebar data={formData} />
                </div>
            </main>

            {/* Video Modal */}
            {formData.videoIntroUrl && (
                <VideoModal
                    isOpen={isVideoModalOpen}
                    onClose={() => setIsVideoModalOpen(false)}
                    videoUrl={formData.videoIntroUrl}
                />
            )}
        </div>
    );
};

export default TutorProfilePreview;
