import type { StepProps } from "./types";
import { DAY_NAMES, TEACHING_MODES } from "./constants";
import { calcTotalHoursFromSchedule, formatGrade, formatPrice } from "./utils";
import { usePromotion } from "./hooks/usePromotion";

const StepReview: React.FC<StepProps> = ({ formData, setFormData, hourlyRate, students, availableSubjects }) => {
    const student = students.find((s) => s.studentId === formData.studentId);
    const subject = availableSubjects.find((s) => s.id === formData.subjectId);
    const teachingModeInfo = TEACHING_MODES.find((m) => m.key === formData.teachingMode);

    // Replicate backend calculation: hourlyRate × totalHours
    const totalHours = calcTotalHoursFromSchedule(formData.schedule);
    const estimatedPrice = hourlyRate * totalHours;

    const { promoResult, promoLoading, promoDiscount, validate: validatePromoCode, reset: resetPromo } = usePromotion(estimatedPrice);

    const slotsPerWeek = formData.schedule.length;
    const sessionCount = slotsPerWeek * 4;

    const baseAmount = estimatedPrice - promoDiscount;
    const serviceFee = Math.round(baseAmount * 0.05);
    const finalEstimate = baseAmount + serviceFee;

    return (
        <div className="bm-step">
            <div className="bm-step-title">Xác nhận booking</div>

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
                    <span className="bm-review-label">Hình thức</span>
                    <span className="bm-review-value">{teachingModeInfo?.icon} {teachingModeInfo?.label}</span>
                </div>
                {(formData.teachingMode === "offline" || formData.teachingMode === "hybrid") && (
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
                <div className="bm-price-note">
                    💡 Giá ước tính — giá cuối cùng sẽ được tính chính xác bởi hệ thống.
                </div>
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
