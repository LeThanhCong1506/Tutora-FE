import { useCallback, useSyncExternalStore } from 'react';

/** Mốc mobile dùng chung toàn dự án — khớp với `@media (max-width: 768px)` trong CSS. */
export const MOBILE_BREAKPOINT = 768;

/**
 * True khi viewport <= breakpoint.
 *
 * Dùng useSyncExternalStore thay vì useState + useEffect: matchMedia là external
 * store đúng nghĩa, cách này lấy giá trị đúng ngay lần render đầu (không nháy một
 * frame ở giá trị sai) và không cần setState trong effect.
 */
export const useIsMobile = (breakpoint: number = MOBILE_BREAKPOINT): boolean => {
  const query = `(max-width: ${breakpoint}px)`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // getServerSnapshot: mặc định desktop để markup SSR/prerender không lệch.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

export default useIsMobile;
