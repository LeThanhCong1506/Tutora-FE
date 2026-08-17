import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../ParentMessage/styles.module.css';
import ChatArea from '../ParentMessage/ChatArea';
import MessageListSidebar from '../ParentMessage/MessageListSidebar';
import SupportChatPage from '../Support/SupportChatPage';
import type { ChatChannel } from '../../services/chat.service';
import { getUserIdFromToken } from '../../services/auth.service';

const MOBILE_BREAKPOINT = 768;

const TutorPortalMessages = () => {
  const userId = getUserIdFromToken();
  const location = useLocation();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(
    () => (location.state as { openChannel?: ChatChannel } | null)?.openChannel ?? null,
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showAdminChat, setShowAdminChat] = useState(false);

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
          <span className={styles.pageEyebrow}>Kết nối</span>
          <h1 className={styles.pageTitle}>Tin nhắn</h1>
          <p className={styles.pageSubtitle}>Đồng hành cùng phụ huynh và học sinh trong từng buổi học.</p>
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
            isTutor={true}
            onBack={isMobile ? handleBackToList : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default TutorPortalMessages;
