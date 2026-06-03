/**
 * Auth cookie utilities - sync localStorage with cookies for middleware access.
 *
 * Problem: Middleware runs on Edge, can't access localStorage.
 * Solution: Mirror auth state to httpOnly cookie.
 */

const COOKIE_NAME = 'TUTORA_user_data';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setAuthCookie(userData: { accessToken: string; refreshToken?: string }) {
  if (typeof document === 'undefined') return;

  const value = JSON.stringify(userData);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function syncAuthToCookie() {
  if (typeof window === 'undefined') return;

  try {
    const userData = window.localStorage.getItem('TUTORA_user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      setAuthCookie(parsed);
    } else {
      clearAuthCookie();
    }
  } catch {
    clearAuthCookie();
  }
}
