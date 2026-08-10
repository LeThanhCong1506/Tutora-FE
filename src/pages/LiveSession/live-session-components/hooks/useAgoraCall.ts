import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type ILocalVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import AgoraRTM, { type RTMClient, type RTMEvents } from 'agora-rtm-sdk';
import {
  getActiveSessionConflict,
  getAgoraErrorMessage,
  isSessionLeaseRevokedError,
  isSessionScheduleConflictError,
  joinAgoraRoom,
  sendRoomHeartbeat,
  leaveRoom,
  type AgoraRoomInfo,
  type SessionPresenceStatus,
} from '../../../../services/agora.service';
import type { LiveSessionIdentity } from '../../../../utils/liveSessionIdentity';
import type { ChatMessage, RemoteParticipant } from '../types';

/**
 * Không có thao tác nào lâu hơn mốc này thì nhịp heartbeat tự khai là "idle". Đủ dài để một
 * người đang nghe giảng chăm chú không bị coi là bỏ đi, đủ ngắn để phòng bỏ trống lộ ra
 * trong vòng vài nhịp.
 */
const IDLE_AFTER_MS = 3 * 60_000;

/** Tin điều khiển gửi qua RTM để đá mọi người khỏi phòng khi gia sư kết thúc buổi học. */
const SESSION_ENDED_SIGNAL = '__SESSION_ENDED__';
/** Tín hiệu RTM gia sư bật/tắt theo dõi hành vi trên máy học viên (học viên không được báo). */
const TRACKING_START_SIGNAL = '__TRACKING_START__';
const TRACKING_STOP_SIGNAL = '__TRACKING_STOP__';
/**
 * Cảnh báo hành vi học viên gửi thẳng cho gia sư qua RTM (kênh sẵn có trong phòng), dạng
 * "__ALERT__{json}". Đi cùng đường lưu qua backend: RTM lo hiển thị tức thì, backend lo lưu trữ.
 */
const ALERT_SIGNAL_PREFIX = '__ALERT__';

/** Cảnh báo hành vi nhận qua RTM (phía gia sư). */
export interface LiveEmotionAlert {
  id: string;
  reason: string;
  level?: string;
  message: string;
  at: number;
}

