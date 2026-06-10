# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Web dev server on :5173 with /api proxy → http://localhost:5166
npm run dev:zalo      # Zalo Mini App dev (Vite MODE=zalo, no proxy, zmp-sdk loaded)
npm run build         # Type-check + Vite build for web (dist/)
npm run build:zalo    # Type-check + Vite build (MODE=zalo) + scripts/zalo-post-build.mjs
npm run lint          # ESLint flat config (eslint.config.js)
npm run format        # Prettier write on src/
npm run format:check  # Prettier check-only
```

Type-check only (no build): `npx tsc -b` or `npx tsc --noEmit -p tsconfig.app.json`.
Vite here is `npm:rolldown-vite@7.2.5` (drop-in fork) — see `overrides` in package.json. Treat commands as standard Vite.

## Dual target: Web + Zalo Mini App

**Same codebase ships to two runtimes.** The switch is the Vite `MODE` flag:

- `MODE=development|production` → plain web SPA, mounted at `/`
- `MODE=zalo` → Zalo Mini App bundle, mounted at `/zapps/<MINI_APP_ID>`

`src/services/zalo-env.ts` exposes `isZaloMiniApp()` which reads `import.meta.env.MODE === "zalo"`. This branch decides:

- **Base path** (`vite.config.ts`): `./` for Zalo build, `/` for web.
- **Router basename** (`src/main.tsx`): `BrowserRouter basename={'/zapps/…'}` vs `'/'`.
- **Storage backend** (`src/services/storage.adapter.ts`): `zmp-sdk/apis` getStorage/setStorage vs `localStorage`. Zalo path is async, so the adapter hydrates an in-memory cache **once** in `main.tsx` before React renders, and exposes `getCachedUser()` for sync hot-paths (axios interceptor).
- **Routes hidden from Zalo** (`src/App.tsx`): `/tutor-portal/*`, `/login`, `/register`, `/reset-password` are only registered when `!inMiniApp`. Tutor flows are web-only; Zalo has Parent + Student portals.
- **Chunking** (`vite.config.ts`): anything under `pages/TutorPortal`, `pages/TutorOnboarding`, `pages/TutorFinance`, `layouts/TutorPortalLayout` is split into a `portal-staff` chunk so the Zalo bundle never loads staff code.
- **Post-build for Zalo** (`scripts/zalo-post-build.mjs`): reads `dist/index.html`, extracts hashed JS/CSS names, writes `dist/assets/bootstrap.js` (a tiny dynamic-import shim), and updates both `dist/app-config.json` and root `app-config.json` so Zalo loader picks up the latest hashed files. **Run only via `npm run build:zalo`**; root `app-config.json` IS checked in and is rewritten by each Zalo build.

When editing anything platform-specific, always ask "does this run in Zalo?" — the entry point, storage, router base, and route set all differ.

## Routing & portals

Single `<Routes>` tree in `src/App.tsx` using React Router v7. Three role portals (Admin moved to separate repo `tutora-admin-frontend` — see plan `~/.claude/plans/t-i-mu-n-t-ch-resource-shimmering-wren.md`), each wrapped in `ProtectedRoute allowedRoles={[...]}` + a layout with `<Outlet />`:

- `/tutor-portal/*` → `TutorPortalLayout` (web only; has onboarding tour)
- `/parent-portal/*` → `ParentLayout` (wraps `StudentProvider` for the multi-student selector)
- `/student-portal/*` → `StudentLayout`

Admin (`/admin-portal/*`) is no longer routed here — paths return 404. Hitting an admin URL on production should redirect users to the admin domain (out of scope for this repo).

Public: `/`, `/tutor-search`, `/tutor-detail/:id`. `/tutor-detail/:id` is the SEO-critical page — any change to its HTML/metadata should be reviewed for SEO impact.

All pages are `lazy()` imported with a shared `<PageLoader />` Suspense fallback. Prefer keeping this discipline when adding new routes.

## Auth architecture

Backend is JWT-based; tokens live in storage as `TUTORA_user_data` (key defined in `src/services/auth.service.ts`):

- **Storage layer**: `storageAdapter` (`services/storage.adapter.ts`) — dual-backend (localStorage / zmp-sdk) + in-memory cache. `getCachedUser()` is sync; `set/get/remove` are async. Do **not** read `localStorage.getItem("TUTORA_user_data")` directly anywhere — always go through the adapter.
- **Interceptor** (`services/apiClient.ts`): `setupAuthInterceptor(axiosInstance)` attaches Bearer token on request, on 401 runs a **single-flight silent refresh** (shared `isRefreshing` + `failedQueue`) against `POST /api/token/refresh`, retries the original, and on refresh failure calls `handleAuthFailure()` from `zalo-auth.service` (route-aware logout for both targets). Every service module that needs auth should `setupAuthInterceptor(axios.create({ baseURL }))` — don't roll custom token logic.
- **Route guard** (`components/ProtectedRoute/ProtectedRoute.tsx`): checks `getCurrentUser()` + role (from JWT claims via `getUserInfoFromToken`), redirects to `/login` or to the correct role's dashboard with a toast. Role claim uses Microsoft schema URIs (`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/…`), decoded manually in `auth.service.ts`.
- **Periodic check**: `App.tsx` calls `checkTokenExpiry` on pathname change and every 30s; if refresh fails, shows `SessionExpiredModal`.
- **Zalo auth** (`services/zalo-auth.service.ts`): Zalo target skips `/login` — auth flows through Zalo access token. `handleAuthFailure` inside the interceptor branches on target.

## Services convention

One file per domain under `src/services/` (e.g. `booking.service.ts`, `tutorDetail.service.ts`). Each module:

1. `const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api'`
2. Creates a local `axios.create({ baseURL })` and wraps with `setupAuthInterceptor`
3. Exports typed functions returning `ApiResponse<T>` (`{ content: T; statusCode; message }` — the backend envelope)

Exceptions: `signalr.service.ts` (singleton class holding two `HubConnection`s — chat hub + notification hub), `supabase.service.ts` (Supabase Storage uploads), `storage.adapter.ts` (no HTTP).

Real-time: `@microsoft/signalr` client connects to `${BACKEND_URL}/hubs/chat` and `/notificationHub`, token via query param. The service is a class singleton — keep constructor side-effect-free and lazy.

Supabase (`src/lib/supabase.ts`): two clients — `supabase` (anon) and `supabaseAdmin` (service-role, used for upload-ID-card). **The service-role key is currently bundled into the client — treat this as a known issue (see SSR landmines below), don't expand its usage.**

## Data-fetching pattern

No React Query / SWR. Pages use raw `useEffect` + axios inside the component or a co-located hook. State lives in `useState`; complex flows get extracted into `hooks/<useX>.ts` inside the page folder. Keep this — don't introduce a client cache library without discussion.

Parent portal uses `contexts/StudentContext.tsx` to share the selected student across pages. The selected student persists via `storageAdapter.set('selectedStudentId', …)`.

## Page/component structure

Pages live under `src/pages/<Feature>/`. The convention after recent refactors (`StudentAccount`, `TutorPortalSchedule`, `BookingModal`):

```
pages/Foo/
  index.tsx                 # orchestrator — composes sections, thin
  styles.module.css         # CSS Module for this page
  foo-components/           # or schedule-components, account-components, etc.
    index.ts                # barrel export (components + hooks + types)
    types.ts                # shared types for this page
    utils.ts                # pure helpers
    styles.ts               # inline-style objects if shared across sections
    hooks/
      useFooData.ts         # state + side effects (fetch, save, toggles)
    SectionA.tsx            # presentational, props-only
    SectionB.tsx
```

When a page passes ~400 lines, apply this pattern. Keep hooks owning side effects, components owning rendering. New sections should be imported via the barrel `index.ts` — never reach into internal files from outside the folder.

UX text defaults to **Vietnamese** (toasts, labels, headings, button captions). See any existing page for tone.

## Styling

- **Tailwind v4** via `@tailwindcss/postcss` (`postcss.config.js`). No `tailwind.config.js` — v4 is CSS-driven.
- **CSS Modules** co-located as `styles.module.css`. Preferred for complex section layouts.
- **Ant Design v6** for rich widgets (tables, forms, dropdowns). Icons from `@ant-design/icons` or `lucide-react`.
- Google Fonts loaded in `index.html` (Bricolage Grotesque + IBM Plex + Noto). Material Symbols also available.

## Environment variables

All client-visible env vars use `VITE_*` prefix and are read via `import.meta.env.VITE_*` (currently 38 occurrences across 31 files). Key vars (see `.env`, `.env.zalo`):

- `VITE_BACKEND_URL` — API origin (default `http://localhost:5166`)
- `VITE_API_URL` — `/api` in dev (goes through Vite proxy)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_ZALO_MINI_APP_ID` — used for BrowserRouter basename in Zalo mode

The `.env` file contains real keys — don't commit edits to it without checking git history first.

## Known SSR landmines (relevant to planned Next.js migration)

A migration plan to Next.js lives at `~/.claude/plans/abstract-growing-blossom.md` (monorepo with `apps/zalo` keeping Vite, `apps/web` on Next, shared code in `packages/shared`). Before that work starts, these files have module-scope browser dependencies that **will crash SSR** and must be guarded:

- `src/services/storage.adapter.ts` — `localStorage.getItem` at module scope inside `getCachedUser`.
- `src/lib/supabase.ts` — `createClient(...)` at import time; service-role key is public. Split into `.browser.ts` + `.admin.ts` (server-only) during migration.
- `src/App.tsx` — reads `window.location.hash` at render body (lines ~102–108).
- `src/services/signalr.service.ts` — class singleton; confirm no instance is constructed at module scope.
- `src/hooks/useFormDraft.ts` — touches `sessionStorage`; needs `typeof window` guard.

Any edit to these files should preserve (or add) the browser-only guarding.

## Formatting & lint

- Prettier: 2-space indent, single quotes, 120-char print width, trailing commas, semis on (see `.prettierrc`).
- ESLint flat config with `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` + `react-refresh/vite`. `dist` is ignored.
- tsconfig is **strict**: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions` (Vite-only — not portable to Next). `jsx: "react-jsx"`.
