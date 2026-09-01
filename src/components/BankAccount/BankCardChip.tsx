import React, { useId } from 'react';

/**
 * Chip EMV + biểu tượng contactless của thẻ vật lý.
 *
 * Chip giữ tông kim loại vàng cố định (không nhuộm theo màu ngân hàng) vì chip thật trên mọi
 * thẻ đều là màu kim loại — nhuộm theo thương hiệu sẽ trông như hình vẽ chứ không như chip.
 *
 * Lưu ý: đây là chi tiết TRANG TRÍ cho khối "tài khoản nhận tiền". Không vẽ logo tổ chức thẻ
 * (Visa/Mastercard/NAPAS): dữ liệu ta có là số TÀI KHOẢN ngân hàng, không phải số thẻ, nên
 * gắn nhãn tổ chức thẻ vào đây là bịa thông tin.
 */

export const BankCardChip: React.FC = () => {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `chip-${rawId}`;

  return (
    <svg
      className="finance-bank-chip"
      viewBox="0 0 44 34"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4dfae" />
          <stop offset="45%" stopColor="#d9b877" />
          <stop offset="100%" stopColor="#b58f4f" />
        </linearGradient>
      </defs>

      <rect x="0.5" y="0.5" width="43" height="33" rx="5" fill={`url(#${gradientId})`} />

      {/* Các đường tiếp xúc trên mặt chip. */}
      <g fill="none" stroke="rgba(120, 88, 40, 0.55)" strokeWidth="1.1">
        <rect x="12" y="7.5" width="20" height="19" rx="3" />
        <path d="M0 12h12M32 12h12M0 22h12M32 22h12M22 0v7.5M22 26.5V34" />
      </g>
    </svg>
  );
};

export const ContactlessGlyph: React.FC = () => (
  <svg
    className="finance-bank-contactless"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
  >
    <path d="M6.5 7.5a9 9 0 0 1 0 9" opacity="0.55" />
    <path d="M10.5 5.5a13 13 0 0 1 0 13" opacity="0.75" />
    <path d="M14.5 3.5a17 17 0 0 1 0 17" />
  </svg>
);
