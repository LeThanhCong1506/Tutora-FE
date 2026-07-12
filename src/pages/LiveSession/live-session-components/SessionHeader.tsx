import styles from '../styles.module.css';

interface SessionHeaderProps {
  subjectAndPeer: string;
  elapsedLabel: string;
  endLabel: string;
  onEnd: () => void;
}

const SessionHeader = ({ subjectAndPeer, elapsedLabel, endLabel, onEnd }: SessionHeaderProps) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.liveDot} />
        <span className={styles.liveLabel}>Buổi học trực tiếp</span>
        <span className={styles.headerDivider} />
        <span className={styles.headerSubject}>{subjectAndPeer}</span>
        <span className={styles.headerTimer}>{elapsedLabel}</span>
      </div>
      <button className={styles.endBtn} onClick={onEnd}>
        {endLabel}
      </button>
    </div>
  );
};

export default SessionHeader;
