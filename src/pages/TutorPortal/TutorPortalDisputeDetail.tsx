import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DisputeDetailView, type DisputeSessionContext } from '../../components/disputes';
import {
  getTutorClassSessionDetail,
  getTutorClassSessionDispute,
  getTutorDisputeThread,
  sendTutorDisputeThreadMessage,
  submitTutorDisputeResponse,
  uploadTutorDisputeEvidence,
} from '../../services/classSession.service';

/**
 * Chi tiết khiếu nại phía gia sư. Trước đây nội dung này nằm nhúng trong trang chi tiết
 * buổi học — tách ra để có URL riêng và đủ chỗ cho dòng thời gian, bằng chứng, bối cảnh.
 */
const TutorPortalDisputeDetail = () => {
  const { classSessionId: rawId } = useParams<{ classSessionId: string }>();
  const classSessionId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const fetchDispute = useCallback(
    async (id: number) => (await getTutorClassSessionDispute(id)).content ?? null,
    [],
  );

  const fetchContext = useCallback(async (id: number): Promise<DisputeSessionContext | null> => {
    const session = (await getTutorClassSessionDetail(id)).content;
    if (!session) return null;

    return {
      classSessionId: session.classSessionId,
      bookingId: session.bookingId,
      subjectName: session.subject?.subjectName,
      scheduledStart: session.scheduledStart,
      scheduledEnd: session.scheduledEnd,
      checkInTime: session.checkInTime,
      checkOutTime: session.checkOutTime,
      reportCreatedAt: session.report?.createdAt,
      confirmDeadline: session.confirmDeadline,
      price: session.classSessionPrice,
      isTutorPresent: session.isTutorPresent,
      isStudentPresent: session.isStudentPresent,
      counterpart: {
        name: session.student?.fullName,
        subtitle: [session.student?.school, session.student?.gradeLevel].filter(Boolean).join(' · ') || undefined,
        avatarUrl: session.student?.avatarUrl,
        // Trang hồ sơ học tập cần cả bookingId lẫn classSessionId để mở đúng lớp đang xét.
        profilePath:
          session.student?.studentId && session.bookingId
            ? `/tutor-portal/students/${encodeURIComponent(session.student.studentId)}?bookingId=${session.bookingId}&classSessionId=${session.classSessionId}`
            : null,
      },
    };
  }, []);

  const fetchThread = useCallback(async (id: number) => (await getTutorDisputeThread(id)).content ?? [], []);

  const sendThreadMessage = useCallback(async (id: number, message: string) => {
    await sendTutorDisputeThreadMessage(id, message);
  }, []);

  const submitResponse = useCallback(
    async (id: number, message: string) => (await submitTutorDisputeResponse(id, message)).content ?? null,
    [],
  );

  const uploadEvidence = useCallback(async (id: number, file: File) => {
    await uploadTutorDisputeEvidence(id, file);
  }, []);

  return (
    <DisputeDetailView
      classSessionId={classSessionId}
      adapter={{
        viewerRole: 'tutor',
        fetchDispute,
        fetchContext,
        fetchThread,
        sendThreadMessage,
        submitResponse,
        uploadEvidence,
        listPath: '/tutor-portal/disputes',
        sessionPath: (id) => `/tutor-portal/class-sessions/${id}`,
      }}
    />
  );
};

export default TutorPortalDisputeDetail;
