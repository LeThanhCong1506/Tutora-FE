import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './styles.module.css';
import ChatArea from './ChatArea';
import MessageListSidebar from './MessageListSidebar';
import SupportChatPage from '../Support/SupportChatPage';
import { getChats, type ChatChannel } from '../../services/chat.service';
import { getUserIdFromToken } from '../../services/auth.service';

const MOBILE_BREAKPOINT = 768;

const ParentMessage = () => {
  const userId = getUserIdFromToken();
  const location = useLocation();
  // Mở thẳng cuộc trò chuyện khi được điều hướng kèm `openChannel`
  // (vd bấm "Nhắn tin" trên thẻ gia sư ở trang tìm kiếm).
  const navState = location.state as { openChannel?: ChatChannel; openBookingId?: number } | null;
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(
    () => navState?.openChannel ?? null,
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showAdminChat, setShowAdminChat] = useState(false);

  // Mở thẳng kênh chat của một booking.
  const openBookingId = navState?.openBookingId ?? null;
  useEffect(() => {
    if (!openBookingId) return;
    let cancelled = false;
    const openByBooking = async () => {
      try {
        const response = await getChats();
        if (cancelled || response.statusCode !== 200) return;
        const channel = response.content.find((item) => item.bookingId === openBookingId);
        if (channel) {
          setShowAdminChat(false);
          setSelectedChannel(channel);
        }
      } catch (err) {
        console.error('Error opening chat channel by booking:', err);
      }
    };
    void openByBooking();
    return () => {
      cancelled = true;
    };
  }, [openBookingId]);

  // Track viewport size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile: go back to chat list
  const handleBackToList = useCallback(() => {
    setSelectedChannel(null);
    setShowAdminChat(false);
  }, []);

  // On mobile: show EITHER chat list or chat area
  const showChatList = !isMobile || (!selectedChannel && !showAdminChat);
  const showChatArea = !isMobile || !!selectedChannel || showAdminChat;

  return (
    <div className={styles.page}>
      <header className={`${styles.topBar} ${isMobile && (selectedChannel || showAdminChat) ? styles.topBarHidden : ''}`}>
        <div className={styles.topBarLeft}>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Tin nhắn</h1>
            <button
              type="button"
              className={`${styles.pageInfoButton} ${styles.pageTitleInfoButton}`}
              aria-label="Thông tin về trang Tin nhắn"
            >
              <span className="material-symbols-outlined" aria-hidden="true">help</span>
              <span className={styles.pageInfoBubble} role="tooltip">
                Trao đổi cùng gia sư và theo dõi mọi thông tin học tập trong một nơi.
              </span>
            </button>
          </div>
        </div>
      </header>
      <div className={styles.mainContent}>
        {showChatList && (
          <MessageListSidebar
            onChannelSelect={() => {
              // Channel selection is handled by onChannelObjectSelect
            }}
            onChannelObjectSelect={(channel) => {
              setShowAdminChat(false);
              setSelectedChannel(channel);
            }}
            onAdminChatSelect={() => {
              setSelectedChannel(null);
              setShowAdminChat(true);
            }}
            selectedChannelId={selectedChannel?.channelId ?? null}
            currentUserId={userId}
          />
        )}
        {showAdminChat ? (
          <SupportChatPage embedded onBack={isMobile ? handleBackToList : undefined} />
        ) : showChatArea && (
          <ChatArea
            selectedChannelId={selectedChannel?.channelId ?? null}
            currentUserId={userId}
            selectedChannel={selectedChannel}
            onBack={isMobile ? handleBackToList : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default ParentMessage;
