import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';
import { getApiErrorMessage } from '../../utils/apiError';

const inMiniApp = isZaloMiniApp();
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, GraduationCap, Link2, UserRound, XCircle } from 'lucide-react';
import { getParentLessonDetail, type ParentLessonDetailDto } from '../../services/parent-lesson.service';
import {
  getClassSessionDispute,
  type DisputeDetailResponse,
  getParentScheduleChange,
  respondParentScheduleChange,
  proposeParentReschedule,
  respondParentReschedule,
  type ReportAttachment,
  type ScheduleChangeAuditDto,
  type SessionScheduleChangeResponse,
} from '../../services/classSession.service';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import { Spin, Button } from 'antd';
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
  RescheduleProposalModal,
  SectionCard,
  SessionTimeline,
  SkipContinuationCard,
  StatusBadge,
} from '../../components/shared';
import { getDisputeStatusMeta, getDisputeTypeLabel } from '../../components/disputes';
import { formatVNDNumber } from '../../utils/formatters';
import { formatLocalDate, formatLocalDateTime, formatLocalTime } from '../../utils/datetime';
import { canReportTutorNoShow } from '../../utils/liveSession';
import styles from './lesson-detail.module.css';

const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'cancelled_noshow'];

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

const RESCHEDULE_PROPOSAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Đang chờ phản hồi',
  accepted: 'Đã đồng ý',
  rejected: 'Đã từ chối',
  expired: 'Đã hết hạn',
};

