import { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { X } from 'lucide-react';

type MessageBubbleProps = {
  message: string;
  time: string;
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

const MessageBubble = ({
  message,
  time,
  isSender = false,
  isRead = false,
  messageType,
}: MessageBubbleProps) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsImageModalOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen]);

  return (
    <>
      <div className={`${styles.messageBubbleRow} ${isSender ? styles.messageBubbleRowSender : ''}`}>
        <div className={styles.messageBubbleContent}>
          <div
            className={`${styles.messageBubble} ${isSender ? styles.messageBubbleSender : ''} ${messageType === 'image' ? styles.messageBubbleImage : ''}`}
          >
            {messageType === 'image' ? (
              <button
                type="button"
                className={styles.imageMessageButton}
                onClick={() => setIsImageModalOpen(true)}
                aria-label="Mở hình ảnh ở kích thước lớn"
              >
                <img src={message} alt="Hình ảnh trong tin nhắn" className={styles.imageMessage} />
              </button>
            ) : (
              message
            )}
          </div>
          <span className={`${styles.messageBubbleTime} ${isSender ? styles.messageBubbleTimeSender : ''}`}>
            {formatTime(time)}
            {isSender && (
              <span
                className={`${styles.readReceipt} ${isRead ? styles.readReceiptRead : ''}`}
                title={isRead ? 'Đã đọc' : 'Đã gửi'}
                aria-label={isRead ? 'Đã đọc' : 'Đã gửi'}
              >
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* FULL-SCREEN IMAGE MODAL OVERLAY */}
      {isImageModalOpen && messageType === 'image' && (
        <div
          className={styles.imageLightbox}
          onClick={() => setIsImageModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem hình ảnh"
        >
          <button
            type="button"
            className={styles.imageLightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setIsImageModalOpen(false);
            }}
            aria-label="Đóng"
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
          <div className={styles.imageLightboxFrame} onClick={(e) => e.stopPropagation()}>
            <img src={message} alt="Hình ảnh phóng to" className={styles.imageLightboxImage} />
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBubble;
