import { useState, useEffect } from "react";
import type { StepProps, ScheduleSlot } from "./types";
import { DAY_NAMES, DURATION_OPTIONS, TIME_SLOTS } from "./constants";
import { addHoursToTime, isSlotWithinAvailability } from "./utils";

const StepSchedule: React.FC<StepProps> = ({
    formData,
    setFormData,
    slotDuration,
    setSlotDuration,
    availabilities,
}) => {
    const [toast, setToast] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ day: number; time: string } | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    const isChunkAvailable = (day: number, time: string): boolean => {
        if (!availabilities || availabilities.length === 0) return true;
        const [h, m] = time.split(":").map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + 30;

        return availabilities.some((a) => {
            const aDay = a.dayofweek;
            if (aDay !== day) return false;
            const aStartStr = a.starttime;
            const aEndStr = a.endtime;
            if (!aStartStr || !aEndStr) return false;
            const [ash, asm] = aStartStr.split(":").map(Number);
            const [aeh, aem] = aEndStr.split(":").map(Number);
            return startMins >= (ash * 60 + asm) && endMins <= (aeh * 60 + aem);
        });
    };

    const checkOverlap = (day: number, start: string, end: string, excludeStartTime?: string): boolean => {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const newStart = sh * 60 + sm;
        const newEnd = eh * 60 + em;

        return formData.schedule.some((s) => {
            if (s.dayOfWeek !== day) return false;
            if (excludeStartTime && s.startTime === excludeStartTime) return false;

            const [ssh, ssm] = s.startTime.split(":").map(Number);
            const [eeh, eem] = s.endTime.split(":").map(Number);
            const sStart = ssh * 60 + ssm;
            const sEnd = eeh * 60 + eem;

            // Basic overlap check: (StartA < EndB) and (EndA > StartB)
            return newStart < sEnd && newEnd > sStart;
        });
    };

    const toggleSlot = (dayOfWeek: number, startTime: string) => {
        const exists = formData.schedule.find(
            (s) => s.dayOfWeek === dayOfWeek && s.startTime === startTime
        );

        if (exists) {
            setFormData((d) => ({
                ...d,
                schedule: d.schedule.filter((s) => !(s.dayOfWeek === dayOfWeek && s.startTime === startTime))
            }));
            return;
        }

        const endTime = addHoursToTime(startTime, slotDuration);

        // 1. Check if occupied by another selected slot
        if (checkOverlap(dayOfWeek, startTime, endTime)) {
            setToast(`⚠️ Khung giờ này bị trùng với một lịch học khác bạn đã chọn.`);
            return;
        }

        // 2. Check against tutor availability
        if (availabilities.length > 0 && !isSlotWithinAvailability(dayOfWeek, startTime, endTime, availabilities)) {
            setToast(
                `⚠️ Gia sư không rảnh khung giờ ${startTime}–${endTime} vào ${DAY_NAMES[dayOfWeek]}. Hãy chọn giờ khác hoặc giảm thời lượng.`
            );
            return;
        }

        setFormData((d) => ({
            ...d,
            schedule: [...d.schedule, { dayOfWeek, startTime, endTime }]
        }));
    };

    const isSelected = (day: number, time: string) => {
        const [h, m] = time.split(":").map(Number);
        const cellTime = h * 60 + m;

        return formData.schedule.some((s) => {
            if (s.dayOfWeek !== day) return false;
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            return cellTime >= (sh * 60 + sm) && cellTime < (eh * 60 + em);
        });
    };

    const isSlotHovered = (day: number, time: string): boolean => {
        if (!hoveredSlot || hoveredSlot.day !== day) return false;
        const [h, m] = time.split(":").map(Number);
        const cellTime = h * 60 + m;
        const [hh, hm] = hoveredSlot.time.split(":").map(Number);
        const hoverStart = hh * 60 + hm;
        const hoverEnd = hoverStart + slotDuration * 60;
        return cellTime >= hoverStart && cellTime < hoverEnd;
    };

    const slotsPerWeek = formData.schedule.length;
    const sessionCount = slotsPerWeek * 4;

    const handleDurationChange = (newDuration: number) => {
        setSlotDuration(newDuration);

        setFormData((d) => {
            const validSlots: ScheduleSlot[] = [];
            let removedCount = 0;

            // Process each slot with the new duration
            for (const s of d.schedule) {
                const newEndTime = addHoursToTime(s.startTime, newDuration);

                // 1. Check availability
                const isAvailable = isSlotWithinAvailability(s.dayOfWeek, s.startTime, newEndTime, availabilities);

                // 2. Check overlap with already accepted slots in the new list
                const hasOverlap = validSlots.some(prev => {
                    if (prev.dayOfWeek !== s.dayOfWeek) return false;
                    const [sh, sm] = s.startTime.split(":").map(Number);
                    const [eh, em] = newEndTime.split(":").map(Number);
                    const [psh, psm] = prev.startTime.split(":").map(Number);
                    const [peh, pem] = prev.endTime.split(":").map(Number);
                    return (sh * 60 + sm) < (peh * 60 + pem) && (eh * 60 + em) > (psh * 60 + psm);
                });

                if (isAvailable && !hasOverlap) {
                    validSlots.push({ ...s, endTime: newEndTime });
                } else {
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                setToast(`⚠️ Đã xóa ${removedCount} slot do không còn phù hợp với thời lượng mới hoặc bị trùng.`);
            }

            return { ...d, schedule: validSlots };
        });
    };

    return (
        <div className="bm-step">
            {/* Toast warning */}
            {toast && (
                <div className="bm-toast-warning">
                    <span>{toast}</span>
                    <button className="bm-toast-close" onClick={() => setToast(null)} type="button">✕</button>
                </div>
            )}

            <div className="bm-step-title">Chọn lịch học hàng tuần</div>
            <p className="bm-step-desc">
                Chọn các khoảng thời gian học và ngày bắt đầu mong muốn. Học phí được tạm tính theo <br /> <strong>{slotsPerWeek} buổi/tuần × 4 tuần = {sessionCount} buổi/tháng</strong>.
            </p>

            {/* Start Date selector */}
            <div className="bm-duration-section" style={{ marginBottom: 16 }}>
                <span className="bm-duration-label">Ngày bắt đầu dự kiến:</span>
                <input
                    type="date"
                    className="bm-form-input"
                    style={{ width: "fit-content" }}
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.startDate}
                    onChange={(e) => setFormData(d => ({ ...d, startDate: e.target.value }))}
                />
            </div>

            {/* Duration selector */}
            <div className="bm-duration-section">
                <span className="bm-duration-label">Thời lượng mỗi slot:</span>
                <div className="bm-hours-grid">
                    {DURATION_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            className={`bm-hours-btn ${slotDuration === opt.value ? "selected" : ""}`}
                            onClick={() => handleDurationChange(opt.value)}
                            type="button"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bm-schedule-table">
                <div className="bm-schedule-header">
                    <div className="bm-schedule-corner"></div>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <div key={d} className="bm-schedule-day-header">{DAY_NAMES[d]}</div>
                    ))}
                </div>
                <div className="bm-schedule-body">
                    {TIME_SLOTS.map((time) => (
                        <div key={time} className="bm-schedule-row">
                            <div className="bm-schedule-time">{time}</div>
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                                const isBusy = !isChunkAvailable(day, time);
                                const currentEndTime = addHoursToTime(time, slotDuration);
                                const isStartInvalid = isBusy || !isSlotWithinAvailability(day, time, currentEndTime, availabilities);

                                const isHovered = isSlotHovered(day, time);
                                const isStartOfHover = hoveredSlot?.day === day && hoveredSlot?.time === time;

                                // Check if hover range overlaps with existing selections
                                const isOverlapHovered = isStartOfHover && checkOverlap(day, time, currentEndTime);
                                const hoverInvalid = isStartOfHover && (isStartInvalid || isOverlapHovered);

                                return (
                                    <div
                                        key={day}
                                        className={`bm-schedule-cell ${isSelected(day, time) ? "selected" : ""} ${isBusy ? "unavailable" : ""} ${isHovered ? "hovering" : ""} ${hoverInvalid ? "hover-invalid" : ""}`}
                                        onClick={() => toggleSlot(day, time)}
                                        onMouseEnter={() => setHoveredSlot({ day, time })}
                                        onMouseLeave={() => setHoveredSlot(null)}
                                        title={isBusy ? "Gia sư bận khung giờ này" : isStartInvalid ? "Thời lượng đã chọn vượt quá lịch rảnh" : isOverlapHovered ? "Trùng với lịch học đã chọn" : ""}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {formData.schedule.length > 0 && (
                <div className="bm-selected-slots">
                    <div className="bm-step-title" style={{ fontSize: 13 }}>Đã chọn ({formData.schedule.length} slot/tuần → {sessionCount} buổi/tháng)</div>
                    <div className="bm-slot-tags">
                        {formData.schedule.map((s, i) => (
                            <span key={i} className="bm-slot-tag">
                                {DAY_NAMES[s.dayOfWeek]} {s.startTime}–{s.endTime}
                                <button
                                    className="bm-slot-remove"
                                    onClick={() =>
                                        setFormData((d) => ({
                                            ...d,
                                            schedule: d.schedule.filter((_, idx) => idx !== i),
                                        }))
                                    }
                                    type="button"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepSchedule;
