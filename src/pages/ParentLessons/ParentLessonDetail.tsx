import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';

const inMiniApp = isZaloMiniApp();
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { getParentLessonDetail, type ParentLessonDetailDto } from '../../services/parent-lesson.service';
import {
  getClassSessionDispute,
  getClassSessionDisputeThread,
  sendClassSessionDisputeThreadMessage,
  type DisputeDetailResponse,
  type DisputeMessage,
  getParentScheduleChange,
  respondParentScheduleChange,
  type ReportAttachment,
  type ScheduleChangeAuditDto,
  type SessionScheduleChangeResponse,
} from '../../services/classSession.service';
import { signalRService } from '../../services/signalr.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { Spin, Button, Input } from 'antd';
import { toast } from 'react-toastify';
import CountdownTimer from './components/CountdownTimer';
import ConfirmLessonModal from './components/ConfirmLessonModal';
import CreateDisputeForm from './components/CreateDisputeForm';
import ReportNoShowModal from './components/ReportNoShowModal';
import NoShowActionModal from './components/NoShowActionModal';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import {
  AttachmentGallery,
  buildSessionTimeline,
  ClassSessionRecording,
  PageContainer,
  SectionCard,
  SessionTimeline,
  StatusBadge,
} from '../../components/shared';
import { getDisputeStatusMeta, getDisputeTypeLabel } from '../../components/disputes';
import { formatVNDNumber } from '../../utils/formatters';
import { formatLocalDate, formatLocalDateTime, formatLocalTime } from '../../utils/datetime';
import styles from './lesson-detail.module.css';

const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'cancelled_noshow'];

const getApiErrorMessage = (error: unknown): string | undefined =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

const getPresenceLabel = (present?: boolean | null) =>
  present === true ? 'Có mặt' : present === false ? 'Vắng mặt' : 'Chưa ghi nhận';

const getPresenceClass = (present?: boolean | null) =>
  present === true ? styles.present : present === false ? styles.absent : '';

const SCHEDULE_CHANGE_STATUS_LABELS: Record<string, string> = {
  applied: 'Đã áp dụng',
  approved: 'Hai bên đã đồng ý',
  rejected: 'Đã từ chối',
  expired: 'Đã hết hạn',
  pending: 'Đang chờ xác nhận',
};

// Dùng chung bộ format với trang khiếu nại: "HH:mm", "DD/MM/YYYY", "HH:mm DD/MM/YYYY".
const formatTime = formatLocalTime;
const formatDate = formatLocalDate;
const formatDateTime = formatLocalDateTime;

const InfoItem: React.FC<{ label: string; value: React.ReactNode; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={styles.infoItem}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={`${styles.infoValue} ${accent ? styles.infoAccent : ''}`}>{value}</span>
  </div>
);

const ReportBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.reportBlock}>
    <p className={styles.reportLabel}>{label}</p>
    {children}
  </div>
);

const ParentLessonDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId } = useParams();
  const id = lessonId ? parseInt(lessonId) : 0;

  const [lesson, setLesson] = useState<ParentLessonDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleChange, setScheduleChange] = useState<SessionScheduleChangeResponse | null>(null);
  const [submittingScheduleDecision, setSubmittingScheduleDecision] = useState(false);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showNoShowActionModal, setShowNoShowActionModal] = useState(false);
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
  const [thread, setThread] = useState<DisputeMessage[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);

  /**
   * Quay lại đúng trang người dùng vừa rời (danh sách khiếu nại, lịch học, dashboard…).
   * `location.key === 'default'` nghĩa là trang này là entry đầu tiên của history (mở thẳng link,
   * F5, tab mới) — lúc đó `navigate(-1)` sẽ văng ra khỏi app nên phải rơi về dashboard.
   */
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/parent-portal/dashboard');
  };

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await getParentLessonDetail(id);
      setLesson(response.content);
    } catch {
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
    if (!id || threadInput.trim().length === 0 || sendingThreadMessage) return;
    setSendingThreadMessage(true);
    try {
      await sendClassSessionDisputeThreadMessage(id, threadInput.trim());
      setThreadInput('');
      await fetchThread();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) || 'Không thể gửi tin nhắn.', { toastId: 'dispute-thread-send-error' });
    } finally {
      setSendingThreadMessage(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLesson();
      fetchDispute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setThread((prev) =>
        prev.some((m) => m.disputeMessageId === message.disputeMessageId) ? prev : [...prev, message],
      );
      toast.info(`Admin: ${message.message}`);
    });
    return unsubscribe;
  }, [dispute]);

  // Tutor check-in → notification "Buổi học đã bắt đầu" → tự refetch để render banner Join
  useLessonStartedListener(() => {
    if (id) fetchLesson();
  });

  const handleScheduleChangeDecision = async (confirmed: boolean) => {
    if (!id) return;
    setSubmittingScheduleDecision(true);
    try {
      const response = await respondParentScheduleChange(id, confirmed);
      setScheduleChange(response.content);
      // Khi cả hai bên đã chốt, BE dời luôn giờ của buổi học — phải nạp lại, không thì trang
      // vẫn hiển thị giờ cũ cho tới khi người dùng tự F5.
      if (response.content.status === 'approved') {
        await fetchLesson();
      }
      if (confirmed && response.content.scheduleConflict) {
        toast.warning(`Đã lưu xác nhận. ${response.content.scheduleConflict.message}`);
      } else {
        toast.success(confirmed ? 'Đã xác nhận đổi lịch học.' : 'Đã từ chối đổi lịch học.');
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) || 'Không thể xử lý yêu cầu đổi lịch.');
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

  const pageClassName = `${styles.page} ${inMiniApp ? styles.miniApp : ''}`;

  if (loading) {
    return (
      <PageContainer className={pageClassName}>
        <div className={styles.centerState}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!lesson) {
    return (
      <PageContainer className={pageClassName}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          Quay lại
        </button>
        <SectionCard>
          <div className={styles.centerState}>Không tìm thấy buổi học.</div>
        </SectionCard>
      </PageContainer>
    );
  }

  const status = getClassSessionStatusMeta(lesson.status);
  const startTime = new Date(lesson.scheduledStart);
  const endTime = new Date(lesson.scheduledEnd);
  const durationMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
  const reportContent = lesson.report?.contentCovered || lesson.lessonContent;
  const reportHomework = lesson.report?.homeworkAssigned || lesson.homework;
  const reportRating =
    typeof lesson.report?.studentPerformanceRating === 'number'
      ? Math.max(0, Math.min(5, Math.round(lesson.report.studentPerformanceRating)))
      : null;
  const hasTutorReport = Boolean(lesson.report || reportContent || reportHomework || lesson.tutorNotes);
  // Báo cáo cũ chỉ có mảng URL; báo cáo mới có kèm mô tả gia sư đặt.
  const reportAttachments: ReportAttachment[] =
    lesson.report?.attachmentDetails ?? (lesson.report?.attachments ?? []).map((url) => ({ url }));
  const canCreateDispute = !TERMINAL_BOOKING_STATUSES.includes(String(lesson.bookingStatus || '').toLowerCase());
  const disputeStatus = dispute ? getDisputeStatusMeta(dispute.status) : null;

  const timelineEvents = buildSessionTimeline({
    scheduledStart: lesson.scheduledStart,
    checkInTime: lesson.checkInTime,
    checkOutTime: lesson.checkOutTime,
    confirmDeadline: lesson.status === 'pending_confirmation' ? lesson.confirmDeadline : null,
    reportCreatedAt: lesson.report?.createdAt,
    disputeCreatedAt: dispute?.createdAt,
    disputeTutorRespondedAt: dispute?.tutorRespondedAt,
    disputeResolvedAt: dispute?.resolvedAt,
    scheduleChangeAppliedAt: lesson.scheduleChanges?.map((sc) => sc.appliedAt),
  });

  const showConfirmAction = lesson.status === 'pending_confirmation';
  const showNoShowAction = lesson.status === 'scheduled';
  const showNoShowResolution = lesson.status === 'no_show' && dispute?.status === 'confirmed_no_show';
  const showReportTutorAction = lesson.status === 'completed' && !dispute && canCreateDispute;

  return (
    <PageContainer className={pageClassName}>
      <button type="button" className={styles.backButton} onClick={goBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        Quay lại
      </button>

      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>Buổi #{lesson.lessonId}</span>
          <h1 className={styles.title}>{lesson.subjectName || lesson.subject?.subjectName || 'Chi tiết buổi học'}</h1>
          <p className={styles.headerMeta}>
            {startTime.toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
            {' · '}
            {formatTime(lesson.scheduledStart)}–{formatTime(lesson.scheduledEnd)}
            {' · '}
            {durationMinutes} phút
          </p>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
          {showConfirmAction && (
            <>
              <Button type="primary" className={styles.primaryAction} onClick={() => setShowConfirmModal(true)}>
                Xác nhận buổi học
              </Button>
              {canCreateDispute && (
                <Button danger onClick={() => setShowDisputeForm(true)}>
                  Khiếu nại
                </Button>
              )}
            </>
          )}
          {showNoShowAction && (
            <Button danger onClick={() => setShowNoShowModal(true)}>
              Báo gia sư vắng mặt
            </Button>
          )}
          {showNoShowResolution && (
            <Button type="primary" className={styles.primaryAction} onClick={() => setShowNoShowActionModal(true)}>
              Chọn hành động xử lý
            </Button>
          )}
          {showReportTutorAction && (
            <Button danger onClick={() => setShowDisputeForm(true)}>
              Báo cáo gia sư
            </Button>
          )}
        </div>
      </header>

      {lesson.confirmDeadline && lesson.status === 'pending_confirmation' && (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <Clock3 size={16} aria-hidden="true" />
          <span>Hạn xác nhận buổi học</span>
          <span className={styles.noticeSpacer}>
            <CountdownTimer deadline={lesson.confirmDeadline} />
          </span>
        </div>
      )}

      {lesson.status === 'no_show' && dispute?.status !== 'confirmed_no_show' && (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          Báo cáo đang chờ quản trị viên xác nhận. Chưa có hoàn tiền hoặc cảnh báo nào được áp dụng.
        </div>
      )}

      {/* Phụ huynh chỉ xác nhận đổi giờ ở đây; phụ huynh không vào phòng học. */}
      {scheduleChange?.requiresConfirmation && scheduleChange.requiredLearnerRole === 'Parent' && (
        <SectionCard
          title="Xác nhận thay đổi giờ học"
          headerAction={<CalendarClock size={18} color="#8a6116" aria-hidden="true" />}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionLead}>
              Gia sư và học viên đang muốn học ngoài thời gian mặc định. Phụ huynh chỉ xác nhận tại đây; học viên và gia
              sư là hai người vào phòng học.
            </p>

            <div className={styles.infoGrid}>
              <InfoItem label="Học viên" value={scheduleChange.studentName || lesson.student?.fullName || 'Học sinh'} />
              <InfoItem
                label="Gia sư"
                value={scheduleChange.tutorName || lesson.tutorName || lesson.tutor?.fullName || 'Gia sư'}
              />
              <InfoItem
                label="Lịch học ban đầu"
                value={`${formatDate(scheduleChange.originalScheduledStart)} · ${formatTime(scheduleChange.originalScheduledStart)}–${formatTime(scheduleChange.originalScheduledEnd)}`}
              />
              <InfoItem label="Thời lượng giữ nguyên" value={`${scheduleChange.durationMinutes} phút`} />
              {scheduleChange.requestedAt && (
                <InfoItem label="Yêu cầu tạo lúc" value={formatDateTime(scheduleChange.requestedAt)} />
              )}
              {scheduleChange.expiresAt && (
                <InfoItem label="Hạn phản hồi" value={formatDateTime(scheduleChange.expiresAt)} />
              )}
            </div>

            <div className={styles.confirmPair}>
              <div className={styles.confirmTile}>
                {scheduleChange.tutorConfirmedAt ? (
                  <CheckCircle2 size={19} color="#059669" />
                ) : (
                  <Clock3 size={19} color="#d97706" />
                )}
                <div>
                  <div className={styles.confirmTileLabel}>Gia sư</div>
                  <div className={styles.confirmTileValue}>
                    {scheduleChange.tutorConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                  </div>
                </div>
              </div>
              <div className={styles.confirmTile}>
                {scheduleChange.learnerConfirmedAt ? (
                  <CheckCircle2 size={19} color="#059669" />
                ) : (
                  <Clock3 size={19} color="#d97706" />
                )}
                <div>
                  <div className={styles.confirmTileLabel}>Phụ huynh</div>
                  <div className={styles.confirmTileValue}>
                    {scheduleChange.learnerConfirmedAt ? 'Đã xác nhận' : 'Đang chờ xác nhận'}
                  </div>
                </div>
              </div>
            </div>

            {scheduleChange.status === 'rejected' ? (
              <div className={`${styles.notice} ${styles.noticeDanger} ${styles.blockGap}`}>
                Yêu cầu đổi lịch đã bị từ chối. Học viên và gia sư chưa thể vào buổi học ngoài lịch này.
              </div>
            ) : scheduleChange.status === 'approved' && scheduleChange.scheduleConflict ? (
              <div className={`${styles.notice} ${styles.noticeWarning} ${styles.blockGap}`}>
                <span>
                  <strong>Đã đủ xác nhận nhưng chưa thể bắt đầu:</strong> {scheduleChange.scheduleConflict.message} Hệ
                  thống sẽ tự kiểm tra lại, phụ huynh không cần xác nhận lần nữa.
                </span>
              </div>
            ) : scheduleChange.status === 'approved' ? (
              <div className={`${styles.notice} ${styles.noticeSuccess} ${styles.blockGap}`}>
                Đã đủ xác nhận. Học viên và gia sư có thể vào học; thời gian buổi học sẽ được cập nhật khi họ bắt đầu.
              </div>
            ) : scheduleChange.currentUserConfirmed ? (
              <div className={`${styles.notice} ${styles.noticeInfo} ${styles.blockGap}`}>
                Phụ huynh đã xác nhận. Đang chờ gia sư xác nhận.
              </div>
            ) : scheduleChange.canCurrentUserConfirm ? (
              <div className={styles.decisionRow}>
                <Button
                  danger
                  icon={<XCircle size={16} />}
                  loading={submittingScheduleDecision}
                  onClick={() => void handleScheduleChangeDecision(false)}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  className={styles.primaryAction}
                  icon={<CheckCircle2 size={16} />}
                  loading={submittingScheduleDecision}
                  onClick={() => void handleScheduleChangeDecision(true)}
                >
                  Xác nhận đổi lịch
                </Button>
              </div>
            ) : null}
          </div>
        </SectionCard>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.primaryColumn}>
          {timelineEvents.length > 0 && (
            <SectionCard title="Diễn biến buổi học">
              <div className={styles.sectionBody}>
                <SessionTimeline events={timelineEvents} />
              </div>
            </SectionCard>
          )}

          {hasTutorReport && (
            <SectionCard
              title="Báo cáo gia sư"
              headerAction={
                lesson.report?.createdAt ? (
                  <span className={styles.historyTime}>Gửi lúc {formatDateTime(lesson.report.createdAt)}</span>
                ) : undefined
              }
            >
              <div className={styles.sectionBody}>
                <div className={styles.reportGrid}>
                  <ReportBlock label="Nội dung đã dạy">
                    <p className={`${styles.reportText} ${reportContent ? '' : styles.reportMuted}`}>
                      {reportContent || 'Không có nội dung.'}
                    </p>
                  </ReportBlock>
                  <ReportBlock label="Bài tập về nhà">
                    <p className={`${styles.reportText} ${reportHomework ? '' : styles.reportMuted}`}>
                      {reportHomework || 'Không giao bài tập.'}
                    </p>
                  </ReportBlock>
                  <ReportBlock label="Ghi chú gia sư">
                    <p className={`${styles.reportText} ${lesson.tutorNotes ? '' : styles.reportMuted}`}>
                      {lesson.tutorNotes || 'Không có ghi chú.'}
                    </p>
                  </ReportBlock>
                  <ReportBlock label="Mức độ tiếp thu của học viên">
                    {reportRating != null && reportRating > 0 ? (
                      <span className={styles.rating}>
                        <span className={styles.ratingStars}>
                          {'★'.repeat(reportRating)}
                          <span>{'★'.repeat(5 - reportRating)}</span>
                        </span>
                        <span className={styles.ratingValue}>{reportRating}/5</span>
                      </span>
                    ) : (
                      <p className={`${styles.reportText} ${styles.reportMuted}`}>Chưa đánh giá.</p>
                    )}
                  </ReportBlock>
                </div>

                {reportAttachments.length > 0 && (
                  <div className={styles.blockGap}>
                    <p className={styles.reportLabel}>Tài liệu gia sư gửi kèm</p>
                    <AttachmentGallery
                      items={reportAttachments.map((item) => ({ url: item.url, label: item.description }))}
                    />
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {dispute && (
            <SectionCard
              title="Khiếu nại của bạn"
              headerAction={
                disputeStatus ? (
                  <StatusBadge variant={disputeStatus.variant}>{disputeStatus.label}</StatusBadge>
                ) : undefined
              }
            >
              <div className={styles.sectionBody}>
                <div className={styles.reportGrid}>
                  <ReportBlock label="Loại khiếu nại">
                    <p className={styles.reportText}>{getDisputeTypeLabel(dispute.disputeType)}</p>
                  </ReportBlock>
                  {dispute.createdAt && (
                    <ReportBlock label="Ngày gửi">
                      <p className={styles.reportText}>{formatDateTime(dispute.createdAt)}</p>
                    </ReportBlock>
                  )}
                </div>

                <div className={styles.blockGap}>
                  <p className={styles.reportLabel}>Nội dung</p>
                  <p className={styles.reportText}>{dispute.reason || 'Không có mô tả.'}</p>
                </div>

                {(Array.isArray(dispute.evidence) && dispute.evidence.length > 0) ||
                (Array.isArray(dispute.additionalEvidence) && dispute.additionalEvidence.length > 0) ? (
                  <div className={styles.blockGap}>
                    <p className={styles.reportLabel}>Bằng chứng</p>
                    <AttachmentGallery
                      items={[
                        ...(dispute.evidence ?? []).map((url) => ({ url })),
                        ...(dispute.additionalEvidence ?? []).map((item) => ({
                          key: `additional-${item.disputeEvidenceId}`,
                          url: item.fileUrl ?? '',
                          label: item.description,
                          mimeType: item.fileType,
                        })),
                      ]}
                    />
                  </div>
                ) : null}

                {dispute.status === 'resolved' && (
                  <div className={`${styles.notice} ${styles.noticeSuccess} ${styles.blockGap}`}>
                    <span>
                      <strong>Kết quả xử lý:</strong> {dispute.resolutionNote || 'Không có ghi chú.'}
                      {typeof dispute.refundPercentage === 'number' && ` · Hoàn ${dispute.refundPercentage}%`}
                    </span>
                  </div>
                )}

                {dispute.status !== 'resolved' && (
                  <div className={styles.blockGap}>
                    <p className={styles.reportLabel}>Trao đổi riêng với quản trị viên</p>
                    {thread.length > 0 ? (
                      <div className={styles.thread}>
                        {thread.map((msg) => (
                          <div
                            key={msg.disputeMessageId}
                            className={`${styles.threadBubble} ${msg.senderRole === 'admin' ? styles.threadAdmin : styles.threadMine}`}
                          >
                            <p className={styles.threadSender}>
                              {msg.senderRole === 'admin' ? 'Quản trị viên' : 'Bạn'}
                            </p>
                            <p className={styles.threadText}>{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.threadEmpty}>Chưa có tin nhắn nào. Gửi câu hỏi cho quản trị viên tại đây.</p>
                    )}
                    <div className={styles.threadForm}>
                      <Input
                        value={threadInput}
                        placeholder="Nhắn cho quản trị viên..."
                        onChange={(event) => setThreadInput(event.target.value)}
                        onPressEnter={() => void handleSendThreadMessage()}
                      />
                      <Button
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
            </SectionCard>
          )}

          <SectionCard title="Video buổi học">
            <div className={styles.sectionBody}>
              <ClassSessionRecording classSessionId={id} />
            </div>
          </SectionCard>
        </div>

        <aside className={styles.sidebar}>
          <SectionCard title="Thông tin buổi học">
            <div className={styles.sectionBody}>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>Gia sư</span>
                  <span className={styles.infoRowValue}>
                    {lesson.tutorName || lesson.tutor?.fullName || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>Học viên</span>
                  <span className={styles.infoRowValue}>{lesson.student?.fullName || 'Chưa cập nhật'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>Hình thức</span>
                  <span className={styles.infoRowValue}>{lesson.meetingLink ? 'Học online' : 'Học trực tiếp'}</span>
                </div>
                {lesson.bookingId != null && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Mã đặt lịch</span>
                    <span className={styles.infoRowValue}>#{lesson.bookingId}</span>
                  </div>
                )}
                {lesson.lessonPrice != null && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Học phí buổi học</span>
                    <span className={`${styles.infoRowValue} ${styles.infoRowAccent}`}>
                      {formatVNDNumber(lesson.lessonPrice)}đ
                    </span>
                  </div>
                )}
                {lesson.confirmDeadline && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Hạn xác nhận</span>
                    <span className={styles.infoRowValue}>{formatDateTime(lesson.confirmDeadline)}</span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Điểm danh">
            <div className={styles.sectionBody}>
              <div className={styles.attendanceList}>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceAvatar}>GS</span>
                  <span className={styles.attendanceText}>
                    <strong>Gia sư</strong>
                    <small>{getPresenceLabel(lesson.isTutorPresent)}</small>
                  </span>
                  <span className={`${styles.presenceDot} ${getPresenceClass(lesson.isTutorPresent)}`} />
                </div>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceAvatar}>HV</span>
                  <span className={styles.attendanceText}>
                    <strong>Học viên</strong>
                    <small>{getPresenceLabel(lesson.isStudentPresent)}</small>
                  </span>
                  <span className={`${styles.presenceDot} ${getPresenceClass(lesson.isStudentPresent)}`} />
                </div>
              </div>
              {lesson.checkInTime && (
                <p className={styles.attendanceNote}>
                  Vào lúc {formatTime(lesson.checkInTime)}
                  {lesson.checkOutTime ? ` · Kết thúc ${formatTime(lesson.checkOutTime)}` : ''}
                </p>
              )}
              {lesson.attendanceNote && <p className={styles.attendanceNote}>{lesson.attendanceNote}</p>}
            </div>
          </SectionCard>

          {/* Bản tóm tắt cố định, khác với thẻ "cần xác nhận" ở trên (thẻ đó tự ẩn sau khi xử lý xong). */}
          {Array.isArray(lesson.scheduleChanges) && lesson.scheduleChanges.length > 0 && (
            <SectionCard title="Lịch sử dời lịch">
              <div className={styles.sectionBody}>
                <div className={styles.historyList}>
                  {lesson.scheduleChanges.map((sc: ScheduleChangeAuditDto) => (
                    <div key={sc.scheduleChangeId} className={styles.historyItem}>
                      <div className={styles.historyTop}>
                        <StatusBadge
                          variant={
                            sc.status === 'rejected' || sc.status === 'expired'
                              ? 'neutral'
                              : sc.status === 'pending'
                                ? 'warning'
                                : 'success'
                          }
                          shape="tag"
                        >
                          {SCHEDULE_CHANGE_STATUS_LABELS[sc.status] || sc.status}
                        </StatusBadge>
                        {sc.appliedAt && (
                          <span className={styles.historyTime}>Áp dụng lúc {formatDateTime(sc.appliedAt)}</span>
                        )}
                      </div>
                      <div className={styles.historyRange}>
                        {formatDate(sc.originalScheduledStart)}, {formatTime(sc.originalScheduledStart)}–
                        {formatTime(sc.originalScheduledEnd)}
                        {sc.adjustedScheduledStart && sc.adjustedScheduledEnd && (
                          <>
                            {' → '}
                            {formatDate(sc.adjustedScheduledStart)}, {formatTime(sc.adjustedScheduledStart)}–
                            {formatTime(sc.adjustedScheduledEnd)}
                          </>
                        )}
                      </div>
                      <div className={styles.historyMeta}>
                        <span>
                          Gia sư: {sc.tutorConfirmedByName ? `${sc.tutorConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}
                        </span>
                        <span>
                          {sc.learnerApproverRole === 'Student' ? 'Học sinh' : 'Phụ huynh'}:{' '}
                          {sc.learnerConfirmedByName ? `${sc.learnerConfirmedByName} đã xác nhận` : 'Chưa xác nhận'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
        </aside>
      </div>

      {/* Modals */}
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
    </PageContainer>
  );
};

export default ParentLessonDetail;
