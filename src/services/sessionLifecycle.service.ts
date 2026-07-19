type SessionCleanup = () => void | Promise<void>;

const cleanupHandlers = new Set<SessionCleanup>();
let cleanupPromise: Promise<void> | null = null;

export const registerSessionCleanup = (cleanup: SessionCleanup): (() => void) => {
  cleanupHandlers.add(cleanup);
  return () => cleanupHandlers.delete(cleanup);
};

/**
 * Runs cleanup hooks while the access token is still available.
 * Calls are coalesced so concurrent logout/401 flows cannot race each other.
 */
export const runSessionCleanups = async (): Promise<void> => {
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = Promise.allSettled([...cleanupHandlers].map((cleanup) => Promise.resolve().then(cleanup)))
    .then(() => undefined)
    .finally(() => {
      cleanupPromise = null;
    });

  return cleanupPromise;
};
