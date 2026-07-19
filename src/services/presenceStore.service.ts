import { getUserPresence, getUsersPresence } from './chat.service';
import { registerSessionCleanup } from './sessionLifecycle.service';
import { signalRService, type NotificationConnectionLifecycle } from './signalr.service';
import {
  createLoadingPresence,
  createUnknownPresence,
  normalizePresenceUserId,
  needsDetailedPresence,
  parsePresencePayload,
  shouldApplyRealtimePresence,
  shouldPollPresenceFallback,
  type ParsedUserPresence,
  type UserPresence,
} from '../utils/presence';

const PRESENCE_CACHE_TTL_MS = 30_000;
const GLOBAL_REVALIDATE_THROTTLE_MS = 5_000;
const MAX_BATCH_SIZE = 50;
const UNKNOWN_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000] as const;
const DISCONNECTED_FALLBACK_POLL_MS = 30_000;

interface PresenceEntry {
  userId: string;
  presence: UserPresence;
  eventRevision: number;
  requestId: number;
  fetchedAt: number;
  hasDetailedPresence: boolean;
}

interface RequestContext {
  normalizedUserId: string;
  requestId: number;
  eventRevision: number;
  sessionRevision: number;
  detail: boolean;
}

const toUserPresence = (parsed: ParsedUserPresence): UserPresence => {
  switch (parsed.status) {
    case 'online':
      return {
        status: 'online',
        isOnline: true,
        lastSeenAt: null,
        version: parsed.version,
        epoch: parsed.epoch,
      };
    case 'offline':
      return {
        status: 'offline',
        isOnline: false,
        lastSeenAt: parsed.lastSeenAt,
        version: parsed.version,
        epoch: parsed.epoch,
      };
    default:
      return createUnknownPresence(parsed.lastSeenAt, parsed.version, parsed.epoch);
  }
};

class PresenceStore {
  private entries = new Map<string, PresenceEntry>();
  private watchedUsers = new Map<string, { userId: string; count: number; detailCount: number }>();
  private inFlightUsers = new Set<string>();
  private pendingDetailUsers = new Map<string, string>();
  private listeners = new Set<() => void>();
  private revision = 0;
  private requestSequence = 0;
  private sessionRevision = 0;
  private lastGlobalRevalidateAt = 0;
  private unknownRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private unknownRetryAttempt = 0;
  private fallbackPollTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationConnected = signalRService.isNotificationConnected();

