import { useState, useEffect } from 'react';
import styles from './styles.module.css';
import MessageInfoItem from './MessageInfoItem';
import MessageSearch from './MessageSearch';
import { getChats, type ChatChannel } from '../../services/chat.service';

interface MessageListSidebarProps {
    onChannelSelect: (channelId: number | null) => void;
    onChannelObjectSelect?: (channel: ChatChannel | null) => void;
    selectedChannelId: number | null;
    isTutor?: boolean;
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

const MessageListSidebar = ({ onChannelSelect, onChannelObjectSelect, selectedChannelId, isTutor = false }: MessageListSidebarProps) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChannelClick = (channel: ChatChannel) => {
    onChannelSelect(channel.channelId);
    if (onChannelObjectSelect) {
      onChannelObjectSelect(channel);
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

  const filteredChannels = channels.filter(channel => 
    channel.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={styles.sidebar}>
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
            <div key={channel.channelId} onClick={() => handleChannelClick(channel)}>
              <MessageInfoItem
                active={selectedChannelId === channel.channelId}
                avatar={channel.otherUserAvatarUrl || ''}
                name={channel.otherUserName || 'Người dùng'}
                preview={formatPreview(channel.lastMessagePreview)}
                role={isTutor ? 'Phụ huynh / Học sinh' : 'Gia sư'}
                session={channel.bookingId ? `Buổi #${channel.bookingId}` : 'Tư vấn'}
                status={channel.status}
                timestamp={formatTimestamp(channel.lastMessageAt)}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default MessageListSidebar;
