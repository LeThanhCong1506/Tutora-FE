import React, { useEffect, useRef, useState } from 'react';
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
  guidanceSignal?: number;
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

const IntroVideoSection: React.FC<IntroVideoSectionProps> = ({
  videoUrl,
  onSave,
  isEditMode,
  isSaving = false,
  guidanceSignal = 0,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  // Xem trước trực tiếp theo link đang gõ (null nếu chưa hợp lệ).
  const previewEmbedUrl = getYouTubeEmbedUrl(inputValue);

  useEffect(() => {
    if (embedUrl || !isEditMode) {
      const resetTimer = window.setTimeout(() => setShowGuidance(false), 0);
      return () => window.clearTimeout(resetTimer);
    }
    if (!guidanceSignal) return;

    const showTimer = window.setTimeout(() => {
      setShowGuidance(true);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 450);
    const hideTimer = window.setTimeout(() => {
      setShowGuidance(false);
    }, 6500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(focusTimer);
      window.clearTimeout(hideTimer);
    };
  }, [embedUrl, guidanceSignal, isEditMode]);

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
            <div className={styles.noVideoText}>
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
    <div ref={sectionRef} className={styles.container}>
      <div className={`${styles.urlEditCard} ${showGuidance ? styles.guidedCard : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.titleBlock}>
            <Label />
            <h3>Giới thiệu bằng video</h3>
          </div>
          <PlatformBadge />
        </div>

        <div className={`${styles.previewArea} ${!previewEmbedUrl ? styles.previewAreaEmpty : ''}`}>
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
              </div>
              <strong>Chưa có video giới thiệu</strong>
              <span>Dán link YouTube bên dưới để xem trước</span>
            </div>
          )}
        </div>

        <div className={styles.urlPanel}>
          {showGuidance && (
            <div className={styles.guidanceMessage} role="status" aria-live="polite">
              <span className={styles.guidanceStep}>1</span>
              <div className={styles.guidanceCopy}>
                <strong>Dán link YouTube vào ô bên dưới</strong>
                <span>Sau đó nhấn nút dấu tích để lưu video.</span>
              </div>
            </div>
          )}
          <label className={styles.inputLabel} htmlFor="intro-video-url">
            Link YouTube
          </label>
          <div className={styles.urlRow}>
            <div className={styles.inputWrapper}>
              <Link2 className={styles.inputIcon} size={18} strokeWidth={2.1} />
              <input
                ref={inputRef}
                id="intro-video-url"
                type="url"
                className={`${styles.input} ${error ? styles.inputError : ''} ${showGuidance ? styles.inputGuided : ''}`}
                placeholder="https://www.youtube.com/watch?v=..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError(null);
                  if (showGuidance && e.target.value.trim()) setShowGuidance(false);
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
          {error && (
            <div className={styles.helperRow}>
              <span className={styles.error}>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntroVideoSection;
