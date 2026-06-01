import styles from './styles.module.css';
import MessageBubble from './MessageBubble';
import type { ChatMessage } from '../../services/chat.service';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Loader2, Video, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingRequestCard from '../../components/BookingRequestCard/BookingRequestCard';


interface ChatMessagesAreaProps {
  messages: Array<ChatMessage>;
  loading: boolean;
  currentUserId: string | null;
  loadMessages: (query?: { page: number; pageSize: number; search?: string }) => Promise<void>;
  hasMore: boolean;
  isTutor?: boolean;
  onProceedToPayment?: (bookingId: number) => void;
  isOtherTyping?: boolean;
}

/** Renders a meet_link message as a clickable card */
const MeetLinkCard = ({ message }: { message: ChatMessage }) => {
  // Extract meeting link from content
  const linkMatch = message.content.match(/https?:\/\/[^\s]+/);
  const meetLink = linkMatch?.[0] || '';

  return (
    <div className={styles.systemMessageContainer}>
      <div className={styles.systemCard} style={{ borderLeft: '3px solid #1a73e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Video size={16} style={{ color: '#1a73e8' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Link buổi học
          </span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#3e2f28', whiteSpace: 'pre-line' }}>
          {message.content}
        </p>
        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#1a73e8',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Video size={14} />
            Tham gia buổi học
          </a>
        )}
      </div>
    </div>
  );
};

/** Renders a booking_accepted or booking_declined system message */
const BookingStatusCard = ({
  message,
  isParent,
}: {
  message: ChatMessage;
  isParent: boolean;
}) => {
  const isAccepted = message.messageType === 'booking_accepted';
  const color = isAccepted ? '#2e7d32' : '#c62828';
  const Icon = isAccepted ? CheckCircle : XCircle;

  return (
    <div className={styles.systemMessageContainer}>
      <div className={styles.systemCard} style={{ borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon size={16} style={{ color }} />
            <span style={{ fontWeight: 600, fontSize: '13px', color }}>
              {message.content}
            </span>
          </div>

          {isAccepted && isParent && (
            <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              Xem chi tiết và thanh toán tại trang Đặt lịch
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatMessagesArea = ({
  messages,
  loading,
  currentUserId,
  hasMore,
  loadMessages,
  isTutor = false,
  onProceedToPayment,
  isOtherTyping = false
}: ChatMessagesAreaProps) => {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className={styles.messagesArea}>
        <div className={styles.chatLoadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.chatLoadingText}>Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.messagesArea}>
        <div className={styles.chatEmptyState}>
          <p className={styles.emptyStateText}>Chưa có tin nhắn nào</p>
        </div>
      </div>
    );
  }

  const getMessages = async () => {
    await loadMessages({ page: page + 1, pageSize: 50 });
    setPage((prev) => prev + 1);
  };

  return (
    <div
      id="top-chat-div"
      className={styles.messagesArea}
      style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
      }}
    >
      {isOtherTyping && (
        <div className={styles.typingIndicator}>
          <span className={styles.typingDots}>
            <span /><span /><span />
          </span>
          <span>Đang nhập...</span>
        </div>
      )}
      <InfiniteScroll
        dataLength={messages.length}
        next={getMessages}
        style={{ display: 'flex', flexDirection: 'column-reverse', paddingBottom: '16px' }}
        inverse={true}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center py-4">
            <Loader2 size={24} className={styles.sendingSpinner} />
          </div>
        }
        scrollableTarget="top-chat-div"
      >
        {messages.map((msg, index) => {
          // Booking request card — tutor sees full card with actions, parent sees simple text
          if (msg.messageType === 'booking_request') {
            if (isTutor) {
              return (
                <div key={msg.messageId || index} className={styles.systemMessageContainer}>
                  <BookingRequestCard
                    message={msg}
                    isTutor={isTutor}
                    onProceedToPayment={onProceedToPayment}
                  />
                </div>
              );
            }
            // Parent view: simple system message
            return (
              <div key={msg.messageId || index} className={styles.systemMessageContainer}>
                <div className={styles.systemCard} style={{ borderLeft: '3px solid #7c6f5b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <BookOpen size={16} style={{ color: '#7c6f5b' }} />
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#7c6f5b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Yêu cầu đặt lịch đã được gửi
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/parent-portal/booking')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '12px',
                      color: '#1a73e8',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontStyle: 'italic',
                    }}
                  >
                    Xem chi tiết tại trang Đặt lịch →
                  </button>
                </div>
              </div>
            );
          }

          // Meet link card
          if (msg.messageType === 'meet_link') {
            return <MeetLinkCard key={msg.messageId || index} message={msg} />;
          }

          // Booking accepted/declined system cards
          if (msg.messageType === 'booking_accepted' || msg.messageType === 'booking_declined') {
            return (
              <BookingStatusCard
                key={msg.messageId || index}
                message={msg}
                isParent={!isTutor}
              />
            );
          }

          // Regular text or image message
          return (
            <MessageBubble
              key={msg.messageId || index}
              message={msg.content}
              time={msg.createdAt}
              isSender={currentUserId ? msg.senderId === currentUserId : false}
              isRead={msg.isRead}
              messageType={msg.messageType}
            />
          );
        })}
      </InfiniteScroll>
    </div>
  );
};

export default ChatMessagesArea;
