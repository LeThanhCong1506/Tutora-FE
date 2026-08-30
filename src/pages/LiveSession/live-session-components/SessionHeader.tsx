import { Clock3, PanelRightClose, PanelRightOpen, Video } from 'lucide-react';
import styles from '../styles.module.css';

interface SessionHeaderProps {
  participantLabel: string;
  elapsedLabel: string;
  panelOpen: boolean;
  onTogglePanel: () => void;
  /** True khi buổi học đang được ghi hình — hiện chỉ báo để người dùng biết. */
  isRecording?: boolean;
}

const SessionHeader = ({
  participantLabel,
  elapsedLabel,
  panelOpen,
  onTogglePanel,
  isRecording = false,
}: SessionHeaderProps) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerStatusGroup}>
          {isRecording ? (
            <span className={styles.recordingBadge} role="status" title="Buổi học đang được ghi hình">
              <span className={styles.recordingDot} />
              <Video size={13} aria-hidden />
              <span className={styles.recordingLabel}>Đang ghi hình</span>
            </span>
          ) : (
            <>
              <span className={styles.liveDot} />
              <span className={styles.liveLabel}>Buổi học trực tiếp</span>
            </>
          )}
        </div>
        {participantLabel && (
          <div className={styles.headerSessionMeta}>
            <span className={styles.headerDivider} />
            <span className={styles.headerSubject} title={participantLabel}>
              {participantLabel}
            </span>
            <span className={styles.headerTimer} aria-label={`Thời lượng ${elapsedLabel}`}>
              <Clock3 size={13} aria-hidden />
              {elapsedLabel}
            </span>
          </div>
        )}
      </div>
      <div className={styles.headerRight}>
        <button
          type="button"
          className={styles.headerIconBtn}
          onClick={onTogglePanel}
          title={panelOpen ? 'Ẩn bảng bên' : 'Hiện bảng bên'}
          aria-label={panelOpen ? 'Ẩn bảng bên' : 'Hiện bảng bên'}
          aria-pressed={panelOpen}
        >
          {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>
    </div>
  );
};

export default SessionHeader;
