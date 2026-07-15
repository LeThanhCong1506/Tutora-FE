import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import styles from '../styles.module.css';

interface NotesPanelProps {
  /** Khoá lưu ghi chú (theo buổi học) trong localStorage. */
  storageKey: string;
}

const NOTES_PREFIX = 'live-session-notes:';

/**
 * Ghi chú cá nhân của người dùng trong buổi học. Lưu localStorage theo buổi
 * (không lên server, không chia sẻ) — giữ được khi lỡ reload, xoá tay khi cần.
 */
const NotesPanel = ({ storageKey }: NotesPanelProps) => {
  const key = `${NOTES_PREFIX}${storageKey}`;
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // Tự lưu sau khi ngừng gõ 500ms (debounce). Bỏ qua lần render đầu (chỉ là nạp).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, value);
        setSavedAt(Date.now());
      } catch {
        /* bỏ qua lỗi ghi */
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [value, key]);

  const clearNotes = () => {
    setValue('');
    try {
      localStorage.removeItem(key);
    } catch {
      /* bỏ qua */
    }
    setSavedAt(null);
  };

  return (
    <div className={styles.notesPanel}>
      <div className={styles.notesHeader}>
        <span className={styles.notesHint}>
          Ghi chú riêng của bạn, chỉ lưu trên máy này.
        </span>
        {value && (
          <button className={styles.notesClearBtn} onClick={clearNotes} title="Xoá ghi chú">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <textarea
        className={styles.notesTextarea}
        placeholder="Viết ghi chú buổi học tại đây..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className={styles.notesFooter}>
        {savedAt ? '✓ Đã lưu tự động' : 'Ghi chú sẽ tự lưu khi bạn gõ'}
      </div>
    </div>
  );
};

export default NotesPanel;