// Dùng chung bộ format với trang khiếu nại: "HH:mm", "DD/MM/YYYY", "HH:mm DD/MM/YYYY".
const formatTime = formatLocalTime;
const formatDate = formatLocalDate;
const formatDateTime = formatLocalDateTime;

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
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [respondingReschedule, setRespondingReschedule] = useState(false);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showNoShowActionModal, setShowNoShowActionModal] = useState(false);
  // Chỉ đủ để vẽ phần tóm tắt khiếu nại — bằng chứng và kênh trao đổi nằm ở trang khiếu nại riêng.
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);

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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải chi tiết buổi học.'));
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
      toast.error(getApiErrorMessage(error, 'Không thể xử lý yêu cầu đổi lịch.'));
      await fetchScheduleChange();
    } finally {
      setSubmittingScheduleDecision(false);
    }
  };
  const handleProposeReschedule = async (proposedScheduledStart: string, reason?: string) => {
    if (!id) return;
    await proposeParentReschedule(id, proposedScheduledStart, reason);
    setRescheduleModalOpen(false);
    await fetchLesson();
  };

  const handleRespondReschedule = async (accepted: boolean) => {
    if (!id) return;
    setRespondingReschedule(true);
    try {
      await respondParentReschedule(id, accepted);
      await fetchLesson();
      toast.success(accepted ? 'Đã đồng ý đổi lịch học.' : 'Đã từ chối đề xuất đổi lịch.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể xử lý yêu cầu đổi lịch.'));
    } finally {
      setRespondingReschedule(false);
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
    interruptedAt: lesson.interruptedAt,
    interruptReason: lesson.interruptReason,
    interruptedByName: lesson.interruptedByName,
  });

  const showConfirmAction = lesson.status === 'pending_confirmation';
  const showNoShowAction = lesson.status === 'scheduled' && canReportTutorNoShow(lesson.scheduledStart);
  const showNoShowResolution = lesson.status === 'no_show' && dispute?.status === 'confirmed_no_show';
  const showReportTutorAction = lesson.status === 'completed' && !dispute && canCreateDispute;
  const pendingReschedule = lesson.pendingRescheduleProposal;
  const canProposeReschedule = lesson.status === 'scheduled' && !pendingReschedule;
  const isRescheduleCounterpart = pendingReschedule?.counterpartRole === 'Parent';
  const isRescheduleProposer = pendingReschedule?.proposedByRole === 'Parent';

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
          {(lesson.isContinuation || lesson.isDisputeRelearn) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 8,
                border: '1px dashed #b9d6ea',
                background: '#EAF3FA',
                color: '#2F6F9F',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <Link2 size={12} />
              {lesson.isContinuation ? 'Buổi phụ' : 'Buổi học lại'}
              {lesson.originalClassSessionId ? ` của buổi #${lesson.originalClassSessionId}` : ''}
            </span>
          )}
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
          {canProposeReschedule && (
            <Button icon={<CalendarClock size={16} />} onClick={() => setRescheduleModalOpen(true)}>
              Đề xuất đổi lịch
            </Button>
          )}
        </div>
      </header>

      {lesson.isContinuation && lesson.status === 'scheduled' && (
        <SkipContinuationCard
          continuationSessionId={lesson.lessonId}
          isTutor={false}
          accentColor="#3e2f28"
          onBothConfirmed={() => void fetchLesson()}
        />
      )}

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
      {scheduleChange?.requiredLearnerRole === 'Parent' &&
        (scheduleChange.requiresConfirmation || scheduleChange.status === 'expired') && (
        <SectionCard
          title="Xác nhận thay đổi giờ học"
          headerAction={<CalendarClock size={18} color="#8a6116" aria-hidden="true" />}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionLead}>
              Gia sư và học viên đang muốn học ngoài thời gian mặc định. Phụ huynh chỉ xác nhận tại đây; học viên và gia
              sư là hai người vào phòng học.
              {scheduleChange.requestedAt && scheduleChange.expiresAt && (
                <>
                  {' '}
                  Yêu cầu lúc {formatTime(scheduleChange.requestedAt)}, hạn phản hồi{' '}
                  {formatTime(scheduleChange.expiresAt)} {formatDate(scheduleChange.expiresAt)}.
                </>
              )}
            </p>

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
                    {scheduleChange.tutorConfirmedAt
                      ? `Đã xác nhận lúc ${formatTime(scheduleChange.tutorConfirmedAt)}`
                      : 'Đang chờ xác nhận'}
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
                    {scheduleChange.learnerConfirmedAt
                      ? `Đã xác nhận lúc ${formatTime(scheduleChange.learnerConfirmedAt)}`
                      : 'Đang chờ xác nhận'}
                  </div>
                </div>
              </div>
            </div>

            {scheduleChange.approvedAt ? (
              scheduleChange.scheduleConflict ? (
                <div className={`${styles.notice} ${styles.noticeWarning} ${styles.blockGap}`}>
                  <span>
                    <strong>Đã đủ xác nhận nhưng chưa thể bắt đầu:</strong> {scheduleChange.scheduleConflict.message}{' '}
                    Hệ thống sẽ tự kiểm tra lại, phụ huynh không cần xác nhận lần nữa.
                  </span>
                </div>
              ) : (
                <div className={`${styles.notice} ${styles.noticeSuccess} ${styles.blockGap}`}>
                  Đã đủ xác nhận. Học viên và gia sư có thể vào học; thời gian buổi học sẽ được cập nhật khi họ bắt
                  đầu.
                </div>
              )
            ) : scheduleChange.status === 'rejected' ? (
              <div className={`${styles.notice} ${styles.noticeDanger} ${styles.blockGap}`}>
                Yêu cầu đổi lịch đã bị từ chối. Học viên và gia sư chưa thể vào buổi học ngoài lịch này.
              </div>
            ) : scheduleChange.status === 'expired' ? (
              <div className={`${styles.notice} ${styles.noticeWarning} ${styles.blockGap}`}>
                <Clock3 size={16} aria-hidden="true" />
                <span>
                  <strong>
                    Yêu cầu xác nhận đã hết hạn
                    {scheduleChange.expiresAt ? ` lúc ${formatDateTime(scheduleChange.expiresAt)}` : ''}.
                  </strong>{' '}
                  Chưa đủ hai bên xác nhận trong thời gian quy định nên yêu cầu đã tự huỷ. Vui lòng nhờ gia sư mở lại
                  phòng chờ để hệ thống tạo yêu cầu xác nhận mới.
                </span>
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

      {pendingReschedule && (
        <SectionCard
          title="Đề xuất đổi lịch học"
          headerAction={<CalendarClock size={18} color="#8a6116" aria-hidden="true" />}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionLead}>
              {pendingReschedule.proposedByName ?? 'Người đề xuất'} muốn dời buổi học sang{' '}
              {formatDate(pendingReschedule.proposedScheduledStart)} · {formatTime(pendingReschedule.proposedScheduledStart)}
              {pendingReschedule.reason ? ` — Lý do: ${pendingReschedule.reason}` : ''}
            </p>
            {isRescheduleCounterpart ? (
              <div className={styles.decisionRow}>
                <Button
                  danger
                  icon={<XCircle size={16} />}
                  loading={respondingReschedule}
                  onClick={() => void handleRespondReschedule(false)}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  className={styles.primaryAction}
                  icon={<CheckCircle2 size={16} />}
                  loading={respondingReschedule}
                  onClick={() => void handleRespondReschedule(true)}
                >
                  Đồng ý đổi lịch
                </Button>
              </div>
            ) : isRescheduleProposer ? (
              <div className={`${styles.notice} ${styles.noticeInfo} ${styles.blockGap}`}>
                Đang chờ {pendingReschedule.counterpartName ?? 'phía còn lại'} phản hồi (hạn{' '}
                {formatDateTime(pendingReschedule.expiresAt)}).
              </div>
            ) : null}
          </div>
        </SectionCard>
      )}

      <RescheduleProposalModal
        open={rescheduleModalOpen}
        currentScheduledStart={lesson.scheduledStart}
        onSubmit={handleProposeReschedule}
        onCancel={() => setRescheduleModalOpen(false)}
        accentColor="#3e2f28"
      />

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
              {/* Bằng chứng, kết quả xử lý và kênh trao đổi với quản trị viên đã chuyển sang
                  /parent-portal/disputes/:classSessionId — ở đây chỉ giữ phần tóm tắt. */}
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

                <div className={styles.blockGap}>
                  <Button type="primary" onClick={() => navigate(`/parent-portal/disputes/${id}`)}>
                    Xem chi tiết khiếu nại
                  </Button>
                </div>
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
                  <span className={styles.attendanceAvatar}><GraduationCap size={16} strokeWidth={2} aria-hidden /></span>
                  <span className={styles.attendanceText}>
                    <strong>Gia sư</strong>
                    <small>{getPresenceLabel(lesson.isTutorPresent)}</small>
                  </span>
                  <span className={`${styles.presenceDot} ${getPresenceClass(lesson.isTutorPresent)}`} />
                </div>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceAvatar}><UserRound size={16} strokeWidth={2} aria-hidden /></span>
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
          {Array.isArray(lesson.rescheduleProposals) && lesson.rescheduleProposals.length > 0 && (
            <SectionCard title="Lịch sử đổi lịch học">
              <div className={styles.sectionBody}>
                <div className={styles.historyList}>
                  {lesson.rescheduleProposals.map((proposal) => (
                    <div key={proposal.rescheduleProposalId} className={styles.historyItem}>
                      <div className={styles.historyTop}>
                        <StatusBadge
                          variant={
                            proposal.status === 'rejected' || proposal.status === 'expired'
                              ? 'neutral'
                              : proposal.status === 'pending'
                                ? 'warning'
                                : 'success'
                          }
                          shape="tag"
                        >
                          {RESCHEDULE_PROPOSAL_STATUS_LABELS[proposal.status] || 'Không rõ'}
                        </StatusBadge>
                        {proposal.respondedAt && (
                          <span className={styles.historyTime}>Phản hồi lúc {formatDateTime(proposal.respondedAt)}</span>
                        )}
                      </div>
                      <div className={styles.historyRange}>
                        {proposal.proposedByName ?? 'Người đề xuất'} đề xuất dời sang{' '}
                        {formatDate(proposal.proposedScheduledStart)}, {formatTime(proposal.proposedScheduledStart)}
                      </div>
                      {proposal.reason && <div className={styles.historyMeta}><span>Lý do: {proposal.reason}</span></div>}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {Array.isArray(lesson.scheduleChanges) && lesson.scheduleChanges.length > 0 && (
            <SectionCard title="Lịch sử vào học ngoài giờ">
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
                          {SCHEDULE_CHANGE_STATUS_LABELS[sc.status] || 'Không rõ'}
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
