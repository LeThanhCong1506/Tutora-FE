import { Plus, SearchX, UserPlus } from 'lucide-react';
import styles from '../styles.module.css';

export interface EmptyStateProps {
  /** `search`: có hồ sơ nhưng không khớp từ khoá. `none`: chưa có hồ sơ nào. */
  variant: 'none' | 'search';
  query?: string;
  onAdd: () => void;
  onClearSearch: () => void;
}

const EmptyState = ({ variant, query, onAdd, onClearSearch }: EmptyStateProps) => {
  if (variant === 'search') {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <SearchX size={22} />
        </span>
        <h2>Không tìm thấy hồ sơ nào</h2>
        <p>Không có con nào khớp với “{query}”.</p>
        <button type="button" className={styles.ghostBtn} onClick={onClearSearch}>
          Xoá tìm kiếm
        </button>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <UserPlus size={22} />
      </span>
      <h2>Chưa có hồ sơ học sinh nào</h2>
      <p>
        Thêm hồ sơ cho con để đặt lịch với gia sư và theo dõi lịch học, buổi đã hoàn thành cùng các buổi cần bạn xác
        nhận.
      </p>
      <button type="button" className={styles.primaryBtn} onClick={onAdd}>
        <Plus size={15} /> Thêm con đầu tiên
      </button>
    </div>
  );
};

export default EmptyState;
