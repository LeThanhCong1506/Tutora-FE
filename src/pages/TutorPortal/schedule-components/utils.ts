import dayjs, { Dayjs } from "dayjs";
import { SNAP_MINUTES } from "./constants";

export const translateScheduleMsg = (msg: string, fallback: string): string => {
    if (!msg) return fallback;
    if (/time slot overlaps/i.test(msg)) {
        const match = msg.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        return match
            ? `Khung giờ bị trùng với lịch hiện có: ${match[1]} - ${match[2]}`
            : "Khung giờ bị trùng với lịch rảnh hiện có";
    }
    if (/start time must be before/i.test(msg)) return "Giờ bắt đầu phải trước giờ kết thúc";
    if (/invalid time/i.test(msg)) return "Thời gian không hợp lệ";
    if (/already exists/i.test(msg)) return "Lịch rảnh này đã tồn tại";
    if (/not found/i.test(msg)) return "Không tìm thấy lịch rảnh";
    return msg;
};

export const apiDayToIsoDay = (apiDay: number): number => {
    if (apiDay === 0) return 7;
    return apiDay;
};

export const isoDayToApiDay = (isoDay: number): number => {
    if (isoDay === 7) return 0;
    return isoDay;
};

export const parseTimeToHour = (timeStr: string): number => {
    const [hours] = timeStr.split(":").map(Number);
    return hours;
};

export const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
};

export const calculateDurationMinutes = (startTime: string, endTime: string): number => {
    return parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
};

export const minutesToTimeStr = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export const snapToGrid = (minutes: number): number => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
};

export const isToday = (date: Dayjs): boolean => {
    return date.isSame(dayjs(), "day");
};

export const getLessonStatusInfo = (status: string | null): { label: string; color: string } => {
    switch (status) {
        case "scheduled": return { label: "Đã lên lịch", color: "#1890ff" };
        case "in_progress": return { label: "Đang học", color: "#52c41a" };
        case "pending_confirmation": return { label: "Chờ xác nhận", color: "#722ed1" };
        case "completed": return { label: "Hoàn thành", color: "#52c41a" };
        case "cancelled": return { label: "Đã hủy", color: "#999" };
        case "no_show": return { label: "Vắng mặt", color: "#ff4d4f" };
        default: return { label: status || "N/A", color: "#999" };
    }
};

export const formatTotalHoursLabel = (totalMinutes: number): string => {
    const totalHours = Math.floor(totalMinutes / 60);
    const remainMins = totalMinutes % 60;
    if (totalHours > 0) {
        return remainMins > 0 ? `${totalHours}h${remainMins}` : `${totalHours}h`;
    }
    return remainMins > 0 ? `${remainMins}m` : "";
};
