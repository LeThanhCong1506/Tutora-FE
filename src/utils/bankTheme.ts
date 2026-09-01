// Diện mạo mặt thẻ theo ngân hàng người dùng đã chọn: màu thương hiệu + hoạ tiết nền.
//
// Vì sao suy từ TÊN chứ không từ mã ngân hàng: bảng `BankAccount` của BE chỉ lưu duy nhất
// `bankName` (là `shortName` của item trong danh sách VietQR, vd "VietinBank", "MBBank") —
// không lưu `code`/`bin`. Nên muốn biết đang là ngân hàng nào thì chỉ có tên để đối chiếu.
//
// Vì sao KHÔNG dùng ảnh thẻ thật của ngân hàng: artwork thẻ là tài sản có bản quyền của từng
// ngân hàng, không có API nào phát hành, và nhúng ~50 ảnh vào bundle vừa nặng vừa dễ lệch khi
// ngân hàng đổi mẫu thẻ. Thay vào đó ta dựng lại NGÔN NGỮ của thẻ vật lý bằng vector: màu
// thương hiệu + hoạ tiết + chip + contactless + logo thật lấy từ API danh sách ngân hàng.
// Xem BankCardArtwork (hoạ tiết) và useBankBrand (logo).
//
// Mỗi ngân hàng chỉ khai MỘT màu thương hiệu, và ta chỉ lấy HUE + độ bão hoà từ màu đó; độ
// sáng thì luôn ép về cùng một dải tối (xem CARD_*_LIGHTNESS). Nhờ vậy:
//   • Mọi thẻ có cùng độ sâu/độ tương phản → chữ trắng luôn đọc được, không cần kiểm từng màu.
//   • Màu khai báo chỉ cần đúng TÔNG (xanh/đỏ/tím/xanh lá) là thẻ ra đúng nhận diện; sai lệch
//     vài độ sáng không ảnh hưởng gì.
//
// Đây là màu và hoạ tiết TRANG TRÍ, xấp xỉ theo nhận diện công khai của từng ngân hàng — không
// phải lấy từ brand guideline, và không mang ý nghĩa dữ liệu nào.
// Ngân hàng không có trong bảng → dùng DEFAULT_BANK_CARD_THEME (dùng chung cho cả ba portal
// gia sư / phụ huynh / học sinh, vì cả ba đều render qua BankAccountCard).

import { removeDiacritics } from './vietnameseText';

/** Hoạ tiết nền mặt thẻ — mỗi kiểu là một SVG trong BankCardArtwork. */
export type BankCardMotif = 'globe' | 'arcs' | 'waves' | 'mesh' | 'orbs' | 'ribbon';

export interface BankCardTheme {
  /** Màu đầu gradient (góc trên-trái mặt thẻ). */
  from: string;
  /** Màu cuối gradient (góc dưới-phải mặt thẻ). */
  to: string;
  /** Vệt sáng tròn ở góc trên-phải. */
  glow: string;
  /** Màu chi tiết nhấn trên thẻ (nhãn, viền logo). */
  accent: string;
  /** Bóng đổ dưới thẻ, cùng tông với mặt thẻ. */
  shadow: string;
  motif: BankCardMotif;
  /** false = không nhận ra tên ngân hàng, đang dùng bộ mặc định. */
  recognized: boolean;
}

/**
 * Diện mạo mặc định khi không nhận ra ngân hàng (hoặc ví chưa có dữ liệu) — giữ đúng bản navy
 * + vàng đồng của hệ màu trang tài chính. Dùng chung cho ví gia sư / phụ huynh / học sinh.
 */
export const DEFAULT_BANK_CARD_THEME: BankCardTheme = {
  from: '#1a2238',
  to: '#303d5d',
  glow: 'rgba(212, 180, 131, 0.34)',
  accent: '#d4b483',
  shadow: 'rgba(26, 34, 56, 0.18)',
  motif: 'globe',
  recognized: false,
};

// Dải sáng của mặt thẻ — giữ sát bản navy gốc (#1a2238 → #303d5d) để đổi màu mà không
// đổi "độ nặng" của khối thẻ trong layout.
const CARD_FROM_LIGHTNESS = 16;
const CARD_TO_LIGHTNESS = 33;

// Chặn hai đầu bão hoà: dưới ngưỡng thì thẻ ra xám xịt, trên ngưỡng thì chói như neon.
const MIN_SATURATION = 0.42;
const MAX_SATURATION = 0.92;

/**
 * Tên ngân hàng → màu thương hiệu + hoạ tiết. `aliases` là các biến thể tên đã chuẩn hoá (bỏ
 * dấu, bỏ khoảng trắng/ký tự đặc biệt, hạ chữ thường) mà giá trị `bankName` trong DB có thể
 * mang: shortName của VietQR, mã ngân hàng, hoặc mảnh tên tiếng Việt nếu chỉ có fullName.
 */
