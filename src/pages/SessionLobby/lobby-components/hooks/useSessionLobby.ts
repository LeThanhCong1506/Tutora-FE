import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { getCurrentUser } from '../../../../services/auth.service';
import type { LobbyInfo, LobbyPhase, LobbyWaitingState, ScheduleChangeState, SessionScheduleConflict } from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166';
const LOBBY_HUB_URL = `${API_BASE_URL}/hubs/session-lobby`;

/** Chu kỳ gọi RefreshState khi đang chờ — lưới an toàn nếu phía kia vào thẳng phòng học
 *  không qua lobby (presence phòng ghi qua REST heartbeat nên không tự phát sự kiện). */
const REFRESH_INTERVAL_MS = 10_000;

/** Rút thông điệp HubException từ lỗi invoke của SignalR (nếu có) để hiển thị tiếng Việt. */
const extractHubError = (err: unknown): string | null => {
  if (err instanceof Error) {
    const match = err.message.match(/HubException:\s*(.+)$/);
    if (match) return match[1].trim();
  }
  return null;
};

interface UseSessionLobbyResult {
  phase: LobbyPhase;
  info: LobbyInfo | null;
  waitingState: LobbyWaitingState | null;
  scheduleChangeState: ScheduleChangeState | null;
  scheduleConflict: SessionScheduleConflict | null;
  respondingToScheduleChange: boolean;
  respondToScheduleChange: (confirmed: boolean) => Promise<void>;
  errorMessage: string | null;
  /** Kết nối lại từ đầu sau khi lỗi. */
  retry: () => void;
}

/**
 * Quản lý vòng đời kết nối tới SessionLobbyHub cho một buổi học:
 * connect → JoinLobby → nhận lobbyInfo/lobbyState/sessionReady/lobbyClosed/lobbyBlocked,
 * tự JoinLobby lại khi reconnect, và LeaveLobby + stop khi unmount.
 *
 * Truyền `classSessionId = null` để hook no-op (mock mode).
 */
