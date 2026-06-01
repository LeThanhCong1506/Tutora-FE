import styles from './styles.module.css';
import type { RecentSession } from './types';

type RecentSessionsProps = {
  sessions: RecentSession[];
};

const RecentSessions = ({ sessions }: RecentSessionsProps) => {
  return (
    <section className={styles.recentSessions}>
      <div className={styles.recentHeader}>
        <h3 className={styles.panelTitle}>Recent Sessions</h3>
        <button className={styles.linkButton} type="button">
          View History
        </button>
      </div>
      <div className={styles.recentList}>
        {sessions.map((session) => (
          <div key={session.id} className={styles.recentCard}>
            <h4 className={styles.recentTitle}>{session.title}</h4>
            <span className={styles.recentNote}>{session.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentSessions;
