import { useState, useEffect, useMemo } from "react";
import { getStudents, getMyLinkStatus, getBookingEligibility, type BookingReasonCode } from "../../../../services/student.service";
import { createBooking } from "../../../../services/booking.service";
import { getCurrentUserRole, getUserIdFromToken } from "../../../../services/auth.service";
import { useFormDraft } from "../../../../hooks/useFormDraft";
import { toUtcIso } from "../../../../utils/datetime";
import type { StudentType } from "../../../../types/student.type";
import type { CreateBookingPayload, FlexibleBookingSlotPayload } from "../../../../services/booking.service";
import type { BookingFormData, BookingSlot } from "../types";

interface Args {
    isOpen: boolean;
    tutorId: string;
    /**
     * Tutor's preferred teaching mode (raw, mixed-case from BE).
     * Used to lock the booking flow's mode when the tutor only supports one.
     */
    tutorTeachingMode?: string | null;
    /**
     * Booking đã tồn tại rồi (vừa quay lại từ /student-portal/profile sau khi lưu SĐT phụ huynh
     * cho luồng OTP giao dịch lớn) — bỏ qua hẳn wizard 4 bước, mở thẳng bước thanh toán.
     */
    resumeBookingId?: number | null;
}

/**
 * Resolve the tutor's preferred teaching mode into a single, immutable mode
 * the student/parent must use, OR `null` if they're free to pick.
 *
 * - "online"  → "online"   (locked)
 * - "offline" → "offline"  (locked)
 * - "both" / "hybrid" → null (free choice)
 * - null / "" / unknown → null (free choice — legacy fallback)
 */
function resolveLockedMode(raw?: string | null): "online" | "offline" | null {
    const m = (raw ?? "").toLowerCase();
    if (m === "online") return "online";
    if (m === "offline") return "offline";
    return null; // "both", "hybrid", null, or anything else — student picks
}

// Một buổi học cụ thể = thời điểm TUYỆT ĐỐI → gửi BE dạng UTC ISO (có Z).
// `new Date("YYYY-MM-DDTHH:mm:ss")` parse theo giờ local của người dùng; toUtcIso
// (≡ toISOString) đổi sang UTC. Vd VN 18:00 → "...T11:00:00.000Z".
const slotToUtcDateTimes = (slot: BookingSlot): FlexibleBookingSlotPayload => {
    const start = new Date(`${slot.date}T${slot.startTime}:00`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + Math.round(slot.durationHours * 60));
    return {
        scheduledStart: toUtcIso(start),
        scheduledEnd: toUtcIso(end),
    };
};

/**
 * Encapsulate all booking modal state, draft persistence, role-aware
 * student fetching, and the submit flow. The orchestrator consumes this
 * hook and stays focused on rendering.
 */
