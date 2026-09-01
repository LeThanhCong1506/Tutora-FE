import { useCallback, useEffect, useState } from 'react';
import {
  getStudentClassSessions,
  type StudentClassSessionSummaryResponse,
} from '../../../../services/classSession.service';
import { buildCourseProgress } from '../utils';
import type { CourseProgress } from '../types';

/**
 * Một lượt tải phủ hết lịch sử buổi học của học sinh — `/api/student/class-sessions` không có
 * endpoint tổng hợp nên số liệu phải gộp ở FE. Ngưỡng đủ rộng cho một học sinh thật; nếu vượt,
 * các con số chỉ thiếu phần buổi cũ nhất, còn "buổi kế tiếp" vẫn đúng vì BE sắp xếp tăng dần
 * theo giờ bắt đầu.
 */
const SESSIONS_PAGE_SIZE = 500;

/**
 * Kiểu khai báo của service là `{ items, totalCount }`, nhưng BE trả `PagedList<T> : List<T>`
 * nên JSON thực tế có thể là MẢNG THUẦN. Nhận cả hai dạng, giống `useParentStudents`.
 *
 * Shape lạ trả `null` để hook coi như LỖI TẢI chứ không phải "không có buổi học nào": hiện nhầm
 * "chưa có lớp nào" trong khi học sinh vẫn đang học là sai lệch nguy hiểm hơn một dòng báo lỗi.
 */
const readSessionList = (content: unknown): StudentClassSessionSummaryResponse[] | null => {
  if (Array.isArray(content)) return content as StudentClassSessionSummaryResponse[];
  const items = (content as { items?: unknown } | null | undefined)?.items;
  return Array.isArray(items) ? (items as StudentClassSessionSummaryResponse[]) : null;
};

export interface UseStudentProgressResult {
  courses: CourseProgress[];
  loading: boolean;
  /** Không tải được buổi học — trang hiện panel lỗi kèm nút thử lại, không hiện số 0 sai. */
  failed: boolean;
  reload: () => void;
}

export function useStudentProgress(): UseStudentProgressResult {
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await getStudentClassSessions(1, SESSIONS_PAGE_SIZE);
        if (!active) return;

        const sessions = readSessionList(response.content);
        if (!sessions) throw new Error('GET /student/class-sessions trả về shape không đọc được');

        setCourses(buildCourseProgress(sessions));
        setFailed(false);
      } catch (err) {
        if (!active) return;
        console.error('StudentProgress: không lấy được danh sách buổi học', err);
        setCourses([]);
        setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { courses, loading, failed, reload };
}
