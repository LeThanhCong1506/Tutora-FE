import { useState } from 'react';
import { X } from 'lucide-react';
import type { ChatMessage } from './types';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';
import styles from '../styles.module.css';

type SidePanelTab = 'chat' | 'notes';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  notesStorageKey: string;
}

const SidePanel = ({ open, onClose, messages, onSendMessage, notesStorageKey }: SidePanelProps) => {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('chat');
  // Mốc "đã đọc": số tin đã thấy khi rời tab Chat. Đặt trong event (không phải
  // effect/render) để tránh cascading render và truy cập ref khi render.
  const [seenCount, setSeenCount] = useState(0);

  const chatVisible = open && activeTab === 'chat';
  // Khi tab Chat đang mở, coi như đã đọc hết → badge = 0. Khi ở tab khác, đếm
  // số tin đến sau mốc đã đọc gần nhất.
  const unread = chatVisible ? 0 : Math.max(0, messages.length - seenCount);

  const openChatTab = () => {
    setSeenCount(messages.length);
    setActiveTab('chat');
  };

  const openNotesTab = () => {
    // Ghi nhận đã đọc tới đây trước khi rời khỏi Chat.
    setSeenCount(messages.length);
    setActiveTab('notes');
  };

  if (!open) return null;

  return (
    <aside className={styles.sidePanel}>
      <button className={styles.sidePanelCloseBtn} onClick={onClose} title="Đóng">
        <X size={16} />
      </button>
      <div className={styles.sidePanelTabs}>
        <button
          className={`${styles.sidePanelTab} ${activeTab === 'chat' ? styles.sidePanelTabActive : ''}`}
          onClick={openChatTab}
        >
          Trò chuyện
          {unread > 0 && <span className={styles.sidePanelBadge}>{unread}</span>}
        </button>
        <button
          className={`${styles.sidePanelTab} ${activeTab === 'notes' ? styles.sidePanelTabActive : ''}`}
          onClick={openNotesTab}
        >
          Ghi chú
        </button>
      </div>

      {/* Cả hai panel luôn được mount để không mất trạng thái (draft chat, con trỏ
          ghi chú) khi chuyển tab; chỉ ẩn/hiện bằng CSS. */}
      <div className={styles.sidePanelBody}>
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
          <ChatPanel messages={messages} onSend={onSendMessage} />
        </div>
        <div style={{ display: activeTab === 'notes' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
          <NotesPanel storageKey={notesStorageKey} />
        </div>
      </div>
    </aside>
  );
};

export default SidePanel;
