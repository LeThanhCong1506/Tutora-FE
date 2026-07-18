import { ArrowUpRight, CalendarSearch, CircleAlert, RefreshCw } from 'lucide-react';
import styles from '../styles.module.css';
import type { LessonViewMode } from './types';

export const LoadingState = ({ mode }: { mode: LessonViewMode }) => (
  <div className={`${styles.loadingLayout} ${styles[`${mode}Loading`]}`} aria-label="Đang tải buổi học">
    {Array.from({ length: mode === 'calendar' ? 7 : 6 }, (_, index) => (
      <span key={index} />
    ))}
  </div>
);

export const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className={styles.stateBox} role="alert">
    <span className={`${styles.stateIcon} ${styles.errorIcon}`}>
      <CircleAlert size={24} />
    </span>
    <strong>Không thể tải lịch học</strong>
    <p>Đường truyền có thể đang gián đoạn. Bạn hãy thử lại nhé.</p>
    <button type="button" onClick={onRetry}>
      <RefreshCw size={15} /> Thử lại
    </button>
  </div>
);

export const EmptyState = ({
  filtered,
  period,
  onBooking,
  ctaLabel = 'Đặt lịch học',
  description = 'Bạn có thể chuyển sang khoảng thời gian khác hoặc đặt lịch mới.',
}: {
  filtered: boolean;
  period: string;
  onBooking: () => void;
  /** Nhãn nút CTA khi trống — trang gia sư đổi thành "Thiết lập lịch rảnh". */
  ctaLabel?: string;
  description?: string;
}) => (
  <div className={styles.stateBox}>
    <span className={`${styles.stateIcon} ${styles.emptyStateIcon}`}>
      <CalendarSearch size={26} strokeWidth={1.9} />
    </span>
    <strong>{filtered ? 'Không có buổi học phù hợp' : `Chưa có buổi học trong ${period}`}</strong>
    <p>{filtered ? 'Hãy chọn trạng thái khác để xem lịch học.' : description}</p>
    {!filtered && (
      <button type="button" onClick={onBooking}>
        {ctaLabel} <ArrowUpRight size={15} />
      </button>
    )}
  </div>
);
