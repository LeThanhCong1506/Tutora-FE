'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * PrefetchLink — wrapper mỏng quanh next/link để prefetch **data** của route động
 * theo intent của user (hover / touchstart / focus).
 *
 * Vì sao tồn tại?
 *  - <Link prefetch="auto" /> (mặc định) trên route động chỉ prefetch tới
 *    `loading.tsx` boundary gần nhất, **KHÔNG** fetch payload của Server
 *    Component → click thật vẫn phải chờ `getTutorFullProfileServer`
 *    → `loading.tsx` hiện ra trong lúc chờ.
 *  - Đặt `prefetch={true}` thì full prefetch ngay khi card vào viewport — với
 *    20 card trong grid /tutor-search sẽ thành 20 lần gọi BE vô tội vạ.
 *  - `router.prefetch(href)` chạy đúng theo intent: chỉ warm cache khi user
 *    hover / chạm card. Click trong vòng ~300ms sau đó → response đã ở Next
 *    Data Cache → skeleton gần như không kịp hiện.
 *
 * Giữ TutorCard ở dạng Server Component bằng cách: chỉ wrapper này là Client.
 * Children (markup của card) vẫn được render bởi parent SC; client component
 * này chỉ chịu trách nhiệm gắn event handler — không cần hydrate nội dung card.
 *
 * API mirror tối thiểu của next/link để dễ swap. Cần prop nào nữa thì thêm sau.
 */

interface PrefetchLinkProps {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function PrefetchLink({ href, className, style, children }: PrefetchLinkProps) {
  const router = useRouter();
  // Idempotent: không spam router.prefetch nhiều lần cho cùng 1 href trong lifetime
  // của card. User hover ra/vào liên tục cũng chỉ trigger 1 lần fetch.
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onMouseEnter={handlePrefetch}
      // Mobile: chạm bắt đầu cũng đủ thời gian (~150ms tap delay) để warm cache
      onTouchStart={handlePrefetch}
      // Keyboard nav: Tab focus card cũng nên warm cache
      onFocus={handlePrefetch}
    >
      {children}
    </Link>
  );
}
