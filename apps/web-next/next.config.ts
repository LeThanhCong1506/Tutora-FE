import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Rewrites cho các route Vite app đảm nhận.
 *
 * Chiến lược: **fallback rewrite** (`fallback: [...]`) thay vì danh sách path cụ thể.
 * - `beforeFiles` — chạy TRƯỚC file system & routes của Next. Bỏ trống.
 * - `afterFiles`  — chạy SAU Next routes nhưng TRƯỚC filesystem. Bỏ trống.
 * - `fallback`    — chạy SAU tất cả (chỉ khi Next + filesystem KHÔNG handle). Catch-all.
 *
 * Lý do phải dùng fallback catch-all thay vì list path cụ thể:
 *  - Vite dev serve `<script src="/@vite/client">`, `/src/main.tsx`, `/@react-refresh`, v.v.
 *    Các path này phát sinh DO VITE chứ không biết trước. List cụ thể sẽ miss.
 *  - Vite prod build serve `/assets/index-HASH.js`, `/assets/index-HASH.css` — tên hash
 *    cũng không biết trước.
 *  - Dùng fallback → Next tự serve `/` (Home), `/tutor-search` (Phase 3), `/tutor-detail/*`
 *    (Phase 4), `/_next/*`, `/favicon.ico`, `/tutora-logo.png` (trong `public/`).
 *    Mọi thứ khác fallback sang Vite.
 *
 * Dev: set `VITE_APP_ORIGIN=http://localhost:5173` trong `.env.local` để proxy về Vite dev.
 * Prod: default `https://app.tutora.vn` (Project B trên Vercel).
 *
 * Chọn `rewrites` (KHÔNG `redirects`) để browser thấy cùng origin → localStorage
 * `TUTORA_user_data` share được giữa Next home page và Vite portal pages.
 */

const VITE_ORIGIN = process.env.VITE_APP_ORIGIN || 'https://app.tutora.vn';

const nextConfig: NextConfig = {
  // Next 16 + Turbopack auto-detect lockfile. Chỉ định rõ root = apps/web-next/ tránh
  // Next đoán nhầm lockfile Vite ở root repo.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Fallback: bất cứ request nào Next + filesystem không xử lý → proxy sang Vite.
      // Bao gồm: /login, /register, /reset-password, /admin-portal/*, /tutor-portal/*,
      // /parent-portal/*, /student-portal/*, /payment/*, /zapps/*, các Vite dev assets
      // (/@vite/*, /src/*, /@react-refresh, /node_modules/.vite/*), Vite prod assets
      // (/assets/*), và các public file Vite có nhưng Next không có.
      fallback: [
        {
          source: '/:path*',
          destination: `${VITE_ORIGIN}/:path*`,
        },
      ],
    };
  },
  images: {
    // Cho phép Next/Image optimize từ backend Tutora (avatar tutor, cover, v.v.)
    remotePatterns: [
      { protocol: 'https', hostname: 'api.tutora.vn' },
      { protocol: 'http', hostname: 'localhost' },
      // Supabase storage (avatar / cover đã upload)
      { protocol: 'https', hostname: '*.supabase.co' },
      // Public fallback images used by tutor detail.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
};

export default nextConfig;
