// Ranh giới UTC giữa FE và BE theo chuẩn đồng bộ thời gian:
//   • FE GỬI: thời điểm tuyệt đối → chuỗi UTC ISO-8601 (có hậu tố Z). Vd giờ VN
//     2026-06-16 10:00 → "2026-06-16T03:00:00.000Z".
//   • BE lưu/trả: UTC.
//   • FE HIỂN THỊ: parse UTC rồi format theo múi giờ THIẾT BỊ người dùng.
//
// LƯU Ý: chỉ dùng cho thời điểm tuyệt đối (booking slot cụ thể, lesson start/end…).
// Pattern lặp hằng tuần (dayofweek + "HH:mm" của lịch rảnh) GIỮ giờ local — KHÔNG
// đi qua các hàm này (đổi sang UTC sẽ làm lệch giờ/đổi cả thứ trong tuần).

// ===== GỬI: local → UTC ISO =====

/** Đổi 1 Date (đang ở giờ local) sang chuỗi UTC ISO-8601 (có Z) để gửi BE. */
export function toUtcIso(date: Date): string {
  return date.toISOString();
}

/**
 * Ghép ngày "YYYY-MM-DD" + giờ "HH:mm" (hiểu theo giờ LOCAL của người dùng) rồi đổi
 * sang UTC ISO. `new Date("YYYY-MM-DDTHH:mm:ss")` (không Z/offset) được parse theo local.
 */
export function localDateTimeToUtcIso(dateKey: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time; // "HH:mm" → "HH:mm:ss"
  return new Date(`${dateKey}T${normalizedTime}`).toISOString();
}

// ===== HIỂN THỊ: UTC (từ BE) → giờ thiết bị =====

/** Coi chuỗi là UTC: thêm 'Z' nếu chưa có offset/Z (phòng BE trả ISO "trần"). */
function ensureUtc(iso: string): string {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`;
}

/** Parse chuỗi UTC từ BE thành Date; null nếu rỗng/không hợp lệ. */
export function parseUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(ensureUtc(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "dd/MM/yyyy HH:mm" theo múi giờ thiết bị. */
export function formatLocalDateTime(iso: string | null | undefined, locale = 'vi-VN'): string {
  const d = parseUtc(iso);
  return d
    ? d.toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

/** "dd/MM/yyyy" theo múi giờ thiết bị. */
export function formatLocalDate(iso: string | null | undefined, locale = 'vi-VN'): string {
  const d = parseUtc(iso);
  return d ? d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/** "HH:mm" theo múi giờ thiết bị. */
export function formatLocalTime(iso: string | null | undefined, locale = 'vi-VN'): string {
  const d = parseUtc(iso);
  return d ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
}

// ===== Giờ-trong-ngày của lịch lặp tuần (dayofweek + "HH:mm") =====
// Chỉ dịch GIỜ trong ngày theo offset thiết bị, GIỮ NGUYÊN thứ (dayofweek). Đúng cho
// khung giờ không vượt mốc nửa đêm UTC (vd lưới 07:00–22:00 ở VN → 00:00–15:00 UTC).
// Dùng ở ranh giới service cho lịch rảnh + tóm tắt schedule[] của booking.

const pad2 = (n: number) => String(n).padStart(2, '0');

const timeOfDayToMinutes = (value: string): number | null => {
  const trimmed = value.trim();
  const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (hour === 12) hour = 0;
    if (twelveHour[3].toUpperCase() === 'PM') hour += 12;
    return hour * 60 + minute;
  }

  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!twentyFourHour) return null;

  const hour = Number(twentyFourHour[1]);
  const minute = Number(twentyFourHour[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

const minutesToHhmm = (min: number): string => {
  const wrapped = ((min % 1440) + 1440) % 1440; // gói trong [0, 1440)
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};

/** Giờ local "HH:mm" → giờ UTC "HH:mm" (gửi BE). Vd VN 07:00 → "00:00". */
export function localTimeOfDayToUtc(hhmm: string): string {
  // getTimezoneOffset() = (UTC − local) phút → UTC = local + offset.
  const minutes = timeOfDayToMinutes(hhmm);
  return minutes == null ? '' : minutesToHhmm(minutes + new Date().getTimezoneOffset());
}

/** Giờ UTC "HH:mm" hoặc "h:mm AM/PM" (từ BE) → giờ local "HH:mm". */
export function utcTimeOfDayToLocal(hhmm: string): string {
  const minutes = timeOfDayToMinutes(hhmm);
  return minutes == null ? '' : minutesToHhmm(minutes - new Date().getTimezoneOffset());
}
