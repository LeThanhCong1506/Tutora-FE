import { AlertTriangle, CheckCircle2, ShieldCheck, X } from "lucide-react";
import type { StepProps } from "./types";
import MonthSimulation from "./MonthSimulation";
import { formatDuration, formatPrice, studentInitials } from "./utils";
import styles from "./bookingModal.module.css";

const StepReview: React.FC<StepProps> = ({
    formData,
    students,
    availableSubjects,
    hourlyRate,
    scheduling,
    sessionHours,
    selectedCombo,
    tutorName,
    submitError,
    onDismissSubmitError,
}) => {
    const selectedSubject = availableSubjects.find((s) => s.id === formData.subjectId);
    const selectedStudent = students.find((s) => s.studentId === formData.studentId);
    const isAvailabilityMode = formData.bookingMode === "schedule";
    const scheduleChoiceLabel = isAvailabilityMode ? "Tự chọn lịch rảnh" : (selectedCombo?.name ?? "Gói cố định");

    const { selectedSlots, bookingWindowStart, bookingWindowEnd, today } = scheduling;
    const chosenHours = selectedSlots.reduce((sum, slot) => sum + slot.durationHours, 0);
    const subtotal = chosenHours * hourlyRate;
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + serviceFee;

    return (
        <>
            <div className={styles.sectionHeading}>
                <span className={styles.headingIcon}>
                    <CheckCircle2 size={20} />
                </span>
                <div>
                    <span className={styles.eyebrow}>Bước 04</span>
                    <h2>Xác nhận đặt lịch</h2>
                </div>
            </div>

            <div className={styles.confirmLayout}>
                <div className={styles.confirmMain}>
                    <section className={styles.reviewHero}>
                        <span className={styles.reviewHeroAvatar}>{studentInitials(tutorName)}</span>
                        <div className={styles.reviewHeroContent}>
                            <span className={styles.eyebrow}>Tóm tắt đặt lịch</span>
                            <h3>
                                {selectedSubject?.name ?? "Môn học"} · {selectedStudent?.fullName ?? "Học sinh"}
                            </h3>
                            <p>
                                {tutorName} · {scheduleChoiceLabel}
                            </p>
                        </div>
                        <div className={styles.confirmQuickFacts}>
                            <span>
                                <b>{selectedSlots.length}</b>
                                <small>buổi</small>
                            </span>
                            <span>
                                <b>{formatDuration(sessionHours)}</b>
                                <small>/ buổi</small>
                            </span>
                            <span>
                                <b>{chosenHours}</b>
                                <small>giờ</small>
                            </span>
                        </div>
                    </section>

                    <MonthSimulation
                        slots={selectedSlots}
                        windowStart={bookingWindowStart ?? today}
                        windowEnd={bookingWindowEnd ?? today}
                        variant="confirm"
                    />
                </div>

                <aside className={styles.confirmAside}>
                    <div className={styles.priceSummary}>
                        <div className={styles.priceSummaryHead}>
                            <span className={styles.eyebrow}>Học phí dự kiến</span>
                            <strong>{formatPrice(total)}</strong>
                            <small>Tổng thanh toán</small>
                        </div>
                        <div className={styles.priceLine}>
                            <span>Học phí · {chosenHours} giờ</span>
                            <strong>{formatPrice(subtotal)}</strong>
                        </div>
                        <div className={styles.priceLine}>
                            <span>Phí dịch vụ (5%)</span>
                            <strong>{formatPrice(serviceFee)}</strong>
                        </div>
                        <p className={styles.priceSummaryNote}>
                            <ShieldCheck size={14} />
                            Thanh toán sau khi gia sư xác nhận lịch học.
                        </p>
                    </div>

                    {submitError && (
                        <div className={`${styles.warningBox} ${styles.reviewErrorBox}`} role="alert">
                            <AlertTriangle size={18} />
                            <div>
                                <strong>{submitError}</strong>
                            </div>
                            <button
                                type="button"
                                className={styles.warningDismiss}
                                onClick={onDismissSubmitError}
                                aria-label="Đóng cảnh báo"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
};

export default StepReview;
