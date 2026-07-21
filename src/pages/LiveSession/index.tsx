import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Modal } from 'antd';
import axios from 'axios';
import SessionDeviceModal from '../../components/SessionDeviceModal';
import {
  discardLiveSessionAdmission,
  peekLiveSessionAdmission,
  useLiveSessionAdmission,
  type LiveSessionAdmission,
} from '../../hooks/useLiveSessionAdmission';
import { leaveRoom } from '../../services/agora.service';
import { checkOutClassSession } from '../../services/classSession.service';
import { getCurrentUserRole, getUserIdFromToken } from '../../services/auth.service';
import {
  SessionHeader,
  VideoStage,
  ControlBar,
  SidePanel,
  PermissionErrorState,
  useAgoraCall,
  useLiveSessionGuard,
} from './live-session-components';
import type { ChatMessage } from './live-session-components/types';
import { useEmotionMonitor } from './emotion/useEmotionMonitor';
import EmotionAlertToast from './emotion/EmotionAlertToast';
import { primeAlertSound } from './emotion/alertSound';
import { postEngagementAlert } from '../../services/emotion.service';
import styles from './styles.module.css';

// SDK whiteboard nặng → lazy-load để không nằm trong bundle chính (đặc biệt cho bản Zalo).
const WhiteboardOverlay = lazy(() => import('./live-session-components/WhiteboardOverlay'));

const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

interface LiveSessionNavigationState {
  fromLobby?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  admissionTransferId?: string;
}

interface LiveSessionRoomProps {
  onAdmissionReady: (admission: LiveSessionAdmission) => void;
}

