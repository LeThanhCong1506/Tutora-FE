import styles from './styles.module.css';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { ChatChannel } from '../../services/chat.service';
import type { BookingResponseDTO } from '../../services/booking.service';

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

const ChatHeader = ({ selectedChannelId: _selectedChannelId, onLeaveChannel: _onLeaveChannel, channel, onBack, isSearchOpen, onSearchToggle, searchQuery, onSearchChange }: ChatHeaderProps) => {
    if (!channel) return null;

    const isBookingRequest = channel.status === 'pending_tutor';

    return (
        <div className={styles.chatHeader}>
            <div className={styles.chatHeaderTopRow}>
                {onBack && (
                    <button className={styles.backButton} type="button" onClick={onBack} title="Quay lại">
                        <ArrowLeft size={20} />
                    </button>
                )}
                
                <div className={styles.chatHeaderInfo}>
                    <div className={styles.chatAvatarWrapper}>
                        {channel.otherUserAvatarUrl ? (
                            <img alt="" className={styles.chatAvatar} src={channel.otherUserAvatarUrl} />
                        ) : (
                            <div className={styles.chatAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0d4c8', color: '#1a2238', fontWeight: 700, fontSize: '18px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                                {(channel.otherUserName || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className={styles.chatHeaderText}>
                        <span className={styles.chatName}>{channel.otherUserName}</span>
                        <span className={styles.chatRole}>
                            {isBookingRequest ? 'Yêu cầu đặt lịch mới' : 'Phụ huynh / Học sinh'}
                        </span>
                    </div>
                </div>

                <div className={styles.chatHeaderActions}>
                    <button className={styles.iconButton} type="button" title="Tìm kiếm" onClick={onSearchToggle}>
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
                        value={searchQuery || ''}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button
                            className={styles.chatSearchClear}
                            type="button"
                            onClick={() => onSearchChange?.('')}
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
