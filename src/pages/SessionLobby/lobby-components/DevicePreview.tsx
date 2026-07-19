import type { RefObject } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import styles from '../styles.module.css';

interface DevicePreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  camOn: boolean;
  micOn: boolean;
  streaming: boolean;
  error: string | null;
  /** Chữ cái đầu tên người dùng — hiển thị khi camera tắt/chưa sẵn sàng. */
  myInitial: string;
  onToggleCam: () => void;
  onToggleMic: () => void;
}

const DevicePreview = ({
  videoRef,
  camOn,
  micOn,
  streaming,
  error,
  myInitial,
  onToggleCam,
  onToggleMic,
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
              {error ? 'Không dùng được camera' : camOn ? 'Đang bật camera…' : 'Camera đang tắt'}
            </span>
          </div>
        )}

        {!micOn && !error && (
          <span className={styles.previewMicBadge} title="Micro đang tắt" aria-hidden="true">
            <MicOff size={14} />
          </span>
        )}
      </div>

      {error && <p className={styles.previewError}>{error}</p>}

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
