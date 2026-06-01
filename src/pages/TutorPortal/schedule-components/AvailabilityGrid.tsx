import React from "react";
import type { Dayjs } from "dayjs";
import { Popconfirm, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { DAYS_OF_WEEK, TIME_SLOTS } from "./constants";
import { isToday } from "./utils";
import type { DragState, GhostPreview, LocalAvailabilitySlot, ResizedStyle, ViewMode } from "./types";
import { DAY_OF_WEEK_MAP } from "../../../services/availability.service";

interface Props {
    viewMode: ViewMode;
    displayDates: Dayjs[];
    rowHeight: number;
    pxPerMinute: number;
    calendarBodyRef: React.RefObject<HTMLDivElement | null>;
    dragState: DragState | null;
    ghostPreview: GhostPreview | null;
    isLongPressActive: boolean;
    tappedSlotId: number | null;
    tapPosition: { x: number; y: number };
    deletingSlotId: number | null;
    getAvailabilityStartingAtHour: (date: Dayjs, hour: number) => LocalAvailabilitySlot | null;
    getResizedSlotStyle: (slot: LocalAvailabilitySlot) => ResizedStyle | null;
    onCellMouseDown: (e: React.MouseEvent, dayIndex: number, isoDay: number) => void;
    onCellTouchStart: (e: React.TouchEvent, dayIndex: number, isoDay: number) => void;
    onResizeStart: (e: React.MouseEvent | React.TouchEvent, slot: LocalAvailabilitySlot, edge: "top" | "bottom") => void;
    onTapSlot: (slotId: number, x: number, y: number) => void;
    onEditAvailability: (slot: LocalAvailabilitySlot) => void;
    onDeleteAvailability: (slot: LocalAvailabilitySlot) => void;
}

const AvailabilityGrid: React.FC<Props> = ({
    viewMode,
    displayDates,
    rowHeight,
    pxPerMinute,
    calendarBodyRef,
    dragState,
    ghostPreview,
    isLongPressActive,
    tappedSlotId,
    tapPosition,
    deletingSlotId,
    getAvailabilityStartingAtHour,
    getResizedSlotStyle,
    onCellMouseDown,
    onCellTouchStart,
    onResizeStart,
    onTapSlot,
    onEditAvailability,
    onDeleteAvailability,
}) => {
    const isDayView = viewMode === "day";

    return (
        <div
            className={`${styles.calendarGrid} ${isDayView ? styles.dayView : ""}`}
            style={isDayView ? ({ "--col-count": "1" } as React.CSSProperties) : undefined}
        >
            <div className={styles.calendarHeader}>
                <div className={styles.timeColumn} />
                {displayDates.map((date, index) => (
                    <div
                        key={index}
                        className={`${styles.dayColumn} ${isToday(date) ? styles.today : ""}`}
                    >
                        <span className={styles.dayName}>
                            {isDayView ? date.format("dddd") : DAYS_OF_WEEK[index]}
                        </span>
                        <span className={styles.dayNumber}>{date.format("DD")}</span>
                        <span className={styles.monthName}>{date.format("MMM")}</span>
                    </div>
                ))}
            </div>

            <div className={styles.calendarBody} ref={calendarBodyRef} style={{ position: "relative" }}>
                {TIME_SLOTS.map((hour, index) => (
                    <div
                        key={hour}
                        className={styles.timeRow}
                        style={{
                            minHeight: `${rowHeight}px`,
                            zIndex: TIME_SLOTS.length - index,
                            position: "relative",
                        }}
                    >
                        <div className={styles.timeLabel}>{hour.toString().padStart(2, "0")}:00</div>
                        {displayDates.map((date, dayIndex) => {
                            const slot = getAvailabilityStartingAtHour(date, hour);
                            const resizedStyle = slot ? getResizedSlotStyle(slot) : null;
                            const minuteOffset = slot ? slot.startMinutes - hour * 60 : 0;
                            const topOffsetPx = resizedStyle
                                ? resizedStyle.topPx - hour * rowHeight
                                : minuteOffset * pxPerMinute;
                            const heightPx = resizedStyle
                                ? resizedStyle.heightPx
                                : slot
                                    ? slot.durationMinutes * pxPerMinute
                                    : 0;
                            const displayStartTime = resizedStyle ? resizedStyle.startTime : slot?.startTime;
                            const displayEndTime = resizedStyle ? resizedStyle.endTime : slot?.endTime;

                            return (
                                <div
                                    key={dayIndex}
                                    className={`${styles.timeCell} ${isToday(date) ? styles.todayColumn : ""}`}
                                    onMouseDown={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest(`.${styles.availableBlock}`)) return;
                                        if (target.closest(`.${styles.mobileSlotActions}`)) return;
                                        if (target.closest("button")) return;
                                        if (target.closest(".ant-popover")) return;
                                        if (target.closest(".ant-popconfirm")) return;
                                        onCellMouseDown(e, dayIndex, date.isoWeekday());
                                    }}
                                    onTouchStart={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest(`.${styles.availableBlock}`)) return;
                                        if (target.closest(`.${styles.mobileSlotActions}`)) return;
                                        if (target.closest("button")) return;
                                        onCellTouchStart(e, dayIndex, date.isoWeekday());
                                    }}
                                    style={{
                                        cursor: dragState?.isDragging ? "ns-resize" : "crosshair",
                                        touchAction: isLongPressActive ? "none" : "auto",
                                    }}
                                >
                                    {slot && (
                                        <div
                                            className={`${styles.availableBlock} ${resizedStyle ? styles.resizing : ""} ${tappedSlotId === slot.apiId ? styles.tapped : ""}`}
                                            style={{
                                                top: `${topOffsetPx + 3}px`,
                                                height: `${heightPx - 6}px`,
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.innerWidth <= 768) {
                                                    onTapSlot(slot.apiId, e.clientX, e.clientY);
                                                }
                                            }}
                                        >
                                            <div
                                                className={styles.resizeHandle}
                                                style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", cursor: "n-resize", zIndex: 10, touchAction: "none" }}
                                                onMouseDown={(e) => onResizeStart(e, slot, "top")}
                                                onTouchStart={(e) => onResizeStart(e, slot, "top")}
                                            />
                                            <div className={styles.availableContent}>
                                                <span className={styles.availableLabel}>Rảnh</span>
                                                <span className={`${styles.availableTime} ${styles.desktopOnly}`}>
                                                    {displayStartTime} - {displayEndTime}
                                                </span>
                                                <span className={`${styles.availableTime} ${styles.mobileOnly}`}>
                                                    {`Từ ${parseInt(displayStartTime?.split(":")[0] || "0")}h`}
                                                </span>
                                                <span className={`${styles.availableTime} ${styles.mobileOnly}`}>
                                                    {`Đến ${parseInt(displayEndTime?.split(":")[0] || "0")}h`}
                                                </span>
                                            </div>
                                            <div className={styles.slotActions}>
                                                <Tooltip title="Chỉnh sửa">
                                                    <button
                                                        className={styles.editSlotBtn}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditAvailability(slot);
                                                        }}
                                                    >
                                                        <EditOutlined />
                                                    </button>
                                                </Tooltip>
                                                <Popconfirm
                                                    title="Xóa lịch rảnh"
                                                    description={`Bạn có chắc muốn xóa lịch rảnh ${DAY_OF_WEEK_MAP[slot.apiDayOfWeek]} ${slot.startTime} - ${slot.endTime}?`}
                                                    onConfirm={() => onDeleteAvailability(slot)}
                                                    okText="Xóa"
                                                    cancelText="Hủy"
                                                    okButtonProps={{
                                                        danger: true,
                                                        loading: deletingSlotId === slot.apiId,
                                                    }}
                                                    placement="left"
                                                >
                                                    <Tooltip title="Xóa">
                                                        <button
                                                            className={styles.deleteSlotBtn}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <DeleteOutlined />
                                                        </button>
                                                    </Tooltip>
                                                </Popconfirm>
                                            </div>
                                            {tappedSlotId === slot.apiId && (
                                                <div
                                                    className={styles.mobileSlotActions}
                                                    style={{ top: tapPosition.y, left: tapPosition.x }}
                                                >
                                                    <button
                                                        className={styles.mobileEditBtn}
                                                        onTouchStart={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditAvailability(slot);
                                                        }}
                                                    >
                                                        <EditOutlined /> Sửa
                                                    </button>
                                                    <button
                                                        className={styles.mobileDeleteBtn}
                                                        onTouchStart={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteAvailability(slot);
                                                        }}
                                                    >
                                                        <DeleteOutlined /> Xóa
                                                    </button>
                                                </div>
                                            )}
                                            <div
                                                className={styles.resizeHandle}
                                                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", cursor: "s-resize", zIndex: 10, touchAction: "none" }}
                                                onMouseDown={(e) => onResizeStart(e, slot, "bottom")}
                                                onTouchStart={(e) => onResizeStart(e, slot, "bottom")}
                                            />
                                        </div>
                                    )}
                                    {ghostPreview && ghostPreview.dayIndex === dayIndex && hour === 0 && (
                                        <div
                                            className={styles.ghostBlock}
                                            style={{
                                                position: "absolute",
                                                top: `${ghostPreview.topPx}px`,
                                                left: "3px",
                                                right: "3px",
                                                height: `${ghostPreview.heightPx}px`,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            <span className={styles.ghostLabel}>
                                                {ghostPreview.startTime} - {ghostPreview.endTime}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AvailabilityGrid;
