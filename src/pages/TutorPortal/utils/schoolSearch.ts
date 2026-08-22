// Tìm kiếm trường học cho ô "Trường học".
import { removeDiacritics } from '../../../utils/vietnameseText';
import type { School } from '../../../data/vnSchools';

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
