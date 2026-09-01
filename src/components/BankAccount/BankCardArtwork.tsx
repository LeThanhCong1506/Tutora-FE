import React, { useId } from 'react';
import type { BankCardMotif } from '../../utils/bankTheme';

/**
 * Hoạ tiết nền mặt thẻ — vector thuần, vẽ bằng trắng bán trong suốt nên đặt lên màu thương
 * hiệu nào cũng giữ đúng độ tương phản (mặt thẻ luôn nằm trong dải tối, xem bankTheme.ts).
 *
 * Đây là hoạ tiết GỢI nhận diện, không phải bản sao artwork thẻ thật của ngân hàng (xem ghi
 * chú đầu bankTheme.ts). Mỗi ngân hàng được gán một kiểu trong bảng BANK_BRANDS.
 *
 * viewBox 400×250 xấp xỉ tỉ lệ mặt thẻ; SVG phủ kín khối thẻ bằng preserveAspectRatio="none"
 * — hoạ tiết là mảng trang trí mềm nên co giãn không gây méo nhìn thấy được.
 */

const STROKE = 'rgba(255, 255, 255, 0.2)';
const STROKE_SOFT = 'rgba(255, 255, 255, 0.12)';
const FILL_SOFT = 'rgba(255, 255, 255, 0.07)';

/** Kinh tuyến/vĩ tuyến trên một khối cầu lệch sang phải — mô-típ "thẻ quốc tế" kinh điển. */
const GlobeMotif: React.FC = () => (
  <g fill="none" stroke={STROKE} strokeWidth="0.9">
    <circle cx="318" cy="104" r="126" stroke={STROKE_SOFT} />
    <circle cx="318" cy="104" r="92" />
    <circle cx="318" cy="104" r="58" stroke={STROKE_SOFT} />
    {/* Vĩ tuyến: ellipse dẹt dần về hai cực. */}
    <ellipse cx="318" cy="104" rx="92" ry="18" />
    <ellipse cx="318" cy="104" rx="92" ry="48" stroke={STROKE_SOFT} />
    <ellipse cx="318" cy="104" rx="92" ry="76" stroke={STROKE_SOFT} />
    {/* Kinh tuyến: ellipse dựng đứng, thu hẹp dần để giả phối cảnh cầu. */}
    <ellipse cx="318" cy="104" rx="18" ry="92" />
    <ellipse cx="318" cy="104" rx="48" ry="92" stroke={STROKE_SOFT} />
    <ellipse cx="318" cy="104" rx="76" ry="92" stroke={STROKE_SOFT} />
  </g>
);

/** Vòng cung đồng tâm toả từ góc dưới-trái. */
const ArcsMotif: React.FC = () => (
  <g fill="none" stroke={STROKE} strokeWidth="1.1">
    <path d="M-30 250 A 150 150 0 0 1 120 100" />
    <path d="M-30 250 A 210 210 0 0 1 180 40" stroke={STROKE_SOFT} />
    <path d="M-30 250 A 270 270 0 0 1 240 -20" />
    <path d="M-30 250 A 330 330 0 0 1 300 -80" stroke={STROKE_SOFT} />
    <path d="M-30 250 A 390 390 0 0 1 360 -140" stroke={STROKE_SOFT} />
  </g>
);

/** Dải sóng mềm chạy ngang nửa dưới thẻ. */
const WavesMotif: React.FC = () => (
  <g fill="none" stroke={STROKE} strokeWidth="1.2">
    <path d="M-20 170 C 70 130, 150 210, 250 165 S 380 120, 430 155" />
    <path d="M-20 196 C 70 156, 150 236, 250 191 S 380 146, 430 181" stroke={STROKE_SOFT} />
    <path d="M-20 222 C 70 182, 150 262, 250 217 S 380 172, 430 207" stroke={STROKE_SOFT} />
    <path d="M-20 144 C 70 104, 150 184, 250 139 S 380 94, 430 129" stroke={STROKE_SOFT} />
  </g>
);

/** Lưới chéo mảnh, dày lên ở góc phải — gợi hoa văn dập nổi trên thẻ. */
const MeshMotif: React.FC = () => (
  <g fill="none" stroke={STROKE_SOFT} strokeWidth="0.8">
    {Array.from({ length: 14 }, (_, index) => {
      const offset = 40 + index * 34;
      return <line key={`a${index}`} x1={offset} y1={-30} x2={offset - 190} y2={280} />;
    })}
    {Array.from({ length: 9 }, (_, index) => {
      const offset = 130 + index * 34;
      return <line key={`b${index}`} x1={offset} y1={-30} x2={offset + 190} y2={280} stroke={STROKE} />;
    })}
  </g>
);

/** Khối cầu sáng mờ chồng nhau — hợp với thẻ của ngân hàng số. */
const OrbsMotif: React.FC<{ gradientId: string }> = ({ gradientId }) => (
  <>
    <defs>
      <radialGradient id={gradientId}>
        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
        <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
      </radialGradient>
    </defs>
    <g fill={`url(#${gradientId})`}>
      <circle cx="330" cy="52" r="120" />
      <circle cx="66" cy="214" r="105" />
      <circle cx="228" cy="150" r="80" />
    </g>
    <g fill="none" stroke={STROKE_SOFT} strokeWidth="1">
      <circle cx="330" cy="52" r="74" />
      <circle cx="66" cy="214" r="62" />
    </g>
  </>
);

/** Hai dải chéo vắt qua mặt thẻ. */
const RibbonMotif: React.FC = () => (
  <>
    <g fill={FILL_SOFT}>
      <path d="M150 -40 L 250 -40 L 60 290 L -40 290 Z" />
      <path d="M420 20 L 420 96 L 150 290 L 40 290 Z" />
    </g>
    <g fill="none" stroke={STROKE} strokeWidth="1">
      <path d="M258 -40 L 68 290" />
      <path d="M420 104 L 158 290" />
    </g>
  </>
);

interface Props {
  motif: BankCardMotif;
}

const BankCardArtwork: React.FC<Props> = ({ motif }) => {
  // useId: nếu có nhiều thẻ trên cùng trang, id gradient của từng thẻ không đè nhau.
  const gradientId = `bank-orb-${useId().replace(/:/g, '')}`;

  return (
    <svg
      className="finance-bank-visual__artwork"
      viewBox="0 0 400 250"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {motif === 'globe' && <GlobeMotif />}
      {motif === 'arcs' && <ArcsMotif />}
      {motif === 'waves' && <WavesMotif />}
      {motif === 'mesh' && <MeshMotif />}
      {motif === 'orbs' && <OrbsMotif gradientId={gradientId} />}
      {motif === 'ribbon' && <RibbonMotif />}
    </svg>
  );
};

export default BankCardArtwork;
