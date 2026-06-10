import { toast } from "react-toastify";
import {
    BookingErrorToast,
    BookingStepper,
    BookingSuccessOverlay,
    StepBookingMode,
    StepReview,
    StepSchedule,
    StepStudentSubject,
    SUBJECT_MAPPING,
    STEPS,
    useBookingForm,
} from "./booking-components";
import type { BookingModalProps, StepProps } from "./booking-components";
import "./BookingModal.css";

const BookingModal: React.FC<BookingModalProps> = ({
    isOpen,
    onClose,
    tutorName,
    tutorId,
    hourlyRate,
    subjects,
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

    // Compute available subjects (intersection of SUBJECT_MAPPING and tutor's subjects).
    // Enrich với gradeLevels của tutor để StepStudentSubject hiển thị + check khớp lớp.
    const availableSubjects = SUBJECT_MAPPING.filter((s) =>
        subjects.some((tutorSubj) => tutorSubj.subjectId === s.id),
    ).map((s) => {
        const tutorSubj = subjects.find((t) => t.subjectId === s.id);
        return { ...s, gradeLevels: tutorSubj?.gradeLevels ?? [] };
    });

    // Grade matching: nếu parent đã chọn student + subject, check student.gradeLevel có trong subject.gradeLevels không.
    const selectedStudent = students.find((s) => s.studentId === formData.studentId);
    const selectedSubjectInfo = availableSubjects.find((s) => s.id === formData.subjectId);
    const gradeMatches = (() => {
        if (!selectedStudent || !selectedSubjectInfo) return true; // chưa chọn đủ → không block
        const grades = selectedSubjectInfo.gradeLevels ?? [];
        if (grades.length === 0) return true; // tutor không khai báo khối → cho qua
        return grades.includes(selectedStudent.gradeLevel);
    })();

    if (!isOpen) return null;

    const canNext = () => {
        switch (step) {
            case 0:
                // Student role: only need subject selected (studentId is auto-set)
                if (userRole === "Student") return formData.subjectId !== 0;
                // Parent role: need both student and subject selected + grade khớp.
                return formData.studentId !== "" && formData.subjectId !== 0 && gradeMatches;
            case 1:
                // BookingMode: nếu "package" thì phải chọn combo nào đó.
                if (formData.bookingMode === "package") return formData.comboId !== null;
                return true; // "schedule" mode không cần input gì ở step này
            case 2: return formData.schedule.length > 0;
            case 3: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (!canNext()) {
            switch (step) {
                case 0:
                    if (userRole === "Student") {
                        toast.warning("Vui lòng chọn môn học trước khi tiếp tục.");
                    } else if (!formData.studentId) {
                        toast.warning("Vui lòng chọn học sinh trước khi tiếp tục.");
                    } else if (!formData.subjectId) {
                        toast.warning("Vui lòng chọn môn học trước khi tiếp tục.");
                    } else if (!gradeMatches) {
                        toast.warning("Học sinh và khối lớp gia sư dạy không khớp. Hãy đổi học sinh hoặc môn khác.");
                    }
                    break;
                case 1:
                    toast.warning("Vui lòng chọn 1 combo gói trước khi tiếp tục.");
                    break;
                case 2:
                    toast.warning("Vui lòng chọn ít nhất 1 slot lịch học trước khi tiếp tục.");
                    break;
            }
            return;
        }
        setStep((s) => s + 1);
    };

    const stepProps: StepProps = {
        formData,
        setFormData,
        hourlyRate,
        students,
        loadingStudents,
        availableSubjects,
        availabilities: availabilities || [],
        slotDuration,
        setSlotDuration,
        userRole,
        tutorTeachingMode: tutorTeachingMode ?? null,
        combos,
    };

    return (
        <div className="bm-overlay" onClick={onClose}>
            <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
                {bookingSuccess && (
                    <BookingSuccessOverlay
                        tutorName={tutorName}
                        bookingId={successBookingId}
                        onClose={onClose}
                    />
                )}

                {submitError && (
                    <BookingErrorToast
                        message={submitError}
                        onClose={() => setSubmitError(null)}
                    />
                )}

                {/* Modal Header */}
                <div className="bm-header">
                    <div className="bm-header-info">
                        <h2 className="bm-title">Đặt lịch với {tutorName}</h2>
                    </div>
                    <button className="bm-close" onClick={onClose} type="button">✕</button>
                </div>

                <BookingStepper step={step} />

                {/* Step Content */}
                <div className="bm-body">
                    {step === 0 && <StepStudentSubject {...stepProps} />}
                    {step === 1 && <StepBookingMode {...stepProps} />}
                    {step === 2 && <StepSchedule {...stepProps} />}
                    {step === 3 && <StepReview {...stepProps} />}
                </div>

                {/* Footer */}
                <div className="bm-footer">
                    {step > 0 && (
                        <button className="bm-btn-back" onClick={() => setStep((s) => s - 1)} disabled={submitting} type="button">
                            ← Quay lại
                        </button>
                    )}
                    <div className="bm-footer-right">
                        {step < STEPS.length - 1 ? (
                            <button className="bm-btn-next" onClick={handleNext} type="button">
                                Tiếp theo →
                            </button>
                        ) : (
                            <button className="bm-btn-submit" onClick={handleSubmit} disabled={submitting} type="button">
                                {submitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingModal;
