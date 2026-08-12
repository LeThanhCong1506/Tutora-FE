import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DisputeDetailView, type DisputeSessionContext } from '../../components/disputes';
import {
  getClassSessionDispute,
  getClassSessionDisputeThread,
  sendClassSessionDisputeThreadMessage,
} from '../../services/classSession.service';
import { getStudentLessonDetail } from '../../services/student-lesson.service';

/**
 * Chi tiết khiếu nại phía học viên tự đăng ký. Dùng chung endpoint khiếu nại với phụ huynh
 * (`/class-sessions/{id}/dispute`), chỉ khác nguồn chi tiết buổi học và route điều hướng.
 */
const StudentDisputeDetail = () => {
  const { classSessionId: rawId } = useParams<{ classSessionId: string }>();
  const classSessionId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const fetchDispute = useCallback(async (id: number) => (await getClassSessionDispute(id)).content ?? null, []);

  const fetchContext = useCallback(async (id: number): Promise<DisputeSessionContext | null> => {
    const lesson = (await getStudentLessonDetail(id)).content;
    if (!lesson) return null;

    return {
      classSessionId: lesson.lessonId,
      bookingId: lesson.bookingId,
      subjectName: lesson.subjectName ?? lesson.subject?.subjectName,
      scheduledStart: lesson.scheduledStart,
      scheduledEnd: lesson.scheduledEnd,
      checkInTime: lesson.checkInTime,
      checkOutTime: lesson.checkOutTime,
      reportCreatedAt: lesson.report?.createdAt,
      confirmDeadline: lesson.confirmDeadline,
      price: lesson.lessonPrice,
      isTutorPresent: lesson.isTutorPresent,
      isStudentPresent: lesson.isStudentPresent,
      counterpart: {
        name: lesson.tutorName ?? lesson.tutor?.fullName,
        subtitle: lesson.subjectName ?? lesson.subject?.subjectName,
        avatarUrl: lesson.tutor?.avatarUrl,
        profilePath: null,
      },
    };
  }, []);

  const fetchThread = useCallback(async (id: number) => (await getClassSessionDisputeThread(id)).content ?? [], []);

  const sendThreadMessage = useCallback(async (id: number, message: string) => {
    await sendClassSessionDisputeThreadMessage(id, message);
  }, []);

  return (
    <DisputeDetailView
      classSessionId={classSessionId}
      adapter={{
        viewerRole: 'claimant',
        fetchDispute,
        fetchContext,
        fetchThread,
        sendThreadMessage,
        listPath: '/student-portal/disputes',
        sessionPath: (id) => `/student-portal/calendar/${id}`,
      }}
    />
  );
};

export default StudentDisputeDetail;
