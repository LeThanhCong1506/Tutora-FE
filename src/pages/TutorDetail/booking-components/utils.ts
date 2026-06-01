import type { ScheduleSlot } from "./types";

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

/** Check if a slot fits within tutor's availability for that day — robust version handling contiguous blocks */
export const isSlotWithinAvailability = (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    availabilities: any[]
): boolean => {
    if (!availabilities || availabilities.length === 0) return true;

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;

    // Check every 30-minute interval within the requested slot
    for (let current = startMins; current < endMins; current += 30) {
        const chunkStart = current;
        const chunkEnd = current + 30;

        // Found at least one availability block that covers this 30-min chunk
        const isChunkCovered = availabilities.some((a) => {
            const aDay = a.dayofweek;
            if (aDay !== dayOfWeek) return false;

            const aStartStr = a.starttime;
            const aEndStr = a.endtime;
            if (!aStartStr || !aEndStr) return false;

            const [ash, asm] = aStartStr.split(":").map(Number);
            const [aeh, aem] = aEndStr.split(":").map(Number);
            const aStartMins = ash * 60 + (asm || 0);
            const aEndMins = aeh * 60 + (aem || 0);

            return chunkStart >= aStartMins && chunkEnd <= aEndMins;
        });

        if (!isChunkCovered) return false;
    }

    return true;
};

export const formatGrade = (grade?: string): string => {
    if (!grade) return "";
    return grade.toLowerCase().includes("lớp") ? grade : `Lớp ${grade}`;
};
