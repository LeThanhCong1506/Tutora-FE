import dayjs, { type Dayjs } from 'dayjs';
import { formatLocalTime, parseUtc } from '../../../utils/datetime';
import { isLiveSessionOverdue } from '../../../utils/liveSession';
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

export type LessonRenderItem =
  | { kind: 'single'; lesson: LessonSummary }
  | { kind: 'chain'; lessons: LessonSummary[] };

/**
 * Dựng hàm tìm buổi GỐC của 1 chuỗi (lùi theo originalClassSessionId) trong phạm vi `lessons`
 * truyền vào — dùng chung cho groupLessonsByChain và filterLessonsKeepingChains để không lệch
 * định nghĩa "cùng 1 chuỗi" giữa 2 nơi.
 */
const buildChainRootFinder = <T extends { lessonId: number; originalClassSessionId?: number }>(lessons: T[]) => {
  const byId = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));
  return (id: number): number => {
    const seen = new Set<number>();
    let current = id;
    while (!seen.has(current)) {
      seen.add(current);
      const parentId = byId.get(current)?.originalClassSessionId;
      if (!parentId || !byId.has(parentId)) return current;
      current = parentId;
    }
    return current;
  };
};

/**
 * Gom buổi gốc bị ngắt/dispute với buổi phụ/buổi học lại của nó (originalClassSessionId) thành
 * 1 nhóm để hiển thị nối liền nhau — chỉ gom khi CẢ 2 buổi cùng nằm trong mảng `lessons` truyền vào
 * (cùng 1 ngày/cùng 1 view đang render); nếu buổi gốc rơi ra ngoài phạm vi đó thì vẫn hiện đơn lẻ,
 * tránh tham chiếu tới 1 buổi không hề xuất hiện trên màn hình.
 */
export const groupLessonsByChain = (lessons: LessonSummary[]): LessonRenderItem[] => {
  const findRoot = buildChainRootFinder(lessons);

  const groups = new Map<number, LessonSummary[]>();
  lessons.forEach((lesson) => {
    const root = findRoot(lesson.lessonId);
    groups.set(root, [...(groups.get(root) || []), lesson]);
  });

  const emitted = new Set<number>();
  const result: LessonRenderItem[] = [];
  lessons.forEach((lesson) => {
    const root = findRoot(lesson.lessonId);
    if (emitted.has(root)) return;
    emitted.add(root);
    const group = [...groups.get(root)!].sort(
      (first, second) => getLessonDate(first).valueOf() - getLessonDate(second).valueOf(),
    );
    result.push(group.length > 1 ? { kind: 'chain', lessons: group } : { kind: 'single', lesson: group[0] });
  });
  return result;
};

/**
 * Lọc theo tab trạng thái (vd "Hoàn thành"/"Tất cả") nhưng KHÔNG làm rớt buổi nào đang là mắt xích
 * của 1 chuỗi mà ít nhất 1 buổi khác trong chuỗi vẫn khớp bộ lọc — cần thế vì buổi gốc bị khiếu nại
 * được Admin đóng theo hướng "học lại" sẽ bị BE chuyển status=Cancelled
 * (DisputeService.CloseDisputeAsync), nên tab "Tất cả" (vốn ẩn buổi cancelled thật) vô tình nuốt
 * luôn mắt xích nối buổi học lại (Isdisputerelearn) về buổi phụ/buổi gốc trước đó, làm chuỗi hiện
 * tách rời dù dữ liệu originalClassSessionId vẫn đúng.
 */
export const filterLessonsKeepingChains = <T extends { lessonId: number; originalClassSessionId?: number }>(
  lessons: T[],
  predicate: (lesson: T) => boolean,
): T[] => {
  const matched = lessons.filter(predicate);
  if (matched.length === lessons.length) return matched;

  const findRoot = buildChainRootFinder(lessons);
  const keepRoots = new Set(matched.map((lesson) => findRoot(lesson.lessonId)));
  return lessons.filter((lesson) => predicate(lesson) || keepRoots.has(findRoot(lesson.lessonId)));
};

export const isCancelledLesson = (lesson: LessonSummary): boolean =>
  ['cancelled', 'cancelled_noshow', 'no_show'].includes(lesson.status.toLowerCase());

/**
 * Buổi in_progress nhưng ĐÃ check-out: phòng học đã đóng vĩnh viễn, chỉ còn chờ gia sư
 * gửi báo cáo (status chỉ chuyển pending_confirmation sau khi báo cáo được gửi).
 * KHÔNG được hiện "Đang diễn ra" / nút "Vào lớp" cho các buổi này.
 */
export const isAwaitingReport = (lesson: {
  status?: string | null;
  scheduledEnd?: string | null;
  checkOutTime?: string | null;
  hasRecording?: boolean;
}): boolean =>
  lesson.status?.trim().toLowerCase() === 'in_progress'
  && (Boolean(lesson.checkOutTime) || Boolean(lesson.hasRecording) || isLiveSessionOverdue(lesson));

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
