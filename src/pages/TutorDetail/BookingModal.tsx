import { toast } from "react-toastify";
import {
    BookingErrorToast,
    BookingStepper,
    BookingSuccessOverlay,
    StepReview,
    StepSchedule,
    StepStudentSubject,
    StepTeachingMode,
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

    // Compute available subjects (intersection of SUBJECT_MAPPING and tutor's subjects)
    const availableSubjects = SUBJECT_MAPPING.filter(s =>
        subjects.some(tutorSubj => tutorSubj.subjectId === s.id)
    );

    if (!isOpen) return null;

    const canNext = () => {
        switch (step) {
            case 0:
                // Student role: only need subject selected (studentId is auto-set)
                if (userRole === "Student") return formData.subjectId !== 0;
                // Parent role: need both student and subject selected
                return formData.studentId !== "" && formData.subjectId !== 0;
            case 1: {
                if (formData.teachingMode === "offline" || formData.teachingMode === "hybrid") {
                    return formData.locationCity.trim() !== "" && formData.locationDistrict.trim() !== "";
                }
                return true;
            }
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
                    } else {
                        if (!formData.studentId) toast.warning("Vui lòng chọn học sinh trước khi tiếp tục.");
                        else toast.warning("Vui lòng chọn môn học trước khi tiếp tục.");
                    }
                    break;
                case 1:
                    toast.warning("Vui lòng nhập đầy đủ địa điểm học (Thành phố và Quận/Huyện).");
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
                        <h2 className="bm-title">Đặt lịch học</h2>
                        <p className="bm-subtitle">với {tutorName}</p>
                    </div>
                    <button className="bm-close" onClick={onClose} type="button">✕</button>
                </div>

                <BookingStepper step={step} />

                {/* Step Content */}
                <div className="bm-body">
                    {step === 0 && <StepStudentSubject {...stepProps} />}
                    {step === 1 && <StepTeachingMode {...stepProps} />}
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
