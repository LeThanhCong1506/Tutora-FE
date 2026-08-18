// Pure mappers giữa shape onboarding (FE) và shape API (BE).
// Không gọi network — chỉ biến đổi dữ liệu. Side-effects nằm ở useOnboardingSync.

import { SUBJECTS, START_HOUR, END_HOUR, formatHourMinute, parseTime } from './constants';
import type { SubjectRecord, TutorAvailabilitySlot } from './types';
import type { FixedCombo } from '../../../types/combo.types';
import type { SubjectGradePriceItem, UpdatePricingData } from '../../../services/tutorProfile.service';
import type {
  AvailabilitySlot,
  CreateAvailabilityData,
  UpdateAvailabilityData,
} from '../../../services/availability.service';
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
// BE lưu phẳng theo từng (môn × lớp). FE gom các dòng có cùng môn, giá,
// thời lượng và số buổi thành một cấu hình nhiều lớp để gia sư thao tác gọn hơn.
export const priceItemsToRecords = (items: SubjectGradePriceItem[]): SubjectRecord[] => {
  const groups = new Map<
    string,
    {
      ids: number[];
      subjectId: number;
      subjectName: string;
      gradeLevels: Set<string>;
      hourlyRate: number;
      hoursPerSession: number;
      sessionsPerWeek: number;
    }
  >();

  items.forEach((item) => {
    const durationMinutes = item.durationMinutesPerSession || 60;
    const sessionsPerWeek = item.sessionsPerWeek || 1;
    const currency = item.currency || 'VND';
    const key = [
      item.subjectId,
      item.pricePerHour,
      durationMinutes,
      sessionsPerWeek,
      currency,
      item.isActive !== false,
    ].join('|');
    const current = groups.get(key);

    if (current) {
      current.ids.push(item.id);
      current.gradeLevels.add(gradeIdToKey(item.gradeLevelId));
      return;
    }

    groups.set(key, {
      ids: [item.id],
      subjectId: item.subjectId,
      subjectName: item.subjectName || subjectNameById(item.subjectId),
      gradeLevels: new Set([gradeIdToKey(item.gradeLevelId)]),
      hourlyRate: item.pricePerHour,
      hoursPerSession: durationMinutes / 60,
      sessionsPerWeek,
    });
  });

  return Array.from(groups.values()).map((group) => {
    const sortedIds = [...group.ids].sort((a, b) => a - b);
    const gradeLevels = Array.from(group.gradeLevels).sort((a, b) => gradeKeyToId(a) - gradeKeyToId(b));
    return {
      id: `prices_${sortedIds.join('_')}`,
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      gradeLevels,
      hourlyRate: group.hourlyRate,
      hoursPerSession: group.hoursPerSession,
      sessionsPerWeek: group.sessionsPerWeek,
    };
  });
};

export const recordToSubjectGradePricePayloads = (r: Omit<SubjectRecord, 'id'>) =>
  Array.from(new Set(r.gradeLevels))
    .sort((a, b) => gradeKeyToId(a) - gradeKeyToId(b))
    .map((gradeLevel) => ({
      subjectId: r.subjectId,
      gradeLevelId: gradeKeyToId(gradeLevel),
      pricePerHour: r.hourlyRate,
      durationMinutesPerSession: Math.round(r.hoursPerSession * 60),
      sessionsPerWeek: r.sessionsPerWeek,
      currency: 'VND',
      isActive: true,
    }));

