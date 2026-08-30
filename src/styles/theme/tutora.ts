/**
 * Bảng màu Tutora cho classroom.
 *
 * Nền tảng là 5 màu thương hiệu (Midnight Blue / Moss Green / Umber / Burgundy /
 * Ivory).
 *
 * Viết hex thẳng thay vì `var(--color-*)` vì Tailwind v4 ở repo này chưa map các
 * biến đó thành token utility, và nhiều chỗ cần truyền qua `style={{}}`.
 */

// Màu thương hiệu
export const MIDNIGHT = '#1a2238'; // Midnight Blue — chữ chính, nền phòng học
export const MOSS = '#3d4a3e'; // Moss Green — trạng thái đúng / thành công
/** Moss đậm — nút hành động chính mang nghĩa "xác nhận/tạo mới" (tải lên, lưu). */
export const MOSS_DEEP = '#2c3530';
export const MOSS_DEEP_HOVER = '#3a463f';
export const MOSS_DEEP_SOFT = 'rgba(44, 53, 48, 0.12)';
export const UMBER = '#2e2320'; // Umber — nền tối bậc sâu nhất (toolbar)
export const BURGUNDY = '#631b1b'; // Burgundy — hành động chính, đang chọn
export const IVORY = '#f2f0e4'; // Ivory — nền dịu, vùng nhấn nhẹ
export const CREAM = '#faf9f6';
export const GOLD = '#d4b483'; // nhấn phụ, trạng thái chờ

// Vai trò trong giao diện
/** Chữ chính. */
export const TEXT = MIDNIGHT;
/** Chữ phụ / nhãn — Midnight pha loãng, KHÔNG dùng xám trung tính. */
export const TEXT_MUTED = 'rgba(26, 34, 56, 0.55)';
export const TEXT_FAINT = 'rgba(26, 34, 56, 0.38)';

/** Viền mảnh phân tách khối (không đổ bóng). */
export const BORDER = 'rgba(26, 34, 56, 0.12)';
export const BORDER_STRONG = 'rgba(26, 34, 56, 0.22)';

/** Nút chính / tab đang chọn / checkbox đã tick. */
export const ACTION = BURGUNDY;
/** Nền nhạt của hành động chính — dùng cho vùng nhấn, icon nền. */
export const ACTION_SOFT = 'rgba(99, 27, 27, 0.08)';

/** Đang chọn ở dạng trung tính (tab icon active). */
export const SELECTED_SOFT = 'rgba(26, 34, 56, 0.07)';

/** Đáp án đúng / đã hoàn thành. */
export const SUCCESS = MOSS;
export const SUCCESS_SOFT = 'rgba(61, 74, 62, 0.10)';
export const SUCCESS_TEXT = '#2f3a30';

/** Sai / cảnh báo mạnh — dùng chính Burgundy, không dùng đỏ tươi. */
export const DANGER = BURGUNDY;
export const DANGER_SOFT = 'rgba(99, 27, 27, 0.08)';

/** Đang xử lý / nháp. */
export const PENDING_SOFT = 'rgba(212, 180, 131, 0.18)';
export const PENDING_TEXT = '#6b5426';

/** Nền phòng học và thanh công cụ. */
export const STAGE_BG = MIDNIGHT;
export const TOOLBAR_BG = UMBER;

/** Trên nền tối. */
export const ON_DARK = 'rgba(255, 255, 255, 0.92)';
export const ON_DARK_MUTED = 'rgba(255, 255, 255, 0.62)';
export const ON_DARK_SOFT = 'rgba(255, 255, 255, 0.10)';

// Tên cũ — giữ để không phải sửa rải rác; ưu tiên dùng tên theo vai trò ở trên.
export const NAVY = MIDNIGHT;
export const NAVY_DEEP = UMBER;
