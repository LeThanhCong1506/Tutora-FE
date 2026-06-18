import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, RotateCcw, X } from "lucide-react";
import {
    BookingStepper,
    StepBookingMode,
    StepReview,
    StepSchedule,
    StepStudentSubject,
    SUBJECT_MAPPING,
    STEPS,
    parseStringArray,
    formatFullDate,
    getGradeMatchInfo,
    normalizeGradeToken,
    useBookingForm,
    useBookingSchedule,
} from "./booking-components";
import type { BookingModalProps, StepProps } from "./booking-components";
import styles from "./booking-components/bookingModal.module.css";

const packageIdFromComboId = (comboId: string | null): number | undefined => {
    const match = comboId?.match(/^pkg_(\d+)$/);
    if (!match) return undefined;
    const packageId = Number(match[1]);
    return Number.isFinite(packageId) ? packageId : undefined;
};

const BookingModal: React.FC<BookingModalProps> = ({
    isOpen,
    onClose,
    tutorName,
    tutorId,
    hourlyRate,
    subjects,
    subjectGradePrices: rawSubjectGradePrices = [],
    packages: rawPackages = [],
    availabilities,
    tutorTeachingMode,
    combos = [],
}) => {
    const {
        formData,
        setFormData,
        step,
        setStep,
        slotDuration,
        setSlotDuration,
        students,
        loadingStudents,
        userRole,
        submitting,
        submitError,
        setSubmitError,
        handleSubmit,
        bookingSuccess,
        successBookingId,
    } = useBookingForm({ isOpen, tutorId, onClose, tutorTeachingMode });

    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const subjectGradePrices = useMemo(() => rawSubjectGradePrices ?? [], [rawSubjectGradePrices]);
    const packages = useMemo(() => rawPackages ?? [], [rawPackages]);

    // Compute available subjects (intersection of SUBJECT_MAPPING and tutor's subjects).
    // Enrich với gradeLevels của tutor để StepStudentSubject hiển thị + check khớp lớp.
    const availableSubjects = SUBJECT_MAPPING.filter((s) =>
        subjects.some((tutorSubj) => tutorSubj.subjectId === s.id),
    ).map((s) => {
        const tutorSubj = subjects.find((t) => t.subjectId === s.id);
        // gradeLevels từ BE có thể là mảng, chuỗi JSON hoặc CSV → chuẩn hoá về string[].
        return { ...s, gradeLevels: parseStringArray(tutorSubj?.gradeLevels) };
    });

    const selectedCombo = combos.find((c) => c.id === formData.comboId);
    const flexiblePackage = packages.find((pkg) => pkg.isActive && pkg.packageType === 1);
    const selectedPackageId =
        formData.bookingMode === "schedule" ? flexiblePackage?.packageId : packageIdFromComboId(formData.comboId);
    const selectedStudent = students.find((s) => s.studentId === formData.studentId);
    const selectedSubjectInfo = availableSubjects.find((subject) => subject.id === formData.subjectId);
    const gradeMatchInfo = getGradeMatchInfo(
        selectedStudent,
        formData.subjectId,
        subjectGradePrices,
        selectedSubjectInfo?.gradeLevels,
    );
    const gradeMatches = gradeMatchInfo?.matches ?? true;
    const selectedGradeToken = normalizeGradeToken(selectedStudent?.gradeLevel);
    const selectedSubjectGradePrice = useMemo(() => {
        const activePrices = subjectGradePrices.filter(
            (price) => price.isActive !== false && price.subjectId === formData.subjectId,
        );
        if (activePrices.length === 0) return undefined;

        if (selectedStudent?.gradeLevelId != null || selectedGradeToken) {
            const matchedByGrade = activePrices.find(
                (price) =>
                    (selectedStudent?.gradeLevelId != null &&
                        price.gradeLevelId === selectedStudent.gradeLevelId) ||
                    normalizeGradeToken(price.gradeLevelName) === selectedGradeToken,
            );
            if (matchedByGrade) return matchedByGrade;
        }

        return activePrices[0];
    }, [formData.subjectId, selectedGradeToken, selectedStudent, subjectGradePrices]);
    const sessionHours =
        selectedSubjectGradePrice?.durationMinutesPerSession && selectedSubjectGradePrice.durationMinutesPerSession > 0
            ? selectedSubjectGradePrice.durationMinutesPerSession / 60
            : slotDuration;

    useEffect(() => {
        const nextPriceId = selectedSubjectGradePrice?.id;
        const nextDuration =
            selectedSubjectGradePrice?.durationMinutesPerSession &&
            selectedSubjectGradePrice.durationMinutesPerSession > 0
                ? selectedSubjectGradePrice.durationMinutesPerSession / 60
                : null;

        if (nextDuration && Number.isFinite(nextDuration) && slotDuration !== nextDuration) {
            setSlotDuration(nextDuration);
        }

        setFormData((d) =>
            d.tutorSubjectGradePriceId === nextPriceId ? d : { ...d, tutorSubjectGradePriceId: nextPriceId },
        );
    }, [
        selectedSubjectGradePrice?.id,
        selectedSubjectGradePrice?.durationMinutesPerSession,
        setFormData,
        setSlotDuration,
        slotDuration,
    ]);

    useEffect(() => {
        setFormData((d) => (d.packageId === selectedPackageId ? d : { ...d, packageId: selectedPackageId }));
    }, [selectedPackageId, setFormData]);

    const scheduling = useBookingSchedule({
        isOpen,
        tutorId,
        availabilities: availabilities || [],
        sessionHours,
        selectedCombo,
        subjectId: formData.subjectId,
        bookingMode: formData.bookingMode,
        comboId: formData.comboId,
        schedule: formData.schedule,
        startDate: formData.startDate,
        setFormData,
    });

    // Khoá scroll nền khi modal mở.
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const canNext = () => {
        switch (step) {
            case 0:
                if (userRole === "Student") {
                    return formData.subjectId !== 0 && selectedStudent != null && gradeMatches;
                }
                return formData.studentId !== "" && formData.subjectId !== 0 && gradeMatches;
            case 1:
                return formData.bookingMode === "schedule" || formData.bookingMode === "package";
            case 2:
                if (formData.bookingMode === "package" && formData.comboId === null) return false;
                return (
                    !scheduling.bookedSlotsLoading &&
                    !scheduling.hasSelectedSlotConflict &&
                    formData.schedule.length > 0
                );
            case 3:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (!canNext()) {
            switch (step) {
                case 0:
                    if (!formData.subjectId) {
                        toast.warning("Vui lòng chọn môn học trước khi tiếp tục.");
                    } else if (!formData.studentId) {
                        toast.warning("Vui lòng chọn học sinh trước khi tiếp tục.");
                    } else if (loadingStudents) {
                        toast.info("Đang tải thông tin khối lớp của học sinh.");
                    } else if (!selectedStudent) {
                        toast.warning("Không thể xác định hồ sơ học sinh. Vui lòng tải lại trang và thử lại.");
                    } else if (!gradeMatches) {
                        toast.warning(
                            gradeMatchInfo?.missingStudentGrade
                                ? "Học sinh chưa cập nhật khối lớp. Vui lòng cập nhật hồ sơ trước khi đặt lịch."
                                : "Khối lớp của học sinh không phù hợp với môn gia sư đang dạy.",
                        );
                    }
                    break;
                case 1:
                    toast.warning("Vui lòng chọn cách đặt lịch trước khi tiếp tục.");
                    break;
                case 2:
                    if (formData.bookingMode === "package" && formData.comboId === null) {
                        toast.warning("Vui lòng chọn 1 gói cố định trước khi tiếp tục.");
                    } else if (scheduling.bookedSlotsLoading) {
                        toast.info("Đang kiểm tra lịch đã đặt của gia sư.");
                    } else if (scheduling.hasSelectedSlotConflict) {
                        toast.warning("Lịch đã chọn trùng với một buổi học hiện có của gia sư.");
                    } else {
                        toast.warning("Vui lòng chọn ít nhất 1 buổi học trước khi tiếp tục.");
                    }
                    break;
            }
            return;
        }
        setStep((s) => s + 1);
    };

    const hasBookingProgress =
        !bookingSuccess &&
        (formData.subjectId !== 0 ||
            formData.studentId !== "" ||
            formData.comboId !== null ||
            scheduling.selectedSlots.length > 0 ||
            step > 0);

    // Đóng giữa chừng (chưa gửi) → hỏi xác nhận tránh mất lựa chọn do lỡ click nền.
    const requestClose = () => {
        if (hasBookingProgress) {
            setCloseConfirmOpen(true);
            return;
        }
        onClose();
    };

    // Giá tính theo môn/lớp ĐANG CHỌN (pricePerHour), không dùng hourlyRate phẳng của
    // gia sư — BE suy hourlyRate = giá thấp nhất trong các môn nên dễ lệch khi đặt môn khác.
    const effectiveHourlyRate = selectedSubjectGradePrice?.pricePerHour ?? hourlyRate;

    const stepProps: StepProps = {
        formData,
        setFormData,
        hourlyRate: effectiveHourlyRate,
        students,
        loadingStudents,
        availableSubjects,
        subjectGradePrices,
        availabilities: availabilities || [],
        slotDuration,
        setSlotDuration,
        userRole,
        tutorTeachingMode: tutorTeachingMode ?? null,
        combos,
        scheduling,
        sessionHours,
        selectedCombo,
        tutorName,
        submitError,
        onDismissSubmitError: () => setSubmitError(null),
    };

    return (
        <div className={styles.modalBackdrop} onMouseDown={requestClose}>
            <section
                className={styles.bookingModal}
                role="dialog"
                aria-modal="true"
                aria-label={`Đặt lịch học với ${tutorName}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {bookingSuccess ? (
                    <div className={styles.modalSuccess}>
                        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng modal">
                            <X size={22} />
                        </button>
                        <span className={styles.successIcon}>
                            <CheckCircle2 size={42} />
                        </span>
                        <span className={styles.eyebrow}>Gửi yêu cầu thành công</span>
                        <h2>Yêu cầu đặt lịch đã được gửi</h2>
                        <p>Gia sư sẽ xem lịch học và phản hồi cho phụ huynh trong thời gian sớm nhất.</p>
                        {successBookingId != null && (
                            <div className={styles.bookingCode}>
                                <span>Mã booking</span>
                                <strong>#{successBookingId}</strong>
                            </div>
                        )}
                        {scheduling.bookingWindowStart && scheduling.bookingWindowEnd && (
                            <div className={styles.successTerm}>
                                <CalendarRange size={16} />
                                <span>
                                    Hiệu lực booking: {formatFullDate(scheduling.bookingWindowStart)} -{" "}
                                    {formatFullDate(scheduling.bookingWindowEnd)}
                                </span>
                            </div>
                        )}
                        <button type="button" className={styles.primaryButton} onClick={onClose}>
                            <RotateCcw size={16} />
                            Hoàn tất
                        </button>
                    </div>
                ) : (
                    <>
                        <header className={styles.modalHeader}>
                            <div>
                                <h2>Đặt lịch học</h2>
                                <p>
                                    với <strong>{tutorName}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                className={styles.modalClose}
                                onClick={requestClose}
                                aria-label="Đóng modal"
                            >
                                <X size={22} />
                            </button>
                        </header>

                        <BookingStepper step={step} />

                        <div className={styles.modalBody}>
                            {step === 0 && <StepStudentSubject {...stepProps} />}
                            {step === 1 && <StepBookingMode {...stepProps} />}
                            {step === 2 && <StepSchedule {...stepProps} />}
                            {step === 3 && <StepReview {...stepProps} />}
                        </div>

                        <footer className={styles.modalFooter}>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => setStep((s) => Math.max(0, s - 1))}
                                disabled={step === 0 || submitting}
                            >
                                <ArrowLeft size={16} />
                                Quay lại
                            </button>
                            {step < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={handleNext}
                                    disabled={submitting || (step === 0 && gradeMatchInfo?.matches === false)}
                                >
                                    Tiếp theo
                                    <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => handleSubmit(scheduling.selectedSlots)}
                                    disabled={submitting}
                                >
                                    {submitting ? "Đang xử lý..." : "Gửi yêu cầu"}
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </footer>
                    </>
                )}

                {closeConfirmOpen && (
                    <div className={styles.closeConfirm}>
                        <div className={styles.closeConfirmCard}>
                            <h3>Thoát đặt lịch?</h3>
                            <p>Các lựa chọn hiện tại (môn, trẻ, gói, lịch học) sẽ bị xoá. Bạn có chắc muốn thoát?</p>
                            <div className={styles.closeConfirmActions}>
                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() => {
                                        setCloseConfirmOpen(false);
                                        onClose();
                                    }}
                                >
                                    Thoát, bỏ lựa chọn
                                </button>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => setCloseConfirmOpen(false)}
                                >
                                    Tiếp tục đặt
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default BookingModal;
