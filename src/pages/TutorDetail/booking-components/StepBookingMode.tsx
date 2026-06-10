import { useEffect } from "react";
import type { StepProps } from "./types";
import { CalendarOutlined, AppstoreOutlined } from "@ant-design/icons";

/**
 * Step 2 mới — phụ huynh chọn CÁCH đặt lịch:
 *   1. "Theo lịch trống": tự pick slot từ availability của gia sư.
 *   2. "Theo gói": chọn 1 combo có sẵn của gia sư.
 *
 * Mode online/offline/hybrid (cũ) đã move sang StepReview (chỉ hiển thị khi
 * tutor support nhiều mode — nếu lock 1 mode thì auto-pin, không cần parent chọn).
 */
const StepBookingMode: React.FC<StepProps> = ({ formData, setFormData, combos }) => {
    const hasCombos = combos.length > 0;

    // Nếu tutor không có combo nào → auto-pin mode "schedule" và để parent qua step kế tiếp.
    useEffect(() => {
        if (!hasCombos && formData.bookingMode !== "schedule") {
            setFormData((d) => ({ ...d, bookingMode: "schedule", comboId: null }));
        }
    }, [hasCombos, formData.bookingMode, setFormData]);

    const select = (mode: "schedule" | "package") => {
        setFormData((d) => ({
            ...d,
            bookingMode: mode,
            // Đổi mode → reset combo + schedule để tránh data lệch
            comboId: mode === "package" ? d.comboId : null,
            schedule: mode === "schedule" ? d.schedule : [],
        }));
    };

    return (
        <div className="bm-step">
            <div className="bm-step-title">Bạn muốn đặt lịch như thế nào?</div>

            <div className="bm-booking-mode-grid">
                <div
                    className={`bm-booking-mode-card ${formData.bookingMode === "schedule" ? "selected" : ""}`}
                    onClick={() => select("schedule")}
                    role="button"
                    aria-pressed={formData.bookingMode === "schedule"}
                >
                    <div className="bm-booking-mode-icon"><CalendarOutlined /></div>
                    <div className="bm-booking-mode-info">
                        <span className="bm-booking-mode-label">Theo lịch trống</span>
                        <span className="bm-booking-mode-desc">Tự chọn khung giờ từ lịch rảnh của gia sư</span>
                    </div>
                    {formData.bookingMode === "schedule" && <div className="bm-check">✓</div>}
                </div>

                <div
                    className={`bm-booking-mode-card ${formData.bookingMode === "package" ? "selected" : ""} ${!hasCombos ? "locked" : ""}`}
                    onClick={() => hasCombos && select("package")}
                    role="button"
                    aria-pressed={formData.bookingMode === "package"}
                    aria-disabled={!hasCombos || undefined}
                    style={!hasCombos ? { cursor: "not-allowed", opacity: 0.6 } : undefined}
                >
                    <div className="bm-booking-mode-icon"><AppstoreOutlined /></div>
                    <div className="bm-booking-mode-info">
                        <span className="bm-booking-mode-label">
                            Theo gói {hasCombos && <span className="bm-booking-mode-count">{combos.length}</span>}
                        </span>
                        <span className="bm-booking-mode-desc">
                            {hasCombos
                                ? "Chọn 1 gói combo có sẵn của gia sư"
                                : "Gia sư này chưa có gói nào"}
                        </span>
                    </div>
                    {formData.bookingMode === "package" && <div className="bm-check">✓</div>}
                </div>
            </div>
        </div>
    );
};

export default StepBookingMode;
