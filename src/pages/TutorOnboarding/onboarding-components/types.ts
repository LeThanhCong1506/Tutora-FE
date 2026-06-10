// Models for the tutor onboarding flow.
// Luồng 3 bước: setup môn-khối-giá → lịch rảnh → tạo combo.

// Combo types được share với parent booking flow — đặt ở src/types/combo.types.ts.
export type { Combo, ComboSessionSlot, FixedCombo, FlexCombo } from '../../../types/combo.types';
import type { FixedCombo } from '../../../types/combo.types';

export type OnboardingStep = 1 | 2 | 3;

// B1: 1 record = (môn, khối lớp, giá). Tutor có thể thêm nhiều record;
// vd Toán-L10-200k, Toán-L11-250k, Tiếng Anh-L12-300k.
export interface SubjectRecord {
  id: string; // local id (uuid-ish)
  subjectId: number; // từ SUBJECTS catalog
  subjectName: string;
  gradeLevel: string; // 'grade_10' v.v.
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
