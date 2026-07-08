import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { ICameraVideoTrack, ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import styles from '../styles.module.css';

interface VideoTileProps {
  name: string;
  roleLabel: string;
  videoTrack?: ICameraVideoTrack | ILocalVideoTrack | IRemoteVideoTrack | null;
  audioOn: boolean;
  avatarUrl?: string;
}

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const VideoTile = ({ name, roleLabel, videoTrack, audioOn, avatarUrl }: VideoTileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videoTrack) return;
    videoTrack.play(el);
    return () => {
      videoTrack.stop();
    };
  }, [videoTrack]);

  const hasVideo = !!videoTrack;

  return (
    <div className={styles.videoTile}>
      <div ref={containerRef} className={styles.videoTileMedia} />
      {!hasVideo && (
        <div className={styles.videoTilePlaceholder}>
          <div className={styles.videoTileAvatar}>
            {avatarUrl ? <img src={avatarUrl} alt={name} /> : <span>{initialsOf(name)}</span>}
          </div>
        </div>
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
