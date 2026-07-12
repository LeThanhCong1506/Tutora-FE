import type { ReactNode } from 'react';
import { PenTool } from 'lucide-react';
import type { ICameraVideoTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import type { RemoteParticipant } from './types';
import VideoTile from './VideoTile';
import styles from '../styles.module.css';

interface VideoStageProps {
  localName: string;
  localVideoTrack: ICameraVideoTrack | ILocalVideoTrack | null;
  localAudioOn: boolean;
  localCamOn: boolean;
  remoteParticipants: RemoteParticipant[];
  children?: ReactNode;
}

const VideoStage = ({
  localName,
  localVideoTrack,
  localAudioOn,
  localCamOn,
  remoteParticipants,
  children,
}: VideoStageProps) => {
  return (
    <div className={styles.stage}>
      <div className={styles.tilesGrid}>
        <VideoTile
          name={localName}
          roleLabel="Bạn"
          videoTrack={localCamOn ? localVideoTrack : null}
          audioOn={localAudioOn}
        />
        {remoteParticipants.map((participant) => (
          <VideoTile
            key={participant.uid}
            name={participant.name}
            roleLabel="Người tham gia"
            videoTrack={participant.hasVideo ? participant.videoTrack : null}
            audioOn={participant.hasAudio}
          />
        ))}
      </div>

      <div className={styles.whiteboardPanel}>
        <div className={styles.whiteboardIconWrap}>
          <PenTool size={22} />
        </div>
        <div className={styles.whiteboardTitle}>Bảng trắng dùng chung</div>
        <div className={styles.whiteboardSubtitle}>Tính năng bảng trắng sẽ sớm ra mắt</div>
      </div>

      {children}
    </div>
  );
};

export default VideoStage;
