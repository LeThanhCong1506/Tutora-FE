import { useState, useEffect, useMemo } from "react";
import type { StepProps, ScheduleSlot } from "./types";
import { DAY_NAMES, DURATION_OPTIONS, TIME_SLOTS } from "./constants";
import { addHoursToTime, isSlotWithinAvailability } from "./utils";
import type { Combo, FixedCombo } from "../../../types/combo.types";

// Convert combo cố định → ScheduleSlot[] để fill thẳng vào formData.schedule.
const fixedComboToSchedule = (combo: FixedCombo): ScheduleSlot[] =>
    combo.sessions.map((s) => {
        const startTotal = s.startHour * 60 + s.startMinute;
        const endTotal = startTotal + s.durationHours * 60;
        const startStr = `${String(s.startHour).padStart(2, "0")}:${String(s.startMinute).padStart(2, "0")}`;
        const endH = Math.floor(endTotal / 60);
        const endM = endTotal % 60;
        const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
        return { dayOfWeek: s.dayOfWeek, startTime: startStr, endTime: endStr };
    });

const ComboCard: React.FC<{
    combo: Combo;
    selected: boolean;
    onSelect: () => void;
    compact?: boolean;
}> = ({ combo, selected, onSelect, compact = false }) => {
    const totalSessions = combo.type === "fixed" ? combo.sessions.length : combo.sessionsPerWeek;
    const totalHours =
        combo.type === "fixed"
            ? combo.sessions.reduce((sum, s) => sum + s.durationHours, 0)
            : combo.sessionsPerWeek * combo.hoursPerSession;

    return (
        <div
            className={`bm-combo-card ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
            onClick={onSelect}
            role="button"
            aria-pressed={selected}
        >
            <div className="bm-combo-card-head">
                <span className={`bm-combo-badge ${combo.type === "fixed" ? "fixed" : "flex"}`}>
                    {combo.type === "fixed" ? "Cố định" : "Linh hoạt"}
                </span>
                {combo.subjectName && <span className="bm-combo-subject">{combo.subjectName}</span>}
            </div>
            <h4 className="bm-combo-name">{combo.name}</h4>
            <div className="bm-combo-meta">
                <span>{totalSessions} buổi/tuần</span>
                <span>·</span>
                <span>{totalHours}h/tuần</span>
            </div>
            {combo.type === "fixed" ? (
                <ul className="bm-combo-sessions">
                    {combo.sessions.slice(0, 3).map((s, i) => {
                        const startStr = `${String(s.startHour).padStart(2, "0")}:${String(s.startMinute).padStart(2, "0")}`;
                        const endTotal = s.startHour * 60 + s.startMinute + s.durationHours * 60;
                        const endStr = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
                        return (
                            <li key={i}>
                                {DAY_NAMES[s.dayOfWeek]} · {startStr}–{endStr}
                            </li>
                        );
                    })}
                    {combo.sessions.length > 3 && <li>... +{combo.sessions.length - 3} buổi khác</li>}
                </ul>
            ) : (
                <p className="bm-combo-desc">{combo.description}</p>
            )}
            {selected && <div className="bm-check">✓</div>}
        </div>
    );
};

const StepSchedule: React.FC<StepProps> = ({
    formData,
    setFormData,
    slotDuration,
    setSlotDuration,
    availabilities,
    combos,
}) => {
    const [toast, setToast] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ day: number; time: string } | null>(null);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    // ─── Package mode handlers ───
    const selectedCombo = useMemo(() => combos.find((c) => c.id === formData.comboId), [combos, formData.comboId]);

    const pickCombo = (combo: Combo) => {
        if (combo.type === "fixed") {
            // Auto-fill schedule từ combo cố định.
            setFormData((d) => ({
                ...d,
                comboId: combo.id,
                schedule: fixedComboToSchedule(combo),
            }));
        } else {
            // Flex: clear schedule, để parent chọn slot. setSlotDuration theo combo.
            setFormData((d) => ({ ...d, comboId: combo.id, schedule: [] }));
            setSlotDuration(combo.hoursPerSession);
        }
    };

    // ─── Schedule mode logic (giống code cũ, support 30-min) ───
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
            return startMins >= ash * 60 + asm && endMins <= aeh * 60 + aem;
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
            return newStart < sEnd && newEnd > sStart;
        });
    };

    const toggleSlot = (dayOfWeek: number, startTime: string) => {
        const exists = formData.schedule.find((s) => s.dayOfWeek === dayOfWeek && s.startTime === startTime);
        if (exists) {
            setFormData((d) => ({
                ...d,
                schedule: d.schedule.filter((s) => !(s.dayOfWeek === dayOfWeek && s.startTime === startTime)),
            }));
            return;
        }

        const endTime = addHoursToTime(startTime, slotDuration);

        if (checkOverlap(dayOfWeek, startTime, endTime)) {
            setToast("⚠️ Khung giờ này bị trùng với một lịch học khác bạn đã chọn.");
            return;
        }
        if (availabilities.length > 0 && !isSlotWithinAvailability(dayOfWeek, startTime, endTime, availabilities)) {
            setToast(
                `⚠️ Gia sư không rảnh khung giờ ${startTime}–${endTime} vào ${DAY_NAMES[dayOfWeek]}. Hãy chọn giờ khác hoặc giảm thời lượng.`,
            );
            return;
        }

        // Nếu là package flex → giới hạn theo sessionsPerWeek
        if (selectedCombo?.type === "flex" && formData.schedule.length >= selectedCombo.sessionsPerWeek) {
            setToast(
                `⚠️ Combo "${selectedCombo.name}" chỉ cho phép ${selectedCombo.sessionsPerWeek} buổi/tuần. Hãy bỏ chọn một slot khác trước.`,
            );
            return;
        }

        setFormData((d) => ({ ...d, schedule: [...d.schedule, { dayOfWeek, startTime, endTime }] }));
    };

    const isSelected = (day: number, time: string) => {
        const [h, m] = time.split(":").map(Number);
        const cellTime = h * 60 + m;
        return formData.schedule.some((s) => {
            if (s.dayOfWeek !== day) return false;
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            return cellTime >= sh * 60 + sm && cellTime < eh * 60 + em;
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
            for (const s of d.schedule) {
                const newEndTime = addHoursToTime(s.startTime, newDuration);
                const isAvailable = isSlotWithinAvailability(s.dayOfWeek, s.startTime, newEndTime, availabilities);
                const hasOverlap = validSlots.some((prev) => {
                    if (prev.dayOfWeek !== s.dayOfWeek) return false;
                    const [sh, sm] = s.startTime.split(":").map(Number);
                    const [eh, em] = newEndTime.split(":").map(Number);
                    const [psh, psm] = prev.startTime.split(":").map(Number);
                    const [peh, pem] = prev.endTime.split(":").map(Number);
                    return sh * 60 + sm < peh * 60 + pem && eh * 60 + em > psh * 60 + psm;
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

    // ─────────────── Render ───────────────

    const renderScheduleGrid = () => (
        <>
            {/* Start Date */}
            <div className="bm-duration-section" style={{ marginBottom: 16 }}>
                <span className="bm-duration-label">Ngày bắt đầu dự kiến:</span>
                <input
                    type="date"
                    className="bm-form-input"
                    style={{ width: "fit-content" }}
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.startDate}
                    onChange={(e) => setFormData((d) => ({ ...d, startDate: e.target.value }))}
                />
            </div>

            {/* Duration */}
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
                        <div key={d} className="bm-schedule-day-header">
                            {DAY_NAMES[d]}
                        </div>
                    ))}
                </div>
                <div className="bm-schedule-body">
                    {TIME_SLOTS.map((time) => (
                        <div key={time} className="bm-schedule-row">
                            <div className="bm-schedule-time">{time}</div>
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                                const isBusy = !isChunkAvailable(day, time);
                                const currentEndTime = addHoursToTime(time, slotDuration);
                                const isStartInvalid =
                                    isBusy || !isSlotWithinAvailability(day, time, currentEndTime, availabilities);
                                const isHovered = isSlotHovered(day, time);
                                const isStartOfHover = hoveredSlot?.day === day && hoveredSlot?.time === time;
                                const isOverlapHovered = isStartOfHover && checkOverlap(day, time, currentEndTime);
                                const hoverInvalid = isStartOfHover && (isStartInvalid || isOverlapHovered);

                                return (
                                    <div
                                        key={day}
                                        className={`bm-schedule-cell ${isSelected(day, time) ? "selected" : ""} ${isBusy ? "unavailable" : ""} ${isHovered ? "hovering" : ""} ${hoverInvalid ? "hover-invalid" : ""}`}
                                        onClick={() => toggleSlot(day, time)}
                                        onMouseEnter={() => setHoveredSlot({ day, time })}
                                        onMouseLeave={() => setHoveredSlot(null)}
                                        title={
                                            isBusy
                                                ? "Gia sư bận khung giờ này"
                                                : isStartInvalid
                                                  ? "Thời lượng đã chọn vượt quá lịch rảnh"
                                                  : isOverlapHovered
                                                    ? "Trùng với lịch học đã chọn"
                                                    : ""
                                        }
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {formData.schedule.length > 0 && (
                <div className="bm-selected-slots">
                    <div className="bm-step-title" style={{ fontSize: 13 }}>
                        Đã chọn ({slotsPerWeek} slot/tuần → {sessionCount} buổi/tháng)
                    </div>
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
        </>
    );

    const renderPackageMode = () => (
        <>
            <div className="bm-step-title" style={{ fontSize: 14, marginBottom: 8 }}>Chọn 1 gói phù hợp</div>
            <div className="bm-combo-grid">
                {combos.map((c) => (
                    <ComboCard key={c.id} combo={c} selected={formData.comboId === c.id} onSelect={() => pickCombo(c)} />
                ))}
            </div>

            {selectedCombo?.type === "flex" && (
                <div style={{ marginTop: 16 }}>
                    <div className="bm-step-title" style={{ fontSize: 13 }}>
                        Chọn {selectedCombo.sessionsPerWeek} khung giờ trong tuần ({selectedCombo.hoursPerSession}h/buổi)
                    </div>
                    {renderScheduleGrid()}
                </div>
            )}

            {selectedCombo?.type === "fixed" && (
                <div className="bm-package-fixed-note" style={{ marginTop: 14, padding: "10px 12px", background: "rgba(61, 74, 62, 0.08)", borderRadius: 8, fontSize: 12.5, color: "#3d4a3e" }}>
                    ✓ Đã tự động chọn {selectedCombo.sessions.length} buổi theo lịch của combo. Bạn có thể chuyển sang bước tiếp theo.
                </div>
            )}

            {/* Start date selector — vẫn cần cho cả package mode */}
            {selectedCombo && (
                <div className="bm-duration-section" style={{ marginTop: 14 }}>
                    <span className="bm-duration-label">Ngày bắt đầu dự kiến:</span>
                    <input
                        type="date"
                        className="bm-form-input"
                        style={{ width: "fit-content" }}
                        min={new Date().toISOString().split("T")[0]}
                        value={formData.startDate}
                        onChange={(e) => setFormData((d) => ({ ...d, startDate: e.target.value }))}
                    />
                </div>
            )}
        </>
    );

    const otherCombos = combos.filter((c) => c.id !== formData.comboId);

    return (
        <div className="bm-step">
            {toast && (
                <div className="bm-toast-warning">
                    <span>{toast}</span>
                    <button className="bm-toast-close" onClick={() => setToast(null)} type="button">
                        ✕
                    </button>
                </div>
            )}

            <div className="bm-step-title">
                {formData.bookingMode === "package" ? "Chọn gói học" : "Chọn lịch học hàng tuần"}
            </div>

            {formData.bookingMode === "package" ? renderPackageMode() : renderScheduleGrid()}

            {/* Bottom card: gợi ý các gói khác (luôn hiển thị khi có combo) */}
            {combos.length > 0 && formData.bookingMode === "schedule" && (
                <div className="bm-package-suggest" style={{ marginTop: 22 }}>
                    <div className="bm-step-title" style={{ fontSize: 13, marginBottom: 8 }}>
                        Hoặc thử các gói có sẵn của gia sư
                    </div>
                    <div className="bm-combo-grid compact">
                        {otherCombos.map((c) => (
                            <ComboCard key={c.id} combo={c} selected={false} onSelect={() => {
                                setFormData((d) => ({ ...d, bookingMode: "package" }));
                                pickCombo(c);
                            }} compact />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepSchedule;
