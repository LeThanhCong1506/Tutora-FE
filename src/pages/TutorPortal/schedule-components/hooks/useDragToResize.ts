import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { SNAP_MINUTES } from "../constants";
import { minutesToTimeStr, parseTimeToMinutes, snapToGrid, translateScheduleMsg } from "../utils";
import type { LocalAvailabilitySlot, ResizeState, ResizedStyle } from "../types";
import { updateAvailability } from "../../../../services/availability.service";

interface UseDragToResizeArgs {
    rowHeight: number;
    calendarBodyRef: React.RefObject<HTMLDivElement | null>;
    onResized: () => void;
}

export function useDragToResize({
    rowHeight,
    calendarBodyRef,
    onResized,
}: UseDragToResizeArgs) {
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);

    const pxPerMinute = rowHeight / 60;

    const pixelToMinutes = useCallback((clientY: number): number => {
        if (!calendarBodyRef.current) return 0;
        const rect = calendarBodyRef.current.getBoundingClientRect();
        const scrollTop = calendarBodyRef.current.scrollTop;
        const relativeY = clientY - rect.top + scrollTop;
        const totalMinutes = (relativeY / rowHeight) * 60;
        return Math.max(0, Math.min(totalMinutes, 24 * 60));
    }, [rowHeight, calendarBodyRef]);

    const resizeStateRef = useRef(resizeState);
    resizeStateRef.current = resizeState;
    const pixelToMinutesRef = useRef(pixelToMinutes);
    pixelToMinutesRef.current = pixelToMinutes;
    const onResizedRef = useRef(onResized);
    onResizedRef.current = onResized;

    const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, slot: LocalAvailabilitySlot, edge: "top" | "bottom") => {
        e.preventDefault();
        e.stopPropagation();
        const startMin = parseTimeToMinutes(slot.startTime);
        const endMin = parseTimeToMinutes(slot.endTime);
        setResizeState({
            isResizing: true,
            slot,
            edge,
            originalStartMinutes: startMin,
            originalEndMinutes: endMin,
            currentMinutes: edge === "top" ? startMin : endMin,
        });
    }, []);

    useEffect(() => {
        if (!resizeState?.isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const minutes = snapToGrid(pixelToMinutesRef.current(e.clientY));
            setResizeState(prev => prev ? { ...prev, currentMinutes: minutes } : null);
        };

        const handleMouseUp = async () => {
            const rs = resizeStateRef.current;
            if (!rs) return;

            let newStart = rs.originalStartMinutes;
            let newEnd = rs.originalEndMinutes;

            if (rs.edge === "top") {
                newStart = Math.min(rs.currentMinutes, newEnd - SNAP_MINUTES);
            } else {
                newEnd = Math.max(rs.currentMinutes, newStart + SNAP_MINUTES);
            }

            newStart = Math.max(0, newStart);
            newEnd = Math.min(24 * 60, newEnd);

            if (newEnd - newStart < SNAP_MINUTES) {
                setResizeState(null);
                return;
            }

            try {
                await updateAvailability(rs.slot.apiId, {
                    dayofweek: rs.slot.apiDayOfWeek,
                    starttime: minutesToTimeStr(newStart),
                    endtime: minutesToTimeStr(newEnd),
                });
                toast.success("Đã cập nhật lịch rảnh");
                onResizedRef.current();
            } catch (error: unknown) {
                const err = error as { response?: { data?: { message?: string } } };
                const msg = err?.response?.data?.message || "";
                toast.error(translateScheduleMsg(msg, "Không thể cập nhật lịch rảnh"));
            } finally {
                setResizeState(null);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (!touch) return;
            const minutes = snapToGrid(pixelToMinutesRef.current(touch.clientY));
            setResizeState(prev => prev ? { ...prev, currentMinutes: minutes } : null);
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
    }, [resizeState?.isResizing]);

    const getResizedSlotStyle = useCallback((slot: LocalAvailabilitySlot): ResizedStyle | null => {
        if (!resizeState?.isResizing || resizeState.slot.apiId !== slot.apiId) return null;

        let startMin = resizeState.originalStartMinutes;
        let endMin = resizeState.originalEndMinutes;

        if (resizeState.edge === "top") {
            startMin = Math.min(resizeState.currentMinutes, endMin - SNAP_MINUTES);
        } else {
            endMin = Math.max(resizeState.currentMinutes, startMin + SNAP_MINUTES);
        }

        startMin = Math.max(0, startMin);
        endMin = Math.min(24 * 60, endMin);

        return {
            topPx: startMin * pxPerMinute,
            heightPx: (endMin - startMin) * pxPerMinute,
            startTime: minutesToTimeStr(startMin),
            endTime: minutesToTimeStr(endMin),
        };
    }, [resizeState, pxPerMinute]);

    return {
        resizeState,
        handleResizeStart,
        getResizedSlotStyle,
    };
}
