// Dò tỉnh/thành từ địa chỉ thường trú trên CCCD sang danh sách chính thức của
// provinces.open-api.vn (API v2) — dùng để GỢI Ý khu vực dạy khi gia sư chưa chọn.
//
// Vì sao phải dò thay vì gán thẳng chuỗi CCCD:
//   • CCCD in theo mô hình hành chính CŨ 3 cấp (xã → huyện → tỉnh), còn API v2 là mô
//     hình MỚI 2 cấp sau sáp nhập 07/2025. Hai bên viết tên khác nhau ("TP. Hồ Chí
//     Minh" vs "Thành phố Hồ Chí Minh").
//   • teachingAreaCity được BE so khớp CHÍNH XÁC khi filter search, nên chỉ chuỗi
//     `name` nguyên văn từ API v2 mới dùng được.
//
// Tỉnh đã bị sáp nhập (vd "Tỉnh Bình Dương") không còn trong danh sách v2 → không khớp
// → không gợi ý. Đây là hành vi MONG MUỐN: thà không gợi ý còn hơn gợi ý sai.
import { fetchProvinces, type Province } from '../../../services/location.service';

/**
 * Dấu thanh tổ hợp tách ra sau normalize('NFD') — bỏ đi để so khớp không dấu.
 * Dùng \p{M} (Unicode Mark) thay cho dải ký tự thô để source giữ được ASCII thuần.
 */
const COMBINING_MARKS = /\p{M}/gu;

/** Bỏ dấu, hạ chữ thường, bỏ dấu câu — để so khớp tên viết khác nhau giữa 2 nguồn. */
function normalize(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(COMBINING_MARKS, '')
      // "đ" là chữ cái riêng, KHÔNG tách ra khi NFD nên phải thay thủ công.
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Cắt tiền tố cấp hành chính: "thanh pho ho chi minh" → "ho chi minh". */
function stripAdminPrefix(normalized: string): string {
  return normalized.replace(/^(thanh pho|tinh|tp)\s+/, '').trim();
}

/**
 * Khớp theo CHUỖI TỪ liền nhau, không dùng String.includes.
 * `includes` sẽ khiến "hue" ăn nhầm bên trong "nhue" (đường Nhuệ) và cho ra Huế.
 */
function containsPhrase(tokens: string[], phrase: string): boolean {
  const words = phrase.split(' ');
  if (words.length === 0 || words[0] === '') return false;
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
}

/**
 * Trả về tỉnh/thành (theo đúng `name` của API v2) suy ra từ địa chỉ CCCD.
 *
 * Trả `null` khi: địa chỉ rỗng, API bên thứ 3 lỗi, không khớp tỉnh nào (tỉnh đã sáp
 * nhập), hoặc khớp nhiều hơn 1 tỉnh (mơ hồ — không đoán bừa).
 */
export async function matchProvinceFromCccdAddress(
  cccdAddress: string | null | undefined,
): Promise<Province | null> {
  if (!cccdAddress?.trim()) return null;

  let provinces: Province[];
  try {
    provinces = await fetchProvinces();
  } catch {
    // Đây chỉ là gợi ý — API địa danh sập thì bỏ qua im lặng, không làm phiền gia sư.
    return null;
  }

  const tokens = normalize(cccdAddress).split(' ');
  const matches = provinces.filter((p) => {
    const bareName = stripAdminPrefix(normalize(p.name));
    return bareName.length > 0 && containsPhrase(tokens, bareName);
  });

  return matches.length === 1 ? matches[0] : null;
}
