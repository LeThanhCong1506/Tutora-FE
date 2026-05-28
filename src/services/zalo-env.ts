/**
 * Zalo Mini App environment detection.
 * - Khi build bằng `zmp build` / `zmp start`, Vite MODE = "zalo"
 * - Khi chạy web bình thường, MODE = "development" | "production"
 */
export const isZaloMiniApp = (): boolean => {
  return import.meta.env.MODE === "zalo";
};
