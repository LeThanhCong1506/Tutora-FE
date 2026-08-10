import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  GraduationCap,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Timer,
  UserRound,
  Video,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatVNDNumber } from '../../utils/formatters';
import {
  checkOutClassSession,
  getTutorClassSessionDetail,
  getTutorClassSessionDispute,
  submitTutorDisputeResponse,
  uploadTutorDisputeEvidence,
  getTutorDisputeThread,
  sendTutorDisputeThreadMessage,
  proposeTutorReschedule,
  respondTutorReschedule,
  type ClassSessionDetailResponse,
  type DisputeDetailResponse,
  type DisputeMessage,
  type ReportAttachment,
} from '../../services/classSession.service';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { canJoinLiveSession, isWithinJoinWindow } from '../../utils/liveSession';
import { signalRService } from '../../services/signalr.service';
import LessonReportForm from './components/LessonReportForm';
import MaterialsTab from './components/MaterialsTab';
import {
  AttachmentGallery,
  buildSessionTimeline,
  ClassSessionRecording,
  RescheduleProposalModal,
  SessionTimeline,
} from '../../components/shared';
import styles from '../../styles/pages/tutor-portal-class-session-detail.module.css';

type DetailTab = 'overview' | 'materials';

const SESSION_STATUS_TONES: Record<string, { color: string; bg: string }> = {
  reserved: { color: '#687086', bg: '#f0f2f4' },
  scheduled: { color: '#2478e5', bg: '#eaf3ff' },
  in_progress: { color: '#0f8f83', bg: '#e8f5f2' },
  pending_confirmation: { color: '#a46d18', bg: '#faf3e7' },
  completed: { color: '#0b796a', bg: '#e9f6f2' },
  cancelled: { color: '#687086', bg: '#f0f2f4' },
  cancelled_noshow: { color: '#687086', bg: '#f0f2f4' },
  no_show: { color: '#b25048', bg: '#fbefee' },
  disputed: { color: '#b25048', bg: '#fbefee' },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const formatTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? `${formatVNDNumber(value)} ₫`
    : 'Chưa cập nhật';

const getNameInitial = (name?: string) => {
  const givenName = name?.trim().split(/\s+/).at(-1);
  return givenName?.charAt(0).toLocaleUpperCase('vi-VN') || 'H';
};

const getErrorMessage = (error: unknown) => {
  const requestError = error as { response?: { data?: { message?: string } }; message?: string };
  return (
    requestError.response?.data?.message || requestError.message || 'Không thể tải chi tiết buổi học. Vui lòng thử lại.'
  );
};

const getDisputeStatusMeta = (status?: string) => {
  if (status === 'resolved') return { label: 'Đã giải quyết', tone: styles.badgeResolved };
  if (status === 'investigating') return { label: 'Đang xem xét', tone: styles.badgeInvestigating };
  return { label: 'Chờ xử lý', tone: styles.badgePending };
};

const getPresenceLabel = (isPresent?: boolean) => {
  if (isPresent === true) return 'Đã tham gia';
  if (isPresent === false) return 'Vắng mặt';
  return 'Chưa ghi nhận';
};

const getDisplayStatus = (session: ClassSessionDetailResponse) => {
  const status = session.status?.toLowerCase() ?? '';
  const base = getClassSessionStatusMeta(status);
  const tone = SESSION_STATUS_TONES[status];
  const display = tone ? { ...base, ...tone } : base;

  if (status === 'in_progress' && session.checkOutTime && !session.report) {
    return { ...display, label: 'Chờ gửi báo cáo', color: '#a46d18', bg: '#faf3e7' };
  }

  return display;
};

const TutorPortalClassSessionDetail = () => {
  const navigate = useNavigate();
  const { classSessionId: rawClassSessionId } = useParams();
  const classSessionId = rawClassSessionId && /^\d+$/.test(rawClassSessionId) ? Number(rawClassSessionId) : null;
  const [session, setSession] = useState<ClassSessionDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ReportAttachment[]>([]);
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [thread, setThread] = useState<DisputeMessage[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [respondingReschedule, setRespondingReschedule] = useState(false);

  const loadSession = useCallback(async () => {
    if (!classSessionId) {
      setSession(null);
      setError('Đường dẫn buổi học không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getTutorClassSessionDetail(classSessionId);
      setSession(response.content);
    } catch (requestError: unknown) {
      setSession(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [classSessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const loadDispute = useCallback(async () => {
    if (!classSessionId) return;
    try {
      const response = await getTutorClassSessionDispute(classSessionId);
      setDispute(response.content);
    } catch (requestError: unknown) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;
      if (status !== 404) console.error('Failed to load dispute for classSession', requestError);
      setDispute(null);
    }
  }, [classSessionId]);

  useEffect(() => {
    void loadDispute();
  }, [loadDispute]);

  const loadThread = useCallback(async () => {
    if (!classSessionId) return;
    try {
      const response = await getTutorDisputeThread(classSessionId);
      setThread(response.content);
    } catch (requestError: unknown) {
      console.error('Failed to load dispute thread', requestError);
    }
  }, [classSessionId]);

  useEffect(() => {
    if (dispute) void loadThread();
  }, [dispute, loadThread]);

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

  const handleSendThreadMessage = async () => {
    if (!session || threadInput.trim().length === 0 || sendingThreadMessage) return;
    setSendingThreadMessage(true);
    try {
      await sendTutorDisputeThreadMessage(session.classSessionId, threadInput.trim());
      setThreadInput('');
      await loadThread();
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError), { toastId: 'dispute-thread-send-error' });
    } finally {
      setSendingThreadMessage(false);
    }
  };

  const handleSubmitDisputeResponse = async () => {
    if (!session || responseText.trim().length < 10) return;
    setSubmittingResponse(true);
    try {
      const response = await submitTutorDisputeResponse(session.classSessionId, responseText.trim());
      setDispute(response.content);
      setResponseText('');
      toast.success('Đã gửi phản hồi tranh chấp.');
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleUploadDisputeEvidence = async (file: File) => {
    if (!session) return;
    setUploadingEvidence(true);
    try {
      await uploadTutorDisputeEvidence(session.classSessionId, file);
      toast.success('Đã tải lên bằng chứng.');
      await loadDispute();
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setUploadingEvidence(false);
    }
  };

  const schedule = useMemo(() => {
    if (!session) return null;
    const start = new Date(session.scheduledStart);
    const end = new Date(session.scheduledEnd);
    const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));

    return {
      start,
      end,
      durationMinutes,
      dateLabel: formatDate(session.scheduledStart),
      timeLabel: `${formatTime(session.scheduledStart)} – ${formatTime(session.scheduledEnd)}`,
    };
  }, [session]);

  const applySessionUpdate = (updatedSession: ClassSessionDetailResponse) => {
    setSession(updatedSession);
  };

  const handleCheckOut = async () => {
    if (!session) return;

    setCheckingOut(true);
    try {
      const response = await checkOutClassSession(session.classSessionId);
      applySessionUpdate(response.content);
      toast.success('Check-out buổi học thành công.');
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setCheckingOut(false);
    }
  };

  const handleProposeReschedule = async (proposedScheduledStart: string, reason?: string) => {
    if (!session) return;
    const response = await proposeTutorReschedule(session.classSessionId, proposedScheduledStart, reason);
    setSession({
      ...session,
      pendingRescheduleProposal: response.content,
      rescheduleProposals: [response.content, ...(session.rescheduleProposals ?? [])],
    });
    setRescheduleModalOpen(false);
  };

  const handleRespondReschedule = async (accepted: boolean) => {
    if (!session) return;
    setRespondingReschedule(true);
    try {
      await respondTutorReschedule(session.classSessionId, accepted);
      await loadSession();
      toast.success(accepted ? 'Đã đồng ý đổi lịch học.' : 'Đã từ chối đề xuất đổi lịch.');
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setRespondingReschedule(false);
    }
  };

  const handleReportSuccess = (updatedSession: ClassSessionDetailResponse) => {
    applySessionUpdate(updatedSession);
    setPendingAttachments([]);
  };

  const handleOpenStudentProfile = () => {
    if (!session?.student?.studentId || !session.bookingId) return;

    const query = new URLSearchParams({
      bookingId: String(session.bookingId),
      classSessionId: String(session.classSessionId),
    });
    navigate(`/tutor-portal/students/${encodeURIComponent(session.student.studentId)}?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.workspace} aria-busy="true">
            <div className={styles.stateHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate('/tutor-portal/calendar')}
                aria-label="Quay lại lịch dạy"
              >
                <ArrowLeft size={19} />
              </button>
              <div className={styles.skeletonTitle} />
            </div>
            <div className={styles.loadingGrid}>
              <div className={styles.loadingMain}>
                <div className={styles.skeletonBlock} />
                <div className={styles.skeletonBlock} />
              </div>
              <div className={styles.skeletonAside} />
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error || !session || !schedule) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.workspace}>
            <div className={styles.stateHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate('/tutor-portal/calendar')}
                aria-label="Quay lại lịch dạy"
              >
                <ArrowLeft size={19} />
              </button>
              <span>Chi tiết buổi học</span>
            </div>
            <div className={styles.errorState} role="alert">
              <span className={styles.errorIcon}>
                <CircleAlert size={25} />
              </span>
              <h1>Không thể mở buổi học</h1>
              <p>{error || 'Không tìm thấy dữ liệu buổi học.'}</p>
              <div className={styles.errorActions}>
                {classSessionId && (
                  <button type="button" className={styles.secondaryButton} onClick={() => void loadSession()}>
                    <RefreshCw size={16} />
                    Thử lại
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => navigate('/tutor-portal/calendar')}
                >
                  Về lịch dạy
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(session);
  const subjectName = session.subject?.subjectName || `Buổi học #${session.classSessionId}`;
  const studentName = session.student?.fullName || 'Học sinh chưa cập nhật';
  const status = session.status?.toLowerCase() ?? '';
  const canJoin = canJoinLiveSession(session);
  const joinButtonLabel =
    status === 'in_progress' ? 'Vào lại lớp' : isWithinJoinWindow(session.scheduledStart) ? 'Vào học' : 'Vào học nhanh';
  const canCheckOut = status === 'in_progress' && !session.checkOutTime;
  const pendingReschedule = session.pendingRescheduleProposal;
  const canProposeReschedule = status === 'scheduled' && !pendingReschedule;
  const isRescheduleCounterpart = pendingReschedule?.counterpartRole === 'Tutor';
  const isRescheduleProposer = pendingReschedule?.proposedByRole === 'Tutor';
  const canSubmitReport =
    !session.report && (session.canSubmitReport || (status === 'in_progress' && Boolean(session.checkOutTime)));
  const reportContent = session.report?.contentCovered || session.classSessionContent;
  const reportHomework = session.report?.homeworkAssigned || session.homework;
  const reportNotes = session.tutorNotes;
  // Báo cáo cũ chỉ có mảng URL; báo cáo mới có kèm mô tả gia sư đặt.
  const reportAttachments: ReportAttachment[] =
    session.report?.attachmentDetails ?? (session.report?.attachments ?? []).map((url) => ({ url }));
  const hasReport = Boolean(session.report || reportContent || reportHomework || reportNotes);
  const attendanceRecorded =
    typeof session.isTutorPresent === 'boolean' || typeof session.isStudentPresent === 'boolean';
  const timelineEvents = buildSessionTimeline({
    scheduledStart: session.scheduledStart,
    checkInTime: session.realStart || session.checkInTime,
    checkOutTime: session.realEnd || session.checkOutTime,
    confirmDeadline: status === 'pending_confirmation' ? session.confirmDeadline : null,
    reportCreatedAt: session.report?.createdAt,
    disputeCreatedAt: dispute?.createdAt,
    disputeTutorRespondedAt: dispute?.tutorRespondedAt,
    disputeResolvedAt: dispute?.resolvedAt,
    scheduleChangeAppliedAt: session.scheduleChanges?.map((sc) => sc.appliedAt),
  });
  const sessionStyle = {
    '--status-color': displayStatus.color,
    '--status-bg': displayStatus.bg,
  } as CSSProperties;
  const disputeStatusMeta = getDisputeStatusMeta(dispute?.status);
  const responseLength = responseText.trim().length;
  // Nút đính kèm dùng chung cho cả lúc chưa phản hồi (nằm trong composer) và đã phản hồi (đứng riêng).
  const evidenceUploadControl = (
    <label className={`${styles.secondaryButton} ${styles.uploadLabel}`}>
      <Paperclip size={16} />
      {uploadingEvidence ? 'Đang tải lên…' : 'Đính kèm bằng chứng'}
      <input
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        disabled={uploadingEvidence}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUploadDisputeEvidence(file);
          event.target.value = '';
        }}
      />
    </label>
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.workspace} style={sessionStyle}>
          <header className={styles.hero}>
            <div className={styles.heroTopline}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate('/tutor-portal/calendar')}
                aria-label="Quay lại lịch dạy"
              >
                <ArrowLeft size={19} />
              </button>
              <button type="button" className={styles.breadcrumb} onClick={() => navigate('/tutor-portal/calendar')}>
                Lịch dạy
              </button>
              <span className={styles.breadcrumbDivider}>/</span>
              <span className={styles.breadcrumbCurrent}>Chi tiết buổi học</span>
            </div>

            <div className={styles.heroBody}>
              <div className={styles.heroCopy}>
                <div className={styles.eyebrow}>
                  <CalendarDays size={15} />
                  <span>Buổi học #{session.classSessionId}</span>
                  <span className={styles.statusPill}>
                    <i />
                    {displayStatus.label}
                  </span>
                </div>
                <h1>{subjectName}</h1>
                <div className={styles.heroMeta}>
                  <span>
                    <Clock3 size={15} />
                    {schedule.dateLabel} · {schedule.timeLabel}
                  </span>
                  <span>
                    <UserRound size={15} />
                    Học sinh: <strong>{studentName}</strong>
                  </span>
                </div>
              </div>

              <div className={styles.heroActions}>
                {canCheckOut && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void handleCheckOut()}
                    disabled={checkingOut}
                  >
                    <Check size={16} />
                    {checkingOut ? 'Đang xử lý…' : 'Check-out'}
                  </button>
                )}
                {canSubmitReport && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setActiveTab('overview')}
                  >
                    <FileText size={16} />
                    Gửi báo cáo
                  </button>
                )}
                {canJoin && (
                  <button
                    type="button"
                    className={styles.joinButton}
                    onClick={() => navigate(`/session-lobby/${session.classSessionId}`)}
                  >
                    <Video size={16} />
                    {joinButtonLabel}
                  </button>
                )}
                {canProposeReschedule && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setRescheduleModalOpen(true)}
                  >
                    <CalendarClock size={16} />
                    Đề xuất đổi lịch
                  </button>
                )}
              </div>
            </div>

            {pendingReschedule && (
              <div className={styles.infoBanner}>
                <CalendarClock size={18} />
                <div>
                  <strong>
                    Đề xuất dời sang {formatDateTime(pendingReschedule.proposedScheduledStart)}
                  </strong>
                  <span>
                    {isRescheduleCounterpart
                      ? `${pendingReschedule.proposedByName ?? 'Đối phương'} đang chờ bạn phản hồi.`
                      : `Đang chờ ${pendingReschedule.counterpartName ?? 'phía học sinh/phụ huynh'} phản hồi.`}
                  </span>
                </div>
                {isRescheduleCounterpart && (
                  <div className={styles.heroActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={respondingReschedule}
                      onClick={() => void handleRespondReschedule(false)}
                    >
                      <X size={16} />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={respondingReschedule}
                      onClick={() => void handleRespondReschedule(true)}
                    >
                      <Check size={16} />
                      Đồng ý đổi lịch
                    </button>
                  </div>
                )}
                {isRescheduleProposer && !isRescheduleCounterpart && (
                  <span className={styles.submittedAt}>
                    Hết hạn phản hồi lúc {formatDateTime(pendingReschedule.expiresAt)}
                  </span>
                )}
              </div>
            )}
          </header>

          <RescheduleProposalModal
            open={rescheduleModalOpen}
            currentScheduledStart={session.scheduledStart}
            onSubmit={handleProposeReschedule}
            onCancel={() => setRescheduleModalOpen(false)}
            accentColor="#1a2238"
          />

          <nav className={styles.tabs} aria-label="Nội dung chi tiết buổi học">
            <button
              type="button"
              className={activeTab === 'overview' ? styles.activeTab : ''}
              aria-current={activeTab === 'overview' ? 'page' : undefined}
              onClick={() => setActiveTab('overview')}
            >
              Tổng quan
            </button>
            <button
              type="button"
              className={activeTab === 'materials' ? styles.activeTab : ''}
              aria-current={activeTab === 'materials' ? 'page' : undefined}
              onClick={() => setActiveTab('materials')}
            >
              Tài liệu lớp học
            </button>
          </nav>

          {activeTab === 'materials' ? (
            <div className={styles.materialsPanel}>
              {session.bookingId ? (
                <MaterialsTab bookingId={session.bookingId} />
              ) : (
                <div className={styles.inlineEmpty}>
                  <Paperclip size={22} />
                  <h2>Chưa thể tải tài liệu</h2>
                  <p>Buổi học này chưa có thông tin booking để liên kết tài liệu lớp.</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.content}>
              <div className={styles.contentGrid}>
                <div className={styles.primaryColumn}>
                  <section className={`${styles.card} ${styles.scheduleCard}`}>
                    <div className={styles.dateBadge} aria-hidden="true">
                      <span>{String(schedule.start.getDate()).padStart(2, '0')}</span>
                      <small>Tháng {schedule.start.getMonth() + 1}</small>
                    </div>
                    <div className={styles.scheduleCopy}>
                      <span className={styles.sectionLabel}>Lịch học</span>
                      <h2>{schedule.dateLabel}</h2>
                      <p>
                        <Clock3 size={17} />
                        {schedule.timeLabel}
                      </p>
                    </div>
                    <div className={styles.summaryMetrics}>
                      <div className={styles.metric}>
                        <span className={styles.metricIcon}>
                          <Timer size={17} />
                        </span>
                        <div>
                          <small>Thời lượng</small>
                          <strong>{schedule.durationMinutes} phút</strong>
                        </div>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricIcon}>
                          {session.meetingLink ? <Video size={17} /> : <MapPin size={17} />}
                        </span>
                        <div>
                          <small>Hình thức</small>
                          <strong>{session.meetingLink ? 'Học trực tuyến' : 'Chưa có liên kết'}</strong>
                        </div>
                      </div>
                      <div className={styles.metric}>
                        <span className={styles.metricIcon}>
                          <WalletCards size={17} />
                        </span>
                        <div>
                          <small>Học phí buổi</small>
                          <strong>{formatCurrency(session.classSessionPrice)}</strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  {session.meetingLink && status === 'scheduled' && (
                    <div className={styles.infoBanner}>
                      <Video size={18} />
                      <div>
                        <strong>Phòng học đã sẵn sàng</strong>
                        <span>Hệ thống tự điểm danh khi gia sư và học sinh cùng vào phòng.</span>
                      </div>
                    </div>
                  )}

                  {/* Cùng dòng thời gian với portal phụ huynh — hai bên nhìn thấy đúng một diễn biến. */}
                  {timelineEvents.length > 0 && (
                    <section className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <h2>Diễn biến buổi học</h2>
                        </div>
                      </div>
                      <SessionTimeline events={timelineEvents} className={styles.timelineBody} />
                    </section>
                  )}

                  {session.rescheduleProposals && session.rescheduleProposals.length > 0 && (
                    <section className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <h2>Lịch sử đổi lịch học</h2>
                        </div>
                      </div>
                      <div className={styles.reportGrid}>
                        {session.rescheduleProposals.map((proposal) => (
                          <div key={proposal.rescheduleProposalId} className={`${styles.reportField} ${styles.reportFieldWide}`}>
                            <span>
                              {proposal.proposedByName ?? 'Người đề xuất'} đề xuất dời sang{' '}
                              {formatDateTime(proposal.proposedScheduledStart)}
                            </span>
                            <p>
                              {proposal.status === 'pending' && 'Đang chờ phản hồi'}
                              {proposal.status === 'accepted' && `Đã đồng ý${proposal.respondedAt ? ` · ${formatDateTime(proposal.respondedAt)}` : ''}`}
                              {proposal.status === 'rejected' && `Đã từ chối${proposal.respondedAt ? ` · ${formatDateTime(proposal.respondedAt)}` : ''}`}
                              {proposal.status === 'expired' && 'Đã hết hạn'}
                              {proposal.reason ? ` — Lý do: ${proposal.reason}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {dispute && (
                    <section className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <h2>Khiếu nại buổi học này</h2>
                        </div>
                        <div className={styles.disputeHeadRight}>
                          <span className={`${styles.disputeBadge} ${disputeStatusMeta.tone}`}>
                            <i />
                            {disputeStatusMeta.label}
                          </span>
                          {dispute.createdAt && (
                            <span className={styles.submittedAt}>Gửi {formatDateTime(dispute.createdAt)}</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.disputeBody}>
                        {dispute.status === 'pending' &&
                          !dispute.tutorResponse &&
                          dispute.tutorResponseDeadline &&
                          (() => {
                            const deadline = new Date(dispute.tutorResponseDeadline!);
                            const msLeft = deadline.getTime() - Date.now();
                            const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
                            return (
                              <div
                                className={`${styles.disputeAlert} ${msLeft > 0 ? '' : styles.disputeAlertDanger}`}
                                role="status"
                              >
                                <CircleAlert size={17} />
                                <span>
                                  {msLeft > 0
                                    ? `Bạn còn khoảng ${hoursLeft} giờ để phản hồi trước khi quản trị viên có thể bắt đầu điều tra (hạn ${formatDateTime(dispute.tutorResponseDeadline)}).`
                                    : `Đã quá hạn phản hồi ưu tiên (${formatDateTime(dispute.tutorResponseDeadline)}) — quản trị viên có thể bắt đầu điều tra bất cứ lúc nào, hãy phản hồi sớm.`}
                                </span>
                              </div>
                            );
                          })()}

                        <div className={styles.disputeGrid}>
                          <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                            <span>Lý do khiếu nại</span>
                            <p>{dispute.reason || 'Không có mô tả.'}</p>
                          </div>
                          {dispute.evidence && dispute.evidence.length > 0 && (
                            <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                              <span>Bằng chứng từ phụ huynh/học sinh</span>
                              <AttachmentGallery items={dispute.evidence.map((url) => ({ url }))} />
                            </div>
                          )}
                          {dispute.tutorResponse && (
                            <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                              <span>Phản hồi của bạn</span>
                              <p>{dispute.tutorResponse}</p>
                            </div>
                          )}
                          {dispute.additionalEvidence && dispute.additionalEvidence.length > 0 && (
                            <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                              <span>Bằng chứng bạn đã nộp</span>
                              <AttachmentGallery
                                items={dispute.additionalEvidence.map((item) => ({
                                  key: `additional-${item.disputeEvidenceId}`,
                                  url: item.fileUrl ?? '',
                                  label: item.description,
                                  mimeType: item.fileType,
                                }))}
                              />
                            </div>
                          )}
                        </div>

                        {dispute.status === 'resolved' ? (
                          <div className={styles.resolutionPanel}>
                            <div className={styles.resolutionHead}>
                              <span className={styles.resolutionIcon}>
                                <ShieldCheck size={19} />
                              </span>
                              <div className={styles.resolutionTitle}>
                                <strong>Kết quả xử lý</strong>
                                <small>
                                  {dispute.resolvedAt
                                    ? `Quản trị viên chốt lúc ${formatDateTime(dispute.resolvedAt)}`
                                    : 'Quản trị viên đã đưa ra quyết định'}
                                </small>
                              </div>
                              {typeof dispute.refundPercentage === 'number' && (
                                <div className={styles.refundBadge}>
                                  <small>Hoàn tiền</small>
                                  <strong>{dispute.refundPercentage}%</strong>
                                </div>
                              )}
                            </div>
                            <p className={styles.resolutionNote}>
                              {dispute.resolutionNote || 'Quản trị viên không để lại ghi chú cho quyết định này.'}
                            </p>
                            {typeof dispute.refundAmount === 'number' && dispute.refundAmount > 0 && (
                              <p className={styles.resolutionAmount}>
                                Số tiền hoàn cho phụ huynh: <strong>{formatCurrency(dispute.refundAmount)}</strong>
                              </p>
                            )}
                          </div>
                        ) : dispute.tutorResponse ? (
                          <div className={styles.disputeActions}>{evidenceUploadControl}</div>
                        ) : (
                          <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                            <span>Phản hồi của bạn</span>
                            <textarea
                              className={styles.disputeTextarea}
                              value={responseText}
                              onChange={(event) => setResponseText(event.target.value)}
                              placeholder="Trình bày góc nhìn của bạn về khiếu nại này (tối thiểu 10 ký tự)..."
                              rows={4}
                            />
                            <div className={styles.disputeComposerFoot}>
                              <span
                                className={`${styles.disputeHint} ${responseLength >= 10 ? styles.disputeHintOk : ''}`}
                              >
                                {responseLength}/10 ký tự tối thiểu
                              </span>
                              <div className={styles.disputeActions}>
                                {evidenceUploadControl}
                                <button
                                  type="button"
                                  className={styles.primaryButton}
                                  disabled={submittingResponse || responseLength < 10}
                                  onClick={() => void handleSubmitDisputeResponse()}
                                >
                                  {submittingResponse ? 'Đang gửi…' : 'Gửi phản hồi'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {dispute.status !== 'resolved' && (
                          <div className={styles.threadBlock}>
                            <div className={styles.threadHead}>
                              <MessageSquare size={15} />
                              <span>Trao đổi riêng với quản trị viên</span>
                            </div>
                            {thread.length > 0 ? (
                              <div className={styles.threadList}>
                                {thread.map((msg) => (
                                  <div
                                    key={msg.disputeMessageId}
                                    className={`${styles.threadBubble} ${
                                      msg.senderRole === 'admin' ? styles.threadAdmin : styles.threadMine
                                    }`}
                                  >
                                    <p className={styles.threadSender}>
                                      {msg.senderRole === 'admin' ? 'Quản trị viên' : 'Bạn'}
                                      {msg.createdAt ? ` · ${formatDateTime(msg.createdAt)}` : ''}
                                    </p>
                                    <p className={styles.threadText}>{msg.message}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={styles.threadEmpty}>
                                Chưa có tin nhắn nào — bạn có thể nhắn trực tiếp cho quản trị viên phụ trách vụ việc.
                              </p>
                            )}
                            <div className={styles.threadComposer}>
                              <input
                                type="text"
                                className={styles.threadInput}
                                value={threadInput}
                                onChange={(event) => setThreadInput(event.target.value)}
                                placeholder="Nhắn cho quản trị viên..."
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') void handleSendThreadMessage();
                                }}
                              />
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={sendingThreadMessage || threadInput.trim().length === 0}
                                onClick={() => void handleSendThreadMessage()}
                              >
                                {sendingThreadMessage ? 'Đang gửi…' : 'Gửi'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h2>Báo cáo buổi học</h2>
                      </div>
                      {hasReport && session.submittedAt && (
                        <span className={styles.submittedAt}>Đã gửi {formatDateTime(session.submittedAt)}</span>
                      )}
                    </div>

                    {hasReport ? (
                      <div className={styles.reportGrid}>
                        <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                          <span>Nội dung đã dạy</span>
                          <p>{reportContent || 'Chưa cập nhật nội dung.'}</p>
                        </div>
                        <div className={styles.reportField}>
                          <span>Bài tập về nhà</span>
                          <p>{reportHomework || 'Không giao bài tập.'}</p>
                        </div>
                        <div className={styles.reportField}>
                          <span>Ghi chú của gia sư</span>
                          <p>{reportNotes || 'Không có ghi chú thêm.'}</p>
                        </div>
                        {reportAttachments.length > 0 && (
                          <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                            <span>Tài liệu đính kèm</span>
                            <AttachmentGallery
                              items={reportAttachments.map((item) => ({ url: item.url, label: item.description }))}
                            />
                          </div>
                        )}
                      </div>
                    ) : canSubmitReport ? (
                      <div className={styles.reportComposer}>
                        <LessonReportForm
                          classSessionId={session.classSessionId}
                          attachments={pendingAttachments}
                          onUploadComplete={(attachment) =>
                            setPendingAttachments((current) => [...current, attachment])
                          }
                          onDescriptionChange={(url, description) =>
                            setPendingAttachments((current) =>
                              current.map((item) => (item.url === url ? { ...item, description } : item)),
                            )
                          }
                          onRemoveComplete={(url) =>
                            setPendingAttachments((current) => current.filter((item) => item.url !== url))
                          }
                          onSubmitSuccess={handleReportSuccess}
                        />
                      </div>
                    ) : (
                      <div className={styles.inlineEmpty}>
                        <span className={styles.emptyIcon}>
                          <FileText size={23} />
                        </span>
                        <h3>Chưa có báo cáo buổi học</h3>
                      </div>
                    )}
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeaderCompact}>
                      <div>
                        <h2>Video buổi học</h2>
                      </div>
                    </div>
                    <ClassSessionRecording classSessionId={session.classSessionId} />
                  </section>
                </div>

                <aside className={styles.sidebar}>
                  <section className={`${styles.card} ${styles.studentCard}`}>
                    <div className={styles.avatar}>
                      {session.student?.avatarUrl ? (
                        <img src={session.student.avatarUrl} alt="" />
                      ) : (
                        <span>{getNameInitial(studentName)}</span>
                      )}
                    </div>
                    <span className={styles.sectionLabel}>Học sinh</span>
                    <h2>{studentName}</h2>
                    <div className={styles.studentTags}>
                      {session.student?.gradeLevel && <span>{session.student.gradeLevel}</span>}
                      {session.student?.school && <span>{session.student.school}</span>}
                    </div>
                    {session.student?.studentId && session.bookingId && (
                      <button type="button" className={styles.profileButton} onClick={handleOpenStudentProfile}>
                        <GraduationCap size={16} />
                        Xem hồ sơ học tập
                      </button>
                    )}
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeaderCompact}>
                      <div>
                        <span className={styles.sectionLabel}>Thông tin</span>
                        <h2>Chi tiết buổi học</h2>
                      </div>
                    </div>
                    <dl className={styles.infoList}>
                      <div>
                        <dt>Mã buổi học</dt>
                        <dd>#{session.classSessionId}</dd>
                      </div>
                      <div>
                        <dt>Mã đặt lịch</dt>
                        <dd>{session.bookingId ? `#${session.bookingId}` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Bắt đầu thực tế</dt>
                        <dd>{formatDateTime(session.realStart || session.checkInTime)}</dd>
                      </div>
                      <div>
                        <dt>Kết thúc thực tế</dt>
                        <dd>{formatDateTime(session.realEnd || session.checkOutTime)}</dd>
                      </div>
                      {session.confirmDeadline && (
                        <div>
                          <dt>Hạn xác nhận</dt>
                          <dd>{formatDateTime(session.confirmDeadline)}</dd>
                        </div>
                      )}
                    </dl>
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeaderCompact}>
                      <div>
                        <span className={styles.sectionLabel}>Điểm danh</span>
                        <h2>Trạng thái tham gia</h2>
                      </div>
                    </div>
                    <div className={styles.attendanceList}>
                      <div>
                        <span className={styles.attendanceAvatar}>GS</span>
                        <span>
                          <strong>Gia sư</strong>
                          <small>{getPresenceLabel(session.isTutorPresent)}</small>
                        </span>
                        <i
                          className={
                            session.isTutorPresent === true
                              ? styles.present
                              : session.isTutorPresent === false
                                ? styles.absent
                                : ''
                          }
                        />
                      </div>
                      <div>
                        <span className={styles.attendanceAvatar}>HS</span>
                        <span>
                          <strong>Học sinh</strong>
                          <small>{getPresenceLabel(session.isStudentPresent)}</small>
                        </span>
                        <i
                          className={
                            session.isStudentPresent === true
                              ? styles.present
                              : session.isStudentPresent === false
                                ? styles.absent
                                : ''
                          }
                        />
                      </div>
                    </div>
                    {!attendanceRecorded && (
                      <p className={styles.attendanceNote}>Điểm danh sẽ được cập nhật khi hai bên vào phòng học.</p>
                    )}
                    {session.attendanceNote && <p className={styles.attendanceNote}>{session.attendanceNote}</p>}
                  </section>
                </aside>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TutorPortalClassSessionDetail;
