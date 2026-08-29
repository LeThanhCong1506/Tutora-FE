import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, Clock, ShieldAlert, Wallet, X } from "lucide-react";
import PaymentModal from "../../components/PaymentModal/PaymentModal";
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
    MIN_BOOKING_LEAD_HOURS,
    MIN_LEAD_HOURS_STUDENT_REQUEST,
    PARENT_REVIEW_HOURS,
} from "./booking-components";
import type { BookingModalProps, StepProps, Subject } from "./booking-components";
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
    resumeBookingId,
}) => {
    const navigate = useNavigate();
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
        eligibilityBlock,
        requiresParentPayment,
        bookingPhase,
        successBookingId,
        handlePaymentSuccess,
        deferPayment,
        resumePayment,
    } = useBookingForm({ isOpen, tutorId, tutorTeachingMode, resumeBookingId });

    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const subjectGradePrices = useMemo(() => rawSubjectGradePrices ?? [], [rawSubjectGradePrices]);
    const packages = useMemo(() => rawPackages ?? [], [rawPackages]);

    const handleViewBookingInfo = () => {
        onClose();
        navigate("/parent-portal/booking");
    };

    // Danh sách môn có thể đặt. BE đã bỏ field `subjects` riêng — nguồn chân lý giờ là
    // `subjectGradePrices` (mỗi dòng = 1 môn × 1 khối + giá). Gom theo subjectId để mỗi
    // môn 1 thẻ, kèm gradeLevels của tutor (để StepStudentSubject hiển thị + check khớp lớp).
    const availableSubjects = useMemo<Subject[]>(() => {
        const bySubject = new Map<number, Subject>();
        for (const price of subjectGradePrices) {
            if (price.isActive === false) continue;
            const gradeName = price.gradeLevelName?.trim();
            const existing = bySubject.get(price.subjectId);
            if (existing) {
                if (gradeName && !existing.gradeLevels!.includes(gradeName)) {
                    existing.gradeLevels!.push(gradeName);
                }
                continue;
            }
            const mapped = SUBJECT_MAPPING.find((s) => s.id === price.subjectId);
            bySubject.set(price.subjectId, {
                id: price.subjectId,
                name: mapped?.name ?? price.subjectName ?? `Môn #${price.subjectId}`,
                gradeLevels: gradeName ? [gradeName] : [],
            });
        }

        // Fallback legacy: hồ sơ cũ còn field `subjects` mà chưa có subjectGradePrices.
        if (bySubject.size === 0) {
            return SUBJECT_MAPPING.filter((s) =>
                subjects.some((tutorSubj) => tutorSubj.subjectId === s.id),
            ).map((s) => {
                const tutorSubj = subjects.find((t) => t.subjectId === s.id);
                // gradeLevels từ BE có thể là mảng, chuỗi JSON hoặc CSV → chuẩn hoá về string[].
                return { ...s, gradeLevels: parseStringArray(tutorSubj?.gradeLevels) };
            });
        }

        return [...bySubject.values()];
    }, [subjectGradePrices, subjects]);

    const selectedCombo = combos.find(
        (combo) => combo.id === formData.comboId && combo.subjectId === formData.subjectId,
    );
    const hasCombos = combos.some((combo) => combo.type === "fixed" && combo.subjectId === formData.subjectId);
    const flexiblePackage = packages.find((pkg) => pkg.isActive && pkg.packageType === 1);
    const hasFlexiblePackage = Boolean(flexiblePackage);
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
    const isStudentGradeMissing = gradeMatchInfo?.missingStudentGrade === true;
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

    // Draft cũ hoặc dữ liệu vừa refresh có thể giữ combo của môn trước. Không để package
    // đó tiếp tục được submit sau khi môn đã đổi.
    useEffect(() => {
        if (formData.bookingMode !== "package" || !formData.comboId || selectedCombo) return;
        setFormData((current) => ({
            ...current,
            comboId: null,
            packageId: undefined,
            startDate: "",
            schedule: [],
        }));
    }, [formData.bookingMode, formData.comboId, selectedCombo, setFormData]);

    const scheduling = useBookingSchedule({
        isOpen,
        tutorId,
        availabilities: availabilities || [],
        sessionHours,
        sessionsPerWeek: selectedSubjectGradePrice?.sessionsPerWeek ?? 1,
        // Yêu cầu của học sinh cần thời gian báo trước dài hơn (phụ huynh duyệt + gia sư phản hồi).
        minLeadHours: requiresParentPayment ? MIN_LEAD_HOURS_STUDENT_REQUEST : MIN_BOOKING_LEAD_HOURS,
        selectedCombo,
        subjectId: formData.subjectId,
        bookingMode: formData.bookingMode,
        comboId: formData.comboId,
        schedule: formData.schedule,
        startDate: formData.startDate,
        setFormData,
    });

    // Nhịp đồng hồ cho phần đếm ngược. Dùng state thay vì Date.now() trong useMemo: gọi hàm
    // không thuần lúc render khiến giá trị lệch giữa các lần render, và số đếm cũng không tự chạy.
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        if (!isOpen) return;
        const id = window.setInterval(() => setNowTs(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, [isOpen]);

    /**
     * Mốc phụ huynh phải thanh toán trước, tính từ buổi học SỚM NHẤT học sinh vừa chọn.
     *
     * Khớp `BookingLeadTimePolicy.ResolveParentPaymentDeadline`: sớm hơn giữa `bây giờ + 24h`
     * và `buổi đầu − 24h`. Vế đầu buộc phụ huynh trả lời trong một ngày; vế sau là cùng luật mà
     * phụ huynh tự đặt lịch phải tuân thủ. Phải hiện mốc THẬT chứ không ghi cứng con số giờ —
     * buổi càng gần thì cửa sổ càng hẹp, có khi chỉ còn 2 tiếng, và học sinh cần thấy điều đó
     * TRƯỚC khi gửi để còn kịp chọn buổi xa hơn.
     */
    const parentDeadline = useMemo(() => {
        if (!requiresParentPayment || scheduling.selectedSlots.length === 0) return null;

        const first = scheduling.selectedSlots
            .map((slot) => new Date(`${slot.date}T${slot.startTime}`))
            .filter((d) => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime())[0];
        if (!first) return null;

        const byLessonLead = first.getTime() - MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000;
        const byReviewWindow = nowTs + PARENT_REVIEW_HOURS * 60 * 60 * 1000;
        const deadline = new Date(Math.min(byLessonLead, byReviewWindow));
        const msLeft = deadline.getTime() - nowTs;
        if (msLeft <= 0) return null;

        const hours = Math.floor(msLeft / (60 * 60 * 1000));
        const minutes = Math.round((msLeft % (60 * 60 * 1000)) / (60 * 1000));

        return {
            text: deadline.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
            }),
            remaining: hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`,
        };
    }, [requiresParentPayment, scheduling.selectedSlots, nowTs]);

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

    // Sau khi tạo booking, mở bước thanh toán buổi học đầu tiên. PaymentModal tự dựng
    // overlay riêng (z-index cao hơn) nên render trực tiếp ở đây là đủ phủ kín màn hình.
    if (bookingPhase === "payment" && successBookingId != null) {
        return (
            <PaymentModal
                bookingId={successBookingId}
                isOpen
                onClose={deferPayment}
                onPaymentSuccess={handlePaymentSuccess}
                tutorId={tutorId}
            />
        );
    }

    const canNext = () => {
        switch (step) {
            case 0:
                if (userRole === "Student") {
                    return formData.subjectId !== 0 && selectedStudent != null && !isStudentGradeMissing;
                }
                return formData.studentId !== "" && formData.subjectId !== 0 && !isStudentGradeMissing;
            case 1:
                if (!hasFlexiblePackage && !hasCombos) return false;
                return formData.bookingMode === "schedule" || formData.bookingMode === "package";
            case 2:
                if (formData.bookingMode === "package" && formData.comboId === null) return false;
                // Chế độ tự chọn lịch: tuần mẫu phải đủ ĐÚNG số buổi/tuần gia sư nhận dạy, vì
                // pattern đó được lặp cho các tuần sau. Trang demo đã có luật này từ đầu
                // (ParentBookingDemo) nhưng bị rơi mất khi port sang modal thật.
                if (formData.bookingMode === "schedule" && scheduling.remainingWeekPicks > 0) return false;
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
                    } else if (isStudentGradeMissing) {
                        toast.warning(
                            "Học sinh chưa cập nhật khối lớp. Vui lòng cập nhật hồ sơ trước khi đặt lịch.",
                        );
                    }
                    break;
                case 1:
                    if (!hasFlexiblePackage && !hasCombos) {
                        toast.warning("Gia sư chưa cấu hình xong gói học. Vui lòng thử lại sau hoặc chọn gia sư khác.");
                    } else {
                        toast.warning("Vui lòng chọn cách đặt lịch trước khi tiếp tục.");
                    }
                    break;
                case 2:
                    if (formData.bookingMode === "package" && formData.comboId === null) {
                        toast.warning("Vui lòng chọn 1 gói cố định trước khi tiếp tục.");
                    } else if (scheduling.bookedSlotsLoading) {
                        toast.info("Đang kiểm tra lịch đã đặt của gia sư.");
                    } else if (scheduling.hasSelectedSlotConflict) {
                        toast.warning("Lịch đã chọn trùng với một buổi học hiện có của gia sư.");
                    } else if (formData.bookingMode === "schedule" && scheduling.remainingWeekPicks > 0) {
                        toast.warning(
                            `Vui lòng chọn thêm ${scheduling.remainingWeekPicks} buổi nữa cho tuần mẫu ` +
                            `(gia sư nhận dạy ${scheduling.pickedWeekSlots.length + scheduling.remainingWeekPicks} buổi/tuần).`,
                        );
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
        bookingPhase === "form" &&
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
        hasFlexiblePackage,
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
                className={`${styles.bookingModal} ${bookingPhase !== "form" ? styles.successModalShell : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={`Đặt lịch học với ${tutorName}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {bookingPhase !== "form" ? (
                    <div className={styles.modalSuccess}>
                        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng modal">
                            <X size={22} />
                        </button>
                        <div className={styles.successContent}>
                            {bookingPhase === "sent" ? (
                                <>
                                    <span className={styles.successIcon}>
                                        <CheckCircle2 size={42} />
                                    </span>
                                    <span className={styles.eyebrow}>Đã gửi cho phụ huynh</span>
                                    <h2>Yêu cầu đặt lịch đã được gửi</h2>
                                    <p>
                                        Phụ huynh sẽ nhận được thông báo để xem lại và thanh toán buổi học đầu
                                        tiên với <strong>{tutorName}</strong>.
                                        {parentDeadline
                                            ? ` Hạn thanh toán: ${parentDeadline.text}.`
                                            : ""}{" "}
                                        Sau khi phụ huynh thanh toán, yêu cầu mới được gửi tới gia sư xác nhận.
                                    </p>
                                    {successBookingId != null && (
                                        <div className={styles.bookingCode}>
                                            <span>Mã đặt lịch</span>
                                            <strong>#{successBookingId}</strong>
                                        </div>
                                    )}
                                </>
                            ) : bookingPhase === "paid" ? (
                                <>
                                    <span className={styles.successIcon}>
                                        <CheckCircle2 size={42} />
                                    </span>
                                    <span className={styles.eyebrow}>Thanh toán thành công</span>
                                    <h2>Đã thanh toán buổi học đầu tiên</h2>
                                    <p>
                                        Yêu cầu đặt lịch đã được gửi tới <strong>{tutorName}</strong>. Gia sư sẽ xác nhận
                                        trong thời gian sớm nhất. Nếu gia sư không phản hồi, tiền sẽ được hoàn vào ví của
                                        bạn.
                                    </p>
                                    {successBookingId != null && (
                                        <div className={styles.bookingCode}>
                                            <span>Mã đặt lịch</span>
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
                                    <button type="button" className={styles.primaryButton} onClick={handleViewBookingInfo}>
                                        <ArrowRight size={16} />
                                        Xem thông tin buổi học
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className={styles.successIcon}>
                                        <Clock size={42} />
                                    </span>
                                    <span className={styles.eyebrow}>Chưa thanh toán</span>
                                    <h2>Đặt lịch đã được tạo</h2>
                                    <p>
                                        Vui lòng thanh toán buổi học đầu tiên trong vòng <strong>10 phút</strong> để gửi yêu
                                        cầu tới <strong>{tutorName}</strong>. Quá hạn, booking sẽ tự động bị hủy.
                                    </p>
                                    {successBookingId != null && (
                                        <div className={styles.bookingCode}>
                                            <span>Mã đặt lịch</span>
                                            <strong>#{successBookingId}</strong>
                                        </div>
                                    )}
                                    <div className={styles.successActions}>
                                        <button
                                            type="button"
                                            className={styles.primaryButton}
                                            onClick={resumePayment}
                                        >
                                            <Wallet size={16} />
                                            Thanh toán ngay
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.secondaryButton}
                                            onClick={onClose}
                                        >
                                            Để sau
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
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

                        {eligibilityBlock && (
                            <div className={styles.eligibilityBanner}>
                                <ShieldAlert size={18} />
                                <span>
                                    {eligibilityBlock.reason}
                                    {eligibilityBlock.reasonCode !== "STUDENT_MANAGED_BY_PARENT" && (
                                        <>
                                            {" "}
                                            <a
                                                href="/student-portal/profile"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.eligibilityLink}
                                            >
                                                Xác minh ngay →
                                            </a>
                                        </>
                                    )}
                                </span>
                            </div>
                        )}

                        {requiresParentPayment && !eligibilityBlock && (
                            <div className={styles.parentPaymentNotice}>
                                <ShieldAlert size={18} />
                                <span>
                                    Bạn chọn gia sư và khung giờ, sau đó yêu cầu sẽ được gửi tới phụ huynh
                                    để duyệt và thanh toán.
                                    {parentDeadline ? (
                                        <>
                                            {" "}Phụ huynh cần thanh toán trước{" "}
                                            <strong>{parentDeadline.text}</strong> (còn {parentDeadline.remaining}).
                                        </>
                                    ) : (
                                        <> Buổi học càng gần thì phụ huynh càng ít thời gian xác nhận.</>
                                    )}
                                </span>
                            </div>
                        )}

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
                                <div className={styles.footerActions}>
                                    {/* Bộ đếm đứng cạnh nút: nút bị khoá cho tới khi đủ tuần mẫu, nên
                                        phải nói ngay còn thiếu mấy buổi thay vì để phụ huynh đoán. */}
                                    {step === 2 && formData.bookingMode === "schedule" && (
                                        <span
                                            className={
                                                scheduling.remainingWeekPicks > 0
                                                    ? styles.pickCounter
                                                    : `${styles.pickCounter} ${styles.pickCounterDone}`
                                            }
                                            aria-live="polite"
                                        >
                                            {scheduling.remainingWeekPicks > 0
                                                ? `Còn ${scheduling.remainingWeekPicks} buổi`
                                                : "Đã chọn đủ"}
                                            <small>
                                                {scheduling.pickedWeekSlots.length}/
                                                {scheduling.pickedWeekSlots.length + scheduling.remainingWeekPicks} buổi mỗi tuần
                                            </small>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className={styles.primaryButton}
                                        onClick={handleNext}
                                        disabled={submitting || (step === 0 && isStudentGradeMissing)}
                                    >
                                        Tiếp theo
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
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
