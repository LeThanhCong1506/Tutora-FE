import type { ScheduleSlot, WeeklySlot, BookingSlot, WeeklyPatternSlot } from "./types";
import type { AvailabilitySlot } from "../../../services/tutorDetail.service";
import type { FixedCombo } from "../../../types/combo.types";

export const formatPrice = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export const addHoursToTime = (time: string, hours: number): string => {
    const [h, m] = time.split(":").map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

/** Tính tổng giờ từ schedule — giống backend: totalHours = sum(endTime - startTime) × 4 weeks */
export const calcTotalHoursFromSchedule = (schedule: ScheduleSlot[]): number => {
    let totalHours = 0;
    for (const slot of schedule) {
        const [sh, sm] = slot.startTime.split(":").map(Number);
        const [eh, em] = slot.endTime.split(":").map(Number);
        const duration = (eh * 60 + em - sh * 60 - sm) / 60;
        totalHours += duration * 4; // 4 weeks per month
    }
    return totalHours;
};

export const formatGrade = (grade?: string): string => {
    if (!grade) return "";
    return grade.toLowerCase().includes("lớp") ? grade : `Lớp ${grade}`;
};

export const normalizeGradeToken = (value?: string | null): string => {
    const normalized = (value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const gradeNumber = normalized.match(/\d+/)?.[0];
    return gradeNumber ?? normalized.replace(/[^a-z0-9]/g, "");
};

/**
 * Chuẩn hoá field mảng-chuỗi từ BE (vd gradeLevels, tags) về string[].
 * BE đôi khi trả về mảng thật, đôi khi trả chuỗi JSON ('["grade_10"]') hoặc CSV
 * ("grade_10,grade_11"). Trả [] cho mọi giá trị không hợp lệ để tránh .map crash.
 */
export const parseStringArray = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
        } catch {
            // Không phải JSON — fallback sang tách CSV bên dưới.
        }
        return trimmed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
};

// ─── Date / schedule helpers (ported from ParentBookingDemo) ───
const pad2 = (n: number) => String(n).padStart(2, "0");

export const addDays = (date: Date, n: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + n);
    return next;
};

// Thứ 2 của tuần chứa date (neo lưới calendar theo tuần).
export const mondayOf = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7));

export const getEndOfNextMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 2, 0);

// Hết hạn booking = đúng ngày này tháng sau (bao gồm); clamp khi tháng sau không có ngày đó.
export const getBookingValidityEnd = (startDate: Date): Date => {
    const nextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    nextMonth.setDate(Math.min(startDate.getDate(), lastDay));
    return nextMonth;
};

export const toDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const fromDateKey = (dateKey: string): Date => new Date(`${dateKey}T00:00:00`);

export const formatFullDate = (date: Date): string =>
    date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatShortDate = (date: Date): string =>
    date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

