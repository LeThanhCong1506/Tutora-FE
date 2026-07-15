import { useEffect, useState } from 'react';

export function useCurrentTime(refreshIntervalMs = 1_000): number {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  return currentTime;
}
