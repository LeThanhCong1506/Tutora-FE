import type { StepProps } from "./types";
import { DAY_NAMES, TEACHING_MODES } from "./constants";
import { calcTotalHoursFromSchedule, formatGrade, formatPrice } from "./utils";
import { usePromotion } from "./hooks/usePromotion";

function getLockedMode(raw: string | null): "online" | "offline" | null {
    const m = (raw ?? "").toLowerCase();
    if (m === "online") return "online";
    if (m === "offline") return "offline";
    return null;
}

const StepReview: React.FC<StepProps> = ({
    formData,
    setFormData,
    hourlyRate,
    students,
    availableSubjects,
    tutorTeachingMode,
    combos,
}) => {
    const student = students.find((s) => s.studentId === formData.studentId);
    const subject = availableSubjects.find((s) => s.id === formData.subjectId);
    const teachingModeInfo = TEACHING_MODES.find((m) => m.key === formData.teachingMode);
    const selectedCombo = combos.find((c) => c.id === formData.comboId);
    const lockedMode = getLockedMode(tutorTeachingMode ?? null);
    const canPickMode = lockedMode === null;

    // Replicate backend calculation: hourlyRate × totalHours
    const totalHours = calcTotalHoursFromSchedule(formData.schedule);
    const estimatedPrice = hourlyRate * totalHours;

    const { promoResult, promoLoading, promoDiscount, validate: validatePromoCode, reset: resetPromo } = usePromotion(estimatedPrice);

    const slotsPerWeek = formData.schedule.length;
    const sessionCount = slotsPerWeek * 4;

    const baseAmount = estimatedPrice - promoDiscount;
    const serviceFee = Math.round(baseAmount * 0.05);
    const finalEstimate = baseAmount + serviceFee;

    const needsLocation = formData.teachingMode === "offline" || formData.teachingMode === "hybrid";

    return (
        <div className="bm-step">
            <div className="bm-step-title">Xác nhận booking</div>

            {/* Mode picker — chỉ khi tutor support nhiều mode */}
            {canPickMode && (
                <div className="bm-review-mode-picker" style={{ marginBottom: 14 }}>
                    <div className="bm-step-title" style={{ fontSize: 13, marginBottom: 8 }}>Phương thức học</div>
                    <div className="bm-teaching-mode-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {TEACHING_MODES.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() =>
                                    setFormData((d) => ({
                                        ...d,
                                        teachingMode: m.key,
                                        ...(m.key === "online"
                                            ? { locationCity: "", locationDistrict: "", locationWard: "", locationDetail: "" }
                                            : {}),
                                    }))
                                }
                                className={`bm-mode-chip ${formData.teachingMode === m.key ? "selected" : ""}`}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: 8,
                                    border: `1.5px solid ${formData.teachingMode === m.key ? "#1a2238" : "rgba(0,0,0,0.15)"}`,
                                    background: formData.teachingMode === m.key ? "#1a2238" : "#fff",
                                    color: formData.teachingMode === m.key ? "#fff" : "#1a2238",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Location form — chỉ khi offline/hybrid */}
            {needsLocation && (
                <div className="bm-location-section" style={{ marginBottom: 14 }}>
                    <div className="bm-step-title" style={{ fontSize: 13 }}>
                        Địa điểm học <span style={{ color: "#631b1b", fontSize: 11, fontWeight: 700 }}>BẮT BUỘC</span>
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

            {/* Summary */}
            <div className="bm-review-card">
                <div className="bm-review-row">
                    <span className="bm-review-label">Học sinh</span>
                    <span className="bm-review-value">{student?.fullName} {student?.gradeLevel ? `(${formatGrade(student.gradeLevel)})` : (student?.school ? `(${student.school})` : "")}</span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Môn học</span>
                    <span className="bm-review-value">{subject?.name}</span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Cách đặt</span>
                    <span className="bm-review-value">
                        {formData.bookingMode === "package" && selectedCombo
                            ? `Theo gói · ${selectedCombo.name}`
                            : "Theo lịch trống"}
                    </span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Phương thức</span>
                    <span className="bm-review-value">{teachingModeInfo?.icon} {teachingModeInfo?.label}</span>
                </div>
                {needsLocation && formData.locationCity && (
                    <div className="bm-review-row">
                        <span className="bm-review-label">Địa điểm</span>
                        <span className="bm-review-value">
                            {[formData.locationDetail, formData.locationWard, formData.locationDistrict, formData.locationCity]
                                .filter(Boolean)
                                .join(", ")}
                        </span>
                    </div>
                )}
                <div className="bm-review-row">
                    <span className="bm-review-label">Ngày bắt đầu</span>
                    <span className="bm-review-value">{new Date(formData.startDate || new Date().toISOString()).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Số buổi/tháng</span>
                    <span className="bm-review-value">{sessionCount} buổi ({slotsPerWeek} slot/tuần)</span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Tổng giờ/tháng</span>
                    <span className="bm-review-value">{totalHours} giờ</span>
                </div>
                <div className="bm-review-row">
                    <span className="bm-review-label">Lịch học</span>
                    <div className="bm-review-schedule">
                        {formData.schedule.map((s, i) => (
                            <span key={i} className="bm-slot-tag-sm">
                                {DAY_NAMES[s.dayOfWeek]} {s.startTime}–{s.endTime}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Promotion Code */}
            <div className="bm-promo-section">
                <div className="bm-step-title" style={{ fontSize: 13 }}>Mã khuyến mãi</div>
                <div className="bm-promo-input-row">
                    <input
                        type="text"
                        placeholder="Nhập mã khuyến mãi"
                        value={formData.promotionCode}
                        onChange={(e) => {
                            setFormData((d) => ({ ...d, promotionCode: e.target.value.toUpperCase() }));
                            resetPromo();
                        }}
                        className="bm-promo-input"
                    />
                    <button
                        className="bm-promo-btn"
                        onClick={() => validatePromoCode(formData.promotionCode)}
                        disabled={!formData.promotionCode || promoLoading}
                        type="button"
                    >
                        {promoLoading ? "..." : "Áp dụng"}
                    </button>
                </div>
                {promoResult?.valid && (
                    <div className="bm-promo-msg valid">✓ {promoResult.message || `Mã hợp lệ! Giảm ${formatPrice(promoDiscount)}`}</div>
                )}
                {promoResult && !promoResult.valid && (
                    <div className="bm-promo-msg invalid">✗ {promoResult.message || "Mã không hợp lệ"}</div>
                )}
            </div>

            {/* Price Estimate */}
            <div className="bm-price-section">
                <div className="bm-price-note">💡 Giá ước tính, có thể thay đổi khi hệ thống xác nhận.</div>
                <div className="bm-price-row">
                    <span>Giá gốc ({totalHours} giờ × {formatPrice(hourlyRate)}/h)</span>
                    <span>{formatPrice(estimatedPrice)}</span>
                </div>
                {promoResult?.valid && promoDiscount > 0 && (
                    <div className="bm-price-row discount">
                        <span>Mã khuyến mãi ({promoResult.code})</span>
                        <span>-{formatPrice(promoDiscount)}</span>
                    </div>
                )}
                <div className="bm-price-row fee">
                    <span>Phí dịch vụ (5%)</span>
                    <span>{formatPrice(serviceFee)}</span>
                </div>
                <div className="bm-price-divider" />
                <div className="bm-price-row total">
                    <span>Dự kiến thanh toán</span>
                    <span>{formatPrice(Math.max(0, finalEstimate))}</span>
                </div>
            </div>
        </div>
    );
};

export default StepReview;