const BANK_BRANDS: Array<{ color: string; motif: BankCardMotif; aliases: string[] }> = [
  { color: '#00693e', motif: 'arcs', aliases: ['vietcombank', 'vcb', 'ngoaithuong'] },
  { color: '#0b4c8c', motif: 'mesh', aliases: ['vietinbank', 'icb', 'congthuong'] },
  { color: '#00776e', motif: 'arcs', aliases: ['bidv', 'dautuvaphattrien'] },
  { color: '#8e1538', motif: 'waves', aliases: ['agribank', 'vba', 'agr', 'nongnghiep'] },
  { color: '#e01f26', motif: 'globe', aliases: ['techcombank', 'tcb', 'kythuong'] },
  { color: '#14357f', motif: 'mesh', aliases: ['mbbank', 'mb', 'mbb', 'quandoi'] },
  { color: '#00994d', motif: 'ribbon', aliases: ['vpbank', 'vpb', 'thinhvuong'] },
  { color: '#0057a8', motif: 'arcs', aliases: ['acb', 'achau'] },
  { color: '#582c83', motif: 'orbs', aliases: ['tpbank', 'tpb', 'tienphong'] },
  { color: '#00539f', motif: 'mesh', aliases: ['sacombank', 'stb', 'saigonthuongtin'] },
  { color: '#123e63', motif: 'ribbon', aliases: ['vib', 'quoctevietnam'] },
  { color: '#0060ae', motif: 'waves', aliases: ['shb', 'saigonhanoi'] },
  { color: '#007f41', motif: 'arcs', aliases: ['ocb', 'phuongdong'] },
  { color: '#d6152a', motif: 'ribbon', aliases: ['msb', 'hanghai', 'maritimebank'] },
  { color: '#c8102e', motif: 'waves', aliases: ['hdbank', 'hdb', 'phattrienthanhpho'] },
  { color: '#d9481f', motif: 'orbs', aliases: ['seabank', 'seab', 'dongnama'] },
  { color: '#0067b1', motif: 'globe', aliases: ['eximbank', 'eib', 'xuatnhapkhau'] },
  { color: '#6e2b8b', motif: 'arcs', aliases: ['lpbank', 'lpb', 'lienvietpostbank', 'buudienlienviet'] },
  { color: '#0f4c81', motif: 'mesh', aliases: ['scb', 'saigonthuongtinbank'] },
  { color: '#0071bc', motif: 'waves', aliases: ['namabank', 'nab', 'nama'] },
  { color: '#00447c', motif: 'mesh', aliases: ['bacabank', 'bab', 'baca'] },
  { color: '#d62027', motif: 'ribbon', aliases: ['pvcombank', 'pvcb', 'daichungvietnam'] },
  { color: '#0e4c92', motif: 'arcs', aliases: ['abbank', 'abb', 'anbinh'] },
  { color: '#0b6bb3', motif: 'mesh', aliases: ['vietabank', 'vab', 'vieta'] },
  { color: '#d22a28', motif: 'ribbon', aliases: ['ncb', 'quocdan'] },
  { color: '#00559c', motif: 'arcs', aliases: ['baovietbank', 'bvb', 'baoviet'] },
  { color: '#157b3e', motif: 'waves', aliases: ['saigonbank', 'sgicb', 'saigoncongthuong'] },
  { color: '#0f8b4c', motif: 'waves', aliases: ['vietbank', 'vietnamthuongtin'] },
  { color: '#1c7c54', motif: 'arcs', aliases: ['kienlongbank', 'klb', 'kienlong'] },
  { color: '#0a7ea4', motif: 'globe', aliases: ['pgbank', 'pgb', 'thinhvuongvaphattrien'] },
  { color: '#0b60a8', motif: 'mesh', aliases: ['gpbank', 'gpb', 'daududaukhitoancau'] },
  { color: '#0a5aa0', motif: 'mesh', aliases: ['cbbank', 'cbb', 'xaydung'] },
  { color: '#0b5ca8', motif: 'globe', aliases: ['vrb', 'vietnga', 'liendoanhvietnga'] },
  { color: '#00a04a', motif: 'orbs', aliases: ['bvbank', 'vccb', 'vietcapitalbank', 'banvietbank'] },
  { color: '#0e7a3c', motif: 'waves', aliases: ['coopbank', 'hoptacxa'] },
  { color: '#0b5fa5', motif: 'mesh', aliases: ['dongabank', 'dob', 'donga'] },
  { color: '#0046a8', motif: 'globe', aliases: ['shinhanbank', 'shinhan', 'svb'] },
  { color: '#0067ac', motif: 'globe', aliases: ['woori', 'wvn', 'wooribank'] },
  { color: '#db0011', motif: 'ribbon', aliases: ['hsbc'] },
  { color: '#0473ea', motif: 'globe', aliases: ['standardchartered', 'scvn'] },
  { color: '#005eb8', motif: 'globe', aliases: ['unitedoverseas', 'uob'] },
  { color: '#d2232a', motif: 'ribbon', aliases: ['publicbank', 'pbvn'] },
  { color: '#c8102e', motif: 'ribbon', aliases: ['cimb'] },
  { color: '#0b4ea2', motif: 'mesh', aliases: ['hongleong', 'hlbvn'] },
  { color: '#0a5b9e', motif: 'globe', aliases: ['indovinabank', 'ivb', 'indovina'] },
  { color: '#00a950', motif: 'orbs', aliases: ['kbank', 'kasikorn'] },
  { color: '#0a8a3f', motif: 'waves', aliases: ['nonghyup', 'nhb'] },
  { color: '#e8467c', motif: 'orbs', aliases: ['timo'] },
  { color: '#ec1a5e', motif: 'orbs', aliases: ['cake', 'cakebyvpbank'] },
  { color: '#f26522', motif: 'orbs', aliases: ['ubank'] },
];

