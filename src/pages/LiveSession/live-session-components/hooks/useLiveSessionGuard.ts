import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { getCurrentUser } from '../../../../services/auth.service';
import type { AgoraRoomInfo } from '../../../../services/agora.service';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166';
const LIVE_SESSION_HUB_URL = `${API_BASE_URL}/hubs/live-session`;
const GUARD_FALLBACK_MS = 5_000;

interface SessionReplacedPayload {
  classSessionId?: number;
  leaseId?: string;
  reason?: string;
}

const isRevokedHubError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('SESSION_LEASE_REVOKED');

/**
 * Đăng ký live lease với SignalR trước khi caller khởi tạo Agora.
 * Nếu hub không kết nối được, guard nhả sau timeout/lỗi để heartbeat REST làm fallback.
 */
export const useLiveSessionGuard = (room: AgoraRoomInfo | null) => {
  const [readyLeaseId, setReadyLeaseId] = useState<string | null>(null);
  const [replacedLeaseId, setReplacedLeaseId] = useState<string | null>(null);

  const classSessionId = room?.classSessionId;
  const participationId = room?.participationId;
  const leaseId = room?.leaseId;

  useEffect(() => {
    if (classSessionId == null || !participationId || !leaseId) return;

    let disposed = false;
    let registered = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(LIVE_SESSION_HUB_URL, {
        accessTokenFactory: () => getCurrentUser()?.accessToken || import.meta.env.VITE_TOKEN || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const markReady = () => {
      if (!disposed) setReadyLeaseId(leaseId);
    };

    const markReplaced = () => {
      if (!disposed) setReplacedLeaseId(leaseId);
    };

    connection.on('sessionReplaced', (payload?: SessionReplacedPayload) => {
      if (payload?.classSessionId != null && payload.classSessionId !== classSessionId) return;
      if (payload?.leaseId && payload.leaseId !== leaseId) return;
      markReplaced();
    });

    const register = async () => {
      try {
        await connection.invoke('RegisterSession', classSessionId, participationId, leaseId);
        registered = true;
        markReady();
      } catch (error) {
        if (isRevokedHubError(error)) markReplaced();
        throw error;
      }
    };

    connection.onreconnected(() => {
      void register().catch((error) => {
        if (!isRevokedHubError(error)) {
          console.error('❌ Live session guard re-registration failed:', error);
        }
      });
    });

    const fallbackTimer = window.setTimeout(() => {
      if (!registered) markReady();
    }, GUARD_FALLBACK_MS);

    void connection
      .start()
      .then(register)
      .catch((error: unknown) => {
        if (!disposed && !isRevokedHubError(error)) {
          console.error('❌ Live session guard connection failed; using heartbeat fallback:', error);
        }
        markReady();
      })
      .finally(() => window.clearTimeout(fallbackTimer));

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      void connection.stop();
    };
  }, [classSessionId, participationId, leaseId]);

  return {
    guardReady: room == null || readyLeaseId === leaseId,
    sessionReplaced: leaseId != null && replacedLeaseId === leaseId,
  };
};
