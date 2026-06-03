/**
 * Env abstraction cho Next app.
 *
 * Tương ứng với mapping trong plan §2.1 (Vite tương đương ở `src/services/zalo-env.ts`):
 *  - `VITE_BACKEND_URL`  → `NEXT_PUBLIC_BACKEND_URL` hoặc `BACKEND_URL`
 *  - `VITE_API_URL`      → `NEXT_PUBLIC_API_URL` hoặc `API_URL`
 *  - `VITE_SITE_URL`     → `NEXT_PUBLIC_SITE_URL` hoặc `SITE_URL`
 *
 * Các URL này không phải secret. Server components ưu tiên biến private (`BACKEND_URL`,
 * `API_URL`) nếu Vercel project đang cấu hình theo tên đó; client bundle vẫn dùng được
 * fallback public/default khi `NEXT_PUBLIC_*` chưa được set.
 */

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production' ? 'https://api.tutora.vn' : 'http://localhost:5166';
const DEFAULT_SITE_URL =
  process.env.NODE_ENV === 'production' ? 'https://tutora.vn' : 'http://localhost:3000';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || `${BACKEND_URL}/api`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL;

export const env = {
  BACKEND_URL,
  API_URL,
  SITE_URL,
} as const;

export type Env = typeof env;
