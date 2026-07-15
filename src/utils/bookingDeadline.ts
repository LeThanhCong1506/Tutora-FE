import { formatLocalDateTime, parseUtc } from './datetime';

export type BookingDeadlineUrgency = 'normal' | 'warning' | 'critical';

export interface BookingDeadlineState {
  compactRemainingLabel: string;
  deadlineLabel: string;
  isExpired: boolean;
  remainingLabel: string;
  urgency: BookingDeadlineUrgency;
}

export function getBookingResponseDeadlineState(
  value: string | null | undefined,
  now = Date.now(),
): BookingDeadlineState | null {
  const deadline = parseUtc(value);
  if (!deadline) return null;

  const remainingMs = deadline.getTime() - now;
  const deadlineLabel = `Hạn phản hồi: ${formatLocalDateTime(value)}`;

  if (remainingMs <= 0) {
    return {
      compactRemainingLabel: '00:00:00',
      deadlineLabel,
      isExpired: true,
      remainingLabel: '',
      urgency: 'critical',
    };
  }

  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const remainingLabel =
    hours > 0
      ? `${hours} giờ ${minutes} phút ${seconds} giây`
      : minutes > 0
        ? `${minutes} phút ${seconds} giây`
        : `${seconds} giây`;
  const compactRemainingLabel = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');

  return {
    compactRemainingLabel,
    deadlineLabel,
    isExpired: false,
    remainingLabel,
    urgency: totalSeconds <= 3_600 ? 'critical' : totalSeconds <= 21_600 ? 'warning' : 'normal',
  };
}
