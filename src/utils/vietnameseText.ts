// Chuẩn hoá chữ tiếng Việt để so khớp khi tìm kiếm.

/** Dấu thanh tổ hợp tách ra sau normalize('NFD'). \p{M} giữ source ASCII thuần. */
const COMBINING_MARKS = /\p{M}/gu;

/**
 * Bỏ dấu + hạ chữ thường, để gõ không dấu vẫn tìm ra: "su pham ha noi" khớp
 * "Sư phạm Hà Nội". Gia sư gõ trên điện thoại thường bỏ dấu cho nhanh.
 */
export function removeDiacritics(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(COMBINING_MARKS, '')
      // "đ" là chữ cái riêng, KHÔNG tách ra khi NFD nên phải thay thủ công.
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
