// src/services/zalo-oauth.service.ts
// Zalo Login v4 — Web OAuth + PKCE.
// LƯU Ý: file này KHÁC `zalo-auth.service.ts` (vốn dùng cho Zalo Mini App qua zmp-sdk).
// Đây là luồng cho WEB: FE tạo PKCE + state → redirect sang Zalo → callback nhận `code`
// → BE (POST /auth/zalo) đổi `code` lấy Tutora JWT. FE KHÔNG gọi token endpoint của Zalo
// trực tiếp vì cần secret_key (chỉ có ở BE).
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const ZALO_APP_ID = import.meta.env.VITE_ZALO_APP_ID || '';
const ZALO_PERMISSION_URL = 'https://oauth.zaloapp.com/v4/permission';

// sessionStorage key prefix: lưu codeVerifier theo `state` để verify lại ở callback (chống CSRF).
const PKCE_PREFIX = 'zalo_pkce_';

export interface ZaloAuthLoginContent {
  token: string;
  refreshToken: string;
}

/**
 * Response của POST /auth/zalo có 2 nhánh:
 *  - Đã có tài khoản + SĐT đã xác thực → { statusCode, message, content: { token, refreshToken } }.
 *  - User mới / chưa verify phone → object thô { requiresRoleSelection, requiresPhoneInput,
 *      socialRegistrationToken, phone, message } (KHÔNG bọc trong content).
 */
export interface ZaloAuthResponse {
  statusCode?: number;
  message?: string;
  content?: ZaloAuthLoginContent | null;
  requiresRoleSelection?: boolean;
  requiresPhoneInput?: boolean;
  socialRegistrationToken?: string;
  phone?: string | null;
  email?: string | null;
}

// --- PKCE helpers ---

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomBytes = (length: number): Uint8Array => {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
};

// code_verifier: 32 byte → 43 ký tự base64url (hợp lệ theo PKCE, khoảng 43-128 ký tự).
const generateCodeVerifier = (): string => base64UrlEncode(randomBytes(32));

// code_challenge = BASE64URL(SHA256(code_verifier)).
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
};

// state ngẫu nhiên chống CSRF + dùng làm key map tới codeVerifier.
const generateState = (): string => base64UrlEncode(randomBytes(16));

/**
 * Redirect URI phải KHỚP TUYỆT ĐỐI với URL đã khai báo trong Zalo Developer Console.
 * Mặc định lấy theo origin hiện tại; có thể override qua VITE_ZALO_REDIRECT_URI.
 */
export const getZaloRedirectUri = (): string =>
  import.meta.env.VITE_ZALO_REDIRECT_URI || `${window.location.origin}/auth/zalo/callback`;

/**
 * Bước 1: bắt đầu đăng nhập Zalo.
 * Tạo PKCE + state, lưu codeVerifier theo state vào sessionStorage, rồi redirect sang Zalo.
 * Hàm này KHÔNG trả về (trang sẽ điều hướng đi) trừ khi cấu hình lỗi.
 */
export const startZaloLogin = async (): Promise<void> => {
  if (!ZALO_APP_ID) {
    throw new Error('Chưa cấu hình VITE_ZALO_APP_ID cho đăng nhập Zalo.');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  try {
    sessionStorage.setItem(PKCE_PREFIX + state, codeVerifier);
  } catch {
    throw new Error('Trình duyệt không cho phép lưu phiên đăng nhập Zalo (sessionStorage).');
  }

  const params = new URLSearchParams({
    app_id: ZALO_APP_ID,
    redirect_uri: getZaloRedirectUri(),
    code_challenge: codeChallenge,
    state,
  });

  window.location.href = `${ZALO_PERMISSION_URL}?${params.toString()}`;
};

/**
 * Đọc & xoá codeVerifier đã lưu theo state (dùng 1 lần).
 * Trả null nếu không tìm thấy (state sai / phiên đã bị dùng / hết hạn) → coi như phiên không hợp lệ.
 */
export const consumeZaloCodeVerifier = (state: string): string | null => {
  try {
    const key = PKCE_PREFIX + state;
    const verifier = sessionStorage.getItem(key);
    if (verifier) sessionStorage.removeItem(key);
    return verifier;
  } catch {
    return null;
  }
};

/**
 * Bước 2: đổi Zalo authorization `code` lấy token qua BE.
 * `code` chỉ dùng 1 lần — KHÔNG gọi lại với code cũ.
 */
export const exchangeZaloCode = async (
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<ZaloAuthResponse> => {
  const response = await axios.post(`${API_BASE_URL}/auth/zalo`, {
    code,
    codeVerifier,
    redirectUri,
  });
  return response.data;
};
