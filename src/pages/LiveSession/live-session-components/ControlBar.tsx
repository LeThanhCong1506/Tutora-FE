import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff } from 'lucide-react';
import styles from '../styles.module.css';

interface ControlBarProps {
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  leaveLabel: string;
}

const ControlBar = ({
  micOn,
  camOn,
  isScreenSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onLeave,
  leaveLabel,
}: ControlBarProps) => {
  return (
    <div className={styles.controlBar}>
      <button
        className={`${styles.controlBtn} ${!micOn ? styles.controlBtnOff : ''}`}
        onClick={onToggleMic}
        title={micOn ? 'Tắt micro' : 'Bật micro'}
      >
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button
        className={`${styles.controlBtn} ${!camOn ? styles.controlBtnOff : ''}`}
        onClick={onToggleCam}
        title={camOn ? 'Tắt camera' : 'Bật camera'}
      >
        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
      <button
        className={`${styles.controlBtn} ${isScreenSharing ? styles.controlBtnActive : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
      >
        {isScreenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
      </button>
      <div className={styles.controlDivider} />
      <button className={styles.leaveBtn} onClick={onLeave}>
        <PhoneOff size={16} />
        <span>{leaveLabel}</span>
      </button>
    </div>
  );
};

export default ControlBar;
