import dayjs, { type Dayjs } from 'dayjs';
import { formatLocalTime, parseUtc } from '../../../utils/datetime';
import type { LessonGroup, LessonSummary } from './types';

export const getLessonDate = (lesson: LessonSummary): Dayjs => {
  const parsed = parseUtc(lesson.scheduledStart);
  return parsed ? dayjs(parsed) : dayjs(lesson.scheduledStart);
};

export const getLessonEndDate = (lesson: LessonSummary): Dayjs => {
  const parsed = parseUtc(lesson.scheduledEnd);
  return parsed ? dayjs(parsed) : dayjs(lesson.scheduledEnd);
};

export const getLessonTime = (lesson: LessonSummary): string => {
  const start = formatLocalTime(lesson.scheduledStart) || '--:--';
  const end = formatLocalTime(lesson.scheduledEnd);
  return end ? `${start}–${end}` : start;
};

export const getMonday = (date: Dayjs): Dayjs => date.startOf('day').subtract((date.day() + 6) % 7, 'day');

export const groupLessonsByDate = (lessons: LessonSummary[]): LessonGroup[] => {
  const groups = new Map<string, LessonSummary[]>();
  lessons.forEach((lesson) => {
    const key = getLessonDate(lesson).format('YYYY-MM-DD');
    groups.set(key, [...(groups.get(key) || []), lesson]);
  });

  return Array.from(groups.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([dateKey, dayLessons]) => ({
      dateKey,
      date: dayjs(dateKey),
      lessons: dayLessons.sort((first, second) => getLessonDate(first).valueOf() - getLessonDate(second).valueOf()),
    }));
};

export const isCancelledLesson = (lesson: LessonSummary): boolean =>
  ['cancelled', 'cancelled_noshow', 'no_show'].includes(lesson.status.toLowerCase());

/**
 * Buổi in_progress nhưng ĐÃ check-out: phòng học đã đóng vĩnh viễn, chỉ còn chờ gia sư
 * gửi báo cáo (status chỉ chuyển pending_confirmation sau khi báo cáo được gửi).
 * KHÔNG được hiện "Đang diễn ra" / nút "Vào lớp" cho các buổi này.
 */
export const isAwaitingReport = (lesson: LessonSummary): boolean =>
  lesson.status.trim().toLowerCase() === 'in_progress' && Boolean(lesson.checkOutTime);

/** Trạng thái "nóng" của buổi học để highlight trên UI. */
export type LessonLiveState = 'live' | 'due' | null;

/** Buổi scheduled được coi là "tới giờ học" từ mốc này trước giờ bắt đầu. */
export const DUE_SOON_MINUTES = 15;

/**
 * 'live' — buổi đang diễn ra (đã điểm danh, in_progress).
 * 'due'  — buổi đã lên lịch và tới giờ học: now ∈ [start − 15ph, end].
 * null   — còn lại (không cần highlight).
 */
export const getLessonLiveState = (lesson: LessonSummary): LessonLiveState => {
  const status = lesson.status.trim().toLowerCase();
  if (status === 'in_progress') return isAwaitingReport(lesson) ? null : 'live';
  if (status !== 'scheduled') return null;

  const now = dayjs();
  const start = getLessonDate(lesson);
  const end = getLessonEndDate(lesson);
  if (now.isBefore(start.subtract(DUE_SOON_MINUTES, 'minute')) || now.isAfter(end)) return null;
  return 'due';
};

export const formatDayHeading = (date: Dayjs): string => {
  const diff = date.startOf('day').diff(dayjs().startOf('day'), 'day');
  const weekday = date.format('dddd');
  if (diff === 0) return `Hôm nay · ${date.format('DD/MM')}`;
  if (diff === 1) return `Ngày mai · ${date.format('DD/MM')}`;
  if (diff === -1) return `Hôm qua · ${date.format('DD/MM')}`;
  return `${weekday} · ${date.format('DD/MM')}`;
};