export function useBookingForm({ isOpen, tutorId, tutorTeachingMode, resumeBookingId }: Args) {
    const userRole = getCurrentUserRole();
    const currentUserId = getUserIdFromToken();
    const lockedMode = resolveLockedMode(tutorTeachingMode);

    const defaultFormData: BookingFormData = useMemo(() => ({
        studentId: userRole === "Student" ? (currentUserId || "") : "",
        subjectId: 0,
        // If tutor only teaches one mode, pre-select it so the student
        // can't accidentally submit a mismatched request (BE will 400).
        teachingMode: lockedMode ?? "online",
        bookingMode: "schedule", // mặc định: parent pick slot tự do
        comboId: null,
        startDate: new Date().toISOString().split("T")[0],
        schedule: [],
        locationCity: "",
        locationDistrict: "",
        locationWard: "",
        locationDetail: "",
        promotionCode: "",
    }), [userRole, currentUserId, lockedMode]);

    const [step, setStep] = useState(0);
    const [students, setStudents] = useState<StudentType[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [eligibilityBlock, setEligibilityBlock] =
        useState<{ reason: string; reasonCode: BookingReasonCode | null } | null>(null);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    // Parent phải thanh toán buổi học đầu tiên (cọc) TRƯỚC khi yêu cầu được gửi tới gia sư
    // (→ `pending_tutor`).
    //   form     → đang điền form đặt lịch
    //   payment  → đã tạo booking, đang mở bước thanh toán buổi đầu
    //   paid     → đã thanh toán, đang chờ gia sư xác nhận
    //   deferred → đã tạo booking nhưng tạm hoãn thanh toán (có 10 phút để trả sau)
    const [bookingPhase, setBookingPhase] = useState<'form' | 'payment' | 'paid' | 'deferred'>('form');
    const [successBookingId, setSuccessBookingId] = useState<number | null>(null);
    const [slotDuration, setSlotDuration] = useState(2);
    const [formData, setFormData] = useState<BookingFormData>(defaultFormData);

    // Một khi đã rời bước form (đang/đã thanh toán hoặc chờ gia sư) thì không lưu nháp nữa.
    const bookingSuccess = bookingPhase !== 'form';

    // Bind draft theo userId để phòng vệ thêm: nếu vì lý do gì đó draft cũ
    // không bị dọn lúc logout (xem `clearUserFromStorage` trong auth.service),
    // user mới đăng nhập vào cùng tab cũng KHÔNG đọc trúng draft của user trước.
    // Fallback `anon` cho trường hợp guest mở modal khi chưa login.
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
        formData: BookingFormData;
        step: number;
        slotDuration: number;
    }>(`draft_booking_${currentUserId || 'anon'}_${tutorId}`);

    useEffect(() => {
        if (!isOpen || userRole !== "Student") {
            setEligibilityBlock(null);
            return;
        }
        setCheckingEligibility(true);
        getBookingEligibility().then(res => {
            const e = res?.content;
            setEligibilityBlock(e && !e.canBook
                ? { reason: e.reason || "Bạn chưa đủ điều kiện đặt lịch học.", reasonCode: e.reasonCode }
                : null);
        }).catch(() => {
            setEligibilityBlock(null);
        }).finally(() => {
            setCheckingEligibility(false);
        });
    }, [isOpen, userRole]);

    // Fetch student profile for Student role (to get correct studentId)
    useEffect(() => {
        if (!isOpen || userRole !== "Student") return;
        setLoadingStudents(true);
        getMyLinkStatus().then(res => {
            const profile = res?.content?.studentProfile;
            if (profile?.studentId) {
                setStudents([profile]);
                setFormData(d => ({ ...d, studentId: profile.studentId }));
            } else {
                setStudents([]);
            }
        }).catch(() => {
            setStudents([]);
        }).finally(() => {
            setLoadingStudents(false);
        });
    }, [isOpen, userRole]);

    // Fetch students on modal open (only for Parent role)
    useEffect(() => {
        if (!isOpen) return;
        if (userRole !== "Parent") return;
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const response = await getStudents();
                const data = response.content || [];
                setStudents(data);
            } catch (err: any) {
                console.error("Failed to fetch students:", err);
                const msg = err.response?.data?.message || "Không thể tải danh sách học sinh";
                alert(`Lỗi: ${msg}`);
                setStudents([]);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [isOpen, userRole]);

    // Load draft on open, reset UI state on close
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            if (draft) {
                const restored = draft.formData || defaultFormData;
                // If the tutor now only supports one mode, override any stale
                // draft selection so we never submit an incompatible mode.
                setFormData(lockedMode
                    ? { ...restored, teachingMode: lockedMode }
                    : restored);
                setStep(draft.step || 0);
                setSlotDuration(draft.slotDuration || 2);
            }
        } else {
            setStep(0);
            setSubmitError(null);
            setBookingPhase('form');
            setSuccessBookingId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Booking đã tồn tại rồi (quay lại từ trang hồ sơ sau khi lưu SĐT phụ huynh cho luồng OTP
    // giao dịch lớn) → bỏ qua wizard, mở thẳng bước thanh toán cho đúng booking đó.
    useEffect(() => {
        if (!isOpen || resumeBookingId == null) return;
        setSuccessBookingId(resumeBookingId);
        setBookingPhase('payment');
    }, [isOpen, resumeBookingId]);

    // Auto-save draft on form data changes
    useEffect(() => {
        if (isOpen && !bookingSuccess) {
            saveDraft({ formData, step, slotDuration });
        }
    }, [formData, step, slotDuration, isOpen, bookingSuccess, saveDraft]);

    // Auto-dismiss error toast after 5 seconds
    useEffect(() => {
        if (!submitError) return;
        const timer = setTimeout(() => setSubmitError(null), 5000);
        return () => clearTimeout(timer);
    }, [submitError]);

    const handleSubmit = async (selectedSlots: BookingSlot[] = []) => {
        if (eligibilityBlock) {
            setSubmitError(eligibilityBlock.reason);
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            if (!formData.tutorSubjectGradePriceId || !formData.packageId) {
                setSubmitError('Thiếu thông tin gói học hoặc cấu hình môn/lớp của gia sư. Vui lòng tải lại trang rồi thử lại.');
                return;
            }

            const sortedSelectedSlots = [...selectedSlots].sort((a, b) =>
                `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`),
            );
            if (sortedSelectedSlots.length === 0) {
                setSubmitError('Vui lòng chọn ít nhất một buổi học trước khi gửi yêu cầu.');
                return;
            }
            const isFlexibleBooking = formData.bookingMode === "schedule";

            const payload: CreateBookingPayload = {
                studentId: formData.studentId || undefined,
                tutorId: tutorId,
                subjectId: formData.subjectId || undefined,
                tutorSubjectGradePriceId: formData.tutorSubjectGradePriceId,
                packageId: formData.packageId,
                totalSessions: sortedSelectedSlots.length,
                startDate: formData.startDate,
                ...(isFlexibleBooking
                    ? { flexibleSlots: sortedSelectedSlots.map(slotToUtcDateTimes) }
                    : {}),
                locationCity: formData.locationCity || undefined,
                locationDistrict: formData.locationDistrict || undefined,
                locationWard: formData.locationWard || undefined,
                locationDetail: formData.locationDetail || undefined,
                promotionCode: formData.promotionCode || undefined,
            };

            const result = await createBooking(payload);
            setSuccessBookingId(result.content?.bookingId ?? null);
            clearDraft();

            // Booking ở `pending_payment`, phải trả ngay (hạn 10 phút) — sau khi cọc vào mới
            // chuyển `pending_tutor` và tới tay gia sư.
            setBookingPhase('payment');
        } catch (err: any) {
            console.error("createBooking failed:", err);
            const msg = err.response?.data?.message || "Có lỗi xảy ra khi tạo booking. Vui lòng thử lại.";
            setSubmitError(msg);
            // Không đóng modal để user sửa lỗi
        } finally {
            setSubmitting(false);
        }
    };

    // Thanh toán buổi đầu thành công → chờ gia sư xác nhận.
    const handlePaymentSuccess = () => setBookingPhase('paid');
    // Đóng bước thanh toán mà CHƯA trả → cho phép trả sau (trong 10 phút).
    // QUAN TRỌNG: dùng functional update + guard chỉ chuyển 'payment' → 'deferred'.
    // PaymentModal khi thành công gọi onPaymentSuccess() (đặt 'paid') RỒI onClose()
    // ngay sau đó; nếu defer vô điều kiện sẽ ghi đè 'paid' → 'deferred' và hiện nhầm
    // màn "Chưa thanh toán" dù đã trả xong.
    const deferPayment = () => setBookingPhase((p) => (p === 'payment' ? 'deferred' : p));
    // Quay lại bước thanh toán từ màn "trả sau".
    const resumePayment = () => setBookingPhase('payment');

    return {
        // Form state
        formData,
        setFormData,
        // Step navigation
        step,
        setStep,
        // Slot duration
        slotDuration,
        setSlotDuration,
        // Students fetch (Parent role only)
        students,
        loadingStudents,
        // User context
        userRole,
        // Submission
        submitting,
        submitError,
        setSubmitError,
        handleSubmit,
        eligibilityBlock,
        checkingEligibility,
        // Post-create payment flow
        bookingPhase,
        successBookingId,
        handlePaymentSuccess,
        deferPayment,
        resumePayment,
    };
}