export const useSessionLobby = (classSessionId: number | null): UseSessionLobbyResult => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [phase, setPhase] = useState<LobbyPhase>('connecting');
  const [info, setInfo] = useState<LobbyInfo | null>(null);
  const [waitingState, setWaitingState] = useState<LobbyWaitingState | null>(null);
  const [scheduleChangeState, setScheduleChangeState] = useState<ScheduleChangeState | null>(null);
  const [scheduleConflict, setScheduleConflict] = useState<SessionScheduleConflict | null>(null);
  const [respondingToScheduleChange, setRespondingToScheduleChange] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (classSessionId == null) return;

    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(LOBBY_HUB_URL, {
        accessTokenFactory: () => getCurrentUser()?.accessToken || import.meta.env.VITE_TOKEN || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('lobbyInfo', (payload: LobbyInfo) => {
      if (!disposed) setInfo(payload);
    });

    connection.on('lobbyState', (payload: LobbyWaitingState) => {
      if (disposed) return;
      setWaitingState(payload);
      // lobbyState chỉ đến khi mình đã ở trong lobby → từ connecting chuyển sang waiting.
      setPhase((prev) => (prev === 'connecting' ? 'waiting' : prev));
    });

    connection.on('scheduleChangeState', (payload: ScheduleChangeState) => {
      if (disposed) return;
      setScheduleChangeState(payload);
      setScheduleConflict(payload.scheduleConflict ?? null);
      if (payload.scheduleConflict) setPhase('waiting');
    });

    connection.on('scheduleConflict', (payload: SessionScheduleConflict) => {
      if (disposed) return;
      setScheduleConflict(payload);
      setPhase('waiting');
    });

    connection.on('scheduleConflictCleared', () => {
      if (!disposed) setScheduleConflict(null);
    });

    connection.on('sessionReady', () => {
      if (disposed) return;
      setPhase('ready');
      // Đường "buổi đang diễn ra, vào lại ngay" (rớt mạng/rời tạm rồi vào lại) báo sessionReady
      // thẳng, không kèm lobbyState như đường chờ bình thường — nếu không set ở đây, waitingState
      // vẫn null và cả 2 chip "Gia sư"/"Học sinh" hiện xám dù nút "Vào lớp học" đã sáng. "ready"
      // luôn đồng nghĩa cả 2 phía đã được xác nhận, nên set thẳng true/true là đúng ngữ nghĩa.
      setWaitingState({ classSessionId, tutorWaiting: true, studentWaiting: true });
    });

    connection.on('lobbyClosed', (payload: { reason?: string }) => {
      if (!disposed) setPhase(payload?.reason === 'ended' ? 'ended' : 'unavailable');
    });

    connection.on('lobbyBlocked', () => {
      if (!disposed) setPhase('blocked-payment');
    });

    // Đề xuất đổi lịch (trang chi tiết buổi học, ngoài hub này) vừa bị từ chối — tự rời rồi vào
    // lại lobby để gỡ banner khoá ngay, thay vì đợi RefreshState (~10s) mới tự vá.
    connection.on('rescheduleProposalRejected', () => {
      if (disposed) return;
      setPhase('connecting');
      setWaitingState(null);
      setScheduleChangeState(null);
      setScheduleConflict(null);
      void (async () => {
        try {
          await connection.invoke('LeaveLobby');
        } catch {
          // best-effort — JoinLobby ngay dưới vẫn tự đồng bộ lại trạng thái dù bước này lỗi
        }
        if (disposed) return;
        await joinLobby();
      })();
    });

    const joinLobby = async () => {
      try {
        await connection.invoke('JoinLobby', classSessionId);
        // Kết quả trả về qua event (lobbyState / sessionReady / lobbyClosed / lobbyBlocked).
      } catch (err) {
        if (disposed) return;
        console.error('❌ JoinLobby failed:', err);
        setErrorMessage(extractHubError(err) || 'Không thể vào phòng chờ. Vui lòng thử lại.');
        setPhase('error');
      }
    };

    connection.onreconnecting(() => {
      // Mất kết nối tạm — quay về trạng thái "đang kết nối" trong lúc SignalR tự nối lại.
      if (!disposed) setPhase((prev) => (prev === 'waiting' ? 'connecting' : prev));
    });

    connection.onreconnected(() => {
      // Server đã xoá lobby entry của connection cũ khi disconnect → phải join lại.
      if (!disposed) void joinLobby();
    });

    connection.onclose(() => {
      if (!disposed) {
        setErrorMessage('Mất kết nối tới phòng chờ. Vui lòng thử lại.');
        setPhase('error');
      }
    });

    (async () => {
      try {
        await connection.start();
        if (disposed) return;
        await joinLobby();
      } catch (err) {
        if (disposed) return; // StrictMode/unmount abort — bỏ qua
        console.error('❌ Lobby hub connection failed:', err);
        setErrorMessage('Không thể kết nối tới phòng chờ. Vui lòng thử lại.');
        setPhase('error');
      }
    })();

    return () => {
      disposed = true;
      connectionRef.current = null;
      void (async () => {
        try {
          if (connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke('LeaveLobby');
          }
        } catch {
          // best-effort — OnDisconnectedAsync phía server sẽ dọn nếu invoke thất bại
        }
        try {
          await connection.stop();
        } catch {
          // ignore
        }
      })();
    };
  }, [classSessionId, retryKey]);

  // Lưới an toàn khi đang chờ: hỏi lại server định kỳ (đồng thời tự vá broadcast bị lỡ).
  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = setInterval(() => {
      const connection = connectionRef.current;
      if (connection?.state === signalR.HubConnectionState.Connected) {
        void connection.invoke('RefreshState').catch(() => {
          // bỏ qua — chu kỳ sau thử lại
        });
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase]);

  // Reset toàn bộ state rồi tăng retryKey để effect kết nối lại từ đầu.
  const retry = () => {
    setPhase('connecting');
    setInfo(null);
    setWaitingState(null);
    setScheduleChangeState(null);
    setScheduleConflict(null);
    setErrorMessage(null);
    setRetryKey((k) => k + 1);
  };

  const respondToScheduleChange = useCallback(
    async (confirmed: boolean) => {
      const connection = connectionRef.current;
      if (classSessionId == null || connection?.state !== signalR.HubConnectionState.Connected) {
        throw new Error('Phòng chờ chưa kết nối.');
      }
      setRespondingToScheduleChange(true);
      try {
        await connection.invoke('RespondToScheduleChange', classSessionId, confirmed);
      } catch (err) {
        throw new Error(extractHubError(err) || 'Không thể gửi xác nhận đổi lịch.');
      } finally {
        setRespondingToScheduleChange(false);
      }
    },
    [classSessionId],
  );

  return {
    phase,
    info,
    waitingState,
    scheduleChangeState,
    scheduleConflict,
    respondingToScheduleChange,
    respondToScheduleChange,
    errorMessage,
    retry,
  };
};
