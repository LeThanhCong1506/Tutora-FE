import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { presenceStore } from '../services/presenceStore.service';
import { createUnknownPresence, normalizePresenceUserId, type UserPresence } from '../utils/presence';

const usePresenceStoreRevision = (): number =>
  useSyncExternalStore(presenceStore.subscribe, presenceStore.getRevision, presenceStore.getRevision);

/**
 * Presence của một đối tác chat. Store dùng chung đảm nhiệm cache, chống race giữa REST/realtime
 * và revalidate khi SignalR reconnect hoặc trình duyệt quay lại foreground.
 */
export function useUserPresence(userId?: string | null): UserPresence {
  const revision = usePresenceStoreRevision();
  const [, forceRelativeTimeTick] = useState(0);
  const normalizedUserId = normalizePresenceUserId(userId);
  const trimmedUserId = userId?.trim() || '';

  useEffect(() => {
    if (!trimmedUserId) return;
    const unwatch = presenceStore.watchUsers([trimmedUserId], { detail: true });
    void presenceStore.ensureUser(trimmedUserId);
    return unwatch;
  }, [normalizedUserId, trimmedUserId]);

  // Reading revision subscribes this component to the external store.
  void revision;
  const presence = trimmedUserId ? presenceStore.getPresence(trimmedUserId) : createUnknownPresence();

  // Cập nhật nhãn "Hoạt động X phút trước" mà không gọi lại API.
  useEffect(() => {
    if (presence.status !== 'offline' || !presence.lastSeenAt) return;
    const timer = setInterval(() => forceRelativeTimeTick((tick) => tick + 1), 60_000);
    return () => clearInterval(timer);
  }, [presence.lastSeenAt, presence.status]);

  return presence;
}

/**
 * Một subscription + các request batch (tối đa 50 IDs/request) cho toàn sidebar.
 * Không mount một hook/API call riêng cho từng hàng hội thoại.
 */
export function useUsersPresence(userIds: Array<string | null | undefined>): ReadonlyMap<string, UserPresence> {
  const revision = usePresenceStoreRevision();
  const userIdKey = JSON.stringify(
    [
      ...new Map(
        userIds
          .map((userId) => userId?.trim())
          .filter((userId): userId is string => Boolean(userId))
          .map((userId) => [normalizePresenceUserId(userId), userId]),
      ).values(),
    ].sort((left, right) => normalizePresenceUserId(left).localeCompare(normalizePresenceUserId(right), 'en-US')),
  );
  const stableUserIds = useMemo<string[]>(() => JSON.parse(userIdKey) as string[], [userIdKey]);

  useEffect(() => {
    if (stableUserIds.length === 0) return;
    const unwatch = presenceStore.watchUsers(stableUserIds);
    void presenceStore.ensureUsers(stableUserIds);
    return unwatch;
  }, [stableUserIds]);

  void revision;
  return new Map(stableUserIds.map((id) => [normalizePresenceUserId(id), presenceStore.getPresence(id)]));
}

export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Ngoại tuyến';

  const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(lastSeenAt);
  const safeTimestamp = hasTimezone ? lastSeenAt : `${lastSeenAt}Z`;
  const timestamp = new Date(safeTimestamp).getTime();
  if (Number.isNaN(timestamp)) return 'Ngoại tuyến';

  const diffMs = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (mins < 1) return 'Hoạt động vừa xong';
  if (mins < 60) return `Hoạt động ${mins} phút trước`;
  if (hours < 24) return `Hoạt động ${hours} giờ trước`;
  if (days < 7) return `Hoạt động ${days} ngày trước`;
  return `Hoạt động ${new Date(safeTimestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  })}`;
}
