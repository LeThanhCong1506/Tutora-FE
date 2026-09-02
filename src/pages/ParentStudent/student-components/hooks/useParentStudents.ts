import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useStudentContext } from '../../../../contexts/StudentContext';
import { getParentClassSessions, type ClassSessionResponse } from '../../../../services/classSession.service';
import {
  createParentStudentWithCredentials,
  deleteStudent,
  resetStudentPassword,
  updateParentStudent,
  type ICreateParentStudent,
  type StudentCredentials,
} from '../../../../services/student.service';
import { extractApiErrorMessage, hasApiErrorCode } from '../apiMessages';
import { buildStudentBookings } from '../utils';
import type { StudentWithBookings } from '../types';

/**
 * Một lượt tải phủ hết lịch sử buổi học của tất cả các con — `GET /api/parent/class-sessions`
 * không có endpoint tổng hợp nên số liệu phải gộp ở FE. Ngưỡng đủ rộng cho một gia đình thật;
 * nếu vượt, các con số chỉ thiếu phần buổi cũ nhất, còn "buổi tiếp theo" vẫn đúng vì BE sắp
 * xếp tăng dần theo giờ bắt đầu.
 */
const SESSIONS_PAGE_SIZE = 500;

/**
 * BE trả `APIResponse<PagedList<ClassSessionResponse>>`, mà `PagedList<T> : List<T>` nên JSON là
 * mảng thuần. Vẫn nhận thêm dạng bọc `{ items: [...] }` vì `parent-lesson.service` đã gặp cả hai
 * kiểu trên các bản deploy khác nhau.
 *
 * Shape lạ trả về `null` để hook coi như LỖI TẢI, không phải "không có buổi học nào": hiện nhầm
 * "chưa có lịch" trong khi con vẫn đang học là sai lệch nguy hiểm hơn hẳn một dòng báo lỗi.
 */
const readSessionList = (content: unknown): ClassSessionResponse[] | null => {
  if (Array.isArray(content)) return content as ClassSessionResponse[];
  const items = (content as { items?: unknown } | null | undefined)?.items;
  return Array.isArray(items) ? (items as ClassSessionResponse[]) : null;
};

/** Buổi học của từng khoá, khoá theo `bookingId`. */
export type SessionsByBooking = Record<number, ClassSessionResponse[]>;

/**
 * Chia danh sách buổi học đã tải theo từng khoá, GIỮ NGUYÊN cả buổi đã huỷ.
 *
 * Modal chi tiết khoá học đọc map này thay vì gọi thêm API: `GET /parent/class-sessions` không
 * lọc được theo `bookingId` (khác endpoint của gia sư), mà trang thì đã tải trọn danh sách rồi.
 * Buổi đã huỷ không vào con số nào của thẻ nhưng vẫn phải hiện trong danh sách buổi của modal —
 * phụ huynh cần thấy buổi đã huỷ, kèm nhãn "Đã hủy".
 */
const groupSessionsByBooking = (sessions: ClassSessionResponse[]): SessionsByBooking => {
  const map: SessionsByBooking = {};
  for (const session of sessions) {
    const bookingId = session.bookingId ?? 0;
    (map[bookingId] ??= []).push(session);
  }
  return map;
};

export interface UseParentStudentsResult {
  rows: StudentWithBookings[];
  /** Buổi học thô theo từng khoá — nguồn cho danh sách buổi trong modal chi tiết. */
  sessionsByBooking: SessionsByBooking;
  /** Đang tải danh sách con — khung trang chưa dựng được. */
  loading: boolean;
  /** Danh sách con đã có nhưng số liệu buổi học còn đang về. */
  insightsLoading: boolean;
  /** Không lấy được buổi học: hồ sơ vẫn hiển thị, phần số liệu bị ẩn thay vì hiện số sai. */
  insightsFailed: boolean;
  credentials: StudentCredentials | null;
  credentialsTitle?: string;
  dismissCredentials: () => void;
  addStudent: (payload: ICreateParentStudent) => Promise<void>;
  editStudent: (studentId: string, payload: ICreateParentStudent) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  resetPassword: (studentId: string) => Promise<void>;
}

