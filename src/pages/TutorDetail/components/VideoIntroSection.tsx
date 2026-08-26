import { useState } from 'react';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../../../utils/youtube';
import { HeartIcon, PlayIcon, StarIcon } from './icons';

/**
 * Hero video giới thiệu + overlay thông tin gia sư (avatar/tên/headline đè góc dưới
 * trái, rating card góc dưới phải) — dùng lại các class .tutor-info-card/.rating-card
 * đã có sẵn trong tutor-detail.css. Avatar/tên/rating đặt ở đây (không phải AboutSection)
 * theo đúng bố cục "info card nổi trên ảnh bìa" của thiết kế gốc.
 */
const VideoIntroSection = ({ profile }: { profile: TutorFullProfile }) => {
    const [showVideoModal, setShowVideoModal] = useState(false);

    const videoUrl = profile.videoIntroUrl;
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    const youtubeThumb = getYouTubeThumbnail(videoUrl);
    const isDirectVideo = Boolean(videoUrl && !embedUrl);
    const rating = profile.averageRating || 0;
    const totalReviews = profile.totalFeedbacks || 0;
    const totalLessons = profile.totalClassSessions || 0;
    const education = profile.education?.trim();

    return (
        <>
            <section className="tutor-hero-section">
                <div className="component-2">
                    {youtubeThumb ? (
                        <img className="interview-thumbnail" src={youtubeThumb} alt={profile.fullName || 'Video giới thiệu'} />
                    ) : isDirectVideo ? (
                        <video className="interview-thumbnail" src={videoUrl!} muted />
                    ) : (
                        <img
                            className="interview-thumbnail"
                            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800"
                            alt={profile.fullName || 'Tutor Interview'}
                        />
                    )}

                    <div className="gradient-overlay" />

                    {videoUrl && (
                        <>
                            <div className="TUTORA-badge-container">
                                <div className="TUTORA-badge">
                                    <span className="TUTORA-badge-dot" />
                                    <span className="TUTORA-badge-text">Video phỏng vấn</span>
                                </div>
                            </div>
                            <span className="click-to-view">Nhấn để xem</span>
                            <div
                                className="play-button-container"
                                onClick={() => setShowVideoModal(true)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="play-button">
                                    <PlayIcon />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="tutor-info-card">
                        <div className="tutor-info-content">
                            <div className="tutor-mini-avatar">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt={profile.fullName || ''} />
                                ) : (
                                    <div className="tutor-mini-avatar-placeholder">
                                        {(profile.fullName || '?').charAt(0)}
                                    </div>
                                )}
                                <div className="mini-avatar-gradient" />
                            </div>
                            <div className="tutor-info-text">
                                {education && <span className="university-badge">{education}</span>}
                                <h1 className="tutor-name">{profile.fullName || 'Chưa cập nhật tên'}</h1>
                                {profile.headline && <p className="tutor-credential">{profile.headline}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="rating-card-container">
                        <div className="rating-card">
                            <div className="rating-stars">
                                <div className="stars-row">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <StarIcon key={i} filled={i <= Math.round(rating)} />
                                    ))}
                                </div>
                                <span className="rating-text">
                                    {rating.toFixed(1)} ({totalReviews.toLocaleString('vi-VN')}) · {totalLessons.toLocaleString('vi-VN')} buổi
                                </span>
                            </div>
                            <div className="rating-divider" />
                            <div className="favorite-button" title="Yêu thích">
                                <HeartIcon />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {showVideoModal && videoUrl && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                    }}
                    onClick={() => setShowVideoModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Video giới thiệu"
                >
                    <button
                        onClick={() => setShowVideoModal(false)}
                        type="button"
                        aria-label="Đóng"
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
                            fontSize: '22px',
                        }}
                    >
                        ✕
                    </button>
                    {embedUrl ? (
                        <div
                            style={{ width: '90%', maxWidth: '960px', aspectRatio: '16 / 9' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <iframe
                                src={`${embedUrl}?autoplay=1`}
                                title="Video giới thiệu"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                }}
                            />
                        </div>
                    ) : (
                        <video
                            src={videoUrl}
                            controls
                            autoPlay
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: '90%',
                                maxHeight: '80vh',
                                borderRadius: '12px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            }}
                        />
                    )}
                </div>
            )}
        </>
    );
};

export default VideoIntroSection;