  constructor() {
    signalRService.subscribeToPresence((payload: unknown) => this.applyRealtimePayload(payload));
    signalRService.subscribeToNotificationLifecycle((state) => this.handleNotificationLifecycle(state));
    registerSessionCleanup(() => this.clear());

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.revalidateWatchedUsers());
      window.addEventListener('focus', () => this.revalidateWatchedUsers());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.revalidateWatchedUsers();
      });
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getRevision = (): number => this.revision;

  getPresence(userId?: string | null): UserPresence {
    const normalizedUserId = normalizePresenceUserId(userId);
    if (!normalizedUserId) return createUnknownPresence();
    return this.entries.get(normalizedUserId)?.presence ?? createLoadingPresence();
  }

  watchUsers(userIds: Array<string | null | undefined>, options: { detail?: boolean } = {}): () => void {
    const uniqueUsers = this.uniqueUsers(userIds);
    const detailIncrement = options.detail ? 1 : 0;

    uniqueUsers.forEach(({ normalizedUserId, userId }) => {
      const watched = this.watchedUsers.get(normalizedUserId);
      this.watchedUsers.set(normalizedUserId, {
        userId,
        count: (watched?.count ?? 0) + 1,
        detailCount: (watched?.detailCount ?? 0) + detailIncrement,
      });
    });
    this.reconcileUnknownRetry();
    this.reconcileFallbackPolling();

    return () => {
      uniqueUsers.forEach(({ normalizedUserId }) => {
        const watched = this.watchedUsers.get(normalizedUserId);
        if (!watched || watched.count <= 1) {
          this.watchedUsers.delete(normalizedUserId);
        } else {
          this.watchedUsers.set(normalizedUserId, {
            ...watched,
            count: watched.count - 1,
            detailCount: Math.max(0, watched.detailCount - detailIncrement),
          });
        }
      });
      this.reconcileUnknownRetry();
      this.reconcileFallbackPolling();
    };
  }

  async ensureUser(userId?: string | null, force = false): Promise<void> {
    const trimmedUserId = userId?.trim();
    const normalizedUserId = normalizePresenceUserId(trimmedUserId);
    if (!trimmedUserId || !normalizedUserId) return;
    if (this.inFlightUsers.has(normalizedUserId)) {
      this.pendingDetailUsers.set(normalizedUserId, trimmedUserId);
      return;
    }

    const entry = this.entries.get(normalizedUserId);
    const detailNeeded = entry ? needsDetailedPresence(entry.presence, entry.hasDetailedPresence) : true;
    if (!force && entry && !detailNeeded && Date.now() - entry.fetchedAt < PRESENCE_CACHE_TTL_MS) {
      return;
    }

    const context = this.beginRequest(trimmedUserId, normalizedUserId, true);
    if (!context) return;

    try {
      const presence = await getUserPresence(trimmedUserId);
      this.applyRequestResult(context, presence);
    } finally {
      this.inFlightUsers.delete(normalizedUserId);
      this.flushPendingDetail(normalizedUserId);
    }
  }

  async ensureUsers(userIds: Array<string | null | undefined>, force = false): Promise<void> {
    const candidates = this.uniqueUsers(userIds).filter(({ normalizedUserId }) => {
      if (this.inFlightUsers.has(normalizedUserId)) return false;
      const entry = this.entries.get(normalizedUserId);
      return force || !entry || Date.now() - entry.fetchedAt >= PRESENCE_CACHE_TTL_MS;
    });

    for (let offset = 0; offset < candidates.length; offset += MAX_BATCH_SIZE) {
      const chunk = candidates.slice(offset, offset + MAX_BATCH_SIZE);
      const contexts = chunk
        .map(({ userId, normalizedUserId }) => this.beginRequest(userId, normalizedUserId, false))
        .filter((context): context is RequestContext => context !== null);

      if (contexts.length === 0) continue;

      const requestUserIds = contexts.map(
        (context) => this.entries.get(context.normalizedUserId)?.userId ?? context.normalizedUserId,
      );

      try {
        const results = await getUsersPresence(requestUserIds);
        const resultsById = new Map(
          results.filter((result) => result.userId).map((result) => [normalizePresenceUserId(result.userId), result]),
        );

        contexts.forEach((context) => {
          const result = resultsById.get(context.normalizedUserId);
          this.applyRequestResult(context, result ? toUserPresence(result) : createUnknownPresence());
        });
      } finally {
        contexts.forEach(({ normalizedUserId }) => {
          this.inFlightUsers.delete(normalizedUserId);
          this.flushPendingDetail(normalizedUserId);
        });
      }
    }
  }

  clear(): void {
    this.sessionRevision += 1;
    this.entries.clear();
    this.watchedUsers.clear();
    this.inFlightUsers.clear();
    this.pendingDetailUsers.clear();
    this.clearUnknownRetry();
    this.unknownRetryAttempt = 0;
    this.clearFallbackPolling();
    this.notificationConnected = false;
    this.notify();
  }

  private beginRequest(userId: string, normalizedUserId: string, detail: boolean): RequestContext | null {
    if (this.inFlightUsers.has(normalizedUserId)) return null;

    const current = this.entries.get(normalizedUserId);
    const requestId = ++this.requestSequence;
    const entry: PresenceEntry = {
      userId,
      presence: current?.presence ?? createLoadingPresence(),
      eventRevision: current?.eventRevision ?? 0,
      requestId,
      fetchedAt: current?.fetchedAt ?? 0,
      hasDetailedPresence: current?.hasDetailedPresence ?? false,
    };

    this.entries.set(normalizedUserId, entry);
    this.inFlightUsers.add(normalizedUserId);
    if (!current) this.notify();

    return {
      normalizedUserId,
      requestId,
      eventRevision: entry.eventRevision,
      sessionRevision: this.sessionRevision,
      detail,
    };
  }

  private applyRequestResult(context: RequestContext, presence: UserPresence): void {
    if (context.sessionRevision !== this.sessionRevision) return;

    const current = this.entries.get(context.normalizedUserId);
    if (!current || current.requestId !== context.requestId || current.eventRevision !== context.eventRevision) {
      return;
    }

    const canPreserveDetailedOffline =
      !context.detail &&
      current.hasDetailedPresence &&
      current.presence.status === 'offline' &&
      presence.status === 'offline' &&
      current.presence.epoch === presence.epoch &&
      current.presence.version === presence.version;
    const nextPresence: UserPresence = canPreserveDetailedOffline
      ? { ...presence, lastSeenAt: current.presence.lastSeenAt }
      : presence;
    const hasDetailedPresence = (context.detail && presence.status !== 'unknown') || canPreserveDetailedOffline;

    this.entries.set(context.normalizedUserId, {
      ...current,
      presence: nextPresence,
      fetchedAt: Date.now(),
      hasDetailedPresence,
    });
    this.notify();

    if (
      !context.detail &&
      (this.watchedUsers.get(context.normalizedUserId)?.detailCount ?? 0) > 0 &&
      needsDetailedPresence(nextPresence, hasDetailedPresence)
    ) {
      this.pendingDetailUsers.set(context.normalizedUserId, current.userId);
    }
    this.reconcileUnknownRetry();
  }

  private applyRealtimePayload(payload: unknown): void {
    const parsed = parsePresencePayload(payload);
    const normalizedUserId = normalizePresenceUserId(parsed.userId);
    if (!normalizedUserId || !parsed.userId) return;

    const current = this.entries.get(normalizedUserId);
    if (!shouldApplyRealtimePresence(current?.presence, parsed)) return;

    this.entries.set(normalizedUserId, {
      userId: current?.userId ?? parsed.userId,
      presence: toUserPresence(parsed),
      eventRevision: (current?.eventRevision ?? 0) + 1,
      requestId: current?.requestId ?? 0,
      fetchedAt: Date.now(),
      hasDetailedPresence: parsed.status !== 'unknown',
    });
    this.notify();
    this.reconcileUnknownRetry();
  }

  private handleNotificationLifecycle(state: NotificationConnectionLifecycle): void {
    if (state === 'connected' || state === 'reconnected') {
      this.notificationConnected = true;
      this.clearFallbackPolling();
      this.revalidateWatchedUsers(true);
    } else {
      this.notificationConnected = false;
      this.reconcileFallbackPolling();
      if (state === 'disconnected') this.markWatchedPresenceUnknown();
    }
  }

  private markWatchedPresenceUnknown(): void {
    let changed = false;
    this.watchedUsers.forEach((_watched, normalizedUserId) => {
      const current = this.entries.get(normalizedUserId);
      if (!current || current.presence.status === 'unknown') return;

      this.entries.set(normalizedUserId, {
        ...current,
        presence: createUnknownPresence(current.presence.lastSeenAt, current.presence.version, current.presence.epoch),
        fetchedAt: 0,
        hasDetailedPresence: false,
      });
      changed = true;
    });
    if (changed) {
      this.notify();
      this.reconcileUnknownRetry();
    }
  }

  private revalidateWatchedUsers(force = false): void {
    if (this.watchedUsers.size === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const now = Date.now();
    if (!force && now - this.lastGlobalRevalidateAt < GLOBAL_REVALIDATE_THROTTLE_MS) return;
    this.lastGlobalRevalidateAt = now;

    void this.ensureUsers(
      [...this.watchedUsers.values()].map(({ userId }) => userId),
      true,
    );
  }

  private flushPendingDetail(normalizedUserId: string): void {
    const userId = this.pendingDetailUsers.get(normalizedUserId);
    if (!userId) return;
    this.pendingDetailUsers.delete(normalizedUserId);

    const entry = this.entries.get(normalizedUserId);
    if (entry && !needsDetailedPresence(entry.presence, entry.hasDetailedPresence)) return;
    void this.ensureUser(userId, true);
  }

  private reconcileUnknownRetry(): void {
    const hasWatchedUnknown = [...this.watchedUsers.keys()].some(
      (normalizedUserId) => this.entries.get(normalizedUserId)?.presence.status === 'unknown',
    );

    if (!hasWatchedUnknown) {
      this.clearUnknownRetry();
      this.unknownRetryAttempt = 0;
      return;
    }

    if (this.unknownRetryTimer) return;
    const delay = UNKNOWN_RETRY_DELAYS_MS[Math.min(this.unknownRetryAttempt, UNKNOWN_RETRY_DELAYS_MS.length - 1)];
    this.unknownRetryTimer = setTimeout(() => {
      this.unknownRetryTimer = null;
      this.unknownRetryAttempt += 1;
      void this.retryWatchedUnknown();
    }, delay);
  }

  private clearUnknownRetry(): void {
    if (!this.unknownRetryTimer) return;
    clearTimeout(this.unknownRetryTimer);
    this.unknownRetryTimer = null;
  }

  private async retryWatchedUnknown(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.reconcileUnknownRetry();
      return;
    }

    const detailedUserIds: string[] = [];
    const summaryUserIds: string[] = [];
    this.watchedUsers.forEach(({ userId, detailCount }, normalizedUserId) => {
      if (this.entries.get(normalizedUserId)?.presence.status !== 'unknown') return;
      if (detailCount > 0) detailedUserIds.push(userId);
      else summaryUserIds.push(userId);
    });

    await Promise.all([
      this.ensureUsers(summaryUserIds, true),
      ...detailedUserIds.map((userId) => this.ensureUser(userId, true)),
    ]);
    this.reconcileUnknownRetry();
  }

  private reconcileFallbackPolling(): void {
    if (!shouldPollPresenceFallback(this.notificationConnected, this.watchedUsers.size)) {
      this.clearFallbackPolling();
      return;
    }
    if (this.fallbackPollTimer) return;

    this.fallbackPollTimer = setTimeout(() => {
      this.fallbackPollTimer = null;
      void this.pollWatchedWhileDisconnected();
    }, DISCONNECTED_FALLBACK_POLL_MS);
  }

  private clearFallbackPolling(): void {
    if (!this.fallbackPollTimer) return;
    clearTimeout(this.fallbackPollTimer);
    this.fallbackPollTimer = null;
  }

  private async pollWatchedWhileDisconnected(): Promise<void> {
    if (!shouldPollPresenceFallback(this.notificationConnected, this.watchedUsers.size)) {
      this.reconcileFallbackPolling();
      return;
    }

    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      await this.ensureUsers(
        [...this.watchedUsers.values()].map(({ userId }) => userId),
        true,
      );
    }
    this.reconcileFallbackPolling();
  }

  private uniqueUsers(userIds: Array<string | null | undefined>): Array<{
    userId: string;
    normalizedUserId: string;
  }> {
    const users = new Map<string, string>();
    userIds.forEach((candidate) => {
      const userId = candidate?.trim();
      const normalizedUserId = normalizePresenceUserId(userId);
      if (userId && normalizedUserId && !users.has(normalizedUserId)) {
        users.set(normalizedUserId, userId);
      }
    });

    return [...users].map(([normalizedUserId, userId]) => ({ normalizedUserId, userId }));
  }

  private notify(): void {
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }
}

export const presenceStore = new PresenceStore();
