import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './styles.module.css';
import { Loader2, SendHorizontal, Paperclip, X } from 'lucide-react';
import { signalRService } from '../../services/signalr.service';
import { toast } from 'react-toastify';

interface MessageComposerProps {
  onSend: (content: string) => void;
  onSendImage?: (file: File) => Promise<void>;
  disabled?: boolean;
  channelId?: number | null;
}

const MessageComposer = ({ onSend, onSendImage, disabled = false, channelId }: MessageComposerProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hintId = 'message-composer-hint';

  const resizeTextarea = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, 128);
    element.style.height = `${Math.max(nextHeight, 48)}px`;
    element.style.overflowY = element.scrollHeight > 128 ? 'auto' : 'hidden';
  }, []);

  // Cleanup object URL khi unmount hoặc đổi ảnh
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const emitTyping = useCallback(() => {
    if (!channelId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      signalRService.typing(channelId);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (channelId) signalRService.stopTyping(channelId);
    }, 2000);
  }, [channelId]);

  const emitStopTyping = useCallback(() => {
    if (!channelId) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      signalRService.stopTyping(channelId);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleSend = async () => {
    const hasText = !!message.trim();
    const hasImage = pendingImage !== null;

    if ((!hasText && !hasImage) || sending || disabled) return;

    setSending(true);
    emitStopTyping();
    try {
      // Gửi ảnh trước nếu có
      if (hasImage && onSendImage) {
        await onSendImage(pendingImage);
        // Xóa preview sau khi gửi thành công
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      // Gửi text nếu có
      if (hasText) {
        await onSend(message);
        setMessage('');
        requestAnimationFrame(() => resizeTextarea(textareaRef.current));
      }
    } catch {
      toast.error('Không thể gửi. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    resizeTextarea(e.target);
    if (e.target.value.trim()) {
      emitTyping();
    } else {
      emitStopTyping();
    }
  };

  // Chỉ lưu ảnh vào state để preview, KHÔNG gửi ngay
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file hình ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file vượt quá 5MB');
      return;
    }

    // Revoke URL cũ nếu có
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(file);
    setPendingImage(file);
    setPreviewUrl(url);

    // Reset input để có thể chọn lại cùng file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSend = (!!message.trim() || pendingImage !== null) && !sending && !disabled;

  return (
    <div className={styles.composerWrapper}>
      {/* Preview ảnh đã chọn — hiện phía trên thanh nhập */}
      {previewUrl && (
        <div className={styles.imagePreviewWrapper}>
          <img src={previewUrl} alt="Xem trước" className={styles.imagePreview} />
          <button type="button" className={styles.imagePreviewRemove} onClick={handleRemoveImage} title="Xóa ảnh">
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.composer}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          className={`${styles.iconButton} ${styles.attachmentButton}`}
          type="button"
          aria-label="Đính kèm hình ảnh"
          disabled={disabled || sending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={19} aria-hidden="true" />
        </button>
        <textarea
          ref={textareaRef}
          className={styles.composerInput}
          placeholder={
            disabled ? 'Đang kết nối...' : pendingImage ? 'Thêm chú thích (tùy chọn)...' : 'Nhập tin nhắn...'
          }
          aria-label="Nội dung tin nhắn"
          aria-describedby={hintId}
          rows={1}
          value={message}
          disabled={disabled || sending}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendButton}
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Gửi tin nhắn"
        >
          {sending ? (
            <Loader2 size={20} className={styles.sendingSpinner} aria-hidden="true" />
          ) : (
            <SendHorizontal size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      <span className={styles.composerHint} id={hintId}>
        Enter để gửi · Shift + Enter để xuống dòng
      </span>
    </div>
  );
};

export default MessageComposer;
