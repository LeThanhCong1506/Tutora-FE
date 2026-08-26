import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Modal, Input } from 'antd';
import axios from 'axios';
import SessionDeviceModal from '../../components/SessionDeviceModal';
import {
  discardLiveSessionAdmission,
  peekLiveSessionAdmission,
  useLiveSessionAdmission,
  type LiveSessionAdmission,
} from '../../hooks/useLiveSessionAdmission';
import {
  getAgoraErrorMessage,
  isScheduleChangeConfirmationRequiredError,
  isSessionScheduleConflictError,
  leaveRoom,
} from '../../services/agora.service';
import {
  checkOutClassSession,
  requestClassSessionInterruption,
  getClassSessionInterruptionEligibility,
  type ClassSessionInterruptionEligibilityResponse,
} from '../../services/classSession.service';
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

/** Bắt đầu hiện cảnh báo đếm ngược khi còn ít hơn mốc này tới lúc hệ thống tự đóng phòng. */
const AUTO_END_WARNING_SEC = 5 * 60;

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
  // Số giây còn lại tới lúc hệ thống tự đóng phòng — null khi còn ngoài cửa sổ cảnh báo
  // (> AUTO_END_WARNING_SEC) hoặc chưa có mốc autoEndAt từ backend.
  const [autoEndCountdownSec, setAutoEndCountdownSec] = useState<number | null>(null);
  // % thật (dữ liệu Agora) đã đủ để báo ngắt giữa chừng chưa — null khi chưa poll được lần nào.
  const [interruptionEligibility, setInterruptionEligibility] =
    useState<ClassSessionInterruptionEligibilityResponse | null>(null);
  const [mockMicOn, setMockMicOn] = useState(initialMicOn);
  const [mockCamOn, setMockCamOn] = useState(initialCamOn);
  const [mockScreenSharing, setMockScreenSharing] = useState(false);
  const [mockMessages, setMockMessages] = useState<ChatMessage[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  // Modal "Kết thúc"/"Rời đi" gộp chung 2 lựa chọn: kết thúc bình thường hoặc báo ngắt giữa chừng
  // do sự cố đột xuất — trước đây là 2 nút/2 modal tách rời (1 ở ControlBar, 1 icon riêng ở header).
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endChoice, setEndChoice] = useState<'normal' | 'interrupt'>('normal');
  const [ending, setEnding] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [interrupting, setInterrupting] = useState(false);
  // Gia sư tự bấm kết thúc → bỏ qua nhánh auto-điều hướng của `sessionEnded`, nếu không
  // heartbeat trả `roomClosed` sẽ đá chính gia sư ra và chạy trùng logic rời phòng.
  const selfEndingRef = useRef(false);
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
        if (isScheduleChangeConfirmationRequiredError(error) || isSessionScheduleConflictError(error)) {
          navigate(`/session-lobby/${sessionIdNum}`, { replace: true });
          return;
        }
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
    } catch (error) {
      if (
        sessionIdNum != null &&
        (isScheduleChangeConfirmationRequiredError(error) || isSessionScheduleConflictError(error))
      ) {
        navigate('/session-lobby/' + sessionIdNum, { replace: true });
        return;
      }
      toast.error(getAgoraErrorMessage(error) || 'Không thể chuyển buổi học sang thiết bị này. Vui lòng thử lại.');
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
    scheduleConflictMessage,
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

  useEffect(() => {
    if (!scheduleConflictMessage || sessionIdNum == null) return;
    toast.error(scheduleConflictMessage);
    void leave().finally(() => {
      navigate(`/session-lobby/${sessionIdNum}`, { replace: true });
    });
  }, [leave, navigate, scheduleConflictMessage, sessionIdNum]);

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

  // Cảnh báo đếm ngược trước khi hệ thống tự đóng phòng (AutoEndLiveSessionJob ở backend).
  // autoEndAt chỉ có giá trị khi buổi đang in_progress và chưa đóng — hết cửa sổ cảnh báo
  // hoặc buổi đã kết thúc thì tự ẩn.
  useEffect(() => {
    const autoEndAt = isMock ? undefined : presenceStatus?.autoEndAt;
    if (!autoEndAt || sessionEnded) {
      setAutoEndCountdownSec(null);
      return;
    }
    const endMs = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(autoEndAt) ? autoEndAt : `${autoEndAt}Z`).getTime();
    const tick = () => {
      const remaining = Math.round((endMs - Date.now()) / 1000);
      setAutoEndCountdownSec(remaining > 0 && remaining <= AUTO_END_WARNING_SEC ? remaining : null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isMock, presenceStatus?.autoEndAt, sessionEnded]);

  // % thật (Agora) đã đủ báo ngắt giữa chừng chưa — poll định kỳ trong lúc đang học, KHÔNG suy
  // từ elapsed time (đồng hồ tường không phản ánh có đang học thật hay không, giống lý do BE
  // dùng overlapRatio thay Realstart→now ở RequestInterruptionAsync).
  useEffect(() => {
    if (isMock || !joined || !presenceStatus?.isCheckedIn || sessionIdNum == null) {
      setInterruptionEligibility(null);
      return;
    }
    let cancelled = false;
    const poll = () => {
      getClassSessionInterruptionEligibility(sessionIdNum)
        .then((res) => {
          if (!cancelled) setInterruptionEligibility(res.content);
        })
        .catch(() => {
          // Lỗi (mất kết nối, endpoint chưa deploy...) — CỐ Ý không set gì cả, để
          // interruptionEligible ở nơi gọi fail-open (coi như bấm được) thay vì khoá vĩnh viễn.
          // Backend RequestInterruptionAsync vẫn là lưới an toàn thật khi bấm xác nhận.
        });
    };
    poll();
    const interval = setInterval(poll, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isMock, joined, presenceStatus?.isCheckedIn, sessionIdNum]);

  const participantLabel = useMemo(() => {
    if (isMock) return 'Học sinh Demo';
    if (!room) return '';
    return [room.tutorName, room.studentName].filter(Boolean).join(', ');
  }, [isMock, room]);

  // Chỉ cho chọn "Báo ngắt giữa chừng" trong modal gộp khi đã điểm danh (đang in_progress — báo ngắt
  // trước đó không có ý nghĩa) và buổi này còn được phép báo ngắt (buổi phụ/buổi học lại do hoà giải
  // thì không — canEverBeInterrupted=false cố định suốt buổi). Chưa tải xong (undefined) vẫn cho hiện,
  // cùng triết lý fail-open với interruptionEligible bên dưới (BE vẫn là lưới an toàn thật).
  const showInterruptOption =
    (isMock || presenceStatus?.isCheckedIn) && interruptionEligibility?.canEverBeInterrupted !== false;
  const interruptEligibleNow = isMock || !interruptionEligibility ? true : interruptionEligibility.eligible;

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
    // Gia sư "Kết thúc buổi học": ghi check-out (đóng phòng) + đá mọi người còn lại ra, rồi thoát
    // thẳng ra ngoài. Không ép điền báo cáo tại chỗ — gia sư điền sau ở trang Chi tiết buổi học,
    // form ở đó vẫn nhận báo cáo bình thường cho buổi đã check-out.
    if (isTutor && classSessionId) {
      selfEndingRef.current = true;
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

  // Báo buổi học bị ngắt giữa chừng vì sự cố đột xuất (mất điện, mất mạng...). Buổi hiện tại
  // dừng lại (backend chuyển "interrupted") và một buổi phụ được tạo để học nốt trong ngày —
  // người dùng tìm buổi phụ đó lại trong danh sách buổi học, không tự động chuyển phòng ngay.
  const confirmInterrupt = async () => {
    if (isMock) {
      toast.info('Không khả dụng ở chế độ demo');
      setEndModalOpen(false);
      return;
    }
    if (sessionIdNum == null) return;
    setInterrupting(true);
    try {
      await requestClassSessionInterruption(sessionIdNum, interruptReason.trim() || undefined);
      toast.success('Đã báo buổi học bị ngắt. Buổi phụ đã được tạo, xem trong danh sách buổi học của bạn.');
      setEndModalOpen(false);
      // Đá phía còn lại ra ngay qua RTM — không đợi heartbeat (tới 10s) mới phát hiện roomClosed,
      // giống hệt đường "Kết thúc buổi học" bình thường ở handleLeave.
      selfEndingRef.current = true;
      await broadcastSessionEnded();
      await leave();
      navigate(-1);
    } catch (error) {
      const fallback = 'Không thể báo buổi học bị ngắt. Vui lòng thử lại.';
      const message = axios.isAxiosError(error) ? (error.response?.data?.message as string | undefined) : undefined;
      toast.error(message || fallback);
    } finally {
      setInterrupting(false);
    }
  };

  // Điểm vào duy nhất của modal gộp: tuỳ lựa chọn đang chọn mà chạy đúng luồng kết thúc/báo ngắt sẵn có.
  const confirmEndChoice = () => (endChoice === 'interrupt' ? confirmInterrupt() : confirmEnd());

  // Takeover chỉ thu hồi media/RTC/presence của thiết bị cũ. Không đi qua handleLeave vì nhánh đó
  // sẽ check-out và kết thúc cả buổi nếu người bị thay thế là gia sư.
  useEffect(() => {
    if (isMock || !sessionReplaced || replacementCleanupStartedRef.current) return;
    replacementCleanupStartedRef.current = true;
    void leave();
  }, [isMock, leave, sessionReplaced]);

  // Bị đá khỏi phòng: gia sư đã kết thúc buổi (nhận tín hiệu SESSION_ENDED hoặc phòng đã đóng).
  // Không áp dụng cho chính gia sư vừa bấm kết thúc — nhánh đó đã tự rời phòng trong handleLeave.
  useEffect(() => {
    if (isMock || !sessionEnded || sessionReplaced || selfEndingRef.current) return;
    toast.info('Buổi học đã kết thúc.');
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
        <PermissionErrorState
          title={joinError.title}
          message={joinError.message}
          kind={joinError.kind}
          onBack={handleBack}
          onRetry={() => window.location.reload()}
        />
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
        isRecording={isMock ? true : Boolean(presenceStatus?.isRecording)}
      />
      {autoEndCountdownSec !== null && (
        <div className={styles.autoEndWarning} role="status">
          <span className={styles.autoEndWarningDot} />
          Buổi học sẽ tự động kết thúc sau{' '}
          <span className={styles.autoEndWarningTime}>{formatElapsed(autoEndCountdownSec)}</span>
        </div>
      )}
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
          {isScreenSharing && (
            <div className={styles.screenShareBanner} role="status">
              <span className={styles.screenShareBannerDot} />
              <span>Bạn đang chia sẻ màn hình</span>
              <button
                type="button"
                className={styles.screenShareStopBtn}
                onClick={() => {
                  if (isMock) return setMockScreenSharing(false);
                  toggleScreenShare().catch(() => toast.error('Không thể dừng chia sẻ màn hình'));
                }}
              >
                Dừng chia sẻ
              </button>
            </div>
          )}
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
            onLeave={() => {
              setEndChoice('normal');
              setEndModalOpen(true);
            }}
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
            displayName={localName}
            onClose={() => setWhiteboardOpen(false)}
          />
        </Suspense>
      )}

      {/* Modal gộp: trước đây là 2 nút/2 modal tách rời (Kết thúc ở ControlBar dưới cùng, Báo ngắt
          giữa chừng là icon riêng ở header) — gộp về 1 điểm bấm duy nhất, cho chọn rõ 1 trong 2 khi
          buổi còn được phép báo ngắt (showInterruptOption); nếu không (chưa điểm danh, hoặc buổi
          phụ/buổi học lại do hoà giải — không được báo ngắt nữa) thì chỉ còn đúng luồng kết thúc cũ. */}
      <Modal
        open={endModalOpen}
        onOk={confirmEndChoice}
        onCancel={() => {
          setEndModalOpen(false);
          setInterruptReason('');
        }}
        title={isTutor ? 'Kết thúc buổi học?' : 'Rời khỏi buổi học?'}
        okText={
          endChoice === 'interrupt'
            ? interrupting
              ? 'Đang xử lý…'
              : 'Xác nhận báo ngắt'
            : isTutor
              ? 'Kết thúc buổi học'
              : 'Rời đi'
        }
        cancelText="Ở lại"
        cancelButtonProps={{ disabled: ending || interrupting }}
        okButtonProps={
          endChoice === 'interrupt'
            ? // KHÔNG dùng confirmLoading ở đây: icon xoay antd tự thêm lấy màu theo class riêng,
              // không theo `style` ghi đè bên dưới → lệch màu với nền nút. Đổi text + khoá nút bằng
              // tay để luôn 1 màu, giống cách CloseDisputeModal (CMS) đang làm.
              { disabled: interrupting, style: { background: '#d97706', borderColor: '#d97706', color: '#fff' } }
            : { danger: true, disabled: ending, loading: ending }
        }
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {showInterruptOption ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => setEndChoice('normal')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: endChoice === 'normal' ? '1.5px solid #dc2626' : '1px solid #e5e7eb',
                  background: endChoice === 'normal' ? '#fef2f2' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{isTutor ? 'Kết thúc bình thường' : 'Rời đi bình thường'}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>
                  {isTutor
                    ? 'Buổi học kết thúc cho tất cả, hệ thống tự điểm danh và tính buổi này là đã học đủ.'
                    : 'Bạn rời khỏi buổi học này, buổi vẫn tiếp tục bình thường cho người còn lại.'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => interruptEligibleNow && setEndChoice('interrupt')}
                disabled={!interruptEligibleNow}
                title={
                  !interruptEligibleNow && interruptionEligibility
                    ? `Cần học đủ ${Math.round(interruptionEligibility.requiredRatio * 100)}% mới báo ngắt được (hiện ${Math.round(interruptionEligibility.currentRatio * 100)}%)`
                    : undefined
                }
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: endChoice === 'interrupt' ? '1.5px solid #d97706' : '1px solid #e5e7eb',
                  background: endChoice === 'interrupt' ? '#fffbeb' : '#fff',
                  cursor: interruptEligibleNow ? 'pointer' : 'not-allowed',
                  opacity: interruptEligibleNow ? 1 : 0.5,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Báo ngắt giữa chừng do sự cố</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>
                  Chỉ dùng khi có sự cố kỹ thuật ngoài ý muốn (mất điện, mất mạng...) khiến buổi học đang diễn ra bị
                  gián đoạn. Buổi hiện tại dừng lại, hệ thống tạo ngay 1 buổi phụ để học nốt trong hôm nay. Nếu bạn có
                  việc bận/gấp cần dừng sớm, hãy dùng chức năng "Dời lịch học" thay vì báo ngắt ở đây.
                  {!interruptEligibleNow && interruptionEligibility && (
                    <>
                      {' '}
                      Cần học đủ {Math.round(interruptionEligibility.requiredRatio * 100)}% (hiện{' '}
                      {Math.round(interruptionEligibility.currentRatio * 100)}%).
                    </>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <p style={{ margin: 0 }}>
              {isTutor
                ? 'Buổi học sẽ kết thúc cho tất cả mọi người tham gia và hệ thống sẽ tự động điểm danh cho buổi học này. Hành động này không thể hoàn tác. Ngay sau đó bạn sẽ được mời viết báo cáo buổi học.'
                : 'Bạn sẽ rời khỏi buổi học này.'}
            </p>
          )}

          {endChoice === 'interrupt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Input.TextArea
                rows={3}
                maxLength={500}
                // Tắt spellcheck của trình duyệt: từ điển mặc định là tiếng Anh nên gạch đỏ hầu như
                // mọi từ tiếng Việt, làm ô nhập trông lỗi/rối dù không có lỗi thật nào.
                spellCheck={false}
                placeholder="Lý do (mất điện, mất mạng...)"
                value={interruptReason}
                onChange={(e) => setInterruptReason(e.target.value)}
              />
              {/* Đếm ký tự bằng tay thay vì dùng showCount của antd: showCount vẽ đè số đếm lên góc
                  dưới-phải NGAY BÊN TRONG khung textarea (chồng lên tay cầm resize), nhìn như lỗi. */}
              <p style={{ margin: 0, textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
                {interruptReason.length} / 500
              </p>
            </div>
          )}
        </div>
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
