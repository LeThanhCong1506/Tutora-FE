import styles from './styles.module.css';
import type { QuickStatItem } from './types';

type QuickStatsBarProps = {
  items: QuickStatItem[];
};

const QuickStatsBar = ({ items }: QuickStatsBarProps) => {
  return (
    <div className={styles.quickStatsBar}>
      <div className={styles.quickStatsRow}>
        {items.map((item) => (
          <div key={item.id} className={styles.quickStatItem}>
            <div className={styles.quickStatIcon}>
              <img src={item.icon} alt="" />
            </div>
            <div className={styles.quickStatContent}>
              <span className={styles.quickStatLabel}>{item.label}</span>
              <span className={styles.quickStatValue}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickStatsBar;
