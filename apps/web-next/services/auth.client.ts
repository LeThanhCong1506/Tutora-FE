'use client';

import { env } from '@/lib/env';

const STORAGE_KEY = 'TUTORA_user_data';

type StoredUser = {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
};

type JwtPayload = {
  exp?: number;
  role?: string;
  sub?: string;
  userId?: string;
  [key: string]: unknown;
};

export type ApiResponse<T> = {
  content: T;
  statusCode?: number;
  message?: string;
};

export class ApiRequestError extends Error {
  response: {
    status: number;
    data: unknown;
  };

  constructor(status: number, data: unknown, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.response = { status, data };
  }
}

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

function writeStoredUser(user: StoredUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('tutora-auth-change'));

  // Sync to cookie for middleware access
  import('@/lib/auth-cookie').then(({ syncAuthToCookie }) => syncAuthToCookie());
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const json =
      typeof atob !== 'undefined'
        ? atob(normalized + pad)
        : Buffer.from(normalized + pad, 'base64').toString('utf8');
    const raw = JSON.parse(json) as Record<string, unknown>;

    return {
      ...raw,
      role:
        (raw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string) ||
        (raw.role as string) ||
        undefined,
      userId:
        (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
        (raw.sub as string) ||
        (raw.userId as string) ||
        undefined,
    };
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): string | null {
  const token = readStoredUser()?.accessToken;
  if (!token) return null;
  return decodeJwtPayload(token)?.role ?? null;
}

export function getUserIdFromToken(): string | null {
  const token = readStoredUser()?.accessToken;
  if (!token) return null;
  return decodeJwtPayload(token)?.userId ?? null;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.content === 'string') return record.content;
  }
  return fallback;
}

async function parseResponseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshTokens(user: StoredUser) {
  if (!user.accessToken || !user.refreshToken) return null;

  const res = await fetch(`${env.API_URL}/tokens/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    }),
  });

  if (!res.ok) return null;
  const data = (await parseResponseBody(res)) as ApiResponse<{
    token?: string;
    refreshToken?: string;
  }> | null;

  const token = data?.content?.token;
  const refreshToken = data?.content?.refreshToken;
  if (!token || !refreshToken) return null;

  const nextUser = { ...user, accessToken: token, refreshToken };
  writeStoredUser(nextUser);
  return nextUser;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const user = readStoredUser();
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  }
  if (user?.accessToken) {
    headers.set('Authorization', `Bearer ${user.accessToken}`);
  }

  const requestUrl = path.startsWith('http') ? path : `${env.API_URL}${path}`;
  let res = await fetch(requestUrl, {
    ...init,
    headers,
  });

  if (res.status === 401 && user?.refreshToken) {
    const nextUser = await refreshTokens(user);
    if (nextUser?.accessToken) {
      headers.set('Authorization', `Bearer ${nextUser.accessToken}`);
      res = await fetch(requestUrl, {
        ...init,
        headers,
      });
    }
  }

  const data = await parseResponseBody(res);
  if (!res.ok) {
    throw new ApiRequestError(res.status, data, getErrorMessage(data, `Request failed: ${res.status}`));
  }

  return data as ApiResponse<T>;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return getErrorMessage(error.response.data, fallback);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
