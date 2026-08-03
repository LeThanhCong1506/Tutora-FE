import styles from './styles.module.css';
import UserAvatar from './UserAvatar';

type MessageInfoItemProps = {
  avatar?: string | null;
  name: string;
  timestamp: string;
  role: string;
  session: string;
  status?: string;
  badge?: {
    label: string;
    icon: string;
    muted?: boolean;
  };
  preview: string;
  active?: boolean;
  unread?: boolean;
  unreadCount?: number;
  isOnline?: boolean;
  onClick?: () => void;
};

const MessageInfoItem = ({
  avatar,
  name,
  timestamp,
  role,
  session,
  status,
  badge,
  preview,
  active = false,
  unread = false,
  unreadCount = 0,
  isOnline = false,
  onClick,
}: MessageInfoItemProps) => {
  const isBookingRequest = status === 'pending_tutor';
  const hasUnread = unread || unreadCount > 0;

  return (
    <button
      className={`${styles.messageItem} ${active ? styles.messageItemActive : ''} ${hasUnread ? styles.messageItemUnread : ''}`}
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      aria-label={`Mở cuộc trò chuyện với ${name}${isOnline ? ', đang hoạt động' : ''}${hasUnread ? `, ${unreadCount || 1} tin nhắn chưa đọc` : ''}`}
    >
      <div className={styles.avatarContainer}>
        <UserAvatar name={name} src={avatar} variant="conversation" loading="lazy" />
        {isOnline && (
          <span className={`${styles.statusDot} ${styles.statusDotOnline}`} title="Đang hoạt động" aria-hidden="true" />
        )}
        {isBookingRequest && <div className={styles.requestIndicator} />}
      </div>
      <div className={styles.messageItemContent}>
        <div className={styles.messageItemTop}>
          <span className={styles.messageName}>{name}</span>
          <span className={styles.messageTime}>{timestamp}</span>
        </div>
        <div className={styles.messageMetaRow}>
          <span className={styles.messageRole}>{role}</span>
          <span className={styles.messageDot}>•</span>
          <span className={styles.messageSession}>{session}</span>
        </div>
        {isBookingRequest ? (
          <div className={styles.bookingRequestBadge}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
              <path d="M6 3v3h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span>Yêu cầu đặt lịch</span>
          </div>
        ) : badge ? (
          <div className={`${styles.messageBadge} ${badge.muted ? styles.messageBadgeMuted : ''}`}>
            <img alt="" className={styles.messageBadgeIcon} src={badge.icon} />
            <span>{badge.label}</span>
          </div>
        ) : null}
        <span className={styles.messagePreview}>{preview}</span>
      </div>
      {hasUnread ? (
        unreadCount > 0 ? (
          <span className={styles.messageUnreadCount} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : (
          <span className={styles.unreadDot} aria-hidden="true" />
        )
      ) : null}
    </button>
  );
};

export default MessageInfoItem;
