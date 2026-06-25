import { useState } from 'react';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../../../utils/youtube';
import { PlayIcon } from './icons';

/**
 * Component CHỈ hiển thị video giới thiệu (thumbnail + nút play + badge).
 * Mọi thông tin về gia sư (avatar, tên, headline, đánh giá, môn học) đã được tách
 * xuống AboutSection ("Về Mentor") để phần video gọn gàng, không bị rối.
 */
const VideoIntroSection = ({ profile }: { profile: TutorFullProfile }) => {
    const [showVideoModal, setShowVideoModal] = useState(false);

    const videoUrl = profile.videoIntroUrl;
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    const youtubeThumb = getYouTubeThumbnail(videoUrl);
    const isDirectVideo = Boolean(videoUrl && !embedUrl);

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

                    {videoUrl && (
                        <div
                            className="play-button-container"
                            onClick={() => setShowVideoModal(true)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="play-button">
                                <PlayIcon />
                            </div>
                        </div>
                    )}
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
