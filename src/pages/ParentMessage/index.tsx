import { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';
import ChatArea from './ChatArea';
import MessageListSidebar from './MessageListSidebar';
import type { ChatChannel } from '../../services/chat.service';
import { getUserIdFromToken } from '../../services/auth.service';

const MOBILE_BREAKPOINT = 768;

const ParentMessage = () => {
  const userId = getUserIdFromToken();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

  // Track viewport size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile: go back to chat list
  const handleBackToList = useCallback(() => {
    setSelectedChannel(null);
  }, []);

  // On mobile: show EITHER chat list or chat area
  const showChatList = !isMobile || !selectedChannel;
  const showChatArea = !isMobile || !!selectedChannel;

  return (
    <div className={styles.page}>
      <header className={`${styles.topBar} ${isMobile && selectedChannel ? styles.topBarHidden : ''}`}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.pageTitle}>Tin nhắn</h1>
        </div>
      </header>
      <div className={styles.mainContent}>
        {showChatList && (
          <MessageListSidebar
            onChannelSelect={() => {
              // Channel selection is handled by onChannelObjectSelect
            }}
            onChannelObjectSelect={setSelectedChannel}
            selectedChannelId={selectedChannel?.channelId ?? null}
          />
        )}
        {showChatArea && (
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
