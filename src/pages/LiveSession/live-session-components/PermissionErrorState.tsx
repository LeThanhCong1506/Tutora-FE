import { AlertTriangle, ArrowLeft } from 'lucide-react';
import styles from '../styles.module.css';

interface PermissionErrorStateProps {
  message: string;
  onBack: () => void;
}

const PermissionErrorState = ({ message, onBack }: PermissionErrorStateProps) => {
  return (
    <div className={styles.errorScreen}>
      <div className={styles.errorIconWrap}>
        <AlertTriangle size={28} />
      </div>
      <div className={styles.errorTitle}>Không thể vào buổi học</div>
      <div className={styles.errorMessage}>{message}</div>
      <button className={styles.errorBackBtn} onClick={onBack}>
        <ArrowLeft size={15} /> Quay lại
      </button>
    </div>
  );
};

export default PermissionErrorState;
