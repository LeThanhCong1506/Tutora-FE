// Models for the tutor onboarding flow.
// Luồng 3 bước: setup môn-khối-giá → lịch rảnh → tạo combo.

// Combo types được share với parent booking flow — đặt ở src/types/combo.types.ts.
export type { Combo, ComboSessionSlot, FixedCombo, FlexCombo } from '../../../types/combo.types';
import type { FixedCombo } from '../../../types/combo.types';

export type OnboardingStep = 1 | 2 | 3;

// B1: 1 cấu hình = (môn, nhiều khối lớp, giá).
// Khi lưu, mỗi khối lớp được tách thành 1 dòng subject-grade theo contract hiện tại của BE.
export interface SubjectRecord {
  id: string; // local id (uuid-ish)
  subjectId: number; // từ SUBJECTS catalog
  subjectName: string;
  gradeLevels: string[]; // ['grade_10', 'grade_11', ...]
  hourlyRate: number; // VND/giờ
  hoursPerSession: number; // số giờ mỗi buổi (gia sư đặt theo môn) — booking dùng để bôi đủ thời lượng
  sessionsPerWeek: number; // số buổi/tuần đề xuất cho cấu hình này
}

// B2: Lịch rảnh demo lưu trong state onboarding, theo ô 30 phút.
export interface TutorAvailabilitySlot {
  id: string;
  dayOfWeek: number; // Backend format: 0=CN..6=T7
  startTime: string; // HH:mm — hỗ trợ :00 và :30
  endTime: string; // HH:mm
}

export interface OnboardingState {
  subjectRecords: SubjectRecord[];
  availability: TutorAvailabilitySlot[];
  combos: FixedCombo[];
  currentStep: OnboardingStep;
}
