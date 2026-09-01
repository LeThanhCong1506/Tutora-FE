import { BookOpen, SearchX } from 'lucide-react';
import styles from '../styles.module.css';

export interface EmptyStateProps {
  /** `search`: có lớp nhưng không khớp từ khoá. `none`: chưa có buổi học nào. */
  variant: 'none' | 'search';
  query?: string;
  onFindTutor: () => void;
  onClearSearch: () => void;
}

const EmptyState = ({ variant, query, onFindTutor, onClearSearch }: EmptyStateProps) => {
  if (variant === 'search') {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <SearchX size={22} />
        </span>
        <h2>Không tìm thấy lớp nào</h2>
        <p>Không có môn học hay gia sư nào khớp với “{query}”.</p>
        <button type="button" className={styles.ghostBtn} onClick={onClearSearch}>
          Xoá tìm kiếm
        </button>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <BookOpen size={22} />
      </span>
      <h2>Bạn chưa có buổi học nào</h2>
      <p>
        Sau khi đặt lịch với gia sư, trang này sẽ hiển thị tiến độ từng môn, buổi học kế tiếp và những buổi cần bạn xác
        nhận.
      </p>
      <button type="button" className={styles.primaryBtn} onClick={onFindTutor}>
        Tìm gia sư
      </button>
    </div>
  );
};

export default EmptyState;
