# Phase 1: SEO Optimization Plan

## Objective
Achieve Lighthouse score ≥90 for Performance, SEO, Accessibility, Best Practices on 3 core pages.

## Tasks

### 1. Image Optimization (2 hours)
**Files to update:**
- `app/_components/Header.tsx` - logo
- `app/_components/Footer.tsx` - logo
- `app/_components/HeroSection.tsx` - hero images
- `app/_components/FeaturesSection.tsx` - feature icons
- `app/_components/TestimonialsSection.tsx` - avatars
- `app/tutor-search/_components/TutorCard.tsx` - tutor avatars
- `app/tutor-detail/[id]/_components/HeroSection.tsx` - tutor avatar/cover

**Action:**
```tsx
// Replace all <img> with:
import Image from 'next/image';

<Image
  src={src}
  alt={alt}
  width={width}
  height={height}
  priority={isAboveFold} // true for hero images
  loading={isAboveFold ? undefined : 'lazy'}
/>
```

**Checklist:**
- [ ] Replace all `<img>` tags with `<Image>`
- [ ] Add proper width/height to avoid layout shift
- [ ] Set `priority` for above-the-fold images
- [ ] Test images load correctly

---

### 2. Loading States (1 hour)
**Files to create:**
- `app/loading.tsx` - homepage skeleton
- `app/tutor-search/loading.tsx` - search skeleton
- `app/tutor-detail/[id]/loading.tsx` - detail skeleton

**Action:**
```tsx
// app/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-16 bg-gray-200" /> {/* Header */}
      <div className="h-96 bg-gray-100" /> {/* Hero */}
      {/* Add more skeleton blocks */}
    </div>
  );
}
```

**Checklist:**
- [ ] Create loading.tsx for each route
- [ ] Match skeleton layout to actual page
- [ ] Test loading states appear during navigation

---

### 3. Metadata Optimization (30 min)
**Files to update:**
- `app/page.tsx` - homepage metadata
- `app/tutor-search/page.tsx` - search metadata
- `app/tutor-detail/[id]/page.tsx` - detail metadata

**Action:**
- Verify title length ≤60 chars
- Verify description length 150-160 chars
- Add keywords (if missing)
- Verify OG images exist and load

**Checklist:**
- [ ] All titles ≤60 chars
- [ ] All descriptions 150-160 chars
- [ ] All OG images load correctly
- [ ] Test with Facebook Debugger & Twitter Card Validator

---

### 4. Performance Optimization (1 hour)
**Files to update:**
- `app/layout.tsx` - font optimization
- `next.config.ts` - compression, caching

**Action:**
```ts
// next.config.ts - add compression
const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // ... existing config
};
```

**Checklist:**
- [ ] Enable compression
- [ ] Remove powered-by header
- [ ] Verify font loading strategy
- [ ] Check bundle size with `npm run build`

---

### 5. Accessibility (30 min)
**Files to check:**
- All interactive elements have proper ARIA labels
- All images have meaningful alt text
- Color contrast meets WCAG AA

**Checklist:**
- [ ] All buttons have accessible names
- [ ] All images have alt text
- [ ] Color contrast ≥4.5:1
- [ ] Keyboard navigation works

---

### 6. Lighthouse Testing (30 min)
**Action:**
```bash
npm run build
npm run start

# Open Chrome DevTools > Lighthouse
# Test each page:
# - http://localhost:3000/
# - http://localhost:3000/tutor-search
# - http://localhost:3000/tutor-detail/1
```

**Target Scores:**
- Performance: ≥90
- SEO: ≥95
- Accessibility: ≥90
- Best Practices: ≥95

**Checklist:**
- [ ] Homepage score ≥90
- [ ] Search page score ≥90
- [ ] Detail page score ≥90
- [ ] Fix any critical issues
- [ ] Document scores in README

---

## Total Time: ~5.5 hours

## Success Criteria
✅ All 3 pages score ≥90 on Lighthouse
✅ All images use next/image
✅ Loading states implemented
✅ No accessibility violations
✅ Bundle size optimized
