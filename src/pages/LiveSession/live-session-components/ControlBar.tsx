import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Presentation,
  PhoneOff,
} from 'lucide-react';
import styles from '../styles.module.css';

interface ControlBarProps {
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  whiteboardOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleWhiteboard: () => void;
  onLeave: () => void;
  leaveLabel: string;
}

const ControlBar = ({
  micOn,
  camOn,
  isScreenSharing,
  whiteboardOn,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleWhiteboard,
  onLeave,
  leaveLabel,
}: ControlBarProps) => {
  return (
    <div className={styles.controlBar} role="toolbar" aria-label="Điều khiển buổi học">
      <button
        type="button"
        className={`${styles.controlBtn} ${!micOn ? styles.controlBtnOff : ''}`}
        onClick={onToggleMic}
        title={micOn ? 'Tắt micro' : 'Bật micro'}
        aria-label={micOn ? 'Tắt micro' : 'Bật micro'}
        aria-pressed={micOn}
      >
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button
        type="button"
        className={`${styles.controlBtn} ${!camOn ? styles.controlBtnOff : ''}`}
        onClick={onToggleCam}
        title={camOn ? 'Tắt camera' : 'Bật camera'}
        aria-label={camOn ? 'Tắt camera' : 'Bật camera'}
        aria-pressed={camOn}
      >
        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
      <button
        type="button"
        className={`${styles.controlBtn} ${isScreenSharing ? styles.controlBtnActive : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
        aria-label={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
        aria-pressed={isScreenSharing}
      >
        {isScreenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
      </button>
      <button
        type="button"
        className={`${styles.controlBtn} ${whiteboardOn ? styles.controlBtnActive : ''}`}
        onClick={onToggleWhiteboard}
        title={whiteboardOn ? 'Đóng bảng vẽ' : 'Mở bảng vẽ'}
        aria-label={whiteboardOn ? 'Đóng bảng vẽ' : 'Mở bảng vẽ'}
        aria-pressed={whiteboardOn}
      >
        <Presentation size={18} />
      </button>
      <div className={styles.controlDivider} />
      <button type="button" className={styles.leaveBtn} onClick={onLeave} aria-label={leaveLabel}>
        <PhoneOff size={16} />
        <span>{leaveLabel}</span>
      </button>
    </div>
  );
};

export default ControlBar;
