import type { Subject } from "./types";
import { OnlineIcon, OfflineIcon, HybridIcon } from "./icons";

export const SUBJECT_MAPPING: Subject[] = [
    { id: 1, name: "Toán" },
    { id: 2, name: "Tiếng Anh" },
    { id: 3, name: "Vật Lý" },
    { id: 4, name: "Hóa Học" },
    { id: 5, name: "Ngữ Văn" },
    { id: 6, name: "Sinh Học" },
    { id: 7, name: "Lịch Sử" },
    { id: 8, name: "Địa Lý" },
    { id: 9, name: "Tin Học" },
    { id: 10, name: "IELTS" },
];

export const TEACHING_MODES = [
    { key: "online" as const, label: "Online", icon: <OnlineIcon />, desc: "Học qua video call" },
    { key: "offline" as const, label: "Tại nhà", icon: <OfflineIcon />, desc: "Gia sư đến tận nơi" },
    { key: "hybrid" as const, label: "Linh hoạt", icon: <HybridIcon />, desc: "Kết hợp online & offline" },
];

// Bội của 30 phút (0.5h). Mentor feedback #7: cần hỗ trợ slot 30 phút.
export const DURATION_OPTIONS = [
    { value: 0.5, label: "30 phút" },
    { value: 1, label: "1 giờ" },
    { value: 1.5, label: "1.5 giờ" },
    { value: 2, label: "2 giờ" },
    { value: 2.5, label: "2.5 giờ" },
    { value: 3, label: "3 giờ" },
];

export const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2).toString().padStart(2, "0");
    const minutes = i % 2 === 0 ? "00" : "30";
    return `${hours}:${minutes}`;
});

export const STEPS = [
    { key: "student", label: "Học sinh & Môn" },
    { key: "bookingMode", label: "Cách đặt" },
    { key: "schedule", label: "Lịch học" },
    { key: "review", label: "Xác nhận" },
];
