import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { ICameraVideoTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import type { RemoteParticipant } from './types';
import VideoTile from './VideoTile';
import styles from '../styles.module.css';

interface VideoStageProps {
  localName: string;
  localVideoTrack: ICameraVideoTrack | ILocalVideoTrack | null;
  localAudioOn: boolean;
  localCamOn: boolean;
  /** Local đang chia sẻ màn hình — hiển thị "contain" (không cắt) như Google Meet. */
  localScreenSharing: boolean;
  remoteParticipants: RemoteParticipant[];
  children?: ReactNode;
}

interface StageTile {
  id: string;
  name: string;
  roleLabel: string;
  videoTrack: ICameraVideoTrack | ILocalVideoTrack | RemoteParticipant['videoTrack'] | null;
  audioOn: boolean;
  fit: 'cover' | 'contain';
}

const LOCAL_TILE_ID = 'local';

const VideoStage = ({
  localName,
  localVideoTrack,
  localAudioOn,
  localCamOn,
  localScreenSharing,
  remoteParticipants,
  children,
}: VideoStageProps) => {
  // Tile được ghim để xem full. null = chế độ lưới cân đối. Người dùng tự chọn
  // (giống Google Meet) — ghim màn hình đang share hay camera tuỳ ý.
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const tiles = useMemo<StageTile[]>(() => {
    const list: StageTile[] = [
      {
        id: LOCAL_TILE_ID,
        name: localName,
        roleLabel: 'Bạn',
        videoTrack: localScreenSharing || localCamOn ? localVideoTrack : null,
        audioOn: localAudioOn,
        fit: localScreenSharing ? 'contain' : 'cover',
      },
    ];
    for (const p of remoteParticipants) {
      list.push({
        id: String(p.uid),
        name: p.name,
        roleLabel: 'Người tham gia',
        videoTrack: p.hasVideo ? p.videoTrack ?? null : null,
        audioOn: p.hasAudio,
        // Không phân biệt được remote share hay camera, nên khi ghép full dùng
        // 'contain' để không cắt mất nội dung màn hình chia sẻ.
        fit: 'contain',
      });
    }
    return list;
  }, [localName, localScreenSharing, localCamOn, localVideoTrack, localAudioOn, remoteParticipants]);

  // Nếu tile đã ghim biến mất (người kia rời phòng) thì tự bỏ ghim.
  const pinned = pinnedId ? tiles.find((t) => t.id === pinnedId) ?? null : null;
  // Thứ tự cố định cho dải thumbnail — dùng để tính --strip-index, không phụ thuộc pin.
  const others = pinned ? tiles.filter((t) => t.id !== pinned.id) : [];

  const renderTile = (
    tile: StageTile,
    opts?: { compact?: boolean; contain?: boolean; layoutClassName?: string; style?: CSSProperties },
  ) => (
    <VideoTile
      key={tile.id}
      name={tile.name}
      roleLabel={tile.roleLabel}
      videoTrack={tile.videoTrack}
      audioOn={tile.audioOn}
      fit={opts?.contain ? tile.fit : 'cover'}
      compact={opts?.compact}
      isPinned={pinnedId === tile.id}
      onTogglePin={() => setPinnedId((cur) => (cur === tile.id ? null : tile.id))}
      layoutClassName={opts?.layoutClassName}
      style={opts?.style}
    />
  );

  // Mỗi tile luôn là con trực tiếp của CÙNG MỘT parent, ở CÙNG vị trí trong cây JSX,
  // dù đang ghim hay không — tránh remount VideoTile (mất track Agora đang play) khi
  // chuyển layout. Ghim/bỏ ghim chỉ đổi class/style định vị (CSS), không đổi cấu trúc.
  const gridClass =
    tiles.length <= 1
      ? styles.tilesGridSingle
      : tiles.length === 2
        ? styles.tilesGridTwo
        : styles.tilesGridMany;

  const containerClassName = pinned ? styles.spotlightFlat : `${styles.tilesGrid} ${gridClass}`;

  return (
    <div className={styles.stage}>
      <div className={containerClassName}>
        {tiles.map((tile) => {
          if (!pinned) return renderTile(tile);

          const isMain = tile.id === pinned.id;
          if (isMain) {
            return renderTile(tile, { contain: true, layoutClassName: styles.spotlightMainAbs });
          }
          const stripIndex = others.findIndex((o) => o.id === tile.id);
          return renderTile(tile, {
            compact: true,
            layoutClassName: styles.spotlightStripAbs,
            style: { '--strip-index': stripIndex } as CSSProperties,
          });
        })}
      </div>
      {children}
    </div>
  );
};

export default VideoStage;