interface UseAgoraCallResult {
  joined: boolean;
  joinError: string | null;
  localVideoTrack: ICameraVideoTrack | ILocalVideoTrack | null;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  remoteParticipants: RemoteParticipant[];
  chatMessages: ChatMessage[];
  /** Trạng thái presence mới nhất từ heartbeat (ai đang có mặt, đã check-in chưa). */
  presenceStatus: SessionPresenceStatus | null;
  /** True khi buổi học đã kết thúc (gia sư check-out hoặc nhận tín hiệu SESSION_ENDED). */
  sessionEnded: boolean;
  /** True khi lease của thiết bị này đã bị takeover bởi thiết bị khác. */
  sessionReplaced: boolean;
  scheduleConflictMessage: string | null;
  /** True khi gia sư đã bật theo dõi hành vi (máy học viên nhận qua RTM). Học viên KHÔNG được báo. */
  trackingRequested: boolean;
  /**
   * LỊCH SỬ toàn bộ cảnh báo trong buổi — chỉ thêm, không bao giờ xoá (tab "Theo dõi" đọc cái này).
   */
  emotionAlerts: LiveEmotionAlert[];
  /** Hàng đợi toast đang hiển thị — tách khỏi lịch sử để toast tắt không làm mất log. */
  emotionToasts: LiveEmotionAlert[];
  /** Gỡ một toast khỏi hàng đợi hiển thị (KHÔNG ảnh hưởng lịch sử). */
  dismissEmotionToast: (id: string) => void;
  /** Học viên gọi để báo cảnh báo hành vi tới gia sư qua RTM. */
  sendEmotionAlert: (alert: Omit<LiveEmotionAlert, 'id' | 'at'>) => void;
  sendChatMessage: (text: string) => void;
  /** Gia sư gọi khi kết thúc buổi: phát tín hiệu đá mọi người còn lại khỏi phòng. */
  broadcastSessionEnded: () => Promise<void>;
  /** Gia sư bật/tắt theo dõi hành vi: phát tín hiệu RTM tới máy học viên. */
  broadcastTracking: (on: boolean) => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCam: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * Quản lý vòng đời kết nối Agora RTC cho một buổi học: join channel, publish
 * local mic/camera track, subscribe remote track, toggle mic/cam/screen-share,
 * và dọn dẹp (nhả camera/mic) khi rời phòng hoặc unmount.
 */
export const useAgoraCall = (
  room: AgoraRoomInfo | null,
  participantNames: Record<string, string>,
  options?: { initialMicOn?: boolean; initialCamOn?: boolean; identity?: LiveSessionIdentity | null },
): UseAgoraCallResult => {
  // Lựa chọn bật/tắt camera/micro người dùng đã chọn ở phòng chờ (mặc định bật khi vào thẳng).
  const initialMicOn = options?.initialMicOn ?? true;
  const initialCamOn = options?.initialCamOn ?? true;
  const identity = options?.identity;
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  // Chống gọi chồng toggleScreenShare (double-click, hoặc track-ended đua với cú click).
  const isTogglingScreenRef = useRef(false);
  const leavingRef = useRef(false);
  // RTM client để nhắn tin trong phiên — chat realtime, không lưu DB.
  const rtmClientRef = useRef<RTMClient | null>(null);
  const rtmChannelRef = useRef<string | null>(null);
  const localUidRef = useRef<string | number | null>(null);
  const localNameRef = useRef<string>('Bạn');
  // Trạng thái mic/cam mới nhất cho heartbeat. Dùng ref chứ không đọc state trực tiếp để
  // sendHeartbeat giữ nguyên identity — nếu không, mỗi lần bật/tắt mic sẽ reset nhịp 20s.
  const micOnRef = useRef(initialMicOn);
  const camOnRef = useRef(initialCamOn);
  const screenSharingRef = useRef(false);
  /** Mốc thao tác gần nhất của người dùng trong tab lớp học. */
  const lastInteractionRef = useRef(Date.now());
  /** Đang có một nhịp heartbeat trên đường đi — nhịp mới phát sinh trong lúc đó sẽ bị bỏ qua. */
  const heartbeatInFlightRef = useRef(false);

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | ILocalVideoTrack | null>(null);
  const [micOn, setMicOn] = useState(initialMicOn);
  const [camOn, setCamOn] = useState(initialCamOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<SessionPresenceStatus | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [scheduleConflictMessage, setScheduleConflictMessage] = useState<string | null>(null);
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const [trackingRequested, setTrackingRequested] = useState(false);
  const [emotionAlerts, setEmotionAlerts] = useState<LiveEmotionAlert[]>([]);
  const [emotionToasts, setEmotionToasts] = useState<LiveEmotionAlert[]>([]);

  const nameFor = useCallback(
    (uid: string | number) => participantNames[String(uid)] ?? `Người tham gia ${uid}`,
    [participantNames],
  );

  // Bản sao ref của trạng thái thiết bị, chỉ để heartbeat đọc mà không phải phụ thuộc state.
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    camOnRef.current = camOn;
  }, [camOn]);
  useEffect(() => {
    screenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // Theo dõi thao tác để nhịp heartbeat biết người dùng còn ngồi trước máy hay không.
  // Chỉ ghi mốc thời gian, không lưu nội dung thao tác.
  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'focus'];
    events.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));
    // Quay lại tab cũng là một dấu hiệu có mặt, không cần đợi thao tác tiếp theo.
    document.addEventListener('visibilitychange', markInteraction);

    return () => {
      events.forEach((event) => window.removeEventListener(event, markInteraction));
      document.removeEventListener('visibilitychange', markInteraction);
    };
  }, []);

  useEffect(() => {
    if (!room) return;

    let cancelled = false;
    leavingRef.current = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    // Dựng lại danh sách remote TỪ client.remoteUsers (nguồn chân lý của SDK) thay vì tự thêm/bớt.
    // Nhờ vậy khi remote gỡ track (dừng share) hoặc rời phòng, tile được cập nhật/xoá đúng ngay,
    // không còn "khung hình đóng băng" do state cũ còn sót.
    const syncRemotes = () => {
      setRemoteParticipants(
        client.remoteUsers.map((u) => ({
          uid: u.uid,
          name: nameFor(u.uid),
          videoTrack: u.videoTrack,
          audioTrack: u.audioTrack,
          hasVideo: !!u.videoTrack,
          hasAudio: !!u.audioTrack,
        })),
      );
    };

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') user.audioTrack?.play();
      } catch (err) {
        // subscribe() có thể lỗi tạm thời (vd. đúng lúc phía kia rời rồi vào lại channel với cùng
        // uid) — nuốt lỗi ở đây trước là ĐÚNG mục đích: nếu để throw, listener bị đăng ký kiểu
        // fire-and-forget này sẽ dừng luôn TRƯỚC syncRemotes() phía dưới, khiến remoteParticipants
        // không bao giờ được cập nhật — tile của người đó biến mất khỏi màn hình vĩnh viễn dù SDK
        // đã báo user-published. Vẫn phải sync để tile ít nhất hiện avatar đợi track.
        console.error(`❌ Subscribe ${mediaType} track failed for uid ${user.uid}:`, err);
      }
      syncRemotes();
    };

    // Đồng bộ ngay khi có người vào lại channel (trước khi họ publish track), để tile của họ xuất
    // hiện với avatar tức thì thay vì chờ tới lúc publish thành công — cùng lý do với việc bọc
    // try/catch ở trên: không được chỉ trông chờ vào đúng một sự kiện publish để dựng lại UI.
    const handleUserJoined = () => syncRemotes();

    const handleUserUnpublished = () => syncRemotes();

    const handleUserLeft = () => syncRemotes();

    // Token Agora hết hạn theo thời gian (thời hạn cấu hình ở AgoraSettings.TokenExpireSeconds
    // bên backend) — sự kiện này bắn ra ít lâu trước khi hết hạn để client kịp xin token mới và
    // gia hạn phiên mà không phải rời/vào lại channel.
    const renewAgoraToken = async (showErrorOnFailure = false) => {
      try {
        // Dùng room.classSessionId làm nguồn chuẩn khi xin token mới. Nếu buổi đã đóng,
        // backend trả lỗi ở đây và phiên sẽ hết hạn tự nhiên.
        if (!identity) throw new Error('Missing live session identity');
        const fresh = await joinAgoraRoom(room.classSessionId, identity);
        await client.renewToken(fresh.content.token);
        const rtm = rtmClientRef.current;
        if (rtm) {
          try {
            await rtm.renewToken(fresh.content.token);
          } catch (rtmError) {
            // RTC remains authoritative for the lesson; a transient chat renewal error must not
            // turn a healthy media session into a false device-replaced state.
            console.error('❌ Agora RTM token renewal failed:', rtmError);
          }
        }
      } catch (err) {
        if (isSessionLeaseRevokedError(err) || getActiveSessionConflict(err)) {
          setSessionReplaced(true);
          return;
        }
        console.error('❌ Agora token renewal failed:', err);
        if (showErrorOnFailure) {
          setJoinError('Phiên kết nối đã hết hạn. Vui lòng tải lại trang để tiếp tục.');
        }
      }
    };

    const handleTokenWillExpire = () => {
      void renewAgoraToken();
    };

    // Nếu renew ở trên thất bại (mất mạng, buổi học đã quá hạn truy cập...), token sẽ thực sự hết
    // hạn và Agora chủ động ngắt kết nối — báo cho user thay vì để màn hình đứng hình im lặng.
    const handleTokenDidExpire = () => {
      // Mobile/WebView may resume only after the short token has expired. Renewing still goes
      // through admission, so an active device recovers while a replaced device is rejected.
      void renewAgoraToken(true);
    };

    client.on('user-joined', handleUserJoined);
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    client.on('token-privilege-will-expire', handleTokenWillExpire);
    client.on('token-privilege-did-expire', handleTokenDidExpire);

    (async () => {
      try {
        await client.join(room.appId, room.channel, room.token, room.uid);
        const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          micTrack.close();
          camTrack.close();
          return;
        }
        micTrackRef.current = micTrack;
        camTrackRef.current = camTrack;
        await client.publish([micTrack, camTrack]);
        // Áp trạng thái bật/tắt đã chọn ở phòng chờ SAU khi publish. Agora KHÔNG cho publish track đã
        // setEnabled(false) (ném TRACK_IS_DISABLED), nên phải publish khi còn enabled rồi mới tắt.
        if (!initialMicOn) await micTrack.setEnabled(false);
        if (!initialCamOn) await camTrack.setEnabled(false);
        setLocalVideoTrack(camTrack);

        localUidRef.current = room.uid;
        localNameRef.current = participantNames[String(room.uid)] ?? 'Bạn';

        // Đăng nhập RTM và subscribe kênh chat (cùng channel/token với RTC).
        try {
          const rtm = new AgoraRTM.RTM(room.appId, String(room.uid));
          rtm.addEventListener('tokenPrivilegeWillExpire', () => {
            void renewAgoraToken();
          });
          rtm.addEventListener('message', (event: RTMEvents.MessageEvent) => {
            if (event.publisher === String(room.uid)) return; // bỏ echo của chính mình
            const text = typeof event.message === 'string' ? event.message : '';
            if (!text) return;
            // Tín hiệu điều khiển "kết thúc buổi" → đá mình ra khỏi phòng (không phải tin chat).
            if (text === SESSION_ENDED_SIGNAL) {
              setSessionEnded(true);
              return;
            }
            // Tín hiệu gia sư bật/tắt theo dõi hành vi (điều khiển, không phải tin chat).
            if (text === TRACKING_START_SIGNAL) {
              setTrackingRequested(true);
              return;
            }
            if (text === TRACKING_STOP_SIGNAL) {
              setTrackingRequested(false);
              return;
            }
            // Cảnh báo hành vi từ máy học viên → xếp vào hàng đợi toast của gia sư.
            if (text.startsWith(ALERT_SIGNAL_PREFIX)) {
              try {
                const payload = JSON.parse(text.slice(ALERT_SIGNAL_PREFIX.length)) as {
                  reason: string;
                  level?: string;
                  message: string;
                };
                const entry: LiveEmotionAlert = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  reason: payload.reason,
                  level: payload.level,
                  message: payload.message,
                  at: Date.now(),
                };
                // Lịch sử: giữ suốt buổi. Toast: hiển thị tạm rồi tự gỡ.
                setEmotionAlerts((prev) => [...prev, entry]);
                setEmotionToasts((prev) => [...prev, entry]);
              } catch {
                // payload hỏng — bỏ qua, không để ảnh hưởng chat
              }
              return;
            }
            setChatMessages((prev) => [
              ...prev,
              {
                id: `${event.publisher}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                senderUid: event.publisher,
                senderName: nameFor(event.publisher),
                text,
                timestamp: Date.now(),
                isLocal: false,
              },
            ]);
          });
          await rtm.login({ token: room.token });
          await rtm.subscribe(room.channel);
          if (cancelled) {
            await rtm.logout();
          } else {
            rtmClientRef.current = rtm;
            rtmChannelRef.current = room.channel;
          }
        } catch (rtmErr) {
          console.error('❌ Agora RTM (chat) init failed:', rtmErr);
        }

        setJoined(true);
      } catch (err) {
        console.error('❌ Agora join failed:', err);
        if (!cancelled) {
          setJoinError(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'Vui lòng cấp quyền camera/micro để tham gia buổi học.'
              : 'Không thể kết nối vào phòng học. Vui lòng thử lại.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      client.off('user-joined', handleUserJoined);
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      client.off('token-privilege-will-expire', handleTokenWillExpire);
      client.off('token-privilege-did-expire', handleTokenDidExpire);
      if (!leavingRef.current) {
        // Chỉ dọn tài nguyên local. Không release lease trong cleanup/unmount: khi refresh,
        // cleanup của page cũ có thể đến sau lúc page mới vừa resume cùng lease và xoá nhầm owner.
        void cleanupTracks();
        void cleanupRtm();
        void client.leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Gửi một nhịp heartbeat: báo BE "đang có mặt", nhận lại trạng thái presence/check-in.
  // Tách khỏi effect để vừa chạy theo interval, vừa gọi được tức thì khi có người mới vào phòng.
  const sendHeartbeat = useCallback(async () => {
    if (!room || leavingRef.current) return;
    // Lúc vừa join, effect interval và effect "có người mới" cùng bắn một nhịp gần như đồng thời.
    // Hai request song song khiến BE (đọc-rồi-ghi) tạo ra HAI đoạn heartbeat trùng nhau trong
    // nhật ký bằng chứng. Một nhịp đang bay là đủ — nhịp thứ hai không mang thêm thông tin gì.
    if (heartbeatInFlightRef.current) return;
    heartbeatInFlightRef.current = true;
    try {
      const res = await sendRoomHeartbeat(
        room.classSessionId,
        {
          participationId: room.participationId,
          leaseId: room.leaseId,
        },
        {
          micOn: micOnRef.current,
          // Chia sẻ màn hình cũng là đang publish hình — im lặng demo bài không phải bỏ lớp.
          cameraOn: camOnRef.current || screenSharingRef.current,
          // Tab bị ẩn, hoặc không có thao tác nào suốt IDLE_AFTER_MS. Chỉ khi cả mic lẫn cam
          // đều tắt thì BE mới tính là "phòng bỏ không" — dạy bằng tiếng nói không bị coi là bỏ lớp.
          idle:
            document.visibilityState === 'hidden' ||
            Date.now() - lastInteractionRef.current > IDLE_AFTER_MS,
        },
      );
      if (leavingRef.current) return;
      setPresenceStatus(res.content);
      if (res.content?.roomClosed) setSessionEnded(true);
    } catch (error) {
      if (!leavingRef.current && isSessionLeaseRevokedError(error)) {
        setSessionReplaced(true);
      } else if (!leavingRef.current && isSessionScheduleConflictError(error)) {
        setScheduleConflictMessage(getAgoraErrorMessage(error) || 'Buổi học hiện bị trùng với lịch khác.');
      }
      // bỏ qua lỗi mạng tạm thời — nhịp sau sẽ thử lại
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [room]);

  // Heartbeat định kỳ: khi đã join, báo BE mỗi 20s để BE auto check-in khi đủ cả 2 người và
  // biết khi nào cần đá mình ra (phòng đã đóng vì gia sư check-out).
  useEffect(() => {
    if (!joined || !room) return;
    void sendHeartbeat();
    const interval = setInterval(() => void sendHeartbeat(), 20_000);
    return () => clearInterval(interval);
  }, [joined, room, sendHeartbeat]);

  // Có người mới xuất hiện trong channel (Agora báo qua user-published) → bắn heartbeat NGAY,
  // không đợi hết nhịp 20s. Nhờ vậy phía vào trước nhận check-in gần như tức thì và banner
  // "đang chờ… vào phòng" biến mất ngay khi cả hai đã có mặt.
  const remoteCount = remoteParticipants.length;
  useEffect(() => {
    if (!joined || !room || remoteCount === 0) return;
    void sendHeartbeat();
  }, [joined, room, remoteCount, sendHeartbeat]);

  const cleanupTracks = async () => {
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    micTrackRef.current = null;
    camTrackRef.current = null;
    screenTrackRef.current = null;
  };

  const cleanupRtm = async () => {
    const rtm = rtmClientRef.current;
    rtmClientRef.current = null;
    rtmChannelRef.current = null;
    if (rtm) {
      try {
        await rtm.logout();
      } catch (err) {
        console.error('❌ Error logging out RTM:', err);
      }
    }
  };

  const toggleMic = useCallback(async () => {
    const track = micTrackRef.current;
    if (!track) return;
    const next = !micOn;
    await track.setEnabled(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    const track = camTrackRef.current;
    if (!track) return;
    const next = !camOn;
    await track.setEnabled(next);
    setCamOn(next);
  }, [camOn]);

  // Dọn dẹp screen track và quay lại camera. Dùng chung cho cả khi người dùng bấm nút tắt share
  // trong app lẫn khi bấm "Stop sharing" ở thanh điều khiển gốc của trình duyệt (sự kiện track-ended).
  // Luôn reset trạng thái trong finally để một lần unpublish lỗi không làm kẹt isScreenSharing.
  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    const screenTrack = screenTrackRef.current;
    // Xoá ref trước để lần gọi chồng (vd track-ended bắn khi đang dừng) không đụng lại track cũ.
    screenTrackRef.current = null;
    try {
      if (screenTrack) {
        try {
          if (client) await client.unpublish(screenTrack);
        } catch (err) {
          console.error('❌ Unpublish screen track failed:', err);
        }
        screenTrack.close();
      }
      if (client && camTrackRef.current) {
        await client.publish(camTrackRef.current);
        setLocalVideoTrack(camTrackRef.current);
      }
    } catch (err) {
      console.error('❌ Stop screen share failed:', err);
    } finally {
      setIsScreenSharing(false);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    // createScreenVideoTrack mở hộp thoại chọn màn hình — PHẢI được gọi từ user gesture, nếu không
    // trình duyệt ném NotAllowedError. Lỗi ở đây (kể cả người dùng bấm Huỷ) được ném lên nơi gọi.
    const screenTrack = await AgoraRTC.createScreenVideoTrack({}, 'disable');
    try {
      if (camTrackRef.current) await client.unpublish(camTrackRef.current);
      await client.publish(screenTrack);
    } catch (err) {
      // Publish lỗi → đóng track vừa tạo và khôi phục camera để không mất hình, rồi ném lại.
      screenTrack.close();
      if (camTrackRef.current) {
        try {
          await client.publish(camTrackRef.current);
        } catch {
          /* bỏ qua — sẽ được dọn khi rời phòng */
        }
      }
      throw err;
    }
    screenTrackRef.current = screenTrack;
    setLocalVideoTrack(screenTrack);
    setIsScreenSharing(true);

    // Người dùng dừng share từ thanh gốc của trình duyệt → gọi THẲNG stopScreenShare (không qua
    // toggle) để không bao giờ vô tình mở lại hộp thoại chọn màn hình ngoài user gesture.
    screenTrack.on('track-ended', () => {
      void stopScreenShare();
    });
  }, [stopScreenShare]);

  // Nút bật/tắt share trong app. Quyết định bật hay tắt dựa vào screenTrackRef (ref luôn mới),
  // KHÔNG dùng state isScreenSharing để tránh stale closure. Có cờ chống gọi chồng.
  const toggleScreenShare = useCallback(async () => {
    if (!clientRef.current) return;
    if (isTogglingScreenRef.current) return;
    isTogglingScreenRef.current = true;
    try {
      if (screenTrackRef.current) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (err) {
      // Người dùng bấm Huỷ ở hộp thoại chọn màn hình → NotAllowedError/PERMISSION_DENIED, không
      // phải lỗi thật → im lặng. Các lỗi khác ném lên để nơi gọi hiện toast.
      const code = (err as { code?: string })?.code;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || code === 'PERMISSION_DENIED') {
        console.warn('Screen share cancelled by user');
        return;
      }
      throw err;
    } finally {
      isTogglingScreenRef.current = false;
    }
  }, [startScreenShare, stopScreenShare]);

  const broadcastSessionEnded = useCallback(async () => {
    const rtm = rtmClientRef.current;
    const channel = rtmChannelRef.current;
    if (!rtm || !channel) return;
    try {
      await rtm.publish(channel, SESSION_ENDED_SIGNAL);
    } catch (err) {
      console.error('❌ Failed to broadcast session-ended signal:', err);
    }
  }, []);

  const broadcastTracking = useCallback(async (on: boolean) => {
    // Cập nhật ngay phía gia sư để UI phản hồi tức thì; máy học viên nhận qua RTM.
    setTrackingRequested(on);
    const rtm = rtmClientRef.current;
    const channel = rtmChannelRef.current;
    if (!rtm || !channel) return;
    try {
      await rtm.publish(channel, on ? TRACKING_START_SIGNAL : TRACKING_STOP_SIGNAL);
    } catch (err) {
      console.error('❌ Failed to broadcast tracking signal:', err);
    }
  }, []);

  /** Học viên: bắn cảnh báo hành vi tới gia sư qua RTM (hiển thị tức thì, không chờ backend). */
  const sendEmotionAlert = useCallback((alert: Omit<LiveEmotionAlert, 'id' | 'at'>) => {
    const rtm = rtmClientRef.current;
    const channel = rtmChannelRef.current;
    if (!rtm || !channel) return;
    void rtm
      .publish(channel, `${ALERT_SIGNAL_PREFIX}${JSON.stringify(alert)}`)
      .catch((err) => console.error('❌ Failed to send emotion alert via RTM:', err));
  }, []);

  /** Chỉ gỡ khỏi hàng đợi toast — lịch sử trong tab "Theo dõi" giữ nguyên. */
  const dismissEmotionToast = useCallback((id: string) => {
    setEmotionToasts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Hiển thị ngay tin của mình (optimistic) — RTM không tự vọng lại tin của publisher.
    setChatMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderUid: localUidRef.current ?? 'local',
        senderName: localNameRef.current,
        text: trimmed,
        timestamp: Date.now(),
        isLocal: true,
      },
    ]);

    const rtm = rtmClientRef.current;
    const channel = rtmChannelRef.current;
    if (!rtm || !channel) return;
    void rtm.publish(channel, trimmed).catch((err) => {
      console.error('❌ Failed to send chat message:', err);
    });
  }, []);

  const leave = useCallback(async () => {
    leavingRef.current = true;
    const client = clientRef.current;
    const classSessionId = room?.classSessionId;
    await cleanupTracks();
    await cleanupRtm();
    if (client) {
      try {
        await client.unpublish();
      } catch (err) {
        console.error('❌ Error unpublishing Agora tracks:', err);
      }
      try {
        await client.leave();
      } catch (err) {
        console.error('❌ Error leaving Agora channel:', err);
      }
    }
    if (classSessionId != null && room) {
      await leaveRoom(classSessionId, {
        participationId: room.participationId,
        leaseId: room.leaseId,
      });
    }
    setJoined(false);
    setLocalVideoTrack(null);
    setRemoteParticipants([]);
    setChatMessages([]);
  }, [room]);

  return {
    joined,
    joinError,
    localVideoTrack,
    micOn,
    camOn,
    isScreenSharing,
    remoteParticipants,
    chatMessages,
    presenceStatus,
    sessionEnded,
    sessionReplaced,
    scheduleConflictMessage,
    trackingRequested,
    emotionAlerts,
    emotionToasts,
    dismissEmotionToast,
    sendEmotionAlert,
    sendChatMessage,
    broadcastSessionEnded,
    broadcastTracking,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leave,
  };
};
