import { storageAdapter } from '../services/storage.adapter';

const DEVICE_ID_STORAGE_KEY = 'TUTORA_live_session_device_id';
const PARTICIPATION_ID_SESSION_PREFIX = 'TUTORA_live_session_participation:';
const UUID_N_PATTERN = /^[0-9a-f]{32}$/i;

let deviceIdPromise: Promise<string> | null = null;
const participationFallback = new Map<number, string>();

/** Tạo UUID theo format .NET "N" (32 ký tự hex, không có dấu gạch ngang). */
const createUuidN = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().replaceAll('-', '');
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    // UUID v4 bits — server chỉ cần ID ngẫu nhiên, nhưng giữ đúng hình dạng UUID để log dễ đọc.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback cuối cho WebView cũ không có Web Crypto. ID này chỉ nhận diện client,
  // quyền sở hữu phiên vẫn được backend xác thực bằng JWT + lease.
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

const loadDeviceId = async (): Promise<string> => {
  try {
    const stored = await storageAdapter.get(DEVICE_ID_STORAGE_KEY);
    if (stored && UUID_N_PATTERN.test(stored)) return stored;
  } catch {
    // Storage có thể bị chặn trong private mode/WebView; dùng ID trong bộ nhớ cho phiên hiện tại.
  }

  const created = createUuidN();
  try {
    await storageAdapter.set(DEVICE_ID_STORAGE_KEY, created);
  } catch {
    // Best-effort: module cache bên dưới vẫn giữ ID ổn định cho tới khi reload.
  }
  return created;
};

const getDeviceId = (): Promise<string> => {
  deviceIdPromise ??= loadDeviceId();
  return deviceIdPromise;
};

const getParticipationId = (classSessionId: number): string => {
  const fallback = participationFallback.get(classSessionId);
  if (fallback) return fallback;

  const key = `${PARTICIPATION_ID_SESSION_PREFIX}${classSessionId}`;
  try {
    const stored = sessionStorage.getItem(key);
    if (stored && UUID_N_PATTERN.test(stored)) {
      participationFallback.set(classSessionId, stored);
      return stored;
    }
  } catch {
    // Zalo WebView/private mode có thể không cho truy cập sessionStorage.
  }

  const created = createUuidN();
  participationFallback.set(classSessionId, created);
  try {
    sessionStorage.setItem(key, created);
  } catch {
    // Module fallback đã giữ giá trị cho vòng đời trang hiện tại.
  }
  return created;
};

const getDeviceLabel = (): string => {
  if (typeof navigator === 'undefined') return 'Thiết bị hiện tại';

  const userAgent = navigator.userAgent;
  const platform = /iPhone/i.test(userAgent)
    ? 'iPhone'
    : /iPad/i.test(userAgent)
      ? 'iPad'
      : /Android/i.test(userAgent)
        ? 'Android'
        : /Windows/i.test(userAgent)
          ? 'Windows'
          : /Macintosh|Mac OS X/i.test(userAgent)
            ? 'macOS'
            : /Linux/i.test(userAgent)
              ? 'Linux'
              : 'thiết bị hiện tại';

  const browser = /Edg\//i.test(userAgent)
    ? 'Microsoft Edge'
    : /CriOS|Chrome\//i.test(userAgent)
      ? 'Chrome'
      : /FxiOS|Firefox\//i.test(userAgent)
        ? 'Firefox'
        : /Safari\//i.test(userAgent)
          ? 'Safari'
          : 'Trình duyệt';

  return `${browser} trên ${platform}`;
};

export interface LiveSessionIdentity {
  deviceId: string;
  participationId: string;
  deviceLabel: string;
}

/**
 * Device ID sống bền qua các lần mở app; participation ID chỉ sống trong tab cho từng buổi học.
 * Cả hai đều là client metadata — backend vẫn là nguồn quyết định lease hợp lệ.
 */
export const getLiveSessionIdentity = async (classSessionId: number): Promise<LiveSessionIdentity> => ({
  deviceId: await getDeviceId(),
  participationId: getParticipationId(classSessionId),
  deviceLabel: getDeviceLabel(),
});
