import { isZaloMiniApp } from "./zalo-env";

// In-memory cache — tránh async overhead cho hot-path calls (interceptor, etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cachedUserData: any = null;

export const storageAdapter = {
  async get(key: string): Promise<string | null> {
    if (isZaloMiniApp()) {
      const { getStorage } = await import("zmp-sdk/apis");
      const data = await getStorage({ keys: [key] });
      return (data as Record<string, string>)[key] ?? null;
    }
    return localStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (isZaloMiniApp()) {
      const { setStorage } = await import("zmp-sdk/apis");
      await setStorage({ data: { [key]: value } });
    } else {
      localStorage.setItem(key, value);
    }
    if (key === "TUTORA_user_data") {
      _cachedUserData = JSON.parse(value);
    }
  },

  async remove(key: string): Promise<void> {
    if (isZaloMiniApp()) {
      const { removeStorage } = await import("zmp-sdk/apis");
      await removeStorage({ keys: [key] });
    } else {
      localStorage.removeItem(key);
    }
    if (key === "TUTORA_user_data") {
      _cachedUserData = null;
    }
  },

  // Sync getter cho hot-path (request interceptor) — đọc từ in-memory cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCachedUser(): any {
    if (_cachedUserData) return _cachedUserData;
    // Web mode: hydrate cache từ localStorage nếu chưa có
    if (!isZaloMiniApp()) {
      const data = localStorage.getItem("TUTORA_user_data");
      _cachedUserData = data ? JSON.parse(data) : null;
    }
    return _cachedUserData;
  },

  // Gọi 1 lần khi app khởi động (Zalo mode) để hydrate cache từ zmp-sdk storage
  async hydrateCache(): Promise<void> {
    if (isZaloMiniApp()) {
      const { getStorage } = await import("zmp-sdk/apis");
      const data = await getStorage({ keys: ["TUTORA_user_data"] });
      const raw = (data as Record<string, string>)["TUTORA_user_data"];
      _cachedUserData = raw ? JSON.parse(raw) : null;
    }
  },

  updateCachedTokens(accessToken: string, refreshToken: string): void {
    if (_cachedUserData) {
      _cachedUserData = { ..._cachedUserData, accessToken, refreshToken }; // eslint-disable-line
    }
  },
};
