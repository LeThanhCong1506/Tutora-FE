import React, { useState } from 'react';
import { YoutubeFilled } from '@ant-design/icons';
import { Check, CirclePlay, Link2, LoaderCircle, Pencil, Video, X } from 'lucide-react';
import styles from './IntroVideoSection.module.css';
import { getYouTubeEmbedUrl, isValidYouTubeUrl } from '../../../utils/youtube';

interface IntroVideoSectionProps {
  videoUrl: string | null;
  /** Lưu link YouTube qua API. Trả về URL đã lưu, hoặc null nếu thất bại. */
  onSave: (url: string) => Promise<string | null>;
  isEditMode: boolean;
  isSaving?: boolean;
}

const Label = () => (
  <div className={styles.label}>
    <Video size={15} strokeWidth={2.4} />
    <span>Video giới thiệu</span>
  </div>
);

const PlatformBadge = () => (
  <div className={styles.platformBadge} title="YouTube" aria-label="YouTube">
    <YoutubeFilled className={styles.youtubeLogo} />
  </div>
);

const IntroVideoSection: React.FC<IntroVideoSectionProps> = ({ videoUrl, onSave, isEditMode, isSaving = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  // Xem trước trực tiếp theo link đang gõ (null nếu chưa hợp lệ).
  const previewEmbedUrl = getYouTubeEmbedUrl(inputValue);

  const handleSave = async () => {
    const url = inputValue.trim();
    if (!url) {
      setError('Vui lòng nhập link video YouTube.');
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setError('Link YouTube không hợp lệ. Ví dụ: https://www.youtube.com/watch?v=...');
      return;
    }
    setError(null);
    const saved = await onSave(url);
    if (saved) {
      setIsEditingUrl(false);
      setInputValue('');
    } else {
      setError('Lưu video thất bại. Vui lòng thử lại.');
    }
  };

  const startEditing = () => {
    setInputValue(videoUrl ?? '');
    setError(null);
    setIsEditingUrl(true);
  };

  const cancelEditing = () => {
    setIsEditingUrl(false);
    setInputValue('');
    setError(null);
  };

  // ===== Preview mode (read-only) =====
  if (!isEditMode) {
    if (!embedUrl) {
      return (
        <div className={styles.container}>
          <div className={styles.noVideo}>
            <div className={styles.noVideoIcon}>
              <CirclePlay size={30} strokeWidth={1.8} />
            </div>
            <div>
              <span>Chưa có video giới thiệu</span>
              <p>Video sẽ hiển thị ở đây sau khi gia sư cập nhật.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div className={styles.videoCard}>
          <div className={styles.cardHeader}>
            <Label />
            <PlatformBadge />
          </div>
          <div className={styles.videoSurface}>
            <iframe
              className={styles.iframe}
              src={embedUrl}
              title="Video giới thiệu"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  // ===== Edit mode - saving =====
  if (isSaving) {
    return (
      <div className={styles.container}>
        <div className={styles.uploadingState}>
          <div className={styles.cardHeader}>
            <Label />
            <PlatformBadge />
          </div>
          <div className={styles.uploadingContent}>
            <LoaderCircle className={styles.spinner} size={34} strokeWidth={2.2} />
            <span className={styles.uploadingText}>Đang lưu video...</span>
            <span className={styles.uploadingHint}>Vui lòng đợi trong giây lát</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== Edit mode - has video, not editing → show embed + edit button =====
  if (embedUrl && !isEditingUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.videoCard}>
          <div className={styles.cardHeader}>
            <Label />
            <div className={styles.headerActions}>
              <PlatformBadge />
              <button
                type="button"
                className={styles.editBtn}
                onClick={startEditing}
                title="Đổi link video"
                aria-label="Đổi link video"
              >
                <Pencil size={18} strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <div className={styles.videoSurface}>
            <iframe
              className={styles.iframe}
              src={embedUrl}
              title="Video giới thiệu"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className={styles.cardFooter}>
            <span className={styles.liveDot} />
            <span>Đang hiển thị trên hồ sơ marketplace</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== Edit mode - URL input (no video, or editing) =====
  const canCancel = !!embedUrl;

  return (
    <div className={styles.container}>
      <div className={styles.urlEditCard}>
        <div className={styles.cardHeader}>
          <div className={styles.titleBlock}>
            <Label />
            <h3>Giới thiệu bằng video</h3>
          </div>
          <PlatformBadge />
        </div>

        <div className={styles.previewArea}>
          {previewEmbedUrl ? (
            <iframe
              className={styles.iframe}
              src={previewEmbedUrl}
              title="Xem trước video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className={styles.previewPlaceholder}>
              <div className={styles.previewIcon}>
                <YoutubeFilled className={styles.previewYoutubeLogo} />
                <CirclePlay size={26} strokeWidth={1.8} />
              </div>
              <strong>Chưa có video</strong>
              <span>Thêm link YouTube để xem trước</span>
            </div>
          )}
        </div>

        <div className={styles.urlPanel}>
          <label className={styles.inputLabel} htmlFor="intro-video-url">
            Link YouTube
          </label>
          <div className={styles.urlRow}>
            <div className={styles.inputWrapper}>
              <Link2 className={styles.inputIcon} size={18} strokeWidth={2.1} />
              <input
                id="intro-video-url"
                type="url"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                placeholder="https://www.youtube.com/watch?v=..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
            </div>
            <div className={styles.editActions}>
              {canCancel && (
                <button type="button" className={styles.cancelBtn} onClick={cancelEditing} title="Hủy" aria-label="Hủy">
                  <X size={20} strokeWidth={2.3} />
                </button>
              )}
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                title="Lưu video"
                aria-label="Lưu video"
              >
                <Check size={21} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <div className={styles.helperRow}>
            {error ? (
              <span className={styles.error}>{error}</span>
            ) : (
              <span>Video sẽ xuất hiện trên hồ sơ marketplace của bạn.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroVideoSection;
