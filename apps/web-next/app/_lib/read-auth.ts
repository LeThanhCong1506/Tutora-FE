'use client';

/**
 * Auth reader cho Next app (read-only).
 *
 * Next chỉ *đọc* auth state để hiển thị (logged-in / logged-out) trên Header — mọi
 * login/logout/refresh flow vẫn nằm ở Vite project (qua rewrite `/login`, `/register`).
 *
 * Lý do **không** import `src/services/auth.service.ts` hay `src/services/storage.adapter.ts`:
 * - Cả 2 file đó đụng `localStorage` ở module scope hoặc trong `getCachedUser()` sync —
 *   SSR sẽ crash (xem "Known SSR landmines" trong root CLAUDE.md).
 * - Storage adapter có nhánh zmp-sdk cho Zalo mà Next không cần.
 * - Giữ self-contained: chỉ 1 storage key `TUTORA_user_data` + 1 hàm decode JWT.
 *
 * KHÔNG viết hàm thao tác token (clear / refresh) ở đây — nếu cần logout trên Next,
 * redirect user sang Vite `/login` và để Vite xử lý.
 */
const STORAGE_KEY = 'TUTORA_user_data';

type StoredUser = {
  accessToken?: string;
  refreshToken?: string;
  [k: string]: unknown;
};

type JwtPayload = {
  fullname?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  [k: string]: unknown;
};

/**
 * Đọc user object (có accessToken) từ localStorage.
 * Trả `null` nếu đang SSR hoặc chưa login.
 */
export function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUser;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Decode JWT payload (base64url JSON) không verify signature.
 * Backend Tutora dùng Microsoft schema URI cho role — normalize về `role`.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    // base64url → base64
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json =
      typeof atob !== 'undefined' ? atob(padded + pad) : Buffer.from(padded + pad, 'base64').toString('utf8');
    const raw = JSON.parse(json) as Record<string, unknown>;

    // Microsoft claim URIs → short keys
    const role =
      (raw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string) ||
      (raw['role'] as string) ||
      undefined;
    const email =
      (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ||
      (raw['email'] as string) ||
      undefined;
    const fullname =
      (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string) ||
      (raw['fullname'] as string) ||
      (raw['name'] as string) ||
      undefined;

    return {
      ...raw,
      role,
      email,
      fullname,
    };
  } catch {
    return null;
  }
}

/**
 * Tiện ích cho Header: trả về { displayName, role } hoặc null nếu chưa login.
 */
export function readAuthInfo(): { displayName: string; role: string | null } | null {
  const user = readStoredUser();
  if (!user?.accessToken) return null;
  const payload = decodeJwtPayload(user.accessToken);
  const displayName =
    payload?.fullname ||
    (payload?.firstName && payload?.lastName ? `${payload.firstName} ${payload.lastName}` : null) ||
    payload?.email?.split('@')[0] ||
    'User';
  return {
    displayName,
    role: payload?.role ?? null,
  };
}

/**
 * Map role → portal path (đồng bộ với `src/components/Header/Header.tsx`).
 * Các path này đều có rewrite sang Vite project trong `next.config.ts`.
 */
export function getPortalPath(role: string | null): string {
  if (!role) return '/login';
  switch (role.toLowerCase()) {
    case 'admin':
      return '/admin-portal/dashboard';
    case 'tutor':
      return '/tutor-portal';
    case 'parent':
      return '/parent-portal/dashboard';
    case 'student':
      return '/student-portal/dashboard';
    default:
      return '/';
  }
}

/**
 * Logout trên Next: clear storage + reload. Vite app đọc cùng key sẽ thấy logout.
 */
export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / disabled storage */
  }
}
