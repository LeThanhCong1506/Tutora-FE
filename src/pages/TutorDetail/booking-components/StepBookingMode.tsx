import { useEffect } from "react";
import { AlertTriangle, MousePointerClick, PackageCheck, Route } from "lucide-react";
import type { StepProps } from "./types";
import styles from "./bookingModal.module.css";

/**
 * Bước 2 — phụ huynh chọn CÁCH đặt lịch:
 *   1. "Tự chọn lịch rảnh": tự pick slot từ lịch trống của gia sư (cần gia sư có
 *      gói "linh hoạt" packageType=1 active — nguồn packageId khi submit).
 *   2. "Chọn gói cố định": chọn 1 gói cố định có sẵn của gia sư (packageType=2).
 *
 * Nếu gia sư chỉ có 1 trong 2 → auto-pin cách còn lại và khóa thẻ không dùng được.
 * Thiếu cả 2 (dữ liệu gia sư chưa cấu hình xong) → không auto-pin, hiện cảnh báo.
 */
const StepBookingMode: React.FC<StepProps> = ({ formData, setFormData, combos, hasFlexiblePackage }) => {
    const hasCombos = combos.some((combo) => combo.type === "fixed" && combo.subjectId === formData.subjectId);
    const neitherAvailable = !hasFlexiblePackage && !hasCombos;

    useEffect(() => {
        if (neitherAvailable) return;
        if (!hasFlexiblePackage && formData.bookingMode !== "package") {
            setFormData((d) => ({ ...d, bookingMode: "package", schedule: [] }));
        } else if (!hasCombos && formData.bookingMode !== "schedule") {
            setFormData((d) => ({ ...d, bookingMode: "schedule", comboId: null }));
        }
    }, [hasFlexiblePackage, hasCombos, neitherAvailable, formData.bookingMode, setFormData]);

    const select = (mode: "schedule" | "package") =>
        setFormData((d) => ({
            ...d,
            bookingMode: mode,
            comboId: mode === "package" ? d.comboId : null,
            schedule: mode === "schedule" ? d.schedule : [],
        }));

    const isAvailability = formData.bookingMode === "schedule";
    const isPackage = formData.bookingMode === "package";

    return (
        <>
            <div className={styles.sectionHeading}>
                <span className={styles.headingIcon}>
                    <Route size={20} />
                </span>
                <div>
                    <span className={styles.eyebrow}>Bước 02</span>
                    <h2>Chọn cách đặt lịch</h2>
                </div>
            </div>

            {neitherAvailable && (
                <div className={`${styles.warningBox} ${styles.gradeWarning}`} role="alert">
                    <AlertTriangle size={18} />
                    <div>
                        <strong>Gia sư chưa sẵn sàng nhận đặt lịch</strong>
                        <p>
                            Gia sư này chưa cấu hình xong gói học (cả lịch rảnh lẫn gói cố định). Vui lòng thử lại
                            sau hoặc chọn gia sư khác.
                        </p>
                    </div>
                </div>
            )}

            <div className={styles.bookingModeGrid}>
                <button
                    type="button"
                    className={`${styles.bookingModeCard} ${isAvailability ? styles.selectedCard : ""}`}
                    onClick={() => hasFlexiblePackage && select("schedule")}
                    disabled={!hasFlexiblePackage}
                    aria-disabled={!hasFlexiblePackage || undefined}
                >
                    <span className={`${styles.bookingModeIcon} ${styles.availabilityModeIcon}`}>
                        <MousePointerClick size={20} />
                    </span>
                    <span className={styles.comboType}>Theo lịch rảnh</span>
                    <h3>Tự chọn lịch rảnh</h3>
                    <small>
                        {!hasFlexiblePackage ? "Gia sư chưa mở lịch tự chọn" : isAvailability ? "Đã chọn" : "Chọn cách này"}
                    </small>
                </button>

                <button
                    type="button"
                    className={`${styles.bookingModeCard} ${isPackage ? styles.selectedCard : ""}`}
                    onClick={() => hasCombos && select("package")}
                    disabled={!hasCombos}
                    aria-disabled={!hasCombos || undefined}
                >
                    <span className={`${styles.bookingModeIcon} ${styles.packageModeIcon}`}>
                        <PackageCheck size={20} />
                    </span>
                    <span className={styles.comboType}>Theo gói cố định</span>
                    <h3>Chọn gói cố định</h3>
                    <small>{!hasCombos ? "Gia sư chưa có gói" : isPackage ? "Đã chọn" : "Xem các gói"}</small>
                </button>
            </div>
        </>
    );
};

export default StepBookingMode;
