import styles from './styles.module.css';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { ChatChannel } from '../../services/chat.service';
import type { BookingResponseDTO } from '../../services/booking.service';
import { useUserPresence, formatLastSeen } from '../../hooks/useUserPresence';
import UserAvatar from './UserAvatar';
import { getOtherUserRoleLabel } from './chatRole';

interface ChatHeaderProps {
  selectedChannelId: number | null;
  onLeaveChannel: () => void;
  channel?: ChatChannel | null;
  booking?: BookingResponseDTO | null;
  onBack?: () => void;
  isSearchOpen?: boolean;
  onSearchToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ChatHeader = ({
  channel,
  onBack,
  isSearchOpen,
  onSearchToggle,
  searchQuery,
  onSearchChange,
}: ChatHeaderProps) => {
  // Hook phải gọi TRƯỚC mọi early-return để không vi phạm rules-of-hooks.
  const presence = useUserPresence(channel?.otherUserId);

  if (!channel) return null;

  const isBookingRequest = channel.status === 'pending_tutor';
  const counterpartRole = getOtherUserRoleLabel(channel);
  const presenceLabel =
    presence.status === 'online'
      ? 'Đang hoạt động'
      : presence.status === 'offline'
        ? formatLastSeen(presence.lastSeenAt)
        : presence.status === 'loading'
          ? 'Đang kiểm tra trạng thái...'
          : 'Chưa xác định trạng thái';

  return (
    <div className={styles.chatHeader}>
      <div className={styles.chatHeaderTopRow}>
        {onBack && (
          <button
            className={styles.backButton}
            type="button"
            onClick={onBack}
            aria-label="Quay lại danh sách trò chuyện"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className={styles.chatHeaderInfo}>
          <div className={styles.chatAvatarWrapper}>
            <UserAvatar name={channel.otherUserName} src={channel.otherUserAvatarUrl} variant="header" />
            {presence.status === 'online' && (
              <span
                aria-hidden="true"
                title="Đang hoạt động"
                className={`${styles.statusDot} ${styles.statusDotOnline}`}
              />
            )}
          </div>
          <div className={styles.chatHeaderText}>
            <span className={styles.chatName}>{channel.otherUserName}</span>
            <span className={styles.chatRole}>
              <span>{counterpartRole}</span>
              <span className={styles.chatRoleDivider} aria-hidden="true">
                •
              </span>
              <span
                className={isBookingRequest ? styles.bookingStatusText : styles.presenceText}
                aria-live={isBookingRequest ? undefined : 'polite'}
                role={isBookingRequest ? undefined : 'status'}
              >
                {!isBookingRequest && (
                  <span
                    className={`${styles.presenceMiniDot} ${presence.status === 'online' ? styles.presenceMiniDotOnline : ''}`}
                    aria-hidden="true"
                  />
                )}
                {isBookingRequest ? 'Yêu cầu đặt lịch mới' : presenceLabel}
              </span>
            </span>
          </div>
        </div>

        <div className={styles.chatHeaderActions}>
          <button
            className={styles.iconButton}
            type="button"
            aria-label={isSearchOpen ? 'Đóng tìm kiếm trong cuộc trò chuyện' : 'Tìm kiếm trong cuộc trò chuyện'}
            aria-pressed={isSearchOpen}
            onClick={onSearchToggle}
          >
            {isSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
        </div>
      </div>

      {/* Search bar (visible when toggled) - placed at the end so it wraps to new line */}
      {isSearchOpen && (
        <div className={styles.chatSearchBar}>
          <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            className={styles.chatSearchInput}
            placeholder="Tìm kiếm trong cuộc trò chuyện..."
            aria-label="Tìm kiếm trong cuộc trò chuyện"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className={styles.chatSearchClear}
              type="button"
              onClick={() => onSearchChange?.('')}
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
