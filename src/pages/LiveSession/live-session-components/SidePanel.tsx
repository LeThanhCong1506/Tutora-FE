import { useState } from 'react';
import { MessageCircle, NotebookPen, X } from 'lucide-react';
import type { ChatMessage } from './types';
import type { LiveEmotionAlert } from './hooks/useAgoraCall';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';
import BehaviorPanel from './BehaviorPanel';
import styles from '../styles.module.css';

type SidePanelTab = 'chat' | 'notes' | 'behavior';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  notesStorageKey: string;
  /** Tab "Theo dõi" chỉ dựng cho GIA SƯ — truyền props này thì tab mới xuất hiện. */
  behavior?: {
    trackingOn: boolean;
    onToggleTracking: () => void;
    alerts: LiveEmotionAlert[];
    disabled?: boolean;
  };
}

const SidePanel = ({
  open,
  onClose,
  messages,
  onSendMessage,
  notesStorageKey,
  behavior,
}: SidePanelProps) => {
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

  const openBehaviorTab = () => {
    setSeenCount(messages.length);
    setActiveTab('behavior');
  };

  if (!open) return null;

  return (
    <aside className={styles.sidePanel} aria-label="Trò chuyện và ghi chú buổi học">
      <button
        type="button"
        className={styles.sidePanelCloseBtn}
        onClick={onClose}
        title="Đóng"
        aria-label="Đóng bảng bên"
      >
        <X size={16} />
      </button>
      <div className={styles.sidePanelTabs} role="tablist" aria-label="Nội dung bảng bên">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chat'}
          className={`${styles.sidePanelTab} ${activeTab === 'chat' ? styles.sidePanelTabActive : ''}`}
          onClick={openChatTab}
        >
          <MessageCircle size={14} aria-hidden />
          <span>Trò chuyện</span>
          {unread > 0 && <span className={styles.sidePanelBadge}>{unread}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={`${styles.sidePanelTab} ${activeTab === 'notes' ? styles.sidePanelTabActive : ''}`}
          onClick={openNotesTab}
        >
          <NotebookPen size={14} aria-hidden />
          <span>Ghi chú</span>
        </button>
        {behavior && (
          <button
            className={`${styles.sidePanelTab} ${activeTab === 'behavior' ? styles.sidePanelTabActive : ''}`}
            onClick={openBehaviorTab}
          >
            Theo dõi
            {behavior.trackingOn && (
              <span
                title="Đang theo dõi"
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ef4444',
                  marginLeft: 6,
                  verticalAlign: 'middle',
                }}
              />
            )}
          </button>
        )}
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
        {behavior && (
          <div style={{ display: activeTab === 'behavior' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
            <BehaviorPanel
              trackingOn={behavior.trackingOn}
              onToggleTracking={behavior.onToggleTracking}
              alerts={behavior.alerts}
              disabled={behavior.disabled}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidePanel;