const LiveSessionRoom = ({ onAdmissionReady }: LiveSessionRoomProps) => {
  const { classSessionId } = useParams<{ classSessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // ?mock=1 — dựng UI tại chỗ bằng dữ liệu giả, không gọi API/Agora thật.
  // Dùng để duyệt layout khi chưa có backend chạy hoặc chưa có classSessionId thật.
  const isMock = searchParams.get('mock') === '1';
  // True khi được lobby chuyển vào (đã đủ 2 người) — deep-link trực tiếp sẽ không có cờ này.
  // micOn/camOn: lựa chọn bật/tắt người dùng đã chọn ở phòng chờ (mặc định bật nếu vào thẳng).
  const lobbyNav = location.state as LiveSessionNavigationState | null;
  const fromLobby = Boolean(lobbyNav?.fromLobby);
  const initialMicOn = lobbyNav?.micOn ?? true;
  const initialCamOn = lobbyNav?.camOn ?? true;
  const parsedSessionId = classSessionId ? Number.parseInt(classSessionId, 10) : Number.NaN;
  const sessionIdNum = Number.isInteger(parsedSessionId) && parsedSessionId > 0 ? parsedSessionId : null;
  const transferredAdmission = peekLiveSessionAdmission(lobbyNav?.admissionTransferId);
  const routeAdmission = transferredAdmission?.room.classSessionId === sessionIdNum ? transferredAdmission : null;

  const [liveAdmission, setLiveAdmission] = useState<LiveSessionAdmission | null>(routeAdmission);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mockMicOn, setMockMicOn] = useState(initialMicOn);
  const [mockCamOn, setMockCamOn] = useState(initialCamOn);
  const [mockScreenSharing, setMockScreenSharing] = useState(false);
  const [mockMessages, setMockMessages] = useState<ChatMessage[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const replacementCleanupStartedRef = useRef(false);

  // Xoá one-shot transfer sau commit (sau cả double-render của StrictMode). Reload/back-forward
  // không thể tái dùng room token/lease cũ và sẽ admission idempotent lại với backend.
  useEffect(() => {
    discardLiveSessionAdmission(lobbyNav?.admissionTransferId);
  }, [lobbyNav?.admissionTransferId]);

  useEffect(() => {
    if (routeAdmission) onAdmissionReady(routeAdmission);
  }, [onAdmissionReady, routeAdmission]);

  const role = (getCurrentUserRole() || '').toLowerCase();
  const isTutor = role === 'tutor';
  const isStudent = role === 'student';
  const currentUserId = getUserIdFromToken();
  const room = liveAdmission?.room ?? null;
  const identity = liveAdmission?.identity ?? null;
  const admission = useLiveSessionAdmission(isMock ? null : sessionIdNum);
  const requestAdmission = admission.join;
  const returnPath =
    role === 'tutor'
      ? '/tutor-portal/calendar'
      : role === 'parent'
        ? '/parent-portal/lessons'
        : '/student-portal/calendar';

  const navigateToCalendar = useCallback(() => {
    navigate(returnPath, { replace: true });
  }, [navigate, returnPath]);

  const acceptAdmission = useCallback(
    async (preparedAdmission: LiveSessionAdmission) => {
      const { status, checkedIn, classSessionId: admittedSessionId, participationId, leaseId } = preparedAdmission.room;

      // Deep-link tới buổi chưa bắt đầu vẫn phải qua lobby. Join là mutation nên trả lease trước khi
      // biết status; nhả đúng lease vừa claim rồi mới redirect để không giữ owner khi đang chờ.
      if (!fromLobby && status === 'scheduled' && !checkedIn) {
        await leaveRoom(admittedSessionId, { participationId, leaseId });
        navigate(`/session-lobby/${admittedSessionId}`, { replace: true });
        return;
      }

      onAdmissionReady(preparedAdmission);
      setLiveAdmission(preparedAdmission);
    },
    [fromLobby, navigate, onAdmissionReady],
  );

  useEffect(() => {
    if (isMock || sessionIdNum == null || liveAdmission) return;
    let cancelled = false;

    requestAdmission()
      .then((preparedAdmission) => {
        if (cancelled || !preparedAdmission) return;
        return acceptAdmission(preparedAdmission);
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
  }, [acceptAdmission, isMock, liveAdmission, requestAdmission, sessionIdNum]);

  const handleAdmissionTakeOver = async () => {
    try {
      const preparedAdmission = await admission.takeOver();
      if (preparedAdmission) await acceptAdmission(preparedAdmission);
    } catch {
      toast.error('Không thể chuyển buổi học sang thiết bị này. Vui lòng thử lại.');
    }
  };

  const { guardReady, sessionReplaced: guardSessionReplaced } = useLiveSessionGuard(isMock ? null : room);
  const guardedRoom = !isMock && guardReady && !guardSessionReplaced ? room : null;

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
    sessionReplaced: heartbeatSessionReplaced,
    trackingRequested,
    emotionAlerts,
    emotionToasts,
    dismissEmotionToast,
    sendEmotionAlert,
    sendChatMessage: realSendChatMessage,
    broadcastSessionEnded,
    broadcastTracking,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leave,
  } = useAgoraCall(guardedRoom, room?.participantNames ?? {}, {
    initialMicOn,
    initialCamOn,
    identity,
  });
  const sessionReplaced = guardSessionReplaced || heartbeatSessionReplaced;

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

  // Ghi hình do BACKEND tự bật đúng lúc buổi vào phòng học chính (cả gia sư + học viên
  // cùng có mặt → auto check-in trong TryAutoCheckInAsync). FE không còn kích hoạt record.

  useEffect(() => {
    if (!joined) return;
    // Đếm từ MỐC CHUNG (thời điểm buổi bắt đầu do server trả về) để 2 màn hình đồng bộ,
    // thay vì mỗi máy đếm cục bộ từ lúc tự join. DateTime từ DB là UTC không kèm hậu tố
    // → thêm 'Z' để trình duyệt hiểu đúng là UTC. Không có startedAt (hoặc mock) → fallback về giờ hiện tại.
    const startedAt = isMock ? undefined : room?.startedAt;
    const startMs = startedAt
      ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(startedAt) ? startedAt : `${startedAt}Z`).getTime()
      : Date.now();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [joined, isMock, room?.startedAt]);

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

  // Người dùng xác nhận trong modal → thực hiện kết thúc/rời phòng. handleLeave sẽ điều hướng đi;
  // reset state trong finally chỉ có tác dụng khi điều hướng chưa kịp unmount (vô hại).
  const confirmEnd = async () => {
    setEnding(true);
    try {
      await handleLeave();
    } finally {
      setEnding(false);
      setEndModalOpen(false);
    }
  };

  // Takeover chỉ thu hồi media/RTC/presence của thiết bị cũ. Không đi qua handleLeave vì nhánh đó
  // sẽ check-out và kết thúc cả buổi nếu người bị thay thế là gia sư.
  useEffect(() => {
    if (isMock || !sessionReplaced || replacementCleanupStartedRef.current) return;
    replacementCleanupStartedRef.current = true;
    void leave();
  }, [isMock, leave, sessionReplaced]);

  // Bị đá khỏi phòng: gia sư đã kết thúc buổi (nhận tín hiệu SESSION_ENDED hoặc phòng đã đóng).
  useEffect(() => {
    if (isMock || !sessionEnded || sessionReplaced) return;
    toast.info('Gia sư đã kết thúc buổi học.');
    void (async () => {
      await leave();
      navigate(-1);
    })();
  }, [sessionEnded, sessionReplaced, isMock, leave, navigate]);

  const handleBack = () => {
    void (async () => {
      await leave();
      navigate(-1);
    })();
  };

  // GIA SƯ bật/tắt "Theo dõi hành vi" → phát tín hiệu RTM tới máy học viên. Không tracking liên tục.
  // Trạng thái đã thể hiện ngay trên nút + chấm đỏ ở tab, không cần toast xác nhận.
  const handleToggleEmotionMonitor = () => {
    // Mở khoá AudioContext trong chính cú bấm này — trình duyệt chặn phát tiếng nếu chưa có
    // tương tác người dùng, làm tiếng báo đầu tiên bị nuốt.
    primeAlertSound();
    void broadcastTracking(!trackingRequested);
  };

  // Học viên tắt/bật camera khi đang được theo dõi → báo gia sư (thay vì để engine hiểu nhầm
  // thành "rời khỏi màn hình"). Tracking tự dừng khi tắt cam và chạy lại khi bật.
  const handleCameraStateChange = useCallback(
    (on: boolean) => {
      const payload = {
        reason: on ? ('camera_on' as const) : ('camera_off' as const),
        level: 'MED' as const,
        message: on ? 'Học viên đã bật lại camera' : 'Học viên đã tắt camera',
      };
      sendEmotionAlert(payload); // RTM → toast tức thì bên gia sư
      if (sessionIdNum) void postEngagementAlert(sessionIdNum, payload);
    },
    [sessionIdNum, sendEmotionAlert],
  );

  // Học viên: chạy phân tích cục bộ + gửi điểm/cảnh báo — chỉ khi GIA SƯ đã bật (qua RTM).
  // Học viên không có nút, không được thông báo; chạy ngầm.
  useEmotionMonitor({
    enabled: !isMock && isStudent && trackingRequested && joined,
    classSessionId: sessionIdNum,
    localVideoTrack,
    camOn,
    onCameraStateChange: handleCameraStateChange,
    onAlert: sendEmotionAlert,
  });

  if (!isMock && sessionReplaced) {
    return (
      <div className={styles.page}>
        <div className={styles.centerState}>Phiên trên thiết bị này đã được ngắt.</div>
        <SessionDeviceModal open mode="replaced" onConfirm={navigateToCalendar} />
      </div>
    );
  }

  if (!isMock && sessionIdNum == null) {
    return (
      <div className={styles.page}>
        <PermissionErrorState message="Đường dẫn buổi học không hợp lệ." onBack={navigateToCalendar} />
      </div>
    );
  }
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

  if (!isMock && (!room || !guardReady || !joined)) {
    return (
      <div className={styles.page}>
        <div className={styles.centerState}>
          {admission.joining ? 'Đang kiểm tra phiên tham gia...' : 'Đang kết nối vào phòng học...'}
        </div>
        <SessionDeviceModal
          open={admission.conflict !== null}
          mode="conflict"
          activeDeviceLabel={admission.conflict?.activeDeviceLabel}
          confirmLoading={admission.takingOver}
          onCancel={navigateToCalendar}
          onConfirm={() => void handleAdmissionTakeOver()}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SessionHeader
        participantLabel={participantLabel}
        elapsedLabel={formatElapsed(elapsedSeconds)}
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
            whiteboardOn={whiteboardOpen}
            onToggleWhiteboard={() => {
              if (isMock) return toast.info('Bảng vẽ không khả dụng ở chế độ demo');
              setWhiteboardOpen((v) => !v);
            }}
            onLeave={() => setEndModalOpen(true)}
            leaveLabel={isTutor ? 'Kết thúc' : 'Rời đi'}
          />
        </VideoStage>
        <SidePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          notesStorageKey={classSessionId ?? 'mock'}
          // Tab "Theo dõi" chỉ dựng cho gia sư — nơi bật/tắt và xem lại lịch sử cảnh báo.
          behavior={
            isTutor
              ? {
                  trackingOn: trackingRequested,
                  onToggleTracking: handleToggleEmotionMonitor,
                  alerts: emotionAlerts,
                  disabled: isMock,
                }
              : undefined
          }
        />
      </div>

      {!isMock && whiteboardOpen && classSessionId && room && (
        <Suspense fallback={<div className={styles.centerState}>Đang tải bảng vẽ…</div>}>
          <WhiteboardOverlay
            classSessionId={parseInt(classSessionId, 10)}
            participationId={room.participationId}
            leaseId={room.leaseId}
            onClose={() => setWhiteboardOpen(false)}
          />
        </Suspense>
      )}

      <Modal
        open={endModalOpen}
        onOk={confirmEnd}
        onCancel={() => setEndModalOpen(false)}
        confirmLoading={ending}
        title={isTutor ? 'Kết thúc buổi học?' : 'Rời khỏi buổi học?'}
        okText={isTutor ? 'Kết thúc buổi học' : 'Rời đi'}
        cancelText="Ở lại"
        okButtonProps={{ danger: true }}
        centered
      >
        <p style={{ margin: 0 }}>
          {isTutor
            ? 'Buổi học sẽ kết thúc cho tất cả mọi người tham gia và hệ thống sẽ tự động điểm danh cho buổi học này. Hành động này không thể hoàn tác.'
            : 'Bạn sẽ rời khỏi buổi học này.'}
        </p>
      </Modal>
      {/* Cảnh báo hành vi — chỉ gia sư. Đặt ở cấp trang (position: fixed) để luôn neo góc dưới
          bên phải MÀN HÌNH, không lệch theo khung camera hay khi mở/đóng SidePanel. */}
      {isTutor && <EmotionAlertToast items={emotionToasts} onDismiss={dismissEmotionToast} />}
    </div>
  );
};

/**
 * React Router tái sử dụng route element khi chỉ đổi `:classSessionId`. Keyed child đảm bảo
 * toàn bộ RTC/error/replaced state remount theo URL; wrapper chỉ release lease khi ID thật sự đổi,
 * không release trong generic unmount/refresh.
 */
const LiveSession = () => {
  const { classSessionId } = useParams<{ classSessionId: string }>();
  const sessionKey = classSessionId ?? 'invalid';
  const previousSessionKeyRef = useRef(sessionKey);
  const admissionsBySessionRef = useRef(new Map<string, LiveSessionAdmission>());

  const handleAdmissionReady = useCallback(
    (admission: LiveSessionAdmission) => {
      if (String(admission.room.classSessionId) === sessionKey) {
        admissionsBySessionRef.current.set(sessionKey, admission);
      }
    },
    [sessionKey],
  );

  useEffect(() => {
    const previousSessionKey = previousSessionKeyRef.current;
    if (previousSessionKey === sessionKey) return;

    previousSessionKeyRef.current = sessionKey;
    const previousAdmission = admissionsBySessionRef.current.get(previousSessionKey);
    admissionsBySessionRef.current.delete(previousSessionKey);
    if (!previousAdmission) return;

    void leaveRoom(previousAdmission.room.classSessionId, {
      participationId: previousAdmission.room.participationId,
      leaseId: previousAdmission.room.leaseId,
    });
  }, [sessionKey]);

  return <LiveSessionRoom key={sessionKey} onAdmissionReady={handleAdmissionReady} />;
};

export default LiveSession;
