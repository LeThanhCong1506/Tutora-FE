import { useEffect, useMemo } from "react";
import type { StepProps } from "./types";
import { TEACHING_MODES } from "./constants";

/**
 * Resolve the tutor's preferred mode into a single locked mode (or null
 * when the tutor accepts multiple modes and the student is free to pick).
 *
 * Mirrors `resolveLockedMode` in useBookingForm — kept inline here so the
 * step renders correctly even when used in isolation (tests, storybook).
 */
function getLockedMode(raw: string | null): "online" | "offline" | null {
    const m = (raw ?? "").toLowerCase();
    if (m === "online") return "online";
    if (m === "offline") return "offline";
    return null;
}

const StepTeachingMode: React.FC<StepProps> = ({ formData, setFormData, tutorTeachingMode }) => {
    const lockedMode = useMemo(() => getLockedMode(tutorTeachingMode), [tutorTeachingMode]);
    const isLocked = lockedMode !== null;

    // Filter the displayed mode cards based on what the tutor accepts.
    // - Locked: show only that mode (auto-selected, not editable).
    // - Free  : show all 3 modes.
    const visibleModes = useMemo(() => {
        if (!lockedMode) return TEACHING_MODES;
        return TEACHING_MODES.filter((m) => m.key === lockedMode);
    }, [lockedMode]);

    // Keep formData in sync with the locked mode. Covers two cases:
    //   1. Tutor data arrives after first render.
    //   2. User reopens the modal with a stale draft.
    useEffect(() => {
        if (lockedMode && formData.teachingMode !== lockedMode) {
            setFormData((d) => ({
                ...d,
                teachingMode: lockedMode,
                // Online never needs a location — wipe stale fields.
                ...(lockedMode === "online"
                    ? { locationCity: "", locationDistrict: "", locationWard: "", locationDetail: "" }
                    : {}),
            }));
        }
    }, [lockedMode, formData.teachingMode, setFormData]);

    const needsLocation = formData.teachingMode === "offline" || formData.teachingMode === "hybrid";

    return (
        <div className="bm-step">
            <div className="bm-step-title">Hình thức học</div>

            {isLocked && (
                <div
                    className="bm-locked-mode-banner"
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "12px 14px",
                        marginBottom: 16,
                        background: "linear-gradient(135deg, rgba(79, 140, 255, 0.10) 0%, rgba(79, 140, 255, 0.04) 100%)",
                        border: "1px solid rgba(79, 140, 255, 0.20)",
                        borderRadius: 12,
                        color: "#1a2238",
                        fontSize: 13,
                        lineHeight: 1.5,
                    }}
                >
                    <span aria-hidden style={{ fontSize: 16, lineHeight: "20px" }}>ℹ️</span>
                    <span>
                        Gia sư này chỉ dạy theo hình thức{" "}
                        <b>{lockedMode === "online" ? "Online" : "Tại nhà (Offline)"}</b>.
                        Bạn không thể đổi sang hình thức khác.
                    </span>
                </div>
            )}

            <div
                className="bm-teaching-mode-grid"
                aria-disabled={isLocked || undefined}
            >
                {visibleModes.map((mode) => {
                    const selected = formData.teachingMode === mode.key;
                    return (
                        <div
                            key={mode.key}
                            className={`bm-teaching-mode-card ${selected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
                            onClick={() => {
                                if (isLocked) return; // pinned — ignore clicks
                                setFormData((d) => ({
                                    ...d,
                                    teachingMode: mode.key,
                                    ...(mode.key === "online"
                                        ? { locationCity: "", locationDistrict: "", locationWard: "", locationDetail: "" }
                                        : {}),
                                }));
                            }}
                            style={isLocked ? { cursor: "not-allowed", opacity: 0.95 } : undefined}
                            role="button"
                            aria-pressed={selected}
                            aria-disabled={isLocked || undefined}
                        >
                            <div className="bm-teaching-mode-icon">{mode.icon}</div>
                            <div className="bm-teaching-mode-info">
                                <span className="bm-teaching-mode-label">{mode.label}</span>
                                <span className="bm-teaching-mode-desc">{mode.desc}</span>
                            </div>
                            {selected && <div className="bm-check">✓</div>}
                        </div>
                    );
                })}
            </div>

            {needsLocation && (
                <div className="bm-location-section">
                    <div className="bm-step-title" style={{ marginTop: 28 }}>
                        Địa điểm học
                        <span className="bm-required-badge">Bắt buộc</span>
                    </div>
                    <div className="bm-location-form">
                        <div className="bm-form-row">
                            <div className="bm-form-group">
                                <label className="bm-form-label">Tỉnh / Thành phố *</label>
                                <input
                                    type="text"
                                    className="bm-form-input"
                                    placeholder="VD: Hồ Chí Minh"
                                    value={formData.locationCity}
                                    onChange={(e) => setFormData((d) => ({ ...d, locationCity: e.target.value }))}
                                />
                            </div>
                            <div className="bm-form-group">
                                <label className="bm-form-label">Quận / Huyện *</label>
                                <input
                                    type="text"
                                    className="bm-form-input"
                                    placeholder="VD: Quận 1"
                                    value={formData.locationDistrict}
                                    onChange={(e) => setFormData((d) => ({ ...d, locationDistrict: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="bm-form-row">
                            <div className="bm-form-group">
                                <label className="bm-form-label">Phường / Xã</label>
                                <input
                                    type="text"
                                    className="bm-form-input"
                                    placeholder="VD: Phường Bến Nghé"
                                    value={formData.locationWard}
                                    onChange={(e) => setFormData((d) => ({ ...d, locationWard: e.target.value }))}
                                />
                            </div>
                            <div className="bm-form-group">
                                <label className="bm-form-label">Địa chỉ cụ thể</label>
                                <input
                                    type="text"
                                    className="bm-form-input"
                                    placeholder="VD: 123 Nguyễn Huệ"
                                    value={formData.locationDetail}
                                    onChange={(e) => setFormData((d) => ({ ...d, locationDetail: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepTeachingMode;
