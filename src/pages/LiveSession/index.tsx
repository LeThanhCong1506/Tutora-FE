import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAgoraRoom, type AgoraRoomInfo } from '../../services/agora.service';
import { getCurrentUserRole, getUserIdFromToken } from '../../services/auth.service';
import {
  SessionHeader,
  VideoStage,
  ControlBar,
  SidePanel,
  PermissionErrorState,
  useAgoraCall,
} from './live-session-components';
import styles from './styles.module.css';

const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

const LiveSession = () => {
  const { classSessionId } = useParams<{ classSessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // ?mock=1 — dựng UI tại chỗ bằng dữ liệu giả, không gọi API/Agora thật.
  // Dùng để duyệt layout khi chưa có backend chạy hoặc chưa có classSessionId thật.
  const isMock = searchParams.get('mock') === '1';

  const [room, setRoom] = useState<AgoraRoomInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mockMicOn, setMockMicOn] = useState(true);
  const [mockCamOn, setMockCamOn] = useState(true);
  const [mockScreenSharing, setMockScreenSharing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const role = (getCurrentUserRole() || '').toLowerCase();
  const isTutor = role === 'tutor';
  const currentUserId = getUserIdFromToken();

  useEffect(() => {
    if (isMock || !classSessionId) return;
    let cancelled = false;

    getAgoraRoom(parseInt(classSessionId, 10))
      .then((response) => {
        if (!cancelled) setRoom(response.content);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const fallback = 'Không thể kết nối tới phòng học. Vui lòng thử lại.';
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const backendMessage = error.response?.data?.message as string | undefined;
          setLoadError(
            backendMessage ||
              (status === 403
                ? 'Bạn không có quyền tham gia buổi học này.'
                : status === 404
                  ? 'Không tìm thấy buổi học.'
                  : fallback),
          );
        } else {
          setLoadError(fallback);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isMock, classSessionId]);

  // Ở mock mode không join Agora thật — truyền room=null để hook no-op.
  const {
    joined: realJoined,
    joinError,
    localVideoTrack,
    micOn: realMicOn,
    camOn: realCamOn,
    isScreenSharing: realIsScreenSharing,
    remoteParticipants: realRemoteParticipants,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leave,
  } = useAgoraCall(isMock ? null : room, room?.participantNames ?? {});

  const joined = isMock ? true : realJoined;
  const micOn = isMock ? mockMicOn : realMicOn;
  const camOn = isMock ? mockCamOn : realCamOn;
  const isScreenSharing = isMock ? mockScreenSharing : realIsScreenSharing;
  const remoteParticipants = isMock
    ? [{ uid: 'mock-peer', name: 'Học sinh Demo', hasVideo: false, hasAudio: true }]
    : realRemoteParticipants;

  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  const peerName = useMemo(() => {
    if (isMock) return 'Học sinh Demo';
    if (!room) return 'Buổi học';
    const entries = Object.entries(room.participantNames).filter(([uid]) => uid !== currentUserId);
    return entries.map(([, name]) => name).join(', ') || 'Buổi học';
  }, [isMock, room, currentUserId]);

  const localName = useMemo(() => {
    if (isMock) return isTutor ? 'Gia sư Demo' : 'Học sinh Demo';
    if (!room || !currentUserId) return isTutor ? 'Gia sư' : 'Học sinh';
    return room.participantNames[currentUserId] ?? (isTutor ? 'Gia sư' : 'Học sinh');
  }, [isMock, room, currentUserId, isTutor]);

  const handleLeave = async () => {
    if (!isMock) await leave();
    navigate(-1);
  };

  const handleBack = () => navigate(-1);

  if (!isMock && loadError) {
    return (
      <div className={styles.page}>
        <PermissionErrorState message={loadError} onBack={handleBack} />
      </div>
    );
  }

  if (!isMock && joinError) {
    return (
      <div className={styles.page}>
        <PermissionErrorState message={joinError} onBack={handleBack} />
      </div>
    );
  }

  if (!isMock && (!room || !joined)) {
    return (
      <div className={styles.page}>
        <div className={styles.centerState}>Đang kết nối vào phòng học...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SessionHeader
        subjectAndPeer={peerName}
        elapsedLabel={formatElapsed(elapsedSeconds)}
        endLabel={isTutor ? 'Kết thúc buổi học' : 'Rời buổi học'}
        onEnd={handleLeave}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      <div className={styles.body}>
        <VideoStage
          localName={localName}
          localVideoTrack={localVideoTrack}
          localAudioOn={micOn}
          localCamOn={camOn}
          localScreenSharing={isScreenSharing}
          remoteParticipants={remoteParticipants}
        >
          <ControlBar
            micOn={micOn}
            camOn={camOn}
            isScreenSharing={isScreenSharing}
            onToggleMic={() => {
              if (isMock) return setMockMicOn((v) => !v);
              toggleMic().catch(() => toast.error('Không thể đổi trạng thái micro'));
            }}
            onToggleCam={() => {
              if (isMock) return setMockCamOn((v) => !v);
              toggleCam().catch(() => toast.error('Không thể đổi trạng thái camera'));
            }}
            onToggleScreenShare={() => {
              if (isMock) return setMockScreenSharing((v) => !v);
              toggleScreenShare().catch(() => toast.error('Không thể chia sẻ màn hình'));
            }}
            onLeave={handleLeave}
            leaveLabel={isTutor ? 'Kết thúc' : 'Rời đi'}
          />
        </VideoStage>
        <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      </div>
    </div>
  );
};

export default LiveSession;
