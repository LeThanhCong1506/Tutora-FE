import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storageAdapter } from "../../services/storage.adapter";

/**
 * Handles deeplinks from ZNS notifications and OA messages.
 * Format: zalo://app/<MINI_APP_ID>?path=/parent-portal/lessons/123
 *
 * Luồng hybrid tìm gia sư (bot gửi nút mở Mini App) còn kèm `token` — HMAC ngắn hạn
 * bot ký sẵn, nhúng Zalo OA user_id THẬT (khác hẳn Mini App User ID lấy được qua
 * zmp-sdk getUserInfo() — 2 namespace ID riêng biệt của Zalo, không tự suy ra nhau
 * được). Lưu lại để miniAppSearch.service.ts gửi kèm khi PH bấm "Gửi kết quả cho Zalo"
 * trên TutorSearchPage — xem tutora-zalo-bot/src/mini-app/mini-app-token.service.ts.
 *
 * `lang` (vi|en) đi kèm token — bot đã tự nhận diện ngôn ngữ PH dùng lúc gửi nút, Mini
 * App KHÔNG tự đoán lại (đơn giản, nhất quán 1 nguồn chân lý) — dùng để render form đúng
 * ngôn ngữ, xem MiniAppSearchFormPage.tsx.
 *
 * `fresh=1` đi kèm khi PH muốn NHU CẦU KHÁC HẲN (agent trả reopen_mini_app_fresh=true,
 * xem tutora-zalo-bot MiniAppButtonService.sendSearchButton) — Mini App PHẢI để form
 * TRỐNG cho PH điền lại, KHÔNG auto-skip qua kết quả cũ dù /prefill còn dữ liệu (bug thật
 * 2026-07-14: thiếu cờ này khiến chọn "nhu cầu khác" vẫn tự hiện kết quả CŨ).
 */
export const MINI_APP_SEARCH_TOKEN_KEY = "MINIAPP_SEARCH_TOKEN";
export const MINI_APP_SEARCH_LANG_KEY = "MINIAPP_SEARCH_LANG";
export const MINI_APP_SEARCH_FRESH_KEY = "MINIAPP_SEARCH_FRESH";

export function DeeplinkHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      void storageAdapter.set(MINI_APP_SEARCH_TOKEN_KEY, token);
    }
    const lang = searchParams.get("lang");
    if (lang === "en" || lang === "vi") {
      void storageAdapter.set(MINI_APP_SEARCH_LANG_KEY, lang);
    }
    // fresh CHỈ set khi có "1" — reset về "0" khi thiếu, tránh dính cờ fresh từ deep link
    // TRƯỚC đó (storage tồn tại xuyên suốt phiên, không tự xoá giữa các lần mở).
    void storageAdapter.set(MINI_APP_SEARCH_FRESH_KEY, searchParams.get("fresh") === "1" ? "1" : "0");
    const path = searchParams.get("path");
    if (path) {
      navigate(path, { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
}
