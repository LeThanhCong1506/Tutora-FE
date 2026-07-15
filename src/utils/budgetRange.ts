// Mốc GIÁ TRỊ THẬT (đơn vị VND), không phải nghìn — "50_100" nghĩa là 50.000đ-100.000đ/h.
export const BUDGET_RANGE_OPTIONS = [
  { value: "all", label: "Mọi giá" },
  { value: "under_50", label: "Dưới 50.000đ/giờ" },
  { value: "50_100", label: "50.000đ - 100.000đ/giờ" },
  { value: "100_200", label: "100.000đ - 200.000đ/giờ" },
  { value: "200_500", label: "200.000đ - 500.000đ/giờ" },
  { value: "over_500", label: "Trên 500.000đ/giờ" },
] as const;

export function budgetRangeToMinMax(budgetRange: string): { minRate?: number; maxRate?: number } {
  switch (budgetRange) {
    case "under_50": return { maxRate: 50_000 };
    case "50_100": return { minRate: 50_000, maxRate: 100_000 };
    case "100_200": return { minRate: 100_000, maxRate: 200_000 };
    case "200_500": return { minRate: 200_000, maxRate: 500_000 };
    case "over_500": return { minRate: 500_000 };
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
