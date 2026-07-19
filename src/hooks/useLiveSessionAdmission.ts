import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveSessionConflict,
  joinAgoraRoom,
  leaveRoom,
  takeOverAgoraRoom,
  type ActiveSessionConflict,
  type AgoraRoomInfo,
} from '../services/agora.service';
import { getLiveSessionIdentity, type LiveSessionIdentity } from '../utils/liveSessionIdentity';

export interface LiveSessionAdmission {
  room: AgoraRoomInfo;
  identity: LiveSessionIdentity;
}

interface CachedIdentity {
  classSessionId: number;
  value: LiveSessionIdentity;
}

interface PendingJoin {
  classSessionId: number;
  generation: number;
  request: Promise<LiveSessionAdmission | null>;
}

interface AdmissionRequestMarker {
  classSessionId: number;
  token: symbol;
}

const pendingAdmissionTransfers = new Map<string, LiveSessionAdmission>();
// Shared by successive route-keyed hook instances. It lets a late A response distinguish
// a real orphan from an A→B→A request that may already have resumed the same backend lease.
let latestAdmissionRequest: AdmissionRequestMarker | null = null;

/** Route state chỉ mang token dùng một lần; room/token thật không sống lại qua reload/back-forward. */
export const stageLiveSessionAdmission = (admission: LiveSessionAdmission): string => {
  const transferId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingAdmissionTransfers.set(transferId, admission);
  globalThis.setTimeout(() => pendingAdmissionTransfers.delete(transferId), 30_000);
  return transferId;
};

export const peekLiveSessionAdmission = (transferId?: string): LiveSessionAdmission | null =>
  transferId ? (pendingAdmissionTransfers.get(transferId) ?? null) : null;

export const discardLiveSessionAdmission = (transferId?: string): void => {
  if (transferId) pendingAdmissionTransfers.delete(transferId);
};

/**
 * Điều phối admission dùng chung cho lobby và direct/reload LiveSession.
 * Lỗi duplicate-device được giữ thành state để caller render cùng một modal;
 * các lỗi API khác được ném lên để page hiển thị error state hiện có.
 */
export const useLiveSessionAdmission = (classSessionId: number | null) => {
  const identityRef = useRef<CachedIdentity | null>(null);
  const takeoverPendingRef = useRef(false);
  const joinGenerationRef = useRef(0);
  const joinPromiseRef = useRef<PendingJoin | null>(null);
  const mountedRef = useRef(false);
  const [conflict, setConflict] = useState<ActiveSessionConflict | null>(null);
  const [pendingAction, setPendingAction] = useState<'join' | 'takeover' | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const ensureIdentity = useCallback(async (): Promise<LiveSessionIdentity> => {
    if (classSessionId == null) throw new Error('Invalid class session ID');
    if (identityRef.current?.classSessionId === classSessionId) return identityRef.current.value;

    const value = await getLiveSessionIdentity(classSessionId);
    identityRef.current = { classSessionId, value };
    return value;
  }, [classSessionId]);

  const handleConflict = useCallback((error: unknown): boolean => {
    const nextConflict = getActiveSessionConflict(error);
    if (!nextConflict) return false;
    setConflict(nextConflict);
    return true;
  }, []);

  const join = useCallback((): Promise<LiveSessionAdmission | null> => {
    if (classSessionId == null) return Promise.resolve(null);
    // React StrictMode chạy effect setup → cleanup → setup. Cả hai setup phải cùng chờ một
    // admission request, nếu lần hai chỉ nhận null thì direct-link sẽ kẹt ở loading.
    if (joinPromiseRef.current?.classSessionId === classSessionId) {
      return joinPromiseRef.current.request;
    }

    const generation = ++joinGenerationRef.current;
    const requestToken = Symbol('live-session-join');
    latestAdmissionRequest = { classSessionId, token: requestToken };
    setPendingAction('join');
    setConflict(null);

    const request = (async () => {
      try {
        const identity = await ensureIdentity();
        if (!mountedRef.current) return null;
        const response = await joinAgoraRoom(classSessionId, identity);
        if (!mountedRef.current || joinGenerationRef.current !== generation) {
          const newerRequest = latestAdmissionRequest;
          const adoptedByNewSameSession =
            newerRequest?.token !== requestToken && newerRequest?.classSessionId === response.content.classSessionId;

          if (!adoptedByNewSameSession) {
            await leaveRoom(response.content.classSessionId, {
              participationId: response.content.participationId,
              leaseId: response.content.leaseId,
            });
          }
          return null;
        }
        return { room: response.content, identity };
      } catch (error) {
        if (!mountedRef.current || joinGenerationRef.current !== generation) return null;
        if (handleConflict(error)) return null;
        throw error;
      } finally {
        // Route param có thể đổi trong lúc request cũ đang chạy; request A không được clear state/promise của B.
        if (joinPromiseRef.current?.generation === generation) {
          joinPromiseRef.current = null;
          if (mountedRef.current) setPendingAction(null);
        }
      }
    })();
    joinPromiseRef.current = { classSessionId, generation, request };
    return request;
  }, [classSessionId, ensureIdentity, handleConflict]);

  const takeOver = useCallback(async (): Promise<LiveSessionAdmission | null> => {
    if (classSessionId == null || !conflict || takeoverPendingRef.current) return null;
    takeoverPendingRef.current = true;
    const requestToken = Symbol('live-session-takeover');
    latestAdmissionRequest = { classSessionId, token: requestToken };
    setPendingAction('takeover');
    try {
      const identity = await ensureIdentity();
      if (!mountedRef.current) return null;
      const response = await takeOverAgoraRoom(classSessionId, identity, conflict.activeLeaseId);
      if (!mountedRef.current || latestAdmissionRequest?.token !== requestToken) {
        const newerRequest = latestAdmissionRequest;
        const adoptedByNewSameSession =
          newerRequest?.token !== requestToken && newerRequest?.classSessionId === response.content.classSessionId;

        if (!adoptedByNewSameSession) {
          await leaveRoom(response.content.classSessionId, {
            participationId: response.content.participationId,
            leaseId: response.content.leaseId,
          });
        }
        return null;
      }
      setConflict(null);
      return { room: response.content, identity };
    } catch (error) {
      if (!mountedRef.current || latestAdmissionRequest?.token !== requestToken) return null;
      // CAS stale: backend trả lại 409 cùng active lease mới; cập nhật modal để lần confirm sau dùng lease mới.
      if (handleConflict(error)) return null;
      throw error;
    } finally {
      takeoverPendingRef.current = false;
      if (mountedRef.current) setPendingAction(null);
    }
  }, [classSessionId, conflict, ensureIdentity, handleConflict]);

  const clearConflict = useCallback(() => setConflict(null), []);

  return {
    conflict,
    pendingAction,
    joining: pendingAction === 'join',
    takingOver: pendingAction === 'takeover',
    join,
    takeOver,
    clearConflict,
  };
};
