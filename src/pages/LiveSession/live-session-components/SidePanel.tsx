import { useState } from 'react';
import { Send, X } from 'lucide-react';
import styles from '../styles.module.css';

type SidePanelTab = 'chat' | 'notes' | 'tools';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
}

const SidePanel = ({ open, onClose }: SidePanelProps) => {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('chat');

  if (!open) return null;

  return (
    <aside className={styles.sidePanel}>
      <button className={styles.sidePanelCloseBtn} onClick={onClose} title="Đóng">
        <X size={16} />
      </button>
      <div className={styles.sidePanelTabs}>
        {(['chat', 'notes', 'tools'] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.sidePanelTab} ${activeTab === tab ? styles.sidePanelTabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'chat' ? 'Trò chuyện' : tab === 'notes' ? 'Ghi chú' : 'Công cụ'}
          </button>
        ))}
      </div>

      <div className={styles.sidePanelBody}>
        {activeTab === 'chat' && (
          <div className={styles.sidePanelComingSoon}>
            Trò chuyện trong buổi học sẽ sớm ra mắt. Hiện tại bạn có thể trao đổi qua mục Tin nhắn.
          </div>
        )}
        {activeTab === 'notes' && (
          <div className={styles.sidePanelComingSoon}>Ghi chú buổi học sẽ sớm ra mắt.</div>
        )}
        {activeTab === 'tools' && (
          <div className={styles.sidePanelComingSoon}>Công cụ hỗ trợ buổi học sẽ sớm ra mắt.</div>
        )}
      </div>

      <div className={styles.sidePanelInputRow}>
        <input className={styles.sidePanelInput} placeholder="Nhắn tin..." disabled />
        <button className={styles.sidePanelSendBtn} disabled>
          <Send size={14} />
        </button>
      </div>
    </aside>
  );
};

export default SidePanel;
