// Danh sách môn (trước nằm inline trong ProfileHeroModal). Dùng chung cho B1.
export const SUBJECTS = [
  { id: 1, name: 'Toán' },
  { id: 2, name: 'Tiếng Anh' },
  { id: 3, name: 'Vật Lý' },
  { id: 4, name: 'Hóa Học' },
  { id: 5, name: 'Ngữ Văn' },
  { id: 6, name: 'Sinh Học' },
  { id: 7, name: 'Lịch Sử' },
  { id: 8, name: 'Địa Lý' },
  { id: 9, name: 'Tin Học' },
  { id: 10, name: 'IELTS' },
];

// Khối lớp — dùng ở B1 để gán mỗi record (môn × khối × giá).
export const GRADE_LEVELS = [
  { value: 'grade_1', label: 'Lớp 1' },
  { value: 'grade_2', label: 'Lớp 2' },
  { value: 'grade_3', label: 'Lớp 3' },
  { value: 'grade_4', label: 'Lớp 4' },
  { value: 'grade_5', label: 'Lớp 5' },
  { value: 'grade_6', label: 'Lớp 6' },
  { value: 'grade_7', label: 'Lớp 7' },
  { value: 'grade_8', label: 'Lớp 8' },
  { value: 'grade_9', label: 'Lớp 9' },
  { value: 'grade_10', label: 'Lớp 10' },
  { value: 'grade_11', label: 'Lớp 11' },
  { value: 'grade_12', label: 'Lớp 12' },
];

// Cột ngày trong lưới. dayOfWeek theo format BE (0=CN..6=T7), hiển thị T2 trước.
export const DAY_COLUMNS = [
  { dayOfWeek: 1, label: 'T2', full: 'Thứ 2' },
  { dayOfWeek: 2, label: 'T3', full: 'Thứ 3' },
  { dayOfWeek: 3, label: 'T4', full: 'Thứ 4' },
  { dayOfWeek: 4, label: 'T5', full: 'Thứ 5' },
  { dayOfWeek: 5, label: 'T6', full: 'Thứ 6' },
  { dayOfWeek: 6, label: 'T7', full: 'Thứ 7' },
  { dayOfWeek: 0, label: 'CN', full: 'Chủ Nhật' },
];

// Khung giờ lưới: 06:00 → 22:00. Block bắt đầu ở 06:00..21:30 (mỗi ô 30 phút).
export const START_HOUR = 6;
export const END_HOUR = 22;

// Giờ tròn — giữ cho code legacy chưa migrate.
export const HOURS: number[] = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Mốc 30 phút — dùng cho grid availability và combo session.
export interface HalfHourStep {
  hour: number;
  minute: 0 | 30;
}
export const HALF_HOUR_STEPS: HalfHourStep[] = HOURS.flatMap((hour) => [
  { hour, minute: 0 as const },
  { hour, minute: 30 as const },
]);

// Quy đổi (giờ, phút) → số phút trong ngày. Dùng cho overlap math.
export const minutesOf = (hour: number, minute: number) => hour * 60 + minute;

const pad = (n: number) => n.toString().padStart(2, '0');

export const formatHourBlock = (hour: number) => `${pad(hour)}:00 - ${pad(hour + 1)}:00`;

// Format giờ tròn. Giữ chữ ký 1 tham số để không phá call site cũ.
export const formatHour = (hour: number) => `${pad(hour)}:00`;

// Format theo "HH:mm". Dùng cho slot 30 phút.
export const formatHourMinute = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

// Parse "HH:mm" → { hour, minute }. Helper khi đọc startTime/endTime từ TutorAvailabilitySlot.
export const parseTime = (time: string): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m || 0 };
};

export const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

// Số giờ/buổi → chuỗi hiển thị. Vd 1 → "1 giờ", 1.5 → "1h30", 0.5 → "30 phút".
export const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h}h${m}`;
};
