// Mốc GIÁ TRỊ THẬT (đơn vị VND), không phải nghìn — "100_200" nghĩa là 100,000đ-200,000đ/h.
// Rút từ 5 mức xuống còn 3 (feedback Lien, ex-MD Check24, 2026-08: "at most 3 buckets in
// the beginning" — nhiều mức làm chậm quyết định của phụ huynh). "Mọi giá" là lựa chọn
// trung lập, không tính vào 3 bucket (giống "Không yêu cầu" ở bước giới tính/khu vực).
export const BUDGET_RANGE_OPTIONS = [
  { value: "all", label: "Mọi giá" },
  { value: "under_100", label: "Dưới 100,000đ/giờ" },
  { value: "100_200", label: "100,000đ - 200,000đ/giờ" },
  { value: "over_200", label: "Trên 200,000đ/giờ" },
] as const;

export function budgetRangeToMinMax(budgetRange: string): { minRate?: number; maxRate?: number } {
  switch (budgetRange) {
    case "under_100": return { maxRate: 100_000 };
    case "100_200": return { minRate: 100_000, maxRate: 200_000 };
    case "over_200": return { minRate: 200_000 };
    default: return {};
  }
}

/** Chiều ngược lại — dùng khi prefill wizard từ agentCtx cũ (chỉ có minRate/maxRate thô,
 * không có bucket). Khớp CHÍNH XÁC theo cặp min/max đã biết; không khớp gì → "all". */
export function minMaxToBudgetRange(minRate?: number, maxRate?: number): string {
  if (minRate == null && maxRate == null) return "all";
  for (const { value } of BUDGET_RANGE_OPTIONS) {
    const range = budgetRangeToMinMax(value);
    if (range.minRate === minRate && range.maxRate === maxRate) return value;
  }
  return "all";
}
