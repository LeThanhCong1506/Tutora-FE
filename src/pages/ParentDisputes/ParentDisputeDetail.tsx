import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DisputeDetailView, type DisputeSessionContext } from '../../components/disputes';
import {
  getClassSessionDispute,
  getClassSessionDisputeThread,
  sendClassSessionDisputeThreadMessage,
  submitParentDisputeResponse,
  uploadParentDisputeEvidence,
} from '../../services/classSession.service';
import { getParentLessonDetail } from '../../services/parent-lesson.service';

/**
 * Chi tiết khiếu nại phía phụ huynh. Khu vực phản hồi/nộp bằng chứng chỉ hiện khi dispute này
 * do GIA SƯ tạo (DisputeDetailView tự quyết định dựa trên dispute.createdBy) — nếu chính phụ
 * huynh/học sinh là người tạo, họ chỉ trao đổi thêm qua kênh riêng với quản trị viên.
 */
const ParentDisputeDetail = () => {
  const { classSessionId: rawId } = useParams<{ classSessionId: string }>();
  const classSessionId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const fetchDispute = useCallback(async (id: number) => (await getClassSessionDispute(id)).content ?? null, []);

  const fetchContext = useCallback(async (id: number): Promise<DisputeSessionContext | null> => {
    const lesson = (await getParentLessonDetail(id)).content;
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
        // Portal phụ huynh không có trang hồ sơ gia sư nội bộ — để trống thay vì dẫn ra trang public.
        profilePath: null,
      },
    };
  }, []);

  const fetchThread = useCallback(async (id: number) => (await getClassSessionDisputeThread(id)).content ?? [], []);

  const sendThreadMessage = useCallback(async (id: number, message: string) => {
    await sendClassSessionDisputeThreadMessage(id, message);
  }, []);

  const submitResponse = useCallback(async (id: number, message: string) => {
    const result = await submitParentDisputeResponse(id, message);
    return result.content ?? null;
  }, []);

  const uploadEvidence = useCallback(async (id: number, file: File) => {
    await uploadParentDisputeEvidence(id, file);
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
        submitResponse,
        uploadEvidence,
        listPath: '/parent-portal/disputes',
        sessionPath: (id) => `/parent-portal/lessons/${id}`,
      }}
    />
  );
};

export default ParentDisputeDetail;
