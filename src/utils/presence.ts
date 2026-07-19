export type PresenceStatus = 'loading' | 'online' | 'offline' | 'unknown';
export type ServerPresenceStatus = Exclude<PresenceStatus, 'loading'>;

interface PresenceBase {
  lastSeenAt: string | null;
  version: number;
  epoch: string | null;
}

export type UserPresence =
  | (PresenceBase & { status: 'loading'; isOnline: null })
  | (PresenceBase & { status: 'online'; isOnline: true })
  | (PresenceBase & { status: 'offline'; isOnline: false })
  | (PresenceBase & { status: 'unknown'; isOnline: null });

export type ParsedUserPresence = Exclude<UserPresence, { status: 'loading' }> & {
  userId: string | null;
};
export type LoadingPresence = Extract<UserPresence, { status: 'loading' }>;
export type UnknownPresence = Extract<UserPresence, { status: 'unknown' }>;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readField = (record: UnknownRecord, camelCase: string, pascalCase: string): unknown =>
  record[camelCase] ?? record[pascalCase];

export const normalizePresenceUserId = (userId?: string | null): string =>
  typeof userId === 'string' ? userId.trim().toLocaleLowerCase('en-US') : '';

export const createLoadingPresence = (): LoadingPresence => ({
  status: 'loading',
  isOnline: null,
  lastSeenAt: null,
  version: 0,
  epoch: null,
});

export const createUnknownPresence = (
  lastSeenAt: string | null = null,
  version = 0,
  epoch: string | null = null,
): UnknownPresence => ({
  status: 'unknown',
  isOnline: null,
  lastSeenAt,
  version,
  epoch,
});

/**
 * Parse both REST and SignalR presence payloads without truthy coercion.
 * REST may wrap the value in an APIResponse envelope; SignalR sends the value directly.
 */
export const parsePresencePayload = (payload: unknown, fallbackUserId?: string | null): ParsedUserPresence => {
  const outer = isRecord(payload) ? payload : {};
  const wrapped = readField(outer, 'content', 'Content');
  const data = isRecord(wrapped) ? wrapped : outer;

  const rawUserId = readField(data, 'userId', 'UserId');
  const userId = typeof rawUserId === 'string' ? rawUserId.trim() : fallbackUserId?.trim() || null;

  const rawIsOnline = readField(data, 'isOnline', 'IsOnline');
  const isOnline = typeof rawIsOnline === 'boolean' ? rawIsOnline : null;

  const rawStatus = readField(data, 'status', 'Status');
  const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.trim().toLocaleLowerCase('en-US') : undefined;

  const rawLastSeenAt = readField(data, 'lastSeenAt', 'LastSeenAt');
  const lastSeenAt = typeof rawLastSeenAt === 'string' && rawLastSeenAt.trim() ? rawLastSeenAt : null;

  const rawVersion = readField(data, 'version', 'Version');
  const version =
    typeof rawVersion === 'number' && Number.isSafeInteger(rawVersion) && rawVersion >= 0 ? rawVersion : 0;

  const rawEpoch = readField(data, 'epoch', 'Epoch');
  const epoch = typeof rawEpoch === 'string' && rawEpoch.trim() ? rawEpoch.trim() : null;

  if ((normalizedStatus === 'online' && isOnline === true) || (!normalizedStatus && isOnline === true)) {
    return { userId, status: 'online', isOnline: true, lastSeenAt: null, version, epoch };
  }

  if ((normalizedStatus === 'offline' && isOnline === false) || (!normalizedStatus && isOnline === false)) {
    return { userId, status: 'offline', isOnline: false, lastSeenAt, version, epoch };
  }

  return { userId, status: 'unknown', isOnline: null, lastSeenAt, version, epoch };
};

export const parsePresenceListPayload = (payload: unknown): ParsedUserPresence[] => {
  const outer = isRecord(payload) ? payload : {};
  const wrapped = readField(outer, 'content', 'Content');
  const list = Array.isArray(wrapped) ? wrapped : Array.isArray(payload) ? payload : [];
  return list.map((item) => parsePresencePayload(item));
};

export const shouldApplyRealtimePresence = (
  current: Pick<UserPresence, 'epoch' | 'version'> | null | undefined,
  incoming: Pick<UserPresence, 'epoch' | 'version'>,
): boolean => !current || current.epoch !== incoming.epoch || incoming.version > current.version;

export const needsDetailedPresence = (presence: Pick<UserPresence, 'status'>, hasDetailedPresence: boolean): boolean =>
  presence.status !== 'online' && !hasDetailedPresence;

export const shouldPollPresenceFallback = (notificationConnected: boolean, watchedUserCount: number): boolean =>
  !notificationConnected && watchedUserCount > 0;
