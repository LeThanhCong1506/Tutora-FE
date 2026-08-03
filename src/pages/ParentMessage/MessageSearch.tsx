import styles from './styles.module.css';
import { Search } from 'lucide-react';

interface MessageSearchProps {
  onSearch: (query: string) => void;
}

const MessageSearch = ({ onSearch }: MessageSearchProps) => {
  return (
    <div className={styles.searchBlock}>
      <div className={styles.searchInputWrapper}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          className={styles.searchInput}
          placeholder="Tìm theo tên hoặc nội dung..."
          type="search"
          aria-label="Tìm kiếm cuộc trò chuyện"
          autoComplete="off"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

export default MessageSearch;
