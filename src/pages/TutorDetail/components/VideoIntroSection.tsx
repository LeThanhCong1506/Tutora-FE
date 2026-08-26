import { useState } from 'react';
import { toast } from 'react-toastify';
import { useWishlist } from '../../../hooks/useWishlist';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../../../utils/youtube';
import { HeartIcon, PlayIcon, StarIcon } from './icons';
import { toHeroHeadline } from './utils';

interface VideoIntroSectionProps {
    profile: TutorFullProfile;
    /** TutorFullProfile không mang theo id của chính nó — lấy từ URL ở trang cha. */
    tutorId: string;
    /**
     * Chạy khi bấm trái tim mà tài khoản hiện tại không lưu được. Ở trang công khai là mời
     * đăng nhập theo đúng cách của từng môi trường (web: /login, Mini App:
     * ZaloRoleSelectModal); ở bản xem trước trong portal gia sư là nhắc "đây chỉ là xem
     * trước". Trang cha đã có sẵn logic đó nên không dựng lại ở đây.
     */
    onFavoriteBlocked: () => void;
    /**
     * Ép hiện trái tim dù role hiện tại không lưu được. Chỉ bật ở bản xem trước của gia sư —
     * mục đích của bản xem trước là cho họ thấy ĐÚNG những gì phụ huynh/học sinh sẽ thấy.
     */
    alwaysShowFavorite?: boolean;
}

/**
 * Hero video giới thiệu + overlay thông tin gia sư (avatar/tên/headline đè góc dưới
 * trái, rating card góc dưới phải) — dùng lại các class .tutor-info-card/.rating-card
 * đã có sẵn trong tutor-detail.css. Avatar/tên/rating đặt ở đây (không phải AboutSection)
 * theo đúng bố cục "info card nổi trên ảnh bìa" của thiết kế gốc.
 */
const VideoIntroSection = ({
    profile,
    tutorId,
    onFavoriteBlocked,
    alwaysShowFavorite = false,
}: VideoIntroSectionProps) => {
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [savingFavorite, setSavingFavorite] = useState(false);
    const { saved, toggle: toggleFavorite, canFavorite, visible } = useWishlist(tutorId);
    const showFavorite = alwaysShowFavorite || visible;

    const videoUrl = profile.videoIntroUrl;
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    const youtubeThumb = getYouTubeThumbnail(videoUrl);
    const isDirectVideo = Boolean(videoUrl && !embedUrl);
    const rating = profile.averageRating || 0;
    const totalReviews = profile.totalFeedbacks || 0;
    const totalLessons = profile.totalClassSessions || 0;
    const education = profile.education?.trim();
    const tutorLabel = profile.fullName || 'gia sư';
    const fullHeadline = profile.headline?.trim() || '';
    const heroHeadline = toHeroHeadline(fullHeadline);

    // Lưu/bỏ lưu gia sư. Khách chưa đăng nhập được mời đăng nhập; gia sư/admin/staff không
    // thấy nút này (xem `visible` trong useWishlist) nên không rơi vào nhánh nào ở đây.
    const handleFavoriteClick = async () => {
        if (!canFavorite) {
            onFavoriteBlocked();
            return;
        }
        if (savingFavorite) return;

        setSavingFavorite(true);
        try {
            const { ok, saved: nowSaved } = await toggleFavorite();
            if (!ok) {
                toast.error('Không lưu được. Vui lòng thử lại.', { toastId: 'tutor-detail-favorite-error' });
                return;
            }
            toast.success(
                nowSaved
                    ? `Đã thêm ${tutorLabel} vào danh sách yêu thích`
                    : `Đã bỏ ${tutorLabel} khỏi danh sách yêu thích`,
            );
        } finally {
            setSavingFavorite(false);
        }
    };

    // Cùng một nút dùng cho rating card (desktop) và thanh rating (mobile) — hai chỗ không
    // bao giờ hiện cùng lúc nên dùng chung state là đủ.
    const favoriteButton = showFavorite ? (
        <button
            type="button"
            className={`favorite-button${saved ? ' is-saved' : ''}`}
            onClick={handleFavoriteClick}
            disabled={savingFavorite}
            aria-pressed={saved}
            aria-label={saved ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
            title={saved ? 'Đã lưu vào yêu thích' : 'Lưu vào yêu thích'}
        >
            <HeartIcon filled={saved} />
        </button>
    ) : null;

    const ratingSummary = (
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
    );

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
                                {heroHeadline && (
                                    <p
                                        className="tutor-credential"
                                        /* Chỉ gắn tooltip khi có phần bị lược — không thì rê
                                           chuột lại hiện đúng câu đang đọc, thừa. */
                                        title={heroHeadline === fullHeadline ? undefined : fullHeadline}
                                    >
                                        {heroHeadline}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rating-card-container">
                        <div className="rating-card">
                            {ratingSummary}
                            {favoriteButton && (
                                <>
                                    <div className="rating-divider" />
                                    {favoriteButton}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/*
                  * Dưới 600px, .rating-card-container bị ẩn (đè lên video thì không còn chỗ),
                  * nên rating VÀ nút yêu thích biến mất khỏi trang. Thanh này thế chỗ — CSS
                  * .mobile-rating-bar đã có sẵn trong tutor-detail.css và tự ẩn trên desktop.
                  */}
                <div className="mobile-rating-bar">
                    {ratingSummary}
                    {favoriteButton}
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
