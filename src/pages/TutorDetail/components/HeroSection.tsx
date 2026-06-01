import { useState } from 'react';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { PlayIcon, StarIcon, HeartIcon } from './icons';

const parseTags = (rawTags: unknown): string[] => {
    if (Array.isArray(rawTags)) return rawTags;
    if (typeof rawTags === 'string') {
        try {
            const parsed = JSON.parse(rawTags);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }
    return [];
};

const HeroSection = ({ profile }: { profile: TutorFullProfile }) => {
    const [showVideoModal, setShowVideoModal] = useState(false);

    const subjectGroups = (profile.subjects || []).map(s => ({
        name: s.subjectName || 'Chưa rõ',
        tags: parseTags(s.tags),
        gradeLevels: parseTags(s.gradeLevels),
    }));

    return (
        <>
            <section className="tutor-hero-section">
                <div className="component-2">
                    {(() => {
                        if (!profile.videoIntroUrl) {
                            return (
                                <img
                                    className="interview-thumbnail"
                                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800"
                                    alt={profile.fullName || "Tutor Interview"}
                                />
                            );
                        }
                        const ytMatch = profile.videoIntroUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                        if (ytMatch?.[1]) {
                            return (
                                <img
                                    className="interview-thumbnail"
                                    src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`}
                                    alt={profile.fullName || "Tutor Interview"}
                                />
                            );
                        }
                        return (
                            <video
                                className="interview-thumbnail"
                                src={profile.videoIntroUrl}
                                muted
                                style={{ objectFit: 'cover', width: '100%', height: '351.4px' }}
                            />
                        );
                    })()}
                    <div className="gradient-overlay"></div>

                    {profile.videoIntroUrl && (
                        <div className="play-button-container" onClick={() => setShowVideoModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="play-button">
                                <PlayIcon />
                            </div>
                            <b className="click-to-view">Click để xem phỏng vấn học thuật</b>
                        </div>
                    )}

                    <div className="TUTORA-badge-container">
                        <div className="TUTORA-badge">
                            <div className="TUTORA-badge-dot"></div>
                            <b className="TUTORA-badge-text">TUTORA Original Interview</b>
                        </div>
                    </div>

                    <div className="tutor-info-card">
                        <div className="tutor-info-content">
                            <div className="tutor-mini-avatar">
                                <img src={profile.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg"} alt={profile.fullName || ""} />
                                <div className="mini-avatar-gradient"></div>
                            </div>
                            <div className="tutor-info-text">
                                <div className="university-badge">
                                    <b>{profile.education?.split(',')[0] || "University"}</b>
                                </div>
                                <h1 className="tutor-name">{profile.fullName}</h1>
                                <p className="tutor-credential">{profile.headline}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rating-card-container">
                        <div className="rating-card">
                            <div className="rating-stars">
                                <div className="stars-row">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <StarIcon key={i} filled={i <= Math.round(profile.averageRating || 0)} />
                                    ))}
                                </div>
                                <b className="rating-text">{(profile.averageRating || 0).toFixed(1)} ({profile.totalFeedbacks || 0} ĐÁNH GIÁ)</b>
                            </div>
                            <div className="rating-divider"></div>
                            <div className="favorite-button">
                                <HeartIcon />
                            </div>
                        </div>
                    </div>
                </div>

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

                <div className="mobile-rating-bar">
                    <div className="rating-stars">
                        <div className="stars-row">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <StarIcon key={i} filled={i <= Math.round(profile.averageRating || 0)} />
                            ))}
                        </div>
                        <b className="rating-text">{(profile.averageRating || 0).toFixed(1)} ({profile.totalFeedbacks || 0} đánh giá)</b>
                    </div>
                    <div className="favorite-button">
                        <HeartIcon />
                    </div>
                </div>
            </section>

            {showVideoModal && profile.videoIntroUrl && (
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
                    onClick={() => setShowVideoModal(false)}
                >
                    <button
                        onClick={() => setShowVideoModal(false)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '24px',
                            transition: 'background 0.3s'
                        }}
                    >
                        ✕
                    </button>
                    <video
                        src={profile.videoIntroUrl!}
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
            )}
        </>
    );
};

export default HeroSection;
