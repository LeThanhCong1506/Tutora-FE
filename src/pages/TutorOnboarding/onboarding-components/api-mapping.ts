// Pure mappers giữa shape onboarding (FE) và shape API (BE).
// Không gọi network — chỉ biến đổi dữ liệu. Side-effects nằm ở useOnboardingSync.

import { SUBJECTS, START_HOUR, END_HOUR, formatHourMinute, parseTime } from './constants';
import type { SubjectRecord, TutorAvailabilitySlot } from './types';
import type { FixedCombo } from '../../../types/combo.types';
import type { SubjectGradePriceItem, UpdatePricingData } from '../../../services/tutorProfile.service';
import type { AvailabilitySlot } from '../../../services/availability.service';
import type { CreateTutorPackageData, TutorPackageResponse } from '../../../services/tutorPackages.service';

// ── Grade key ⇄ id ──────────────────────────────────────────────
// FE dùng 'grade_10'; BE dùng GradeLevelId (1..12 = Lớp 1..12).
export const gradeKeyToId = (key: string): number => {
  const n = parseInt(key.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
export const gradeIdToKey = (id: number): string => `grade_${id}`;

const subjectNameById = (id: number): string => SUBJECTS.find((s) => s.id === id)?.name ?? '';

// Chuẩn hoá "HH:mm:ss" / "HH:mm" → "HH:mm".
export const normalizeHHmm = (t: string): string => t.slice(0, 5);

// ── Day-of-week: FE nội bộ (0=CN..6=T7, JS getDay) ⇄ BE (ISO 1=T2..7=CN) ──
// Chỉ Chủ nhật khác nhau (0 ↔ 7); T2–T7 (1–6) trùng nhau.
export const feDayToIso = (fe: number): number => (fe === 0 ? 7 : fe);
export const isoDayToFe = (iso: number): number => (iso === 7 ? 0 : iso);

// Cộng số phút vào (hour, minute) → "HH:mm".
const addMinutes = (hour: number, minute: number, add: number): string => {
  const total = hour * 60 + minute + add;
  return formatHourMinute(Math.floor(total / 60), (total % 60) as 0 | 30);
};

// ── Pricing (Step 1) ────────────────────────────────────────────
export const priceItemToRecord = (item: SubjectGradePriceItem): SubjectRecord => ({
  id: `price_${item.id}`,
  subjectId: item.subjectId,
  subjectName: item.subjectName || subjectNameById(item.subjectId),
  gradeLevel: gradeIdToKey(item.gradeLevelId),
  hourlyRate: item.pricePerHour,
  hoursPerSession: (item.durationMinutesPerSession || 60) / 60,
  sessionsPerWeek: item.sessionsPerWeek || 1,
});

export const recordToSubjectGradePricePayload = (r: Omit<SubjectRecord, 'id'>) => ({
  subjectId: r.subjectId,
  gradeLevelId: gradeKeyToId(r.gradeLevel),
  pricePerHour: r.hourlyRate,
  durationMinutesPerSession: Math.round(r.hoursPerSession * 60),
  sessionsPerWeek: r.sessionsPerWeek,
  currency: 'VND',
  isActive: true,
});

export const recordsToPricingPayload = (records: SubjectRecord[]): UpdatePricingData => ({
  subjectGradePrices: records.map(recordToSubjectGradePricePayload),
});

// ── Availability (Step 2) ───────────────────────────────────────
// Mỗi slot BE có thể là 1 dải dài (vd 18:00-20:00). Onboarding grid là ô 30 phút,
// id ô = `${dayOfWeek}-${hour}-${minute}` (khớp useOnboardingState). Tách dải → các ô 30'.
export const expandAvailabilityToCells = (slot: AvailabilitySlot): TutorAvailabilitySlot[] => {
  const start = parseTime(normalizeHHmm(slot.starttime));
  const end = parseTime(normalizeHHmm(slot.endtime));
  // Clamp về khung lưới [START_HOUR, END_HOUR) — bỏ phần ngoài giờ hiển thị (vd dữ liệu
  // cũ 00:00-24:00) để KHÔNG sinh ô ẩn mà gia sư không thể bỏ chọn trên lưới.
  const startMin = Math.max(start.hour * 60 + start.minute, START_HOUR * 60);
  const endMin = Math.min(end.hour * 60 + end.minute, END_HOUR * 60);
  const feDay = isoDayToFe(slot.dayofweek); // BE trả ISO 1-7 → FE 0-6
  const cells: TutorAvailabilitySlot[] = [];
  for (let m = startMin; m + 30 <= endMin; m += 30) {
    const hour = Math.floor(m / 60);
    const minute = (m % 60) as 0 | 30;
    cells.push({
      id: `${feDay}-${hour}-${minute}`,
      dayOfWeek: feDay,
      startTime: formatHourMinute(hour, minute),
      endTime: addMinutes(hour, minute, 30),
    });
  }
  return cells;
};

// Khoá tự nhiên để diff slot (ngày + giờ bắt đầu + giờ kết thúc).
export const availabilityKey = (dayOfWeek: number, startTime: string, endTime: string): string =>
  `${dayOfWeek}|${normalizeHHmm(startTime)}|${normalizeHHmm(endTime)}`;

// ── Packages / Combos (Step 3) ──────────────────────────────────
export const packageToFixedCombo = (pkg: TutorPackageResponse): FixedCombo => ({
  id: `pkg_${pkg.packageId}`,
  type: 'fixed',
  name: pkg.name,
  sessions: pkg.fixedSlots.map((s) => {
    const start = parseTime(normalizeHHmm(s.startTime));
    const end = parseTime(normalizeHHmm(s.endTime));
    const durationHours = (end.hour * 60 + end.minute - (start.hour * 60 + start.minute)) / 60;
    return {
      dayOfWeek: isoDayToFe(s.dayOfWeek), // BE ISO 1-7 → FE 0-6
      startHour: start.hour,
      startMinute: (start.minute as 0 | 30) || 0,
      durationHours,
    };
  }),
});

export const comboToPackagePayload = (combo: FixedCombo): CreateTutorPackageData => ({
  name: combo.name,
  packageType: 2,
  fixedSlots: combo.sessions.map((s) => ({
    dayOfWeek: feDayToIso(s.dayOfWeek), // FE 0-6 → BE ISO 1-7
    startTime: formatHourMinute(s.startHour, s.startMinute),
    endTime: addMinutes(s.startHour, s.startMinute, Math.round(s.durationHours * 60)),
  })),
});

export const DEFAULT_FLEXIBLE_PACKAGE: CreateTutorPackageData = {
  name: 'Gói linh hoạt',
  packageType: 1,
  fixedSlots: [],
};