/** Bỏ dấu, hạ chữ thường rồi bỏ mọi thứ không phải chữ/số: "MB Bank" → "mbbank". */
export const slugifyBankName = (raw: string): string => removeDiacritics(raw).replace(/[^a-z0-9]/g, '');

type BrandEntry = { color: string; motif: BankCardMotif };

const EXACT_LOOKUP: Map<string, BrandEntry> = new Map(
  BANK_BRANDS.flatMap(({ color, motif, aliases }) =>
    aliases.map((alias) => [alias, { color, motif }] as const),
  ),
);

// Chỉ alias đủ dài mới được dò kiểu "chứa trong": dùng cho trường hợp DB lưu cả tên đầy đủ
// ("Ngân hàng TMCP Ngoại thương Việt Nam") thay vì shortName. Alias ngắn (vd "mb", "scb")
// bị loại khỏi vòng này vì dễ khớp lẫn sang tên ngân hàng khác. Dài trước ngắn sau để tên
// cụ thể hơn luôn thắng.
const CONTAINS_LOOKUP: Array<readonly [string, BrandEntry]> = BANK_BRANDS.flatMap(
  ({ color, motif, aliases }) =>
    aliases.filter((alias) => alias.length >= 6).map((alias) => [alias, { color, motif }] as const),
).sort((a, b) => b[0].length - a[0].length);

const hexToRgb = (hex: string): [number, number, number] | null => {
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3 ? clean.replace(/./g, (char) => char + char) : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const rgbToHueSaturation = ([r, g, b]: [number, number, number]): { hue: number; saturation: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  if (delta === 0) return { hue: 210, saturation: 0 }; // xám: không có tông

  const lightness = (max + min) / 2;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, saturation };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hsl = (hue: number, saturation: number, lightness: number, alpha?: number) => {
  const h = Math.round(hue);
  const s = Math.round(saturation * 100);
  const l = Math.round(lightness);
  return alpha === undefined ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
};

const findBrand = (bankName: string): BrandEntry | null => {
  const slug = slugifyBankName(bankName);
  if (!slug) return null;

  const exact = EXACT_LOOKUP.get(slug);
  if (exact) return exact;

  return CONTAINS_LOOKUP.find(([alias]) => slug.includes(alias))?.[1] ?? null;
};

/**
 * Diện mạo mặt thẻ cho ngân hàng có tên `bankName`. Luôn trả về một bộ hợp lệ —
 * không nhận ra tên thì trả DEFAULT_BANK_CARD_THEME (`recognized: false`).
 */
export const getBankCardTheme = (bankName: string | null | undefined): BankCardTheme => {
  if (!bankName) return DEFAULT_BANK_CARD_THEME;

  const brand = findBrand(bankName);
  if (!brand) return DEFAULT_BANK_CARD_THEME;

  const rgb = hexToRgb(brand.color);
  if (!rgb) return DEFAULT_BANK_CARD_THEME;

  const { hue, saturation } = rgbToHueSaturation(rgb);
  if (saturation === 0) return DEFAULT_BANK_CARD_THEME;

  const cardSaturation = clamp(saturation, MIN_SATURATION, MAX_SATURATION);

  return {
    from: hsl(hue, cardSaturation, CARD_FROM_LIGHTNESS),
    to: hsl(hue, cardSaturation, CARD_TO_LIGHTNESS),
    glow: hsl(hue, Math.min(cardSaturation, 0.85), 68, 0.3),
    accent: hsl(hue, Math.min(cardSaturation, 0.8), 76),
    shadow: hsl(hue, cardSaturation * 0.6, 24, 0.26),
    motif: brand.motif,
    recognized: true,
  };
};
