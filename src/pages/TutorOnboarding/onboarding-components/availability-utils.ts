import { DAY_COLUMNS, END_HOUR, HALF_HOUR_STEPS, START_HOUR, minutesOf, type HalfHourStep } from './constants';
import type { ComboSessionSlot, TutorAvailabilitySlot } from './types';

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const isRangeWithinAvailability = (
  dayOfWeek: number,
  startMinutes: number,
  durationMinutes: number,
  availability: TutorAvailabilitySlot[],
): boolean => {
  const endMinutes = startMinutes + durationMinutes;

  for (let current = startMinutes; current < endMinutes; current += 30) {
    const chunkEnd = current + 30;
    const covered = availability.some(
      (slot) =>
        slot.dayOfWeek === dayOfWeek && current >= toMinutes(slot.startTime) && chunkEnd <= toMinutes(slot.endTime),
    );
    if (!covered) return false;
  }

  return true;
};

export const isSessionWithinAvailability = (
  session: ComboSessionSlot,
  availability: TutorAvailabilitySlot[],
): boolean =>
  isRangeWithinAvailability(
    session.dayOfWeek,
    minutesOf(session.startHour, session.startMinute),
    session.durationHours * 60,
    availability,
  );

// Check 1 ô 30 phút (hour, minute) có nằm trong availability không.
export const isHalfHourAvailable = (
  dayOfWeek: number,
  hour: number,
  minute: number,
  availability: TutorAvailabilitySlot[],
) => isRangeWithinAvailability(dayOfWeek, minutesOf(hour, minute), 30, availability);

// Legacy — giữ cho ComboPreview check kiểu cũ. Mặc định 1 giờ tròn.
export const isHourFullyAvailable = (dayOfWeek: number, hour: number, availability: TutorAvailabilitySlot[]) =>
  isRangeWithinAvailability(dayOfWeek, hour * 60, 60, availability);

// Trả về các thời điểm bắt đầu (hour, minute) khả dụng cho 1 buổi tối thiểu 30 phút.
export const getAvailableStartTimes = (dayOfWeek: number, availability: TutorAvailabilitySlot[]): HalfHourStep[] =>
  HALF_HOUR_STEPS.filter(({ hour, minute }) =>
    isSessionWithinAvailability({ dayOfWeek, startHour: hour, startMinute: minute, durationHours: 0.5 }, availability),
  );

// Trả về các duration (giờ, bội của 0.5) hợp lệ cho start time đã chọn.
const DURATION_CANDIDATES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
export const getAvailableDurations = (
  dayOfWeek: number,
  startHour: number,
  startMinute: 0 | 30,
  availability: TutorAvailabilitySlot[],
) =>
  DURATION_CANDIDATES.filter((durationHours) => {
    const endTotalMinutes = minutesOf(startHour, startMinute) + durationHours * 60;
    if (endTotalMinutes > END_HOUR * 60) return false;
    return isSessionWithinAvailability({ dayOfWeek, startHour, startMinute, durationHours }, availability);
  });

export interface AvailabilityRange {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

// Gom các ô 30 phút rảnh thành khoảng liên tục theo từng ngày. Availability lưu dạng
// mảng phẳng mỗi ô 30 phút một phần tử, nên muốn hiển thị "07:00 – 09:00" cho người
// dùng thì phải gộp lại ở đây.
export const getAvailabilityRanges = (availability: TutorAvailabilitySlot[]): AvailabilityRange[] => {
  // day -> set các mốc startMinutes (mỗi mốc = 1 ô 30 phút đã chọn rảnh).
  const cellsByDay = new Map<number, Set<number>>();
  for (const slot of availability) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    let cells = cellsByDay.get(slot.dayOfWeek);
    if (!cells) {
      cells = new Set<number>();
      cellsByDay.set(slot.dayOfWeek, cells);
    }
    for (let cur = start; cur < end; cur += 30) cells.add(cur);
  }

