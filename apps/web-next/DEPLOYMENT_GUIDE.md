# Deployment Guide - Option B (Same Domain)

## 🎯 Tổng quan

Deploy NextJS và Vite trên cùng domain `tutora.vn` với routing:
- NextJS: SEO pages (/, /tutor-search, /tutor-detail/[id])
- Vite: Portal pages (/login, /register, /admin-portal/*, etc.)

---

## 📋 Checklist Deploy

### **Phase 1: Chuẩn bị** ✅

- [x] Build NextJS thành công
- [x] Testing local pass
- [x] Tạo `.env.production`
- [ ] Commit code

### **Phase 2: Deploy NextJS**

**Option 2A: Vercel (Recommended - 10 phút)**

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd apps/web-next
vercel --prod
```

4. **Configure domain:**
- Vercel Dashboard → Settings → Domains
- Add: `tutora.vn`
- Update DNS: `CNAME tutora.vn → cname.vercel-dns.com`

**Option 2B: VPS/Server (30 phút)**

1. **Build NextJS:**
```bash
cd apps/web-next
npm run build
```

2. **Upload to server:**
```bash
# Copy files to server
scp -r .next package.json server:/var/www/tutora-next/
```

3. **Start NextJS:**
```bash
# On server
cd /var/www/tutora-next
npm install --production
npm run start
# NextJS runs on port 3000
```

### **Phase 3: Configure Nginx Routing**

**File: `/etc/nginx/sites-available/tutora.vn`**

```nginx
upstream nextjs {
    server 127.0.0.1:3000;
}

upstream vite {
    server 127.0.0.1:5173;
}

server {
    listen 80;
    server_name tutora.vn;

    # NextJS pages (SSR)
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /tutor-search {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /tutor-detail {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Vite pages (CSR) - Portal routes
    location ~ ^/(login|register|reset-password) {
        proxy_pass http://vite;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location ~ ^/(admin-portal|tutor-portal|parent-portal|student-portal) {
        proxy_pass http://vite;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Static files
    location /_next/static {
        proxy_pass http://nextjs;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable & Restart:**
```bash
sudo ln -s /etc/nginx/sites-available/tutora.vn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Phase 4: Verify**

**Test URLs:**
```bash
# NextJS pages
curl -I https://tutora.vn
curl -I https://tutora.vn/tutor-search
curl -I https://tutora.vn/tutor-detail/1

# Vite pages
curl -I https://tutora.vn/login
curl -I https://tutora.vn/admin-portal
```

**Check in browser:**
- [ ] https://tutora.vn → NextJS (view source có full HTML)
- [ ] https://tutora.vn/tutor-search → NextJS
- [ ] https://tutora.vn/tutor-detail/1 → NextJS
- [ ] https://tutora.vn/login → Vite
- [ ] https://tutora.vn/admin-portal → Vite

---

## 🔧 Troubleshooting

### Issue 1: NextJS 404 for Vite routes
**Fix:** Check Nginx routing config, ensure Vite routes are proxied correctly

### Issue 2: CORS errors
**Fix:** Add CORS headers in Nginx:
```nginx
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
```

### Issue 3: Images not loading
**Fix:** Check `next.config.ts` remotePatterns includes your image domains

---

## 📊 Success Metrics

**After deploy, verify:**
- [ ] Google Search Console: Submit sitemap
- [ ] Lighthouse scores: Performance ≥70, SEO = 100
- [ ] All pages load correctly
- [ ] Auth flow works (login → portal)
- [ ] No console errors

---

## 🎉 Done!

**Your site is now live with:**
- ✅ NextJS SSR for SEO pages
- ✅ Vite CSR for portal pages
- ✅ Same domain (tutora.vn)
- ✅ SEO score: 100/100
