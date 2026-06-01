import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { LONG_PRESS_DURATION, LONG_PRESS_MOVE_THRESHOLD, SNAP_MINUTES } from "../constants";
import { isoDayToApiDay, minutesToTimeStr, snapToGrid, translateScheduleMsg } from "../utils";
import type { ActiveTab, DragState, GhostPreview, ViewMode } from "../types";
import { createAvailability } from "../../../../services/availability.service";

interface UseDragToCreateArgs {
    activeTab: ActiveTab;
    viewMode: ViewMode;
    rowHeight: number;
    calendarBodyRef: React.RefObject<HTMLDivElement | null>;
    onCreated: () => void;
}

export function useDragToCreate({
    activeTab,
    viewMode,
    rowHeight,
    calendarBodyRef,
    onCreated,
}: UseDragToCreateArgs) {
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [isLongPressActive, setIsLongPressActive] = useState(false);

    const pxPerMinute = rowHeight / 60;

    const pixelToMinutes = useCallback((clientY: number): number => {
        if (!calendarBodyRef.current) return 0;
        const rect = calendarBodyRef.current.getBoundingClientRect();
        const scrollTop = calendarBodyRef.current.scrollTop;
        const relativeY = clientY - rect.top + scrollTop;
        const totalMinutes = (relativeY / rowHeight) * 60;
        return Math.max(0, Math.min(totalMinutes, 24 * 60));
    }, [rowHeight, calendarBodyRef]);

    const dragStateRef = useRef(dragState);
    dragStateRef.current = dragState;
    const pixelToMinutesRef = useRef(pixelToMinutes);
    pixelToMinutesRef.current = pixelToMinutes;
    const onCreatedRef = useRef(onCreated);
    onCreatedRef.current = onCreated;

    const handleCellMouseDown = useCallback((e: React.MouseEvent, dayIndex: number, isoDay: number) => {
        if (activeTab !== "settings" || viewMode === "month") return;
        if (e.button !== 0) return;
        if (window.innerWidth <= 768) return;
        e.preventDefault();

        const minutes = snapToGrid(pixelToMinutes(e.clientY));

        setDragState({
            isDragging: true,
            dayIndex,
            isoDay,
            startMinutes: minutes,
            currentMinutes: minutes + SNAP_MINUTES,
        });
    }, [activeTab, viewMode, pixelToMinutes]);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTouchStartRef = useRef<{ x: number; y: number; dayIndex: number; isoDay: number } | null>(null);

    const cancelLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        longPressTouchStartRef.current = null;
    }, []);

    const handleCellTouchStart = useCallback((e: React.TouchEvent, dayIndex: number, isoDay: number) => {
        if (activeTab !== "settings" || viewMode === "month") return;
        const touch = e.touches[0];
        if (!touch) return;

        longPressTouchStartRef.current = { x: touch.clientX, y: touch.clientY, dayIndex, isoDay };

        longPressTimerRef.current = setTimeout(() => {
            const touchData = longPressTouchStartRef.current;
            if (!touchData) return;

            if (navigator.vibrate) navigator.vibrate(50);

            setIsLongPressActive(true);
            const minutes = snapToGrid(pixelToMinutes(touch.clientY));
            setDragState({
                isDragging: true,
                dayIndex: touchData.dayIndex,
                isoDay: touchData.isoDay,
                startMinutes: minutes,
                currentMinutes: minutes + SNAP_MINUTES,
            });
            longPressTimerRef.current = null;
        }, LONG_PRESS_DURATION);
    }, [activeTab, viewMode, pixelToMinutes]);

    useEffect(() => {
        const handleTouchMoveCancel = (e: TouchEvent) => {
            if (!longPressTouchStartRef.current || !longPressTimerRef.current) return;
            const touch = e.touches[0];
            if (!touch) return;
            const dx = Math.abs(touch.clientX - longPressTouchStartRef.current.x);
            const dy = Math.abs(touch.clientY - longPressTouchStartRef.current.y);
            if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
                cancelLongPress();
            }
        };

        const handleTouchEndCancel = () => cancelLongPress();

        window.addEventListener("touchmove", handleTouchMoveCancel, { passive: true });
        window.addEventListener("touchend", handleTouchEndCancel);
        return () => {
            window.removeEventListener("touchmove", handleTouchMoveCancel);
            window.removeEventListener("touchend", handleTouchEndCancel);
        };
    }, [cancelLongPress]);

    useEffect(() => {
        if (!dragState?.isDragging) {
            setIsLongPressActive(false);
        }
    }, [dragState?.isDragging]);

    useEffect(() => {
        if (!dragState?.isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const minutes = snapToGrid(pixelToMinutesRef.current(e.clientY));
            setDragState(prev => prev ? { ...prev, currentMinutes: minutes } : null);
        };

        const handleMouseUp = async () => {
            const ds = dragStateRef.current;
            if (!ds) return;

            const startMin = Math.min(ds.startMinutes, ds.currentMinutes);
            const endMin = Math.max(ds.startMinutes, ds.currentMinutes);

            if (endMin - startMin < SNAP_MINUTES) {
                setDragState(null);
                return;
            }

            try {
                const apiDay = isoDayToApiDay(ds.isoDay);
                await createAvailability({
                    dayofweek: apiDay,
                    starttime: minutesToTimeStr(startMin),
                    endtime: minutesToTimeStr(endMin),
                });
                toast.success(`Đã thêm lịch rảnh ${minutesToTimeStr(startMin)} - ${minutesToTimeStr(endMin)}`);
                onCreatedRef.current();
            } catch (error: unknown) {
                const err = error as { response?: { data?: { message?: string } } };
                const msg = err?.response?.data?.message || "";
                toast.error(translateScheduleMsg(msg, "Không thể thêm lịch rảnh"));
            } finally {
                setDragState(null);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (!touch) return;
            const minutes = snapToGrid(pixelToMinutesRef.current(touch.clientY));
            setDragState(prev => prev ? { ...prev, currentMinutes: minutes } : null);
        };

        const handleTouchEnd = () => handleMouseUp();

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [dragState?.isDragging]);

    const ghostPreview: GhostPreview | null = useMemo(() => {
        if (!dragState?.isDragging) return null;
        const startMin = Math.min(dragState.startMinutes, dragState.currentMinutes);
        const endMin = Math.max(dragState.startMinutes, dragState.currentMinutes);
        const duration = endMin - startMin;
        if (duration < SNAP_MINUTES) return null;
        return {
            dayIndex: dragState.dayIndex,
            topPx: startMin * pxPerMinute,
            heightPx: duration * pxPerMinute,
            startTime: minutesToTimeStr(startMin),
            endTime: minutesToTimeStr(endMin),
        };
    }, [dragState, pxPerMinute]);

    return {
        dragState,
        isLongPressActive,
        ghostPreview,
        handleCellMouseDown,
        handleCellTouchStart,
    };
}
