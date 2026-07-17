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
  getAgoraRoom,
  sendRoomHeartbeat,
  leaveRoom,
  type AgoraRoomInfo,
  type SessionPresenceStatus,
} from '../../../../services/agora.service';
import type { ChatMessage, RemoteParticipant } from '../types';

/** Tin điều khiển gửi qua RTM để đá mọi người khỏi phòng khi gia sư kết thúc buổi học. */
const SESSION_ENDED_SIGNAL = '__SESSION_ENDED__';

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
  sendChatMessage: (text: string) => void;
  /** Gia sư gọi khi kết thúc buổi: phát tín hiệu đá mọi người còn lại khỏi phòng. */
  broadcastSessionEnded: () => Promise<void>;
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
): UseAgoraCallResult => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const leavingRef = useRef(false);
  // RTM client để nhắn tin trong phiên — chat realtime, không lưu DB.
  const rtmClientRef = useRef<RTMClient | null>(null);
  const rtmChannelRef = useRef<string | null>(null);
  const localUidRef = useRef<string | number | null>(null);
  const localNameRef = useRef<string>('Bạn');

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | ILocalVideoTrack | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<SessionPresenceStatus | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const nameFor = useCallback(
    (uid: string | number) => participantNames[String(uid)] ?? `Người tham gia ${uid}`,
    [participantNames],
  );

  const upsertRemote = useCallback((user: IAgoraRTCRemoteUser) => {
    setRemoteParticipants((prev) => {
      const next = prev.filter((p) => p.uid !== user.uid);
      next.push({
        uid: user.uid,
        name: nameFor(user.uid),
        videoTrack: user.videoTrack,
        audioTrack: user.audioTrack,
        hasVideo: !!user.videoTrack,
        hasAudio: !!user.audioTrack,
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!room) return;

    let cancelled = false;
    leavingRef.current = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack?.play();
      upsertRemote(user);
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => upsertRemote(user);

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
    };

    // Token Agora hết hạn theo thời gian (thời hạn cấu hình ở AgoraSettings.TokenExpireSeconds
    // bên backend) — sự kiện này bắn ra ít lâu trước khi hết hạn để client kịp xin token mới và
    // gia hạn phiên mà không phải rời/vào lại channel.
    const handleTokenWillExpire = async () => {
      try {
        // Channel dùng chung theo booking → không suy ra classSessionId từ channel được nữa;
        // dùng room.classSessionId. Nếu buổi đã đóng, BE trả lỗi ở đây → phiên sẽ hết hạn tự nhiên.
        const fresh = await getAgoraRoom(room.classSessionId);
        await client.renewToken(fresh.content.token);
      } catch (err) {
        console.error('❌ Agora token renewal failed:', err);
      }
    };

    // Nếu renew ở trên thất bại (mất mạng, buổi học đã quá hạn truy cập...), token sẽ thực sự hết
    // hạn và Agora chủ động ngắt kết nối — báo cho user thay vì để màn hình đứng hình im lặng.
    const handleTokenDidExpire = () => {
      setJoinError('Phiên kết nối đã hết hạn. Vui lòng tải lại trang để tiếp tục.');
    };

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
        setLocalVideoTrack(camTrack);

        localUidRef.current = room.uid;
        localNameRef.current = participantNames[String(room.uid)] ?? 'Bạn';

        // Đăng nhập RTM và subscribe kênh chat (cùng channel/token với RTC).
        try {
          const rtm = new AgoraRTM.RTM(room.appId, String(room.uid));
          rtm.addEventListener('message', (event: RTMEvents.MessageEvent) => {
            if (event.publisher === String(room.uid)) return; // bỏ echo của chính mình
            const text = typeof event.message === 'string' ? event.message : '';
            if (!text) return;
            // Tín hiệu điều khiển "kết thúc buổi" → đá mình ra khỏi phòng (không phải tin chat).
            if (text === SESSION_ENDED_SIGNAL) {
              setSessionEnded(true);
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
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      client.off('token-privilege-will-expire', handleTokenWillExpire);
      client.off('token-privilege-did-expire', handleTokenDidExpire);
      if (!leavingRef.current) {
        void cleanupTracks();
        void cleanupRtm();
        void client.leave();
        void leaveRoom(room.classSessionId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Heartbeat presence: khi đã join, báo BE mỗi 20s để BE auto check-in khi đủ cả 2 người và
  // biết khi nào cần đá mình ra (phòng đã đóng vì gia sư check-out).
  useEffect(() => {
    if (!joined || !room) return;
    const classSessionId = room.classSessionId;
    let stopped = false;

    const ping = async () => {
      try {
        const res = await sendRoomHeartbeat(classSessionId);
        if (stopped) return;
        setPresenceStatus(res.content);
        if (res.content?.roomClosed) setSessionEnded(true);
      } catch {
        // bỏ qua lỗi tạm thời — nhịp sau sẽ thử lại
      }
    };

    void ping();
    const interval = setInterval(ping, 20_000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, room]);

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

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    if (isScreenSharing) {
      const screenTrack = screenTrackRef.current;
      if (screenTrack) {
        await client.unpublish(screenTrack);
        screenTrack.close();
        screenTrackRef.current = null;
      }
      if (camTrackRef.current) {
        await client.publish(camTrackRef.current);
        setLocalVideoTrack(camTrackRef.current);
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({}, 'disable');
      if (camTrackRef.current) await client.unpublish(camTrackRef.current);
      await client.publish(screenTrack);
      screenTrackRef.current = screenTrack;
      setLocalVideoTrack(screenTrack);
      setIsScreenSharing(true);

      screenTrack.on('track-ended', () => {
        void toggleScreenShare();
      });
    } catch (err) {
      console.error('❌ Screen share failed:', err);
    }
  }, [isScreenSharing]);

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
        await client.leave();
      } catch (err) {
        console.error('❌ Error leaving Agora channel:', err);
      }
    }
    if (classSessionId != null) void leaveRoom(classSessionId);
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
    sendChatMessage,
    broadcastSessionEnded,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leave,
  };
};
