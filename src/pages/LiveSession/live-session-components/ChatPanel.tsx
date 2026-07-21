import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { ChatMessage } from './types';
import styles from '../styles.module.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

const formatTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const ChatPanel = ({ messages, onSend }: ChatPanelProps) => {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Tự cuộn xuống cuối khi có tin mới.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatList} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <span className={styles.chatEmptyIcon} aria-hidden>
              <MessageCircle size={22} />
            </span>
            <strong>Chưa có tin nhắn</strong>
            <span>Tin nhắn chỉ hiển thị trong buổi học này và không được lưu lại.</span>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`${styles.chatBubbleRow} ${m.isLocal ? styles.chatBubbleRowLocal : ''}`}>
              <div className={`${styles.chatBubble} ${m.isLocal ? styles.chatBubbleLocal : ''}`}>
                {!m.isLocal && <div className={styles.chatSender}>{m.senderName}</div>}
                <div className={styles.chatText}>{m.text}</div>
                <div className={styles.chatTime}>{formatTime(m.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.sidePanelInputRow}>
        <input
          className={styles.sidePanelInput}
          placeholder="Nhắn tin..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={1000}
        />
        <button
          type="button"
          className={styles.sidePanelSendBtn}
          onClick={submit}
          disabled={!draft.trim()}
          title="Gửi"
          aria-label="Gửi tin nhắn"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