export function useParentStudents(): UseParentStudentsResult {
  const { students, loading, refreshStudents } = useStudentContext();
  const [bookings, setBookings] = useState<ReturnType<typeof buildStudentBookings>>({});
  const [sessionsByBooking, setSessionsByBooking] = useState<SessionsByBooking>({});
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsFailed, setInsightsFailed] = useState(false);
  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);
  const [credentialsTitle, setCredentialsTitle] = useState<string | undefined>();
  const [sessionsKey, setSessionsKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadSessions = async () => {
      setInsightsLoading(true);
      try {
        const response = await getParentClassSessions(1, SESSIONS_PAGE_SIZE);
        if (!active) return;

        const sessions = readSessionList(response.content);
        if (!sessions) throw new Error('GET /parent/class-sessions trả về shape không đọc được');

        const map = buildStudentBookings(sessions);

        // Có buổi học nhưng không buổi nào khớp studentId nào của trang → lệch khoá, không phải
        // "chưa học buổi nào". Báo lỗi để phụ huynh không tin nhầm là con chưa có lịch.
        if (sessions.length > 0 && Object.keys(map).length === 0) {
          throw new Error(`Nhận ${sessions.length} buổi học nhưng không buổi nào có studentId khớp`);
        }

        // Chẩn đoán chỉ chạy ở dev: khi card hiện "Chưa có lịch" mà thực tế con vẫn đang học,
        // dòng này cho biết ngay endpoint trả về bao nhiêu buổi và gộp được cho những id nào.
        if (import.meta.env.DEV) {
          console.warn(
            '[ParentStudent] buổi học nhận được:',
            sessions.length,
            '· học sinh có khoá học:',
            Object.keys(map),
            '· mẫu:',
            sessions[0],
          );
        }

        setBookings(map);
        setSessionsByBooking(groupSessionsByBooking(sessions));
        setInsightsFailed(false);
      } catch (err) {
        if (!active) return;
        console.error('ParentStudent: không lấy được danh sách buổi học', err);
        setBookings({});
        setSessionsByBooking({});
        setInsightsFailed(true);
      } finally {
        if (active) setInsightsLoading(false);
      }
    };

    void loadSessions();
    return () => {
      active = false;
    };
  }, [sessionsKey]);

  const rows = useMemo<StudentWithBookings[]>(
    () => students.map((student) => ({ student, bookings: bookings[student.studentId] ?? [] })),
    [students, bookings],
  );

  const addStudent = useCallback(
    async (payload: ICreateParentStudent) => {
      try {
        const result = await createParentStudentWithCredentials(payload);
        toast.success('Đã thêm hồ sơ học sinh.');
        await refreshStudents();
        setSessionsKey((key) => key + 1);
        if (result.content) {
          setCredentialsTitle(undefined);
          setCredentials(result.content);
        }
      } catch (err) {
        toast.error(extractApiErrorMessage(err, 'Thêm học sinh thất bại'));
        throw err;
      }
    },
    [refreshStudents],
  );

  const editStudent = useCallback(
    async (studentId: string, payload: ICreateParentStudent) => {
      try {
        await updateParentStudent(studentId, payload);
        toast.success('Đã cập nhật hồ sơ học sinh.');
        await refreshStudents();
      } catch (err) {
        toast.error(extractApiErrorMessage(err, 'Cập nhật thất bại'));
        throw err;
      }
    },
    [refreshStudents],
  );

  const removeStudent = useCallback(
    async (studentId: string) => {
      try {
        await deleteStudent(studentId);
        toast.success('Đã xoá hồ sơ học sinh.');
        await refreshStudents();
        setSessionsKey((key) => key + 1);
      } catch (err) {
        // BE chặn xoá khi còn lịch học đang chạy — nói rõ để phụ huynh biết phải huỷ lịch trước.
        toast.error(
          hasApiErrorCode(err, 'ACTIVE_BOOKING')
            ? 'Không thể xoá vì học sinh vẫn còn lịch học. Vui lòng huỷ lịch học trước.'
            : extractApiErrorMessage(err, 'Xoá học sinh thất bại'),
        );
      }
    },
    [refreshStudents],
  );

  const resetPassword = useCallback(async (studentId: string) => {
    try {
      const result = await resetStudentPassword(studentId);
      if (result.content) {
        setCredentialsTitle('Đã đặt lại mật khẩu');
        setCredentials(result.content);
      } else {
        toast.success('Đã đặt lại mật khẩu.');
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'Đặt lại mật khẩu thất bại'));
    }
  }, []);

  const dismissCredentials = useCallback(() => {
    setCredentials(null);
    setCredentialsTitle(undefined);
  }, []);

  return {
    rows,
    sessionsByBooking,
    loading,
    insightsLoading,
    insightsFailed,
    credentials,
    credentialsTitle,
    dismissCredentials,
    addStudent,
    editStudent,
    removeStudent,
    resetPassword,
  };
}
