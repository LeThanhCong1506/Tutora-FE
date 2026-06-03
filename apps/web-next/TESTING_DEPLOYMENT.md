# Testing & Deployment Checklist

## ✅ Pre-Deployment Testing

### 1. Build & Type Check (5 phút)
```bash
cd apps/web-next
npm run build
# ✅ Build thành công
# ✅ No TypeScript errors
# ✅ No ESLint errors
```

### 2. Dev Server Testing (15 phút)
```bash
npm run dev
```

**Test cases:**
- [ ] Homepage loads (`http://localhost:3000/`)
- [ ] Tutor search works (`/tutor-search`)
- [ ] Tutor detail loads (`/tutor-detail/1`)
- [ ] Images load correctly (next/image)
- [ ] Loading states appear during navigation
- [ ] Header auth state syncs (login/logout)
- [ ] Links navigate correctly
- [ ] Responsive design works (mobile/tablet/desktop)

### 3. Production Build Testing (10 phút)
```bash
npm run build
npm run start
```

**Test on `http://localhost:3000`:**
- [ ] All pages load faster than dev
- [ ] Images optimized (check Network tab)
- [ ] No console errors
- [ ] Metadata correct (view source)

### 4. Vite Fallback Testing (10 phút)
```bash
# Start both servers:
# Terminal 1: NextJS
cd apps/web-next && npm run start

# Terminal 2: Vite (from root)
npm run dev
```

**Test fallback routes:**
- [ ] `/login` → Vite app
- [ ] `/register` → Vite app
- [ ] `/admin-portal` → Vite app
- [ ] Auth state syncs between NextJS ↔ Vite

---

## 🚀 Deployment

### Option A: Vercel (Recommended - 10 phút)

**Setup:**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd apps/web-next
vercel
```

**Environment Variables (Vercel Dashboard):**
```
VITE_APP_ORIGIN=https://app.tutora.vn
SITE_URL=https://tutora.vn
API_URL=https://api.tutora.vn/api
BACKEND_URL=https://api.tutora.vn
```

**Vercel Settings:**
- Root Directory: `apps/web-next`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Option B: Docker (15 phút)

**Create Dockerfile:**
```dockerfile
# apps/web-next/Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**Build & Run:**
```bash
docker build -t tutora-nextjs .
docker run -p 3000:3000 tutora-nextjs
```

---

## 🔍 Post-Deployment Verification

### 1. SEO Check (10 phút)
- [ ] Google Search Console: Submit sitemap
- [ ] Test with [Google Rich Results](https://search.google.com/test/rich-results)
- [ ] Verify JSON-LD schema
- [ ] Check robots.txt accessible

### 2. Performance Check (5 phút)
- [ ] Run Lighthouse on production URL
- [ ] Target: Performance ≥90, SEO ≥95
- [ ] Check Core Web Vitals

### 3. Monitoring Setup (15 phút)

**Vercel Analytics (Free):**
```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Or Sentry (Error Tracking):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## 📋 Production Checklist

### Before Deploy:
- [ ] All environment variables set
- [ ] Build succeeds locally
- [ ] No console errors in production build
- [ ] Images optimized
- [ ] Metadata verified

### After Deploy:
- [ ] All pages accessible
- [ ] SSL certificate active (HTTPS)
- [ ] Sitemap submitted to Google
- [ ] Analytics tracking works
- [ ] Error monitoring active

### Ongoing:
- [ ] Monitor error rates (Sentry/Vercel)
- [ ] Check Core Web Vitals weekly
- [ ] Review Lighthouse scores monthly
- [ ] Update dependencies quarterly

---

## 🐛 Common Issues & Fixes

### Issue 1: Images not loading
**Fix:** Check `next.config.ts` remotePatterns
```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'api.tutora.vn' },
    { protocol: 'https', hostname: '*.supabase.co' },
  ],
}
```

### Issue 2: Vite fallback not working
**Fix:** Verify `VITE_APP_ORIGIN` env var
```bash
# .env.local
VITE_APP_ORIGIN=https://app.tutora.vn
```

### Issue 3: Middleware blocking public pages
**Fix:** Check middleware matcher config
```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
```

---

## 📊 Success Metrics

**Week 1:**
- [ ] Zero critical errors
- [ ] Lighthouse score ≥90
- [ ] Page load time <2s

**Month 1:**
- [ ] Google indexing 3 main pages
- [ ] Organic traffic baseline established
- [ ] Core Web Vitals "Good"

**Month 3:**
- [ ] SEO traffic increase
- [ ] Zero downtime
- [ ] User satisfaction maintained
