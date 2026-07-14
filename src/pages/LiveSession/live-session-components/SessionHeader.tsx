import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import styles from '../styles.module.css';

interface SessionHeaderProps {
  subjectAndPeer: string;
  elapsedLabel: string;
  endLabel: string;
  onEnd: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

const SessionHeader = ({
  subjectAndPeer,
  elapsedLabel,
  endLabel,
  onEnd,
  panelOpen,
  onTogglePanel,
}: SessionHeaderProps) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.liveDot} />
        <span className={styles.liveLabel}>Buổi học trực tiếp</span>
        <span className={styles.headerDivider} />
        <span className={styles.headerSubject}>{subjectAndPeer}</span>
        <span className={styles.headerTimer}>{elapsedLabel}</span>
      </div>
      <div className={styles.headerRight}>
        <button
          className={styles.headerIconBtn}
          onClick={onTogglePanel}
          title={panelOpen ? 'Ẩn bảng bên' : 'Hiện bảng bên'}
        >
          {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
        <button className={styles.endBtn} onClick={onEnd}>
          {endLabel}
        </button>
      </div>
    </div>
  );
};

export default SessionHeader;
