export type ActiveTab = "settings" | "lessons";
export type ViewMode = "day" | "week" | "month";

export interface LocalAvailabilitySlot {
    id: number;
    dayOfWeek: number;
    startHour: number;
    startMinutes: number;
    durationMinutes: number;
    apiId: number;
    startTime: string;
    endTime: string;
    apiDayOfWeek: number;
}

export interface EditAvailabilityData {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface DragState {
    isDragging: boolean;
    dayIndex: number;
    isoDay: number;
    startMinutes: number;
    currentMinutes: number;
}

export interface ResizeState {
    isResizing: boolean;
    slot: LocalAvailabilitySlot;
    edge: "top" | "bottom";
    originalStartMinutes: number;
    originalEndMinutes: number;
    currentMinutes: number;
}

export interface GhostPreview {
    dayIndex: number;
    topPx: number;
    heightPx: number;
    startTime: string;
    endTime: string;
}

export interface ResizedStyle {
    topPx: number;
    heightPx: number;
    startTime: string;
    endTime: string;
}
