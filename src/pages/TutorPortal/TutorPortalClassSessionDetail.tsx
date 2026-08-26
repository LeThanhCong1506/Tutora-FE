import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  GraduationCap,
  Link2,
  MapPin,
  Paperclip,
  RefreshCw,
  Timer,
  UserRound,
  Video,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatVNDNumber } from '../../utils/formatters';
import {
  checkOutClassSession,
  getTutorClassSessionDetail,
  getTutorClassSessionDispute,
  proposeTutorReschedule,
  respondTutorReschedule,
  type ClassSessionDetailResponse,
  type DisputeDetailResponse,
  type ReportAttachment,
} from '../../services/classSession.service';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { canJoinLiveSession, isWithinJoinWindow } from '../../utils/liveSession';
import { useTabParam } from '../../hooks/useTabParam';
import LessonReportForm from './components/LessonReportForm';
import MaterialsTab from './components/MaterialsTab';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';
import {
  AttachmentGallery,
  buildSessionTimeline,
  ClassSessionRecording,
  RescheduleProposalModal,
  SessionTimeline,
  SkipContinuationCard,
} from '../../components/shared';
import styles from '../../styles/pages/tutor-portal-class-session-detail.module.css';

const DETAIL_TABS = ['overview', 'materials'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

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

const getErrorMessage = (error: unknown) =>
  getApiErrorMessage(error, 'Không thể tải chi tiết buổi học. Vui lòng thử lại.');

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
  const location = useLocation();
  const { classSessionId: rawClassSessionId } = useParams();
  const classSessionId = rawClassSessionId && /^\d+$/.test(rawClassSessionId) ? Number(rawClassSessionId) : null;
  const [session, setSession] = useState<ClassSessionDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useTabParam<DetailTab>(DETAIL_TABS, 'overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ReportAttachment[]>([]);
  // Chỉ giữ đủ để vẽ dải tóm tắt khiếu nại — phản hồi, bằng chứng và trao đổi với quản trị viên
  // đã chuyển hết sang /tutor-portal/disputes/:classSessionId.
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [respondingReschedule, setRespondingReschedule] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

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

  // Buổi phụ không có trang riêng — mọi thông tin (giờ hẹn, nút vào học) đã hiện thẳng trên trang
  // buổi GỐC rồi (xem block "status === 'interrupted'" bên dưới). Ai lỡ mở thẳng URL của buổi phụ
  // (vd từ lịch dạy) thì tự đưa về đúng trang buổi gốc thay vì hiện 1 trang riêng trùng lặp.
  useEffect(() => {
    if (session?.isContinuation && session.originalClassSessionId) {
      navigate(`/tutor-portal/class-sessions/${session.originalClassSessionId}`, { replace: true });
    }
  }, [session, navigate]);

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

  /** Quay lại đúng trang/tab người dùng vừa rời (vd tab "Hoàn thành" trên lịch dạy) thay vì luôn
   *  văng về URL mặc định — `location.key === 'default'` nghĩa là trang này là entry đầu tiên của
   *  history (mở thẳng link, F5, tab mới), lúc đó `navigate(-1)` sẽ văng ra khỏi app. */
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/tutor-portal/calendar');
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
                onClick={goBack}
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
                onClick={goBack}
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
                  onClick={goBack}
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
  const canProposeReschedule = status === 'scheduled' && !pendingReschedule && !session.skipConfirmedByBothSides;
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
    interruptedAt: session.interruptedAt,
    interruptReason: session.interruptReason,
    interruptedByName: session.interruptedByName,
  });
  const sessionStyle = {
    '--status-color': displayStatus.color,
    '--status-bg': displayStatus.bg,
  } as CSSProperties;
  const disputeStatusMeta = getDisputeStatusMeta(dispute?.status);
  // Chỉ để đổi nhãn nút và hiện nhắc trên dải tóm tắt; việc phản hồi thật nằm ở trang khiếu nại.
  const needsTutorResponse = Boolean(
    dispute && !dispute.tutorResponse && !['resolved', 'closed', 'confirmed_no_show'].includes(dispute.status ?? ''),
  );
  // Cùng điều kiện buổi học phía BE cho phép tạo dispute (pending_confirmation/completed),
  // và chỉ khi buổi học này chưa có dispute nào.
  const canCreateDispute = !dispute && (status === 'pending_confirmation' || status === 'completed');
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.workspace} style={sessionStyle}>
          <header className={styles.hero}>
            <div className={styles.heroTopline}>
              <button
                type="button"
                className={styles.backButton}
                onClick={goBack}
                aria-label="Quay lại lịch dạy"
              >
                <ArrowLeft size={19} />
              </button>
              <button type="button" className={styles.breadcrumb} onClick={goBack}>
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
                  {(session.isContinuation || session.isDisputeRelearn) && (
                    <span className={styles.linkChip}>
                      <Link2 size={12} />
                      {session.isContinuation ? 'Buổi phụ' : 'Buổi học lại'}
                      {session.originalClassSessionId ? ` của buổi #${session.originalClassSessionId}` : ''}
                    </span>
                  )}
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
                {/* Buổi gốc bị ngắt giữa chừng: phòng đã checkout, không mở lại được nữa — hiện nút
                    gốc dạng xám (đã dùng) cạnh nút vào buổi phụ để học nốt. */}
                {status === 'interrupted' && (
                  <button type="button" className={styles.joinButton} disabled>
                    <Video size={16} />
                    Đã kết thúc
                  </button>
                )}
                {status === 'interrupted' && session.continuationSessionId && (
                  <button
                    type="button"
                    className={styles.joinButton}
                    onClick={() => navigate(`/session-lobby/${session.continuationSessionId}`)}
                  >
                    <Video size={16} />
                    Vào buổi phụ
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
                {canCreateDispute && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowDisputeForm(true)}
                  >
                    <CircleAlert size={16} />
                    Báo cáo vấn đề
                  </button>
                )}
              </div>
            </div>

            {status === 'interrupted' && session.continuationSessionId && session.continuationScheduledStart && (
              <div className={styles.infoBanner}>
                <Link2 size={18} />
                <div>
                  <strong>
                    Buổi phụ #{session.continuationSessionId}: {formatDate(session.continuationScheduledStart)} ·{' '}
                    {formatTime(session.continuationScheduledStart)}–{formatTime(session.continuationScheduledEnd)}
                  </strong>
                  <span>
                    Nộp báo cáo cho buổi này lúc nào cũng được — nếu không học buổi phụ, nó sẽ tự huỷ khi bạn nộp
                    báo cáo.
                  </span>
                </div>
              </div>
            )}

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

          {/* Buổi phụ chưa diễn ra: cho tự bỏ nếu 2 bên thống nhất không học nốt. */}
          {session.isContinuation && status === 'scheduled' && (
            <SkipContinuationCard
              continuationSessionId={session.classSessionId}
              isTutor
              accentColor="#1a2238"
              onBothConfirmed={() => void loadSession()}
            />
          )}

          <RescheduleProposalModal
            open={rescheduleModalOpen}
            currentScheduledStart={session.scheduledStart}
            onSubmit={handleProposeReschedule}
            onCancel={() => setRescheduleModalOpen(false)}
            accentColor="#1a2238"
          />

          <CreateDisputeForm
            open={showDisputeForm}
            lessonId={session.classSessionId}
            viewerRole="tutor"
            onCancel={() => setShowDisputeForm(false)}
            onSuccess={() => {
              setShowDisputeForm(false);
              void loadDispute();
            }}
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

                  {/* Toàn bộ nội dung khiếu nại đã chuyển sang trang riêng
                      (/tutor-portal/disputes/:classSessionId) — ở đây chỉ còn dải tóm tắt để
                      gia sư biết buổi này có tranh chấp và bấm sang xem. */}
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
                        <div className={`${styles.reportField} ${styles.reportFieldWide}`}>
                          <span>Lý do khiếu nại</span>
                          <p>{dispute.reason || 'Không có mô tả.'}</p>
                        </div>

                        {needsTutorResponse && (
                          <div className={styles.disputeAlert} role="status">
                            <CircleAlert size={17} />
                            <span>Khiếu nại này đang chờ phản hồi của bạn.</span>
                          </div>
                        )}

                        <div className={styles.disputeActions}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => navigate(`/tutor-portal/disputes/${classSessionId}`)}
                          >
                            {needsTutorResponse ? 'Phản hồi khiếu nại' : 'Xem chi tiết khiếu nại'}
                          </button>
                        </div>
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
                      <button
                        type="button"
                        className={styles.profileButton}
                        onClick={handleOpenStudentProfile}
                        disabled
                        title="Tính năng đang được phát triển"
                      >
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
                        <span className={styles.attendanceAvatar}><GraduationCap size={16} strokeWidth={2} aria-hidden /></span>
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
                        <span className={styles.attendanceAvatar}><UserRound size={16} strokeWidth={2} aria-hidden /></span>
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