  const ranges: AvailabilityRange[] = [];
  for (const [dayOfWeek, cells] of cellsByDay) {
    const sorted = [...cells].sort((a, b) => a - b);
    let rangeStart: number | null = null;
    let prev = Number.NEGATIVE_INFINITY;

    for (const cell of sorted) {
      if (cell !== prev + 30) {
        if (rangeStart !== null) ranges.push({ dayOfWeek, startMinutes: rangeStart, endMinutes: prev + 30 });
        rangeStart = cell;
      }
      prev = cell;
    }
    if (rangeStart !== null) ranges.push({ dayOfWeek, startMinutes: rangeStart, endMinutes: prev + 30 });
  }

  return ranges;
};

// Độ dài (phút) của từng khối rảnh liên tục. Dùng để suy ra giới hạn hợp lý cho
// "số giờ/buổi" và "số buổi/tuần".
export const getContiguousBlocksMinutes = (availability: TutorAvailabilitySlot[]): number[] =>
  getAvailabilityRanges(availability).map((range) => range.endMinutes - range.startMinutes);

// Số giờ tối đa cho 1 buổi = khối rảnh liên tục dài nhất trong 1 ngày (giờ).
// Một buổi học không thể dài hơn khoảng rảnh liên tục dài nhất tutor đã thiết lập.
export const getMaxSessionHours = (availability: TutorAvailabilitySlot[]): number => {
  const blocks = getContiguousBlocksMinutes(availability);
  if (blocks.length === 0) return 0;
  return Math.max(...blocks) / 60;
};

// Số buổi tối đa/tuần = tổng số buổi (mỗi buổi dài `hoursPerSession` giờ) có thể nhét
// vừa, không chồng lấn, vào tất cả các khối rảnh trong tuần. Với buổi cùng độ dài thì
// greedy theo từng khối là tối ưu, nên đây là giới hạn khả thi để bước tạo gói (B3) còn xếp được.
export const getMaxSessionsPerWeek = (availability: TutorAvailabilitySlot[], hoursPerSession: number): number => {
  if (!hoursPerSession || hoursPerSession <= 0) return 0;
  const sessionMinutes = hoursPerSession * 60;
  return getContiguousBlocksMinutes(availability).reduce(
    (sum, blockMinutes) => sum + Math.floor(blockMinutes / sessionMinutes),
    0,
  );
};

export const hasAvailabilityForDuration = (durationHours: number, availability: TutorAvailabilitySlot[]) => {
  const durationMinutes = durationHours * 60;
  for (const day of DAY_COLUMNS) {
    for (let startMinutes = START_HOUR * 60; startMinutes + durationMinutes <= END_HOUR * 60; startMinutes += 30) {
      if (isRangeWithinAvailability(day.dayOfWeek, startMinutes, durationMinutes, availability)) return true;
    }
  }
  return false;
};

const sessionsOverlap = (left: ComboSessionSlot, right: ComboSessionSlot) => {
  if (left.dayOfWeek !== right.dayOfWeek) return false;
  const leftStart = minutesOf(left.startHour, left.startMinute);
  const leftEnd = leftStart + left.durationHours * 60;
  const rightStart = minutesOf(right.startHour, right.startMinute);
  const rightEnd = rightStart + right.durationHours * 60;
  return leftStart < rightEnd && rightStart < leftEnd;
};

export const findFirstAvailableSession = (
  availability: TutorAvailabilitySlot[],
  selectedSessions: ComboSessionSlot[] = [],
  durationHours = 1,
): ComboSessionSlot | null => {
  for (const day of DAY_COLUMNS) {
    for (const { hour, minute } of getAvailableStartTimes(day.dayOfWeek, availability)) {
      const candidate: ComboSessionSlot = {
        dayOfWeek: day.dayOfWeek,
        startHour: hour,
        startMinute: minute,
        durationHours,
      };
      const endTotalMinutes = minutesOf(hour, minute) + durationHours * 60;
      if (endTotalMinutes > END_HOUR * 60) continue;
      if (!isSessionWithinAvailability(candidate, availability)) continue;
      if (!selectedSessions.some((session) => sessionsOverlap(session, candidate))) return candidate;
    }
  }
  return null;
};
