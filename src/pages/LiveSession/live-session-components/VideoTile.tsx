import { useEffect, useRef } from 'react';
import { Mic, MicOff, Pin, PinOff } from 'lucide-react';
import type { ICameraVideoTrack, ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import styles from '../styles.module.css';

interface VideoTileProps {
  name: string;
  roleLabel: string;
  videoTrack?: ICameraVideoTrack | ILocalVideoTrack | IRemoteVideoTrack | null;
  audioOn: boolean;
  avatarUrl?: string;
  /** Screen-share track được hiển thị "contain" (không cắt) như Google Meet;
   * camera thường hiển thị "cover" để lấp đầy khung. */
  fit?: 'cover' | 'contain';
  /** Biến thể thu nhỏ dùng ở dải thumbnail khi đang spotlight. */
  compact?: boolean;
  /** Ô này đang được ghim (xem full) hay không. */
  isPinned?: boolean;
  /** Ghim/bỏ ghim ô để xem full. */
  onTogglePin?: () => void;
}

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const VideoTile = ({
  name,
  roleLabel,
  videoTrack,
  audioOn,
  avatarUrl,
  fit = 'cover',
  compact = false,
  isPinned = false,
  onTogglePin,
}: VideoTileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (videoTrack) videoTrack.play(el, { fit });
    return () => {
      // Luôn dừng track + xoá video còn sót → tránh đóng băng khung hình khi remote
      // gỡ track (dừng chia sẻ màn hình) hoặc rời phòng.
      try {
        videoTrack?.stop();
      } catch {
        // ignore
      }
      el.innerHTML = '';
    };
  }, [videoTrack, fit]);

  const hasVideo = !!videoTrack;

  return (
    <div className={compact ? `${styles.videoTile} ${styles.videoTileCompact}` : styles.videoTile}>
      <div ref={containerRef} className={styles.videoTileMedia} />
      {!hasVideo && (
        <div className={styles.videoTilePlaceholder}>
          <div className={styles.videoTileAvatar}>
            {avatarUrl ? <img src={avatarUrl} alt={name} /> : <span>{initialsOf(name)}</span>}
          </div>
        </div>
      )}

      {onTogglePin && (
        <button
          type="button"
          className={`${styles.pinBtn} ${isPinned ? styles.pinBtnActive : ''}`}
          onClick={onTogglePin}
          title={isPinned ? 'Bỏ ghim' : 'Ghim để xem full'}
          aria-label={isPinned ? `Bỏ ghim ${name}` : `Ghim ${name} để xem lớn`}
          aria-pressed={isPinned}
        >
          {isPinned ? <PinOff size={compact ? 13 : 16} /> : <Pin size={compact ? 13 : 16} />}
        </button>
      )}

      <div className={styles.videoTileNameOverlay}>
        <span className={audioOn ? styles.audioDotOn : styles.audioDotOff} />
        {name} ({roleLabel})
      </div>
      <div className={styles.videoTileMicIcon}>{audioOn ? <Mic size={13} /> : <MicOff size={13} />}</div>
    </div>
  );
};

export default VideoTile;
