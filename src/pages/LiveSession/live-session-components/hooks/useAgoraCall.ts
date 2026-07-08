import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type ILocalVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import type { AgoraRoomInfo } from '../../../../services/agora.service';
import type { RemoteParticipant } from '../types';

interface UseAgoraCallResult {
  joined: boolean;
  joinError: string | null;
  localVideoTrack: ICameraVideoTrack | ILocalVideoTrack | null;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  remoteParticipants: RemoteParticipant[];
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

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | ILocalVideoTrack | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);

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

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

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
      if (!leavingRef.current) {
        void cleanupTracks();
        void client.leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const cleanupTracks = async () => {
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    micTrackRef.current = null;
    camTrackRef.current = null;
    screenTrackRef.current = null;
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

  const leave = useCallback(async () => {
    leavingRef.current = true;
    const client = clientRef.current;
    await cleanupTracks();
    if (client) {
      try {
        await client.unpublish();
        await client.leave();
      } catch (err) {
        console.error('❌ Error leaving Agora channel:', err);
      }
    }
    setJoined(false);
    setLocalVideoTrack(null);
    setRemoteParticipants([]);
  }, []);

  return {
    joined,
    joinError,
    localVideoTrack,
    micOn,
    camOn,
    isScreenSharing,
    remoteParticipants,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leave,
  };
};