// Số giờ/buổi → chuỗi hiển thị. 1.5 → "1h30", 1 → "1 giờ", 0.5 → "30 phút".
export const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} phút`;
    return m === 0 ? `${h} giờ` : `${h}h${pad2(m)}`;
};

export const normalizeTimeToHHmm = (time: string): string => {
    const trimmed = (time || "").trim();
    const amPm = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (amPm) {
        let hour = Number(amPm[1]);
        const minute = Number(amPm[2]);
        const suffix = amPm[3].toUpperCase();
        if (suffix === "AM" && hour === 12) hour = 0;
        if (suffix === "PM" && hour !== 12) hour += 12;
        return `${pad2(hour)}:${pad2(minute)}`;
    }

    const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHour) {
        return `${pad2(Number(twentyFourHour[1]))}:${pad2(Number(twentyFourHour[2]))}`;
    }

    return "";
};

export const timeToMinutes = (time: string): number => {
    const normalized = normalizeTimeToHHmm(time);
    if (!normalized) return NaN;
    const [h, m] = normalized.split(":").map(Number);
    return h * 60 + m;
};

export const minutesToTime = (mins: number): string => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

// 1 khung [startTime, +durationHours] có phủ ô 30' bắt đầu tại cellMin (phút) không.
export const slotCoversCell = (startTime: string, durationHours: number, cellMin: number): boolean =>
    timeToMinutes(startTime) <= cellMin && cellMin < timeToMinutes(startTime) + durationHours * 60;

// 2 khoảng [startMin, +durHours] có chồng nhau không.
export const rangesOverlap = (startMinA: number, durA: number, startMinB: number, durB: number): boolean =>
    startMinA < startMinB + durB * 60 && startMinB < startMinA + durA * 60;

const getSlotKey = (slot: Pick<BookingSlot, "date" | "startTime">) => `${slot.date}-${slot.startTime}`;

export const sortSlots = (slots: BookingSlot[]): BookingSlot[] =>
    [...slots].sort((a, b) => getSlotKey(a).localeCompare(getSlotKey(b)));

// Quy ước demo 1=T2..7=CN; backend/JS getDay 0=CN..6=T7 → CN(0) thành 7.
export const toDemoWeekday = (jsDay: number): number => (jsDay === 0 ? 7 : jsDay);

// Buổi [startTime, +durationHours] có được phủ kín bởi lịch rảnh liền mạch của ngày đó không.
export const sessionFitsAvailability = (
    dayOfWeek: number,
    startTime: string,
    durationHours: number,
    availability: WeeklySlot[],
): boolean => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + Math.round(durationHours * 60);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) return false;

    const intervals = availability
        .filter((slot) => slot.dayOfWeek === dayOfWeek && slot.available !== false)
        .map((slot) => {
            const slotStart = timeToMinutes(slot.startTime);
            return {
                start: slotStart,
                end: slotStart + Math.round(slot.durationHours * 60),
            };
        })
        .filter((slot) => Number.isFinite(slot.start) && Number.isFinite(slot.end) && slot.end > slot.start)
        .sort((a, b) => a.start - b.start);

    let coveredUntil = startMin;
    for (const slot of intervals) {
        if (slot.end <= coveredUntil) continue;
        if (slot.start > coveredUntil) return false;
        coveredUntil = Math.max(coveredUntil, slot.end);
        if (coveredUntil >= endMin) return true;
    }

    return false;
};

// Lặp pattern tuần từ startDate đến hết cửa sổ 1 tháng (bao gồm ngày cuối).
export const buildScheduleFromPattern = (pattern: WeeklyPatternSlot[], startDate: Date): BookingSlot[] => {
    if (!pattern.length) return [];
    const windowEnd = getBookingValidityEnd(startDate);
    const slots: BookingSlot[] = [];
    for (let day = new Date(startDate); day <= windowEnd; day = addDays(day, 1)) {
        const demoDow = toDemoWeekday(day.getDay());
        pattern
            .filter((slot) => slot.dayOfWeek === demoDow)
            .forEach((slot) =>
                slots.push({
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    durationHours: slot.durationHours,
                    date: toDateKey(day),
                }),
            );
    }
    return sortSlots(slots);
};

// Combo cố định → pattern tuần (startHour/startMinute → "HH:mm", dayOfWeek → quy ước demo).
export const comboToWeeklyPattern = (combo: FixedCombo): WeeklyPatternSlot[] =>
    combo.sessions.map((s) => ({
        dayOfWeek: toDemoWeekday(s.dayOfWeek),
        startTime: `${pad2(s.startHour)}:${pad2(s.startMinute)}`,
        durationHours: s.durationHours,
    }));

// ─── Adapters: dữ liệu thật → view model của demo ───
// AvailabilitySlot (BE: dayofweek ISO 1=T2..7=CN, starttime/endtime "HH:mm[:ss]" or "h:mm AM/PM")
// → WeeklySlot[] (demo 1..7).
export const toCalendarAvailability = (availabilities: AvailabilitySlot[]): WeeklySlot[] =>
    (availabilities ?? [])
        .filter((a) => a.starttime && a.endtime)
        .map((a) => {
            const startTime = normalizeTimeToHHmm(a.starttime);
            const endTime = normalizeTimeToHHmm(a.endtime);
            return {
                dayOfWeek: toDemoWeekday(a.dayofweek),
                startTime,
                durationHours: (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60,
                available: true,
            };
        })
        .filter((s) => s.durationHours > 0);

// Tên đầy đủ → viết tắt 2 chữ cuối. "Nguyễn Gia Hân" → "GH".
export const studentInitials = (fullName: string): string => {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};
