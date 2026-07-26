import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { Tutor } from './types';
import { VerifiedIcon, UniversityIcon, ArrowIcon, PlayIcon, StarIcon, HeartIcon } from './icons';
import { formatGradeLevelRanges } from './utils';
import { useWishlist } from './useWishlist';
import { createChannel } from '../../../services/chat.service';
import { getCurrentUser, getCurrentUserRole } from '../../../services/auth.service';
import { formatVNDNumber } from '../../../utils/formatters';

const MAX_VISIBLE_SUBJECT_GRADES = 3;

// Ảnh nền mặc định khi gia sư chưa có video giới thiệu — chân dung minh hoạ (không phải người thật).
const DEFAULT_MEDIA_IMAGE =
  'https://api.dicebear.com/7.x/notionists/svg?seed=tutora&backgroundColor=b6e3f4';

// Giá thấp nhất hiển thị trên thẻ, ví dụ "Từ 150,000đ/giờ".
const formatFromPrice = (rate: number): string => `Từ ${formatVNDNumber(rate)}đ/giờ`;

// Lấy id video YouTube nếu videoUrl là link YouTube (để dùng thumbnail thay vì nhúng <video>).
const getYoutubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
};

interface TutorCardProps {
  tutor: Tutor;
}

const TutorCard = ({ tutor }: TutorCardProps) => {
  const navigate = useNavigate();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { saved, toggle: toggleWishlist } = useWishlist(tutor.id);

  const handleCardClick = () => {
    navigate(`/tutor-detail/${tutor.id}`);
  };

  // Lưu/bỏ lưu gia sư vào danh sách yêu thích — không điều hướng/không mở video.
  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist();
  };

  // Click vào video → mở modal xem ngay tại trang (không điều hướng sang trang chi tiết).
  const openVideoModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tutor.videoUrl) setShowVideoModal(true);
  };

  const closeVideoModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVideoModal(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tutor-detail/${tutor.id}`);
  };

  // Nhắn tin: tạo/lấy kênh chat với gia sư rồi mở thẳng cuộc trò chuyện ở trang Tin nhắn.
  const handleMessageClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const role = (getCurrentUserRole() || '').toLowerCase();
    if (!getCurrentUser() || !role) {
      toast.info('Vui lòng đăng nhập để nhắn tin với gia sư.');
      navigate('/login');
      return;
    }

    try {
      const res = await createChannel(tutor.id);
      const channelId = res.content?.channelId;
      if (!channelId) throw new Error('Thiếu channelId');

      const messagesPath =
        role === 'student'
          ? '/student-portal/messages'
          : role === 'tutor'
            ? '/tutor-portal/messages'
            : '/parent-portal/messages';

      // Truyền sẵn thông tin kênh để trang Tin nhắn mở đúng cuộc trò chuyện ngay.
      navigate(messagesPath, {
        state: {
          openChannel: {
            channelId,
            bookingId: 0,
            otherUserId: tutor.id,
            otherUserName: tutor.name,
            otherUserAvatarUrl: tutor.avatar,
            status: 'active',
            lastMessageAt: '',
            lastMessagePreview: '',
          },
        },
      });
    } catch {
      toast.error('Không mở được cuộc trò chuyện. Vui lòng thử lại.');
    }
  };

  const university = tutor.university.trim();
  const gradeLevelRange = formatGradeLevelRanges(tutor.gradeLevels);
  const subjectGradeItems =
    tutor.subjectGradeLevels.length > 0
      ? tutor.subjectGradeLevels
      : tutor.subjects.map((subject) => ({
          subjectName: subject,
          gradeLevels: tutor.gradeLevels,
          gradeLabel: gradeLevelRange,
          minPrice: null,
        }));
  const visibleSubjectGrades = subjectGradeItems.slice(0, MAX_VISIBLE_SUBJECT_GRADES);
  const hiddenSubjectsCount = Math.max(subjectGradeItems.length - visibleSubjectGrades.length, 0);

  const youtubeId = tutor.videoUrl ? getYoutubeId(tutor.videoUrl) : null;
  const hasPrice = typeof tutor.minPrice === 'number' && tutor.minPrice > 0;

  return (
    <div className="tutor-card" onClick={handleCardClick}>
      {/* 1) Video giới thiệu ở trên cùng */}
      <div
        className={`tutor-card-media${tutor.videoUrl ? ' is-playable' : ''}`}
        onClick={tutor.videoUrl ? openVideoModal : undefined}
        role={tutor.videoUrl ? 'button' : undefined}
        aria-label={tutor.videoUrl ? `Xem video giới thiệu của ${tutor.name}` : undefined}
      >
        {tutor.videoUrl ? (
          youtubeId ? (
            <img
              className="tutor-card-media-content"
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt={tutor.name}
            />
          ) : (
            <video className="tutor-card-media-content" src={tutor.videoUrl} muted preload="metadata" />
          )
        ) : (
          <img
            className="tutor-card-media-content tutor-card-media-illustration"
            src={DEFAULT_MEDIA_IMAGE}
            alt={tutor.name}
          />
        )}
        {tutor.videoUrl && (
          <span className="tutor-card-play" aria-hidden="true">
            <PlayIcon />
          </span>
        )}
        <button
          type="button"
          className={`tutor-card-wishlist${saved ? ' is-saved' : ''}`}
          onClick={handleWishlistClick}
          aria-pressed={saved}
          aria-label={saved ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          title={saved ? 'Đã lưu vào yêu thích' : 'Lưu vào yêu thích'}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>

      <div className="tutor-card-body">
        {/* 2) Avatar + tên + học vấn */}
        <div className="tutor-card-identity">
          <div className="tutor-avatar-container">
            <img src={tutor.avatar} alt={tutor.name} className="tutor-avatar" />
            <div className="tutor-verified-badge">
              <VerifiedIcon />
            </div>
          </div>
          <div className="tutor-identity-text">
            <h3 className="tutor-name">{tutor.name}</h3>
            {university && (
              <div className="tutor-university-row">
                <span className="university-icon">
                  <UniversityIcon />
                </span>
                <span className="university-name">{university}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3) Lớp & môn học */}
        {visibleSubjectGrades.length > 0 && (
          <div className="tutor-subjects">
            {visibleSubjectGrades.map((item, index) => (
              <span
                key={`${item.subjectName}-${index}`}
                className="subject-grade-chip"
                title={`${item.subjectName}${item.gradeLabel ? ` - ${item.gradeLabel}` : ''}`}
              >
                <span className="subject-grade-name">{item.subjectName}</span>
                {item.gradeLabel && <span className="subject-grade-level">{item.gradeLabel}</span>}
              </span>
            ))}
            {hiddenSubjectsCount > 0 && <span className="subject-tag subject-tag-more">+{hiddenSubjectsCount}</span>}
          </div>
        )}

        {/* 4) Rating + số lượt đánh giá + tổng số buổi học */}
        <div className="tutor-rating-row">
          <span className="tutor-rating-star">
            <StarIcon />
          </span>
          <span className="tutor-rating-value">{tutor.rating.toFixed(1)}</span>
          <span className="tutor-rating-count">({tutor.totalReviews.toLocaleString('vi-VN')} đánh giá)</span>
          <span className="tutor-rating-dot" aria-hidden="true">•</span>
          <span className="tutor-lessons-count">{tutor.totalLessons.toLocaleString('vi-VN')} buổi học</span>
        </div>

        {/* 5) Giá môn học thấp nhất */}
        {hasPrice && (
          <div className="tutor-price">
            <span className="tutor-price-value">{formatFromPrice(tutor.minPrice as number)}</span>
          </div>
        )}
      </div>

      <div className="tutor-card-footer">
        <div className="tutor-actions">
          <button className="btn-details" onClick={handleMessageClick}>
            Nhắn tin
          </button>
          <button className="btn-start-plan" onClick={handleButtonClick}>
            <span className="btn-start-plan-text">XEM HỒ SƠ</span>
            <span className="btn-start-plan-icon">
              <ArrowIcon />
            </span>
          </button>
        </div>
      </div>

      {showVideoModal &&
        tutor.videoUrl &&
        createPortal(
          <div className="tutor-video-modal" role="dialog" aria-modal="true" onClick={closeVideoModal}>
            <button type="button" className="tutor-video-modal-close" onClick={closeVideoModal} aria-label="Đóng video">
              ✕
            </button>
            <div className="tutor-video-modal-content" onClick={(e) => e.stopPropagation()}>
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                  title={`Video giới thiệu - ${tutor.name}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={tutor.videoUrl} controls autoPlay />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TutorCard;
