import { useEffect } from "react";
import { MousePointerClick, PackageCheck, Route } from "lucide-react";
import type { StepProps } from "./types";
import styles from "./bookingModal.module.css";

/**
 * Bước 2 — phụ huynh chọn CÁCH đặt lịch:
 *   1. "Tự chọn lịch rảnh": tự pick slot từ lịch trống của gia sư.
 *   2. "Chọn gói cố định": chọn 1 gói cố định có sẵn của gia sư.
 *
 * Nếu gia sư không có gói nào → auto-pin "schedule" và khóa thẻ gói.
 */
const StepBookingMode: React.FC<StepProps> = ({ formData, setFormData, combos }) => {
    const hasCombos = combos.some((combo) => combo.type === "fixed" && combo.subjectId === formData.subjectId);

    useEffect(() => {
        if (!hasCombos && formData.bookingMode !== "schedule") {
            setFormData((d) => ({ ...d, bookingMode: "schedule", comboId: null }));
        }
    }, [hasCombos, formData.bookingMode, setFormData]);

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

            <div className={styles.bookingModeGrid}>
                <button
                    type="button"
                    className={`${styles.bookingModeCard} ${isAvailability ? styles.selectedCard : ""}`}
                    onClick={() => select("schedule")}
                >
                    <span className={`${styles.bookingModeIcon} ${styles.availabilityModeIcon}`}>
                        <MousePointerClick size={20} />
                    </span>
                    <span className={styles.comboType}>Theo lịch rảnh</span>
                    <h3>Tự chọn lịch rảnh</h3>
                    <small>{isAvailability ? "Đã chọn" : "Chọn cách này"}</small>
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
