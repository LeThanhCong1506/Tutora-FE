import { useState } from 'react';
import { X, MessageCircle, FileText, ListChecks } from 'lucide-react';
import type { ChatMessage } from './types';
import type { LiveEmotionAlert } from './hooks/useAgoraCall';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';
import BehaviorPanel from './BehaviorPanel';
import MaterialsTab from './practice/MaterialsTab';
import PracticeTab from './practice/PracticeTab';
import QuestionModal from './practice/QuestionModal';
import type { PracticeSet, PracticeQuestion } from '../../../services/practice.service';
import type { PracticeGeneration } from './practice/usePracticeGeneration';
import styles from '../styles.module.css';

/** Panel nào đang mở. null = đóng hết. */
export type SidePanelKind = 'chat' | 'notes' | 'behavior' | null;

interface SidePanelProps {
  /** Panel đang mở — chọn từ THANH CÔNG CỤ dưới, không còn tab-bar trong panel. */
  kind: SidePanelKind;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  notesStorageKey: string;
  /** Booking chứa buổi học — tài liệu và bài tập đều gắn theo booking. */
  bookingId: number | null;
  classSessionId: number | null;
  isTutor: boolean;
  /** Tiến trình sinh đề — sở hữu bởi LiveSession để sống qua việc đóng/mở panel. */
  generation: PracticeGeneration;
  /** Gia sư gửi câu hỏi -> báo cho học sinh qua RTM. */
  onPracticeSent: () => void;
  /** Tăng lên khi NHẬN được tín hiệu có bài tập mới (phía học sinh). */
  practiceSignal: number;
  /** Chỉ dựng cho GIA SƯ — truyền props này thì panel "Theo dõi" mới hoạt động. */
  behavior?: {
    trackingOn: boolean;
    onToggleTracking: () => void;
    alerts: LiveEmotionAlert[];
    disabled?: boolean;
  };
}

const TITLES: Record<Exclude<SidePanelKind, null>, string> = {
  chat: 'Trò chuyện',
  notes: 'Ghi chú',
  behavior: 'Theo dõi',
};

/**
 * Bảng bên phải — mỗi lần mở ĐÚNG MỘT panel, chọn từ thanh công cụ dưới (mẫu Preply).
 * Trước đây là tab-bar cố định trong panel; bỏ đi để thanh công cụ là chỗ điều hướng
 * duy nhất và panel có thêm chiều cao cho nội dung.
 */
/** Tab bên trong panel Trò chuyện. */
type ChatTabKey = 'chat' | 'materials' | 'practice';

const SidePanel = ({
  kind,
  onClose,
  messages,
  onSendMessage,
  notesStorageKey,
  bookingId,
  classSessionId,
  isTutor,
  generation,
  onPracticeSent,
  practiceSignal,
  behavior,
}: SidePanelProps) => {
  const [chatTab, setChatTab] = useState<ChatTabKey>('chat');
  const [openQuestion, setOpenQuestion] = useState<{ set: PracticeSet; question: PracticeQuestion } | null>(null);
  // Tăng lên sau mỗi thay đổi để PracticeTab tải lại danh sách.
  const [refreshToken, setRefreshToken] = useState(0);

  if (!kind) return null;
  // Vào thẳng bằng deep-link mà không phải gia sư thì không dựng panel Theo dõi.
  if (kind === 'behavior' && !behavior) return null;

  return (
    <aside className={styles.sidePanel} aria-label={TITLES[kind]}>
      <header className={styles.sidePanelHeader}>
        {kind === 'chat' ? (
          <div className={styles.chatTabs} role="tablist" aria-label="Nội dung trò chuyện">
            {([
              { key: 'chat' as const, label: 'Trò chuyện', icon: <MessageCircle size={15} /> },
              { key: 'materials' as const, label: 'Tài liệu', icon: <FileText size={15} /> },
              {
                key: 'practice' as const,
                label: isTutor ? 'AI Hỗ trợ' : 'Bài tập',
                icon: isTutor ? (
                  <img src="/images/icons/ai-assistant.png" alt="" className={styles.tabImageIcon} />
                ) : (
                  <ListChecks size={15} />
                ),
              },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-label={tab.label}
                aria-selected={chatTab === tab.key}
                className={`${styles.chatTab} ${chatTab === tab.key ? styles.chatTabActive : ''}`}
                onClick={() => setChatTab(tab.key)}
              >
                {tab.icon}
                {/* Tooltip tự dựng thay cho thuộc tính title: title hiện chậm (~1s),
                    nền trắng của hệ điều hành và không tắt được — lạc hẳn tông tối. */}
                <span className={styles.chatTabTooltip} aria-hidden>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <h2 className={styles.sidePanelTitle}>{TITLES[kind]}</h2>
        )}
        <button
          type="button"
          className={styles.sidePanelCloseBtn}
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng bảng bên"
        >
          <X size={16} />
        </button>
      </header>

      {/* MỌI panel/tab luôn được mount, chỉ ẩn/hiện bằng CSS — unmount là mất hết
          trạng thái đang chạy dở: draft chat, con trỏ ghi chú, lịch sử cảnh báo, và
          quan trọng nhất là tiến trình "Đang tạo câu hỏi" của tab AI (gia sư đổi
          sang tab khác rồi quay lại phải thấy nó vẫn đang chạy). */}
      <div className={styles.sidePanelBody}>
        <div style={{ display: kind === 'chat' && chatTab === 'chat' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
          <ChatPanel messages={messages} onSend={onSendMessage} />
        </div>
        <div
          style={{
            display: kind === 'chat' && chatTab === 'materials' ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
          }}
        >
          <MaterialsTab bookingId={bookingId} canUpload={isTutor} />
        </div>
        <div
          style={{
            display: kind === 'chat' && chatTab === 'practice' ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
          }}
        >
          <PracticeTab
            bookingId={bookingId}
            classSessionId={classSessionId}
            isTutor={isTutor}
            refreshToken={refreshToken + practiceSignal}
            generation={generation}
            onOpenQuestion={(set, question) => setOpenQuestion({ set, question })}
          />
        </div>
        <div style={{ display: kind === 'notes' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
          <NotesPanel storageKey={notesStorageKey} />
        </div>
        {behavior && (
          <div style={{ display: kind === 'behavior' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
            <BehaviorPanel
              trackingOn={behavior.trackingOn}
              onToggleTracking={behavior.onToggleTracking}
              alerts={behavior.alerts}
              disabled={behavior.disabled}
            />
          </div>
        )}
      </div>

      {openQuestion && (
        <QuestionModal
          key={openQuestion.question.id}
          set={openQuestion.set}
          question={openQuestion.question}
          isTutor={isTutor}
          onClose={() => setOpenQuestion(null)}
          onChanged={() => setRefreshToken((v) => v + 1)}
          onSent={onPracticeSent}
        />
      )}
    </aside>
  );
};

export default SidePanel;
