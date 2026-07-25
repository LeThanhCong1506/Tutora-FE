import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';

const inMiniApp = isZaloMiniApp();
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, XCircle, Paperclip, Download } from 'lucide-react';
import { getParentLessonDetail } from '../../services/parent-lesson.service';
import {
  getClassSessionDispute,
  getClassSessionDisputeThread,
  sendClassSessionDisputeThreadMessage,
  type DisputeDetailResponse,
  type DisputeMessage,
  getParentScheduleChange,
  respondParentScheduleChange,
  type SessionScheduleChangeResponse,
} from '../../services/classSession.service';
import { signalRService } from '../../services/signalr.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { Spin, Tag, Button } from 'antd';
import { toast } from 'react-toastify';
import CountdownTimer from './components/CountdownTimer';
import ConfirmLessonModal from './components/ConfirmLessonModal';
import CreateDisputeForm from './components/CreateDisputeForm';
import ReportNoShowModal from './components/ReportNoShowModal';
import NoShowActionModal from './components/NoShowActionModal';
import CreateFeedbackModal from './components/CreateFeedbackModal';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';

const getFileNameFromUrl = (url: string): string => {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1)) || 'Tệp đính kèm';
  } catch {
    return 'Tệp đính kèm';
  }
};

const ParentLessonDetail: React.FC = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const id = lessonId ? parseInt(lessonId) : 0;

  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleChange, setScheduleChange] = useState<SessionScheduleChangeResponse | null>(null);
  const [submittingScheduleDecision, setSubmittingScheduleDecision] = useState(false);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showNoShowActionModal, setShowNoShowActionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
  const [thread, setThread] = useState<DisputeMessage[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await getParentLessonDetail(id);
      setLesson(response.content);
    } catch (error: any) {
      toast.error('Không thể tải chi tiết buổi học.');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleChange = async () => {
    if (!id) return;
    try {
      const response = await getParentScheduleChange(id);
      setScheduleChange(response.content);
    } catch (requestError: unknown) {
      console.error('Failed to load schedule-change state', requestError);
      setScheduleChange(null);
    }
  };
  const fetchDispute = async () => {
    if (!id) return;
    try {
      const response = await getClassSessionDispute(id);
      setDispute(response.content);
    } catch {
      setDispute(null);
    }
  };

  const fetchThread = async () => {
    if (!id) return;
    try {
      const response = await getClassSessionDisputeThread(id);
      setThread(response.content);
    } catch (requestError: unknown) {
      console.error('Failed to load dispute thread', requestError);
    }
  };

  const handleSendThreadMessage = async () => {
    if (!id || threadInput.trim().length === 0) return;
    setSendingThreadMessage(true);
    try {
      await sendClassSessionDisputeThreadMessage(id, threadInput.trim());
      setThreadInput('');
      await fetchThread();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSendingThreadMessage(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLesson();
      fetchDispute();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void fetchScheduleChange();
    const timer = window.setInterval(() => void fetchScheduleChange(), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (dispute) void fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispute?.disputeId]);

  // Real-time: chèn tin nhắn mới trực tiếp thay vì phải F5/refetch.
  useEffect(() => {
    if (!dispute) return;
    const unsubscribe = signalRService.subscribeToDisputeMessages((message: DisputeMessage) => {
      if (message.disputeId !== dispute.disputeId) return;
      setThread((prev) => (prev.some((m) => m.disputeMessageId === message.disputeMessageId) ? prev : [...prev, message]));
      toast.info(`Admin: ${message.message}`);
    });
    return unsubscribe;
  }, [dispute]);

  // Tutor check-in → notification "Buổi học đã bắt đầu" → tự refetch để render banner Join
  useLessonStartedListener(() => { if (id) fetchLesson(); });

  const handleScheduleChangeDecision = async (confirmed: boolean) => {
    if (!id) return;
    setSubmittingScheduleDecision(true);
    try {
      const response = await respondParentScheduleChange(id, confirmed);
      setScheduleChange(response.content);
      toast.success(confirmed ? 'Đã xác nhận đổi lịch học.' : 'Đã từ chối đổi lịch học.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xử lý yêu cầu đổi lịch.');
      await fetchScheduleChange();
    } finally {
      setSubmittingScheduleDecision(false);
    }
  };
  const handleActionSuccess = () => {
    setShowConfirmModal(false);
    setShowDisputeForm(false);
    setShowNoShowModal(false);
    setShowNoShowActionModal(false);
    fetchLesson();
    fetchDispute();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
        Không tìm thấy buổi học
      </div>
    );
  }

  const status = getClassSessionStatusMeta(lesson.status);
  const startTime = new Date(lesson.scheduledStart);
  const endTime = new Date(lesson.scheduledEnd);
  const reportContent = lesson.report?.contentCovered || lesson.lessonContent;
  const reportHomework = lesson.report?.homeworkAssigned || lesson.homework;
  const reportRating = typeof lesson.report?.studentPerformanceRating === 'number'
    ? Math.max(0, Math.min(5, Math.round(lesson.report.studentPerformanceRating)))
    : null;
  const hasTutorReport = Boolean(
    lesson.report
    || reportContent
    || reportHomework
    || lesson.tutorNotes
    || lesson.report?.attachments?.length,
  );

  return (
    <div style={{ padding: inMiniApp ? '12px' : '24px', maxWidth: inMiniApp ? 'none' : '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/parent-portal/dashboard')}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: '1px solid #e8e8e8', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2238', margin: 0 }}>
            Chi tiết buổi học
          </h1>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
            #{lesson.lessonId}
          </p>
        </div>
        <Tag color={status.color} style={{ fontSize: '14px', padding: '4px 12px', borderRadius: '6px' }}>
          {status.label}
        </Tag>
      </div>

      {/* Countdown Timer */}
      {lesson.confirmDeadline && lesson.status === 'pending_confirmation' && (
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px',
          padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#d48806' }}>
            Hạn xác nhận buổi học:
          </span>
          <CountdownTimer deadline={lesson.confirmDeadline} />
        </div>
      )}

      {/* Parent confirms an off-schedule request here; parent never enters the lobby/call. */}
      {scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Parent' && (
        <div style={{
          background: '#fff',
          border: `1px solid ${scheduleChange.status === 'rejected' ? '#ffccc7' : '#ffe58f'}`,
          borderRadius: 12,
          padding: inMiniApp ? 16 : 22,
          marginBottom: 20,
          boxShadow: '0 6px 22px rgba(26,34,56,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: '#fff7e6', color: '#d46b08',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarClock size={22} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2238' }}>
                Xác nhận thay đổi giờ học
              </div>
              <div style={{ fontSize: 13, color: '#667085', marginTop: 4, lineHeight: 1.55 }}>
                Gia sư và học viên đang muốn học ngoài thời gian mặc định. Phụ huynh chỉ xác nhận tại đây;
                học viên và gia sư là hai người vào phòng học.
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: inMiniApp ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}>
            <InfoRow
              label="Học viên"
              value={scheduleChange.studentName || lesson.student?.fullName || 'Học sinh'}
            />
            <InfoRow
              label="Gia sư"
              value={scheduleChange.tutorName || lesson.tutorName || lesson.tutor?.fullName || 'Gia sư'}
            />
            <InfoRow
              label="Lịch học ban đầu"
              value={`${new Date(scheduleChange.originalScheduledStart).toLocaleDateString('vi-VN')} · ${new Date(scheduleChange.originalScheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(scheduleChange.originalScheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
            />
            <InfoRow label="Thời lượng giữ nguyên" value={`${scheduleChange.durationMinutes} phút`} />
            {scheduleChange.requestedAt && (
              <InfoRow
                label="Yêu cầu được tạo lúc"
                value={new Date(scheduleChange.requestedAt).toLocaleString('vi-VN')}
              />
            )}
            {scheduleChange.expiresAt && (
              <InfoRow
                label="Hạn phản hồi"
                value={new Date(scheduleChange.expiresAt).toLocaleString('vi-VN')}
              />
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: inMiniApp ? '1fr' : '1fr 1fr',
            gap: 10,
            marginBottom: 16,
          }}>
            <div style={{
              border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {scheduleChange.tutorConfirmedAt
                ? <CheckCircle2 size={19} color="#16a34a" />
                : <Clock3 size={19} color="#d97706" />}
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Gia sư</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2238' }}>
                  {scheduleChange.tutorConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                </div>
              </div>
            </div>
            <div style={{
              border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {scheduleChange.learnerConfirmedAt
                ? <CheckCircle2 size={19} color="#16a34a" />
                : <Clock3 size={19} color="#d97706" />}
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Phụ huynh</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2238' }}>
                  {scheduleChange.learnerConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                </div>
              </div>
            </div>
          </div>

          {scheduleChange.status === 'rejected' ? (
            <div style={{ color: '#cf1322', background: '#fff2f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              Yêu cầu đổi lịch đã bị từ chối. Học viên và gia sư chưa thể vào buổi học ngoài lịch này.
            </div>
          ) : scheduleChange.status === 'approved' ? (
            <div style={{ color: '#15803d', background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              Đã đủ xác nhận. Học viên và gia sư có thể vào học; thời gian buổi học sẽ được cập nhật khi họ bắt đầu.
            </div>
          ) : scheduleChange.currentUserConfirmed ? (
            <div style={{ color: '#0958d9', background: '#e6f4ff', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              Phụ huynh đã xác nhận. Đang chờ gia sư xác nhận.
            </div>
          ) : scheduleChange.canCurrentUserConfirm ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <Button
                danger
                size="large"
                icon={<XCircle size={17} />}
                loading={submittingScheduleDecision}
                onClick={() => void handleScheduleChangeDecision(false)}
              >
                Từ chối
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircle2 size={17} />}
                loading={submittingScheduleDecision}
                onClick={() => void handleScheduleChangeDecision(true)}
                style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
              >
                Xác nhận đổi lịch
              </Button>
            </div>
          ) : null}
        </div>
      )}
      {/* Lesson Info Card */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px',
        border: '1px solid rgba(26,34,56,0.06)', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2238', marginBottom: '16px' }}>
          Thông tin buổi học
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: inMiniApp ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <InfoRow label="Môn học" value={lesson.subjectName || lesson.subject?.subjectName || 'N/A'} />
          <InfoRow label="Gia sư" value={lesson.tutorName || lesson.tutor?.fullName || 'N/A'} />
          <InfoRow

            label="Thời gian"
            value={`${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
          />
          <InfoRow
            label="Ngày"
            value={startTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          />
          {lesson.lessonPrice != null && (
            <InfoRow
              label="Giá buổi học"
              value={`${lesson.lessonPrice.toLocaleString('vi-VN')}đ`}
              highlight
            />
          )}
          {lesson.meetingLink && (
            <InfoRow label="Hình thức" value="Học online" />
          )}
        </div>
      </div>

      {/* Lịch sử dời lịch (nếu có) — bản tóm tắt cố định, khác với banner "cần xác nhận" ở trên (banner đó tự ẩn sau khi xử lý xong). */}
      {Array.isArray(lesson.scheduleChanges) && lesson.scheduleChanges.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '24px',
          border: '1px solid rgba(26,34,56,0.06)', marginBottom: '20px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2238', marginBottom: '16px' }}>
            Lịch sử dời lịch
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lesson.scheduleChanges.map((sc: any) => {
              const statusLabel: Record<string, string> = {
                applied: 'Đã áp dụng',
                approved: 'Hai bên đã đồng ý',
                rejected: 'Đã từ chối',
                expired: 'Đã hết hạn',
                pending: 'Đang chờ xác nhận',
              };
              return (
                <div key={sc.scheduleChangeId} style={{ background: '#fafaf8', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(26,34,56,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {statusLabel[sc.status] || sc.status}
                    </span>
                    {sc.appliedAt && (
                      <span style={{ fontSize: 12, color: '#999' }}>
                        Áp dụng lúc {new Date(sc.appliedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: '#1a2238' }}>
                    {new Date(sc.originalScheduledStart).toLocaleDateString('vi-VN')}, {new Date(sc.originalScheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–{new Date(sc.originalScheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {sc.adjustedScheduledStart && (
                      <> {'→'} {new Date(sc.adjustedScheduledStart).toLocaleDateString('vi-VN')}, {new Date(sc.adjustedScheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–{new Date(sc.adjustedScheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                    <span>Gia sư: {sc.tutorConfirmedByName ? `${sc.tutorConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}</span>
                    <span>
                      {sc.learnerApproverRole === 'Student' ? 'Học sinh' : 'Phụ huynh'}: {sc.learnerConfirmedByName ? `${sc.learnerConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tutor Report (if available) */}
      {hasTutorReport && (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '24px',
          border: '1px solid rgba(26,34,56,0.06)', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a2238', margin: 0 }}>
              Báo cáo gia sư
            </h3>
            {lesson.report?.createdAt && (
              <span style={{ fontSize: '12px', color: '#999', textAlign: 'right' }}>
                Gửi lúc {new Date(lesson.report.createdAt).toLocaleString('vi-VN')}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: inMiniApp ? '1fr' : '1fr 1fr', gap: '18px 24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Nội dung đã dạy</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {reportContent || 'Không có nội dung.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Bài tập về nhà</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {reportHomework || 'Không giao bài tập.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Ghi chú gia sư</div>
              <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {lesson.tutorNotes || 'Không có ghi chú.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Mức độ tiếp thu của học viên
              </div>
              {reportRating != null && reportRating > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#faad14', fontSize: '18px', letterSpacing: 2 }}>
                    {'★'.repeat(reportRating)}
                    <span style={{ color: '#e8e8e8' }}>{'★'.repeat(5 - reportRating)}</span>
                  </span>
                  <span style={{ fontSize: '13px', color: '#666' }}>{reportRating}/5</span>
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#999' }}>Chưa đánh giá.</div>
              )}
            </div>
          </div>

          {Array.isArray(lesson.report?.attachments) && lesson.report.attachments.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Tệp đính kèm</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lesson.report.attachments.map((url: string, index: number) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: '#fafaf8',
                      borderRadius: 10,
                      border: '1px solid rgba(26,34,56,0.06)',
                      textDecoration: 'none',
                    }}
                  >
                    <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '13px',
                        color: '#1a2238',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getFileNameFromUrl(url)}
                    </span>
                    <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {dispute && (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px',
          border: '1px solid rgba(26,34,56,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a2238' }}>Khiếu nại của bạn</span>
            <Tag color={dispute.status === 'resolved' || dispute.status === 'confirmed_no_show' ? '#52c41a' : dispute.status === 'investigating' ? '#1890ff' : '#faad14'}>
              {dispute.status === 'resolved'
                ? 'Đã giải quyết'
                : dispute.status === 'confirmed_no_show'
                  ? 'Đã xác nhận vắng mặt'
                  : dispute.status === 'investigating'
                    ? 'Đang xem xét'
                    : 'Chờ xử lý'}
            </Tag>
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: dispute.evidence?.length ? '12px' : 0 }}>
            {dispute.reason || 'Không có mô tả.'}
          </div>
          {Array.isArray(dispute.evidence) && dispute.evidence.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dispute.evidence.map((url: string, index: number) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#fafaf8', borderRadius: 10,
                    border: '1px solid rgba(26,34,56,0.06)', textDecoration: 'none',
                  }}
                >
                  <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#1a2238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getFileNameFromUrl(url)}
                  </span>
                  <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                </a>
              ))}
            </div>
          )}
          {Array.isArray(dispute.additionalEvidence) && dispute.additionalEvidence.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: dispute.evidence?.length ? 8 : 0 }}>
              {dispute.additionalEvidence.map((item) => (
                <a
                  key={item.disputeEvidenceId}
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#fafaf8', borderRadius: 10,
                    border: '1px solid rgba(26,34,56,0.06)', textDecoration: 'none',
                  }}
                >
                  <Paperclip size={14} style={{ flexShrink: 0, color: '#6366F1' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#1a2238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.fileUrl ? getFileNameFromUrl(item.fileUrl) : 'Bằng chứng'}
                  </span>
                  <Download size={14} style={{ flexShrink: 0, color: '#9ca3af' }} />
                </a>
              ))}
            </div>
          )}
          {dispute.status === 'resolved' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(26,34,56,0.06)' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Kết quả xử lý</div>
              <div style={{ fontSize: '14px', color: '#1a2238' }}>{dispute.resolutionNote || 'Không có ghi chú.'}</div>
            </div>
          )}
          {dispute.status !== 'resolved' && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(26,34,56,0.06)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2238', marginBottom: 8 }}>Chat riêng với admin</div>
              {thread.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
                  {thread.map((msg) => (
                    <div
                      key={msg.disputeMessageId}
                      style={{
                        alignSelf: msg.senderRole === 'admin' ? 'flex-start' : 'flex-end',
                        maxWidth: '80%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: msg.senderRole === 'admin' ? '#eef2ff' : '#f1f5f9',
                      }}
                    >
                      <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                        {msg.senderRole === 'admin' ? 'Admin' : 'Bạn'}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={threadInput}
                  onChange={(event) => setThreadInput(event.target.value)}
                  placeholder="Nhắn cho admin..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d9dde3', fontSize: 13 }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSendThreadMessage();
                  }}
                />
                <Button
                  size="middle"
                  loading={sendingThreadMessage}
                  disabled={threadInput.trim().length === 0}
                  onClick={() => void handleSendThreadMessage()}
                >
                  Gửi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '20px',
        border: '1px solid rgba(26,34,56,0.06)',
        display: 'flex', gap: '12px', flexWrap: 'wrap',
      }}>
        {lesson.status === 'pending_confirmation' && (
          <>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowConfirmModal(true)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Xác nhận buổi học
            </Button>
            <Button
              size="large"
              danger
              onClick={() => setShowDisputeForm(true)}
            >
              Khiếu nại
            </Button>
          </>
        )}

        {lesson.status === 'scheduled' && (
          <Button
            size="large"
            danger
            onClick={() => setShowNoShowModal(true)}
          >
            Báo gia sư vắng mặt
          </Button>
        )}

        {lesson.status === 'no_show' && dispute?.status === 'confirmed_no_show' && (
          <Button
            type="primary"
            size="large"
            onClick={() => setShowNoShowActionModal(true)}
            style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
          >
            Chọn hành động xử lý
          </Button>
        )}

        {lesson.status === 'no_show' && dispute?.status !== 'confirmed_no_show' && (
          <div style={{ maxWidth: 420, color: '#8a6116', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '10px 14px' }}>
            Báo cáo đang chờ quản trị viên xác nhận. Chưa có hoàn tiền hoặc cảnh báo nào được áp dụng.
          </div>
        )}

        {lesson.status === 'completed' && (
          <>
            <Button
              type="primary"
              size="large"
              onClick={() => setShowFeedbackModal(true)}
              style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
            >
              Đánh giá buổi học
            </Button>
            {!dispute && (
              <Button
                size="large"
                danger
                onClick={() => setShowDisputeForm(true)}
              >
                Báo cáo gia sư
              </Button>
            )}
          </>
        )}

        <Button size="large" onClick={() => navigate('/parent-portal/dashboard')}>
          Quay lại
        </Button>
      </div>

      {/* Modals */}
      <CreateFeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={handleActionSuccess}
        lessonId={id}
        bookingId={lesson.bookingId || 0}
        tutorId={(lesson.tutorId || lesson.tutor?.tutorId) || ''}
        tutorName={lesson.tutorName || lesson.tutor?.fullName}
        subjectName={lesson.subjectName || lesson.subject?.subjectName}
      />

      <ConfirmLessonModal
        open={showConfirmModal}
        lessonId={id}
        subjectName={lesson.subjectName}
        tutorName={lesson.tutorName}
        lessonPrice={lesson.lessonPrice}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowConfirmModal(false)}
      />

      <CreateDisputeForm
        open={showDisputeForm}
        lessonId={id}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowDisputeForm(false)}
      />

      <ReportNoShowModal
        open={showNoShowModal}
        lessonId={id}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowNoShowModal(false)}
      />

      <NoShowActionModal
        open={showNoShowActionModal}
        lessonId={id}
        onSuccess={handleActionSuccess}
        onCancel={() => setShowNoShowActionModal(false)}
      />
    </div>
  );
};

// Helper component
const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{label}</div>
    <div style={{
      fontSize: '14px', color: highlight ? '#52c41a' : '#1a2238',
      fontWeight: highlight ? 600 : 400,
    }}>
      {value}
    </div>
  </div>
);

export default ParentLessonDetail;
