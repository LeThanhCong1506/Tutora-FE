import styles from './styles.module.css';
import type { ProgressOverview } from './types';

type ProgressPanelProps = {
  progress: ProgressOverview;
};

const ProgressPanel = ({ progress }: ProgressPanelProps) => {
  return (
    <section className={styles.progressPanel}>
      <h3 className={styles.panelTitle}>{progress.title}</h3>
      <div className={styles.progressChartPlaceholder}>
        <span>{progress.chartLabel}</span>
      </div>
      <div className={styles.progressSummary}>
        <span className={styles.progressPercent}>{progress.percent}</span>
        <span className={styles.progressDescription}>{progress.description}</span>
      </div>
    </section>
  );
};

export default ProgressPanel;
