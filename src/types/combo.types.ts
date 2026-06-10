// Shared combo model — single source of truth dùng cho CẢ tutor onboarding lẫn parent booking.
// Trong onboarding: combo lưu local (chưa call API).
// Trong booking: combo đến từ tutor profile (hiện mock — xem TODO(BE) trong TutorDetailPage / ParentBookingDemo).
//
// Quy ước thời gian: startHour/startMinute là dạng "có cấu trúc" (thuận cho overlap math),
// dayOfWeek theo chuẩn JS getDay (0=CN..6=T7), 1=T2.

export interface ComboSessionSlot {
  dayOfWeek: number; // 0=CN..6=T7 (chuẩn JS getDay)
  startHour: number;
  startMinute: 0 | 30;
  durationHours: number; // bội của 0.5
}

interface BaseCombo {
  id: string;
  name: string;
  // Mô tả ngắn cho phụ huynh. Optional cho gói cố định (lịch tự nói lên), bắt buộc cho gói linh hoạt.
  description?: string;
  // Optional: combo có thể gắn với 1 môn cụ thể (vd combo Toán riêng, Tiếng Anh riêng).
  // Khi undefined → combo áp dụng cho mọi môn tutor dạy.
  subjectId?: number;
  subjectName?: string;
}

export interface FixedCombo extends BaseCombo {
  type: 'fixed';
  sessions: ComboSessionSlot[];
}

export interface FlexCombo extends BaseCombo {
  type: 'flex';
  sessionsPerWeek: number;
  // Tổng số buổi/tháng gia sư mở cho gói (GIỚI HẠN CỨNG). Phụ huynh chọn pattern tuần, hệ thống
  // lặp trong cửa sổ 1 tháng nhưng chỉ lấy tối đa số buổi này (các buổi sớm nhất) — dư thì cắt bớt.
  sessionsPerMonth: number;
  hoursPerSession: number;
  description: string;
}

export type Combo = FixedCombo | FlexCombo;

// ── Số buổi/TUẦN của gói ──
// Số buổi/THÁNG KHÔNG cố định: hệ thống lặp lịch tuần theo cửa sổ [ngày bắt đầu → đúng ngày
// này tháng sau] nên ra 4 hoặc 5 buổi tuỳ lịch. Vì vậy chỉ phơi ra "buổi/tuần"; số buổi & giá
// thực tế được tính tại thời điểm phụ huynh đặt (theo ngày bắt đầu), KHÔNG nhân cứng ×4.
export const getComboSessionsPerWeek = (combo: Combo): number =>
  combo.type === 'fixed' ? combo.sessions.length : combo.sessionsPerWeek;