export const recordsToPricingPayload = (records: SubjectRecord[]): UpdatePricingData => ({
  subjectGradePrices: records.flatMap(recordToSubjectGradePricePayloads),
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

// Gộp các ô 30' LIỀN KỀ trong cùng 1 ngày thành 1 CỤM (dải dài) để gửi 1 payload/cụm
// thay vì 1 payload/ô. Vd T2: 06:00-06:30, 06:30-07:00, … 09:30-10:00 → cụm 06:00-10:00.
// Các ô có khoảng trống ở giữa tách thành cụm riêng (vd 06:00-10:00 và 15:00-18:00 → 2 cụm).
// BE chấp nhận dải bất kỳ và khi đọc lại sẽ tách dải về các ô 30' (xem expandAvailabilityToCells).
export const mergeCellsToClusters = (cells: TutorAvailabilitySlot[]): TutorAvailabilitySlot[] => {
  const toMin = (t: string) => {
    const { hour, minute } = parseTime(normalizeHHmm(t));
    return hour * 60 + minute;
  };

  const byDay = new Map<number, TutorAvailabilitySlot[]>();
  for (const cell of cells) {
    const list = byDay.get(cell.dayOfWeek);
    if (list) list.push(cell);
    else byDay.set(cell.dayOfWeek, [cell]);
  }

  const clusters: TutorAvailabilitySlot[] = [];
  for (const [dayOfWeek, list] of byDay) {
    const sorted = [...list].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    let runStart = sorted[0].startTime;
    let runEnd = sorted[0].endTime;

    for (let i = 1; i < sorted.length; i++) {
      const cell = sorted[i];
      if (toMin(cell.startTime) <= toMin(runEnd)) {
        // Liền mạch (hoặc chồng lấn) → mở rộng cụm hiện tại.
        if (toMin(cell.endTime) > toMin(runEnd)) runEnd = cell.endTime;
      } else {
        // Có khoảng trống → chốt cụm hiện tại, bắt đầu cụm mới.
        clusters.push({ id: `${dayOfWeek}-${runStart}`, dayOfWeek, startTime: runStart, endTime: runEnd });
        runStart = cell.startTime;
        runEnd = cell.endTime;
      }
    }
    clusters.push({ id: `${dayOfWeek}-${runStart}`, dayOfWeek, startTime: runStart, endTime: runEnd });
  }

  return clusters;
};

const toMinutes = (t: string): number => {
  const { hour, minute } = parseTime(normalizeHHmm(t));
  return hour * 60 + minute;
};

export interface AvailabilityDiff {
  toCreate: CreateAvailabilityData[]; // POST  /bulk
  toUpdate: UpdateAvailabilityData[]; // PATCH /bulk (tái dùng id hiện có)
  toDelete: number[]; // DELETE /bulk (availabilityid)
}

/**
 * So sánh lịch rảnh mong muốn (các ô 30' đã chọn trên lưới) với lịch đang lưu ở BE,
 * rồi sinh ra 3 nhóm thao tác tối thiểu cho 3 endpoint bulk:
 *   - Gộp ô liền kề → cụm (mergeCellsToClusters), diff theo TỪNG NGÀY.
 *   - Cụm trùng khớp y hệt (start+end) → bỏ qua (no-op).
 *   - Phần còn lại ghép theo thứ tự để TÁI DÙNG id qua PATCH (giữ id + createdat,
 *     tránh xoá-tạo lại); dư mong muốn → POST; dư hiện có → DELETE.
 *
 * Caller PHẢI gọi theo thứ tự DELETE → PATCH → POST. Vì các cụm mong muốn không bao giờ
 * chồng nhau, thứ tự này không bao giờ kích hoạt guard "trùng giờ" của BE.
 */
export const diffAvailability = (
  desiredCells: TutorAvailabilitySlot[],
  loaded: AvailabilitySlot[],
): AvailabilityDiff => {
  const toCreate: CreateAvailabilityData[] = [];
  const toUpdate: UpdateAvailabilityData[] = [];
  const toDelete: number[] = [];

  // Mong muốn: gộp cụm rồi gom theo ngày (FE 0-6).
  const desiredByDay = new Map<number, { start: string; end: string }[]>();
  for (const c of mergeCellsToClusters(desiredCells)) {
    const list = desiredByDay.get(c.dayOfWeek) ?? [];
    list.push({ start: normalizeHHmm(c.startTime), end: normalizeHHmm(c.endTime) });
    desiredByDay.set(c.dayOfWeek, list);
  }

  // Hiện có: BE trả ISO 1-7 (giờ local) → convert về FE 0-6, gom theo ngày.
  const loadedByDay = new Map<number, { id: number; start: string; end: string }[]>();
  for (const s of loaded) {
    const feDay = isoDayToFe(s.dayofweek);
    const list = loadedByDay.get(feDay) ?? [];
    list.push({ id: s.availabilityid, start: normalizeHHmm(s.starttime), end: normalizeHHmm(s.endtime) });
    loadedByDay.set(feDay, list);
  }

  const days = new Set<number>([...desiredByDay.keys(), ...loadedByDay.keys()]);
  for (const day of days) {
    const isoDay = feDayToIso(day);
    const desired = [...(desiredByDay.get(day) ?? [])].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    const loadedRemaining = [...(loadedByDay.get(day) ?? [])].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    // 1) Loại các cụm trùng khớp y hệt — không cần đụng tới.
    const desiredRemaining: { start: string; end: string }[] = [];
    for (const d of desired) {
      const idx = loadedRemaining.findIndex((l) => l.start === d.start && l.end === d.end);
      if (idx >= 0) loadedRemaining.splice(idx, 1);
      else desiredRemaining.push(d);
    }

    // 2) Ghép phần còn lại theo vị trí → PATCH; phần dư → POST / DELETE.
    const pairCount = Math.min(desiredRemaining.length, loadedRemaining.length);
    for (let i = 0; i < pairCount; i++) {
      toUpdate.push({
        availabilityid: loadedRemaining[i].id,
        dayofweek: isoDay,
        starttime: desiredRemaining[i].start,
        endtime: desiredRemaining[i].end,
      });
    }
    for (let i = pairCount; i < desiredRemaining.length; i++) {
      toCreate.push({ dayofweek: isoDay, starttime: desiredRemaining[i].start, endtime: desiredRemaining[i].end });
    }
    for (let i = pairCount; i < loadedRemaining.length; i++) {
      toDelete.push(loadedRemaining[i].id);
    }
  }

  return { toCreate, toUpdate, toDelete };
};

// ── Packages / Combos (Step 3) ──────────────────────────────────
export const packageToFixedCombo = (pkg: TutorPackageResponse): FixedCombo => ({
  id: `pkg_${pkg.packageId}`,
  type: 'fixed',
  subjectId: pkg.subjectId ?? undefined,
  subjectName: pkg.subjectName ?? undefined,
  name: pkg.name,
  hasActiveBooking: pkg.hasActiveBooking,
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
  subjectId: combo.subjectId,
  packageType: 2,
  fixedSlots: combo.sessions.map((s) => ({
    dayOfWeek: feDayToIso(s.dayOfWeek), // FE 0-6 → BE ISO 1-7
    startTime: formatHourMinute(s.startHour, s.startMinute),
    endTime: addMinutes(s.startHour, s.startMinute, Math.round(s.durationHours * 60)),
  })),
});

export const DEFAULT_FLEXIBLE_PACKAGE: CreateTutorPackageData = {
  name: 'Gói linh hoạt',
  subjectId: null,
  packageType: 1,
  fixedSlots: [],
};
