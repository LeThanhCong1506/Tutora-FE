import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import styles from '../styles.module.css';
import type { MediaErrorKind } from '../../../utils/mediaPermissionError';

interface PermissionErrorStateProps {
  title?: string;
  message: string;
  /** "denied" đổi icon để người dùng nhận ra ngay đây là vấn đề quyền, không phải phòng học bị lỗi. */
  kind?: MediaErrorKind;
  onBack: () => void;
  /** Có khi lỗi có thể tự khắc phục được (vd cấp lại quyền rồi tải lại trang) — ẩn nếu không truyền. */
  onRetry?: () => void;
}

const PermissionErrorState = ({
  title = 'Không thể vào buổi học',
  message,
  kind,
  onBack,
  onRetry,
}: PermissionErrorStateProps) => {
  const Icon = kind === 'denied' ? ShieldAlert : AlertTriangle;

  return (
    <div className={styles.errorScreen}>
      <div className={styles.errorIconWrap}>
        <Icon size={28} />
      </div>
      <div className={styles.errorTitle}>{title}</div>
      <div className={styles.errorMessage}>{message}</div>
      <div className={styles.errorActions}>
        {onRetry && (
          <button className={styles.errorRetryBtn} onClick={onRetry}>
            <RefreshCw size={15} /> Thử lại
          </button>
        )}
        <button className={styles.errorBackBtn} onClick={onBack}>
          <ArrowLeft size={15} /> Quay lại
        </button>
      </div>
    </div>
  );
};

export default PermissionErrorState;
