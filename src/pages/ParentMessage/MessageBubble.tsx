import { useState } from 'react';
import styles from './styles.module.css';

type MessageBubbleProps = {
    message: string;
    time: string;
    avatar?: string;
    isSender?: boolean;
    isRead?: boolean;
    messageType?: string;
};

/** Format ISO timestamp to readable time */
const formatTime = (isoString: string): string => {
    if (!isoString) return '';
    try {
        const safeIsoString = isoString.includes('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
        const date = new Date(safeIsoString);
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        if (isToday) {
            return `${hours}:${minutes}`;
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}`;
    } catch {
        return isoString;
    }
};

const MessageBubble = ({ message, time, avatar, isSender = false, isRead = false, messageType }: MessageBubbleProps) => {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    return (
        <>
            <div className={`${styles.messageBubbleRow} ${isSender ? styles.messageBubbleRowSender : ''}`}>
                {!isSender && avatar && <img alt="" className={styles.messageBubbleAvatar} src={avatar} />}
                <div className={styles.messageBubbleContent}>
                    <div className={`${styles.messageBubble} ${isSender ? styles.messageBubbleSender : ''}`} style={messageType === 'image' ? { padding: 4, background: 'transparent' } : undefined}>
                        {messageType === 'image' ? (
                            <img
                                src={message}
                                alt="Hình ảnh"
                                style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, display: 'block', cursor: 'pointer', objectFit: 'cover' }}
                                onClick={() => setIsImageModalOpen(true)}
                            />
                        ) : (
                            message
                        )}
                    </div>
                    <span className={`${styles.messageBubbleTime} ${isSender ? styles.messageBubbleTimeSender : ''}`}>
                        {formatTime(time)}
                        {isSender && (
                            <span style={{ marginLeft: 4, fontSize: 12, color: isRead ? '#4F46E5' : '#9ca3af' }} title={isRead ? 'Đã đọc' : 'Đã gửi'}>
                                {isRead ? '✓✓' : '✓'}
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* FULL-SCREEN IMAGE MODAL OVERLAY */}
            {isImageModalOpen && messageType === 'image' && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setIsImageModalOpen(false)}
                >
                    <button
                        style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: '#fff',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            cursor: 'pointer',
                            zIndex: 100000,
                            lineHeight: 1
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsImageModalOpen(false);
                        }}
                        aria-label="Đóng"
                    >
                        &times;
                    </button>
                    <img 
                        src={message} 
                        alt="Hình ảnh phóng to" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain', 
                            borderRadius: '8px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }} 
                        onClick={(e) => e.stopPropagation()} /* Prevent background click when clicking the image itself */
                    />
                </div>
            )}
        </>
    );
};

export default MessageBubble;
