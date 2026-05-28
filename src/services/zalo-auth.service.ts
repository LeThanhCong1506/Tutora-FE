import { isZaloMiniApp } from './zalo-env';
import { storageAdapter } from './storage.adapter';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

export interface ZaloLoginResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  fullname: string;
  role: string;
}

/**
 * Thực hiện Zalo OAuth flow:
 * 1. Authorize + lấy access token từ Zalo SDK
 * 2. Lấy user info từ Zalo
 * 3. Exchange lấy Tutora JWT từ backend
 * 4. Lưu vào storage adapter
 */
export const loginWithZalo = async (role?: string): Promise<ZaloLoginResult> => {
  if (!isZaloMiniApp()) {
    throw new Error('loginWithZalo chỉ chạy được trong Zalo Mini App');
  }

  const { getAccessToken, getUserInfo } = await import('zmp-sdk/apis');

  // Lấy Zalo access token (user đã login Zalo rồi, không cần authorize thêm)
  console.log('[ZaloAuth] getAccessToken...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenResult = await (getAccessToken as any)({}) as any;
  const zaloToken: string = tokenResult?.accessToken ?? tokenResult;
  console.log('[ZaloAuth] token length:', zaloToken?.length);

  // Lấy Zalo user ID client-side — cần thiết khi server IP ngoài Việt Nam (-501)
  let zaloUserId = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userInfoResult = await (getUserInfo as any)({}) as any;
    zaloUserId = userInfoResult?.userInfo?.id ?? '';
    console.log('[ZaloAuth] zaloUserId:', zaloUserId ? 'obtained' : 'empty');
  } catch (e) {
    console.warn('[ZaloAuth] getUserInfo failed:', e);
  }

  // 3. Exchange với backend
  const response = await fetch(`${API_BASE_URL}/auth/zalo/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      zaloAccessToken: zaloToken,
      zaloUserId,
      role: role ?? 'Parent',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Zalo auth failed: ${response.status}`);
  }

  const result = await response.json();
  const { token, refreshToken } = result.content;

  // 5. Lưu JWT vào storage
  const userData = {
    accessToken: token,
    refreshToken,
  };
  await storageAdapter.set('TUTORA_user_data', JSON.stringify(userData));

  return {
    accessToken: token,
    refreshToken,
    userId: result.content.userId || '',
    fullname: result.content.fullname || '',
    role: result.content.role || 'Parent',
  };
};

/**
 * Xử lý khi auth fail (401 / session expired):
 * - Mini App: re-trigger loginWithZalo
 * - Web: redirect to /login
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (isZaloMiniApp()) {
    try {
      await loginWithZalo();
    } catch {
      // silent — user will see blank state and can retry
    }
  } else {
    window.location.href = '/login';
  }
};

/**
 * Kiểm tra user đã login Zalo chưa, nếu chưa thì trigger login flow
 */
export const ensureZaloAuth = async (): Promise<boolean> => {
  if (!isZaloMiniApp()) return true;

  const cached = storageAdapter.getCachedUser();
  if (cached?.accessToken) return true;

  try {
    await loginWithZalo();
    return true;
  } catch (err) {
    console.error('[ZaloAuth] ensureZaloAuth failed:', err);
    return false;
  }
};
