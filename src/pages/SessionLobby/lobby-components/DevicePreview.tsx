import type { RefObject } from 'react';
import { Mic, MicOff, RefreshCw, ShieldAlert, Video, VideoOff } from 'lucide-react';
import styles from '../styles.module.css';
import type { MediaErrorInfo } from '../../../utils/mediaPermissionError';

interface DevicePreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  camOn: boolean;
  micOn: boolean;
  streaming: boolean;
  error: MediaErrorInfo | null;
  /** Chữ cái đầu tên người dùng — hiển thị khi camera tắt/chưa sẵn sàng. */
  myInitial: string;
  onToggleCam: () => void;
  onToggleMic: () => void;
  onRetry: () => void;
}

/** Icon theo loại lỗi — "denied" cần biểu tượng khác để người dùng nhận ra ngay đây là vấn đề quyền, không phải thiết bị hỏng. */
const ERROR_ICON = { denied: ShieldAlert, 'not-found': VideoOff, 'in-use': VideoOff, other: VideoOff };

const DevicePreview = ({
  videoRef,
  camOn,
  micOn,
  streaming,
  error,
  myInitial,
  onToggleCam,
  onToggleMic,
  onRetry,
}: DevicePreviewProps) => {
  const showVideo = streaming && camOn && !error;

  return (
    <div className={styles.previewWrap}>
      <div className={styles.previewBox}>
        {/* <video> luôn mount để giữ ref; chỉ ẩn đi khi tắt cam / đang lỗi / chưa có luồng. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.previewVideo}
          style={{ visibility: showVideo ? 'visible' : 'hidden' }}
        />

        {!showVideo && (
          <div className={styles.previewOverlay}>
            <div className={styles.previewAvatar}>{myInitial}</div>
            <span className={styles.previewOverlayText}>
              {error ? error.title : camOn ? 'Đang bật camera…' : 'Camera đang tắt'}
            </span>
          </div>
        )}

        {!micOn && !error && (
          <span className={styles.previewMicBadge} title="Micro đang tắt" aria-hidden="true">
            <MicOff size={14} />
          </span>
        )}
      </div>

      {error && (
        <div className={styles.previewErrorBanner} role="alert">
          <div className={styles.previewErrorIcon}>
            {(() => {
              const Icon = ERROR_ICON[error.kind];
              return <Icon size={18} />;
            })()}
          </div>
          <div className={styles.previewErrorBody}>
            <strong>{error.title}</strong>
            <span>{error.message}</span>
          </div>
          <button type="button" className={styles.previewErrorRetryBtn} onClick={onRetry}>
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      <div className={styles.deviceRow}>
        <button
          type="button"
          className={`${styles.deviceBtn} ${!micOn ? styles.deviceBtnOff : ''}`}
          onClick={onToggleMic}
          title={micOn ? 'Tắt micro' : 'Bật micro'}
          aria-pressed={micOn}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          type="button"
          className={`${styles.deviceBtn} ${!camOn ? styles.deviceBtnOff : ''}`}
          onClick={onToggleCam}
          title={camOn ? 'Tắt camera' : 'Bật camera'}
          aria-pressed={camOn}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>
    </div>
  );
};

export default DevicePreview;
