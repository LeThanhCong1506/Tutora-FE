import type { StudentType } from "../../../types/student.type";
import type { AvailabilitySlot, SubjectInfo } from "../../../services/tutorDetail.service";
import type { Combo } from "../../../types/combo.types";

export interface ScheduleSlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
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
}

export interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorName: string;
    tutorId: string;
    hourlyRate: number;
    subjects: SubjectInfo[];
    availabilities?: AvailabilitySlot[] | null;
    /**
     * Tutor's preferred teaching mode. Drives whether student/parent can pick a mode.
     */
    tutorTeachingMode?: string | null;
    // Danh sách combo (gói học) — hiển thị ở Step 2 (BookingMode) + Step 3 (Schedule).
    combos?: Combo[];
}
