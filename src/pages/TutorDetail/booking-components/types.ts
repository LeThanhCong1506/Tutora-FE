import type { StudentType } from "../../../types/student.type";
import type {
    AvailabilitySlot,
    SubjectInfo,
    TutorPackageResponse,
    TutorSubjectGradePrice,
} from "../../../services/tutorDetail.service";
import type { Combo } from "../../../types/combo.types";

export interface ScheduleSlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

// ─── Scheduling model (ported from ParentBookingDemo) ───
// dayOfWeek dùng quy ước demo: 1=T2 … 6=T7, 7=CN (KHÁC backend 0=CN..6=T7).
export interface WeeklySlot {
    dayOfWeek: number;
    startTime: string; // "HH:mm"
    durationHours: number;
    available?: boolean;
}

export interface BookingSlot extends WeeklySlot {
    date: string; // "YYYY-MM-DD"
}

export interface WeeklyPatternSlot {
    dayOfWeek: number;
    startTime: string;
    durationHours: number;
}

// API trả về từ hook useBookingSchedule — truyền xuống Step Lịch học & Xác nhận.
export interface BookingScheduleApi {
    today: Date;
    bookingDeadline: Date;
    visibleWeekIndex: number;
    setVisibleWeekIndex: React.Dispatch<React.SetStateAction<number>>;
    visibleWeekStart: Date;
    visibleDays: Date[];
    maxVisibleWeekIndex: number;
    calendarTimes: string[];
    calendarAvailability: WeeklySlot[];
    pickedWeekSlots: BookingSlot[];
    selectedSlots: BookingSlot[];
    bookingWindowStart: Date | null;
    bookingWindowEnd: Date | null;
    navLocked: boolean;
    bookedSlotsLoading: boolean;
    bookedSlotsError: boolean;
    hasSelectedSlotConflict: boolean;
    isBookedCell: (dateKey: string, time: string) => boolean;
    wouldAvailabilityPickConflict: (dateKey: string, dayOfWeek: number, startTime: string) => boolean;
    fixedWeekHasConflict: (weekMonday: Date) => boolean;
    toggleAvailabilityPick: (dateKey: string, dayOfWeek: number, startTime: string) => void;
    pickFixedStartWeek: (weekMonday: Date) => void;
    clearPicks: () => void;
}

export interface Subject {
    id: number;
    name: string;
    // Tutor dạy khối nào cho môn này (vd ["grade_10", "grade_11"]). Optional cho legacy.
    gradeLevels?: string[];
}

// Cách phụ huynh muốn đặt lịch — chọn sau khi đã chọn student + môn.
export type BookingMode = "schedule" | "package";

export interface BookingFormData {
    studentId: string;
    subjectId: number;
    teachingMode: "online" | "offline" | "hybrid";
    bookingMode: BookingMode; // mới — picker ở step 2
    comboId: string | null; // mới — id của combo đã chọn (chỉ khi bookingMode = "package")
    startDate: string;
    schedule: ScheduleSlot[];
    locationCity: string;
    locationDistrict: string;
    locationWard: string;
    locationDetail: string;
    promotionCode: string;
    // BE blocker (xem plan Part E): booking model mới yêu cầu 2 field này, lấy từ
    // endpoint public của gia sư (giá theo môn/lớp + gói). full-profile hiện chưa trả.
    tutorSubjectGradePriceId?: number;
    packageId?: number;
}

export type TutorTeachingModeKey = "online" | "offline" | "hybrid" | "both";

export interface StepProps {
    formData: BookingFormData;
    setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
    hourlyRate: number;
    students: StudentType[];
    loadingStudents: boolean;
    availableSubjects: Subject[];
    subjectGradePrices: TutorSubjectGradePrice[];
    availabilities: AvailabilitySlot[];
    slotDuration: number;
    setSlotDuration: React.Dispatch<React.SetStateAction<number>>;
    userRole: string | null;
    /**
     * Tutor's preferred teaching mode (raw value from BE, may be mixed case).
     * - "online" / "offline": single mode → student/parent CANNOT change.
     * - "both" / "hybrid": tutor accepts multiple modes → student/parent CAN choose.
     * - null / empty: legacy data → fall back to all modes.
     */
    tutorTeachingMode: string | null;
    // Combos hiện có của gia sư — dùng cho step BookingMode + Schedule (package mode).
    // Hiện đang mock trong TutorDetailPage.
    combos: Combo[];
    // Gia sư có gói "linh hoạt" (packageType 1, active) không — bắt buộc để mode
    // "Tự chọn lịch rảnh" tạo được packageId khi submit (xem BookingModal.tsx).
    hasFlexiblePackage: boolean;
    // Trạng thái lịch học (week-pick/lock/project) — Step Lịch học & Xác nhận dùng.
    scheduling: BookingScheduleApi;
    // Số giờ mỗi buổi đang áp dụng, lấy từ cấu hình môn/lớp của gia sư.
    sessionHours: number;
    // Combo đang chọn (nếu bookingMode = package).
    selectedCombo: Combo | undefined;
    // Tên gia sư — dùng ở bước Xác nhận.
    tutorName: string;
    // Lỗi submit booking — hiển thị ở bước Xác nhận, ngay dưới box học phí.
    submitError?: string | null;
    onDismissSubmitError?: () => void;
}

export interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorName: string;
    tutorId: string;
    hourlyRate: number;
    subjects: SubjectInfo[];
    subjectGradePrices?: TutorSubjectGradePrice[] | null;
    packages?: TutorPackageResponse[] | null;
    availabilities?: AvailabilitySlot[] | null;
    /**
     * Tutor's preferred teaching mode. Drives whether student/parent can pick a mode.
     */
    tutorTeachingMode?: string | null;
    // Danh sách combo (gói học) — hiển thị ở Step 2 (BookingMode) + Step 3 (Schedule).
    combos?: Combo[];
    /**
     * Booking đã tồn tại rồi (quay lại từ /student-portal/profile sau khi lưu SĐT phụ huynh cho
     * luồng OTP giao dịch lớn) — bỏ qua wizard, mở thẳng bước thanh toán cho đúng booking đó.
     */
    resumeBookingId?: number | null;
}
