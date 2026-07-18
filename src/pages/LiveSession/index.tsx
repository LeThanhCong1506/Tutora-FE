import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAgoraRoom, type AgoraRoomInfo } from '../../services/agora.service';
import { checkOutClassSession } from '../../services/classSession.service';
import { getCurrentUserRole, getUserIdFromToken } from '../../services/auth.service';
import {
  SessionHeader,
  VideoStage,
  ControlBar,
  SidePanel,
  PermissionErrorState,
  useAgoraCall,
} from './live-session-components';
import type { ChatMessage } from './live-session-components/types';
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // ?mock=1 — dựng UI tại chỗ bằng dữ liệu giả, không gọi API/Agora thật.
  // Dùng để duyệt layout khi chưa có backend chạy hoặc chưa có classSessionId thật.
  const isMock = searchParams.get('mock') === '1';
  // True khi được lobby chuyển vào (đã đủ 2 người) — deep-link trực tiếp sẽ không có cờ này.
  const fromLobby = Boolean((location.state as { fromLobby?: boolean } | null)?.fromLobby);

  const [room, setRoom] = useState<AgoraRoomInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mockMicOn, setMockMicOn] = useState(true);
  const [mockCamOn, setMockCamOn] = useState(true);
  const [mockScreenSharing, setMockScreenSharing] = useState(false);
  const [mockMessages, setMockMessages] = useState<ChatMessage[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);

  const role = (getCurrentUserRole() || '').toLowerCase();
  const isTutor = role === 'tutor';
  const currentUserId = getUserIdFromToken();

  useEffect(() => {
    if (isMock || !classSessionId) return;
    let cancelled = false;

    getAgoraRoom(parseInt(classSessionId, 10))
      .then((response) => {
        if (cancelled) return;
        // Buổi chưa bắt đầu (scheduled, chưa check-in) mà vào thẳng bằng URL → ép qua
        // phòng chờ để chờ đủ 2 người. Vào từ lobby (fromLobby) hoặc buổi đang diễn ra
        // (rớt mạng vào lại) thì join phòng ngay.
        const { status, checkedIn } = response.content;
        if (!fromLobby && status === 'scheduled' && !checkedIn) {
          navigate(`/session-lobby/${classSessionId}`, { replace: true });
          return;
        }
        setRoom(response.content);
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
  }, [isMock, classSessionId, fromLobby, navigate]);

  // Ở mock mode không join Agora thật — truyền room=null để hook no-op.
  const {
    joined: realJoined,
    joinError,
    localVideoTrack,
    micOn: realMicOn,
    camOn: realCamOn,
    isScreenSharing: realIsScreenSharing,
    remoteParticipants: realRemoteParticipants,
    chatMessages: realChatMessages,
    presenceStatus,
    sessionEnded,
    sendChatMessage: realSendChatMessage,
    broadcastSessionEnded,
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

  const chatMessages = isMock ? mockMessages : realChatMessages;
  const sendChatMessage = isMock
    ? (text: string) =>
        setMockMessages((prev) => [
          ...prev,
          {
            id: `mock-${Date.now()}`,
            senderUid: 'local',
            senderName: 'Bạn',
            text,
            timestamp: Date.now(),
            isLocal: true,
          },
        ])
    : realSendChatMessage;

  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  const participantLabel = useMemo(() => {
    if (isMock) return 'Học sinh Demo';
    if (!room) return '';
    return [room.tutorName, room.studentName].filter(Boolean).join(', ');
  }, [isMock, room]);

  const localName = useMemo(() => {
    if (isMock) return isTutor ? 'Gia sư Demo' : 'Học sinh Demo';
    if (!room || !currentUserId) return isTutor ? 'Gia sư' : 'Học sinh';
    return room.participantNames[currentUserId] ?? (isTutor ? 'Gia sư' : 'Học sinh');
  }, [isMock, room, currentUserId, isTutor]);

  const handleLeave = async () => {
    if (isMock) {
      navigate(-1);
      return;
    }
    // Gia sư "Kết thúc buổi học": ghi check-out (đóng phòng) + đá mọi người còn lại ra.
    if (isTutor && classSessionId) {
      try {
        await checkOutClassSession(parseInt(classSessionId, 10));
      } catch {
        // Buổi có thể chưa từng check-in (chưa đủ 2 người vào) → vẫn cho rời phòng.
      }
      await broadcastSessionEnded();
    }
    await leave();
    navigate(-1);
  };

  // Bị đá khỏi phòng: gia sư đã kết thúc buổi (nhận tín hiệu SESSION_ENDED hoặc phòng đã đóng).
  useEffect(() => {
    if (isMock || !sessionEnded) return;
    toast.info('Gia sư đã kết thúc buổi học.');
    void (async () => {
      await leave();
      navigate(-1);
    })();
  }, [sessionEnded, isMock, leave, navigate]);

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
        participantLabel={participantLabel}
        elapsedLabel={formatElapsed(elapsedSeconds)}
        endLabel={isTutor ? 'Kết thúc buổi học' : 'Rời buổi học'}
        onEnd={handleLeave}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      {!isMock && joined && presenceStatus && !presenceStatus.isCheckedIn && (
        <div
          style={{
            padding: '8px 16px',
            background: '#FEF3C7',
            color: '#92400E',
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {presenceStatus.blockedByPayment
            ? 'Buổi học chưa được điểm danh: phụ huynh chưa thanh toán các buổi còn lại.'
            : isTutor
              ? presenceStatus.studentPresent
                ? 'Đang điểm danh buổi học…'
                : 'Đang chờ học viên vào phòng để điểm danh buổi học…'
              : presenceStatus.tutorPresent
                ? 'Đang điểm danh buổi học…'
                : 'Đang chờ gia sư vào phòng để điểm danh buổi học…'}
        </div>
      )}
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
        <SidePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          notesStorageKey={classSessionId ?? 'mock'}
        />
      </div>
    </div>
  );
};

export default LiveSession;
