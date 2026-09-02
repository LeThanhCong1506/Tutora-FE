import { parseUtc } from '../../../utils/datetime';
import type { CourseSessionLike } from './types';

/**
 * Helper đọc/gộp danh sách buổi học cho modal chi tiết khoá học.
 *
 * Bản đối ứng của `TutorPortal/TutorPortalClasses/classes-components/groupSessions.ts` và
 * `utils.ts`, khác hai điểm:
 *  - generic theo `CourseSessionLike` để dùng được cho cả hai DTO của portal người học;
 *  - mọi mốc thời gian đi qua `parseUtc` (BE trả UTC, có bản deploy thiếu hậu tố `Z`), giống
 *    phần còn lại của portal phụ huynh/học sinh. Bên portal gia sư còn dùng `new Date(iso)`
 *    trực tiếp nên hai bên có thể lệch múi giờ — không sửa ở đây để khỏi đụng vào trang gia sư.
 */

export interface CourseSessionGroup<T extends CourseSessionLike> {
  parent: T;
  /** Buổi phụ / buổi học lại sinh ra từ buổi gốc, mặc định thu gọn trong modal. */
  children: T[];
}

const isExtra = (session: CourseSessionLike): boolean => Boolean(session.isContinuation || session.isDisputeRelearn);

const startMs = (session: CourseSessionLike): number =>
  parseUtc(session.scheduledStart)?.getTime() ?? Number.MAX_SAFE_INTEGER;

const byStart = (a: CourseSessionLike, b: CourseSessionLike): number => startMs(a) - startMs(b);

/**
 * Gom buổi phụ / buổi học lại về đúng buổi GỐC thuộc gói, để danh sách trong modal đếm theo
 * số buổi của gói chứ không phồng lên vì các buổi sinh thêm.
 */
export function groupCourseSessions<T extends CourseSessionLike>(sessions: T[]): CourseSessionGroup<T>[] {
  const sorted = [...sessions].sort(byStart);
  const byId = new Map(sorted.map((session) => [session.classSessionId, session]));
  const groups = new Map<number, CourseSessionGroup<T>>();
  const orphans: T[] = [];

  for (const session of sorted) {
    if (!isExtra(session)) groups.set(session.classSessionId, { parent: session, children: [] });
  }

  /** Lần ngược chuỗi tới buổi thuộc gói; undefined nếu không tới được. */
  const findRoot = (session: T): CourseSessionGroup<T> | undefined => {
    // `seen` chặn vòng lặp vô hạn nếu dữ liệu bị trỏ vòng (A → B → A).
    const seen = new Set<number>([session.classSessionId]);
    let current: T | undefined = session;

    while (current?.originalClassSessionId != null) {
      const parentId: number = current.originalClassSessionId;
      if (seen.has(parentId)) return undefined;
      seen.add(parentId);

      const group = groups.get(parentId);
      if (group) return group;

      current = byId.get(parentId);
    }

    return undefined;
  };

  for (const session of sorted) {
    if (!isExtra(session)) continue;

    const group = findRoot(session);
    if (group) group.children.push(session);
    else orphans.push(session);
  }

  return [...groups.values(), ...orphans.map((parent) => ({ parent, children: [] as T[] }))].sort((a, b) =>
    byStart(a.parent, b.parent),
  );
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Tách ngày và khung giờ thành 2 phần để dòng buổi học đọc được ngay:
 * "T6, 22/08" + "20:40 – 21:28" thay vì dồn thành một chuỗi.
 */
export function formatSessionTime(startIso?: string | null, endIso?: string | null): { date: string; range: string } {
  const start = parseUtc(startIso);
  if (!start) return { date: '—', range: '' };

  const end = parseUtc(endIso);
  const time = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return {
    date: `${WEEKDAYS[start.getDay()]}, ${pad(start.getDate())}/${pad(start.getMonth() + 1)}`,
    range: end ? `${time(start)} – ${time(end)}` : time(start),
  };
}

/** Nhãn phân biệt buổi sinh thêm với buổi trong gói. */
export function extraSessionLabel(session: CourseSessionLike): string | null {
  if (session.isContinuation) return 'Buổi phụ';
  if (session.isDisputeRelearn) return 'Học lại';
  return null;
}

/**
 * "Lịch cố định" suy từ chính các buổi đã tải: các khung (thứ + giờ) khác nhau, tối đa 3.
 *
 * Portal gia sư nhận sẵn chuỗi này từ `GET /tutor/classes`; phía người học không có endpoint
 * tương đương nên dựng tại chỗ theo đúng quy tắc của BE (`ClassSessionRepository`), để hai bên
 * đọc ra cùng một câu về cùng một lớp.
 */
export function deriveSchedule(sessions: CourseSessionLike[]): string {
  const slots: string[] = [];

  for (const session of [...sessions].sort(byStart)) {
    const start = parseUtc(session.scheduledStart);
    if (!start) continue;

    const slot = `${WEEKDAYS[start.getDay()]} ${pad(start.getHours())}:${pad(start.getMinutes())}`;
    if (!slots.includes(slot)) slots.push(slot);
    if (slots.length === 3) break;
  }

  return slots.join(', ');
}
