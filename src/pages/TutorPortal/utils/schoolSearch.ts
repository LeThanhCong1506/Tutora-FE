// Tìm kiếm trường học cho ô "Trình độ học vấn".
//
// Ô này chứa CẢ bằng cấp, chuyên ngành và tên trường trong một chuỗi
// ("Cử nhân Sư phạm Toán - Đại học Sư phạm Hà Nội"), nên không thể đem nguyên
// chuỗi đi so với tên trường. Ta tách ra "đoạn đang gõ" — phần sau dấu gạch cuối
// cùng — rồi chỉ tìm và chỉ thay thế đúng đoạn đó.
import { removeDiacritics } from '../../../utils/vietnameseText';
import type { School } from '../../../data/vnSchools';

/** Dấu ngăn giữa "bằng cấp + chuyên ngành" và "tên trường". */
const SEPARATOR = ' - ';

export interface ActiveSegment {
  /** Phần đứng trước đoạn đang gõ, giữ nguyên khi chọn gợi ý (kèm cả dấu ngăn). */
  prefix: string;
  /** Đoạn đang gõ — dùng để tìm kiếm và sẽ bị thay bằng tên trường được chọn. */
  query: string;
}

/**
 * Tách giá trị ô thành (phần giữ nguyên, đoạn đang gõ).
 * "Cử nhân Toán - su pham" → prefix "Cử nhân Toán - ", query "su pham".
 * "su pham"                → prefix "",               query "su pham".
 */
export function splitActiveSegment(value: string): ActiveSegment {
  const at = value.lastIndexOf(SEPARATOR);
  if (at === -1) return { prefix: '', query: value.trimStart() };
  return {
    prefix: value.slice(0, at + SEPARATOR.length),
    query: value.slice(at + SEPARATOR.length).trimStart(),
  };
}

/** Ghép lại giá trị ô sau khi người dùng chọn một trường từ danh sách. */
export function applySchoolToValue(value: string, schoolName: string): string {
  return splitActiveSegment(value).prefix + schoolName;
}

/**
 * Điểm khớp — càng NHỎ càng đúng ý người gõ. `null` = không khớp.
 *
 * Thứ tự ưu tiên có chủ đích: gõ "HUST" phải ra Bách khoa Hà Nội ngay đầu, chứ không
 * bị chìm dưới những trường chỉ tình cờ chứa chuỗi đó ở giữa tên.
 */
function scoreSchool(school: School, normalizedQuery: string): number | null {
  const abbr = school.abbr.toLowerCase();
  if (abbr && abbr === normalizedQuery) return 0; // trùng khít viết tắt
  if (abbr && abbr.startsWith(normalizedQuery)) return 1;

  const name = removeDiacritics(school.name);
  if (name.startsWith(normalizedQuery)) return 2;

  // Khớp đầu một TỪ trong tên: "su pham" khớp "truong dai hoc su pham ha noi".
  if (name.includes(` ${normalizedQuery}`)) return 3;

  // Mọi từ trong câu truy vấn đều xuất hiện đâu đó — gõ thiếu/đảo thứ tự vẫn ra.
  const words = normalizedQuery.split(' ').filter(Boolean);
  if (words.length > 1 && words.every((w) => name.includes(w))) return 4;

  if (name.includes(normalizedQuery)) return 5;
  return null;
}

/**
 * Lọc danh sách trường theo đoạn đang gõ.
 * Câu truy vấn rỗng → trả về đầu danh sách (người dùng bấm vào ô là thấy list ngay).
 */
export function searchSchools(schools: readonly School[], query: string, limit = 50): School[] {
  const normalized = removeDiacritics(query);
  if (!normalized) return schools.slice(0, limit);

  const scored: { school: School; score: number }[] = [];
  for (const school of schools) {
    const score = scoreSchool(school, normalized);
    if (score !== null) scored.push({ school, score });
  }

  scored.sort((a, b) => a.score - b.score || a.school.name.localeCompare(b.school.name, 'vi'));
  return scored.slice(0, limit).map((s) => s.school);
}
