import { useState, useEffect } from 'react';
import styles from './styles.module.css';
import MessageInfoItem from './MessageInfoItem';
import MessageSearch from './MessageSearch';
import { getChats, type ChatChannel } from '../../services/chat.service';
import { getOtherUserRoleLabel } from './chatRole';
import { signalRService } from '../../services/signalr.service';
import { useUsersPresence } from '../../hooks/useUserPresence';
import { normalizePresenceUserId } from '../../utils/presence';

interface MessageListSidebarProps {
  onChannelSelect: (channelId: number | null) => void;
  onChannelObjectSelect?: (channel: ChatChannel | null) => void;
  onAdminChatSelect?: () => void;
  selectedChannelId: number | null;
  currentUserId?: string | null;
}

// Helper function to format date/time
const formatTimestamp = (dateString: string | null): string => {
  if (!dateString) return '';
  const safeDateString = dateString.includes('Z') || dateString.includes('+') ? dateString : `${dateString}Z`;
  const date = new Date(safeDateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
  return date.toLocaleDateString('vi-VN', options);
};

// Helper function to format message preview (hide raw URLs)
const formatPreview = (text: string | null): string => {
  if (!text) return 'Chưa có tin nhắn';
  if (text.startsWith('http') && (text.includes('supabase.co/storage') || text.match(/\.(jpeg|jpg|gif|png)$/i))) {
    return '[Hình ảnh]';
  }
  return text;
};

const MessageListSidebar = ({
  onChannelSelect,
  onChannelObjectSelect,
  onAdminChatSelect,
  selectedChannelId,
  currentUserId,
}: MessageListSidebarProps) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Chỉ dùng để ép re-render mỗi phút → nhãn thời gian tương đối luôn cập nhật.
  const [, forceTick] = useState(0);
  const presenceByUserId = useUsersPresence(channels.map((channel) => channel.otherUserId));

  const handleChannelClick = (channel: ChatChannel) => {
    setChannels((currentChannels) =>
      currentChannels.map((item) => (item.channelId === channel.channelId ? { ...item, unreadCount: 0 } : item)),
    );
    onChannelSelect(channel.channelId);
    if (onChannelObjectSelect) {
      onChannelObjectSelect({ ...channel, unreadCount: 0 });
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getChats();
        if (response.statusCode === 200) {
          setChannels(response.content);
        }
      } catch (err) {
        console.error('Error fetching chat channels:', err);
        setError('Không thể tải tin nhắn');
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  // Realtime: khi có tin nhắn mới (kể cả tin mình vừa gửi — BE broadcast lại qua group),
  // cập nhật thời gian + preview của đúng kênh và đẩy kênh đó lên đầu. Nhờ vậy timestamp
  // hiển thị "Vừa xong" thay vì kẹt ở mốc lúc mở trang. Dùng subscribeToChatMessages
  // (multi-subscriber) để không đụng handler của ChatArea.
  useEffect(() => {
    const unsubscribe = signalRService.subscribeToChatMessages(
      (msg: {
        channelId?: number;
        ChannelId?: number;
        content?: string;
        Content?: string;
        createdAt?: string;
        CreatedAt?: string;
        senderId?: string;
        SenderId?: string;
      }) => {
        const channelId = msg?.channelId ?? msg?.ChannelId;
        if (!channelId) return;
        const content = msg?.content ?? msg?.Content ?? '';
        const createdAt = msg?.createdAt ?? msg?.CreatedAt ?? new Date().toISOString();
        const senderId = msg?.senderId ?? msg?.SenderId;
        const shouldIncrementUnread =
          channelId !== selectedChannelId && !!currentUserId && !!senderId && senderId !== currentUserId;

        setChannels((prev) => {
          if (!prev.some((c) => c.channelId === channelId)) return prev; // kênh chưa có trong list → bỏ qua
          const updated = prev.map((c) => {
            if (c.channelId !== channelId) return c;
            return {
              ...c,
              lastMessageAt: createdAt,
              lastMessagePreview: content,
              unreadCount: shouldIncrementUnread ? (c.unreadCount ?? 0) + 1 : c.unreadCount,
            };
          });
          updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          return updated;
        });
      },
    );
    return unsubscribe;
  }, [currentUserId, selectedChannelId]);

  // Nhịp 60s để refresh nhãn thời gian tương đối ("Vừa xong" → "1 phút trước" → ...).
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const filteredChannels = channels.filter(
    (channel) =>
      channel.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <aside className={styles.sidebar} aria-label="Danh sách cuộc trò chuyện" data-tour="messages-sidebar">
      <div className={styles.sidebarHeading}>
        <div className={styles.sidebarHeadingCopy}>
          <span className={styles.sidebarEyebrow}>Hộp thư</span>
          <h2 className={styles.sidebarTitle}>Cuộc trò chuyện</h2>
        </div>
        <div className={styles.sidebarHeadingActions}>
          <button className={styles.adminChatButton} type="button" onClick={onAdminChatSelect}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3.5h12v8.25a2 2 0 0 1-2 2H8l-3.5 2v-2H5a2 2 0 0 1-2-2V3.5Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 7.5h.01M9 7.5h.01M12 7.5h.01" strokeLinecap="round" strokeWidth="2" />
            </svg>
            Trò chuyện với Admin
          </button>
          {!loading && !error && (
            <span className={styles.conversationCount} aria-label={`${filteredChannels.length} cuộc trò chuyện`}>
              {filteredChannels.length}
            </span>
          )}
        </div>
      </div>
      <MessageSearch onSearch={setSearchQuery} />
      <div className={styles.messageList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Đang tải tin nhắn...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryButton} onClick={() => window.location.reload()} type="button">
              Thử lại
            </button>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className={styles.emptyContainer}>
            <p className={styles.emptyText}>{searchQuery ? 'Không tìm thấy tin nhắn' : 'Chưa có tin nhắn'}</p>
            <p className={styles.emptySubtext}>
              {searchQuery ? 'Thử từ khóa khác' : 'Bắt đầu cuộc trò chuyện để xem tin nhắn'}
            </p>
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <MessageInfoItem
              key={channel.channelId}
              active={selectedChannelId === channel.channelId}
              avatar={channel.otherUserAvatarUrl || ''}
              name={channel.otherUserName || 'Người dùng'}
              preview={formatPreview(channel.lastMessagePreview)}
              role={getOtherUserRoleLabel(channel)}
              session={channel.bookingId ? `Buổi #${channel.bookingId}` : 'Tư vấn'}
              status={channel.status}
              timestamp={formatTimestamp(channel.lastMessageAt)}
              unread={!!channel.unreadCount}
              unreadCount={channel.unreadCount ?? 0}
              isOnline={presenceByUserId.get(normalizePresenceUserId(channel.otherUserId))?.status === 'online'}
              onClick={() => handleChannelClick(channel)}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default MessageListSidebar;
