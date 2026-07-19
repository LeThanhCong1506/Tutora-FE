import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import styles from '../styles.module.css';

interface SessionHeaderProps {
  participantLabel: string;
  elapsedLabel: string;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

const SessionHeader = ({ participantLabel, elapsedLabel, panelOpen, onTogglePanel }: SessionHeaderProps) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.liveDot} />
        <span className={styles.liveLabel}>Buổi học trực tiếp</span>
        {participantLabel && (
          <>
            <span className={styles.headerDivider} />
            <span className={styles.headerSubject}>{participantLabel}</span>
          </>
        )}
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
      </div>
    </div>
  );
};

export default SessionHeader;
