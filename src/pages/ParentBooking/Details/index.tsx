import { useEffect, useState, type ElementType } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Input, Modal, Spin, message as antMessage } from 'antd';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  CreditCard,
  GraduationCap,
  MessageSquare,
  ReceiptText,
  Tag,
  Timer,
  UserRound,
  WalletCards,
  XCircle,
} from 'lucide-react';
import BookingMonthCalendar from '../../../components/BookingMonthCalendar/BookingMonthCalendar';
import { cancelBooking, getBookingById, isFirstLessonFinished, type BookingResponseDTO } from '../../../services/booking.service';
import { canLeaveBookingFeedback } from '../../../services/feedback.service';
import { getPaymentBadge } from '../../../utils/paymentBadge';
import CreateFeedbackModal from '../../ParentLessons/components/CreateFeedbackModal';
import styles from './styles.module.css';

type Lesson = NonNullable<BookingResponseDTO['lessons']>[number];

interface StatusConfig {
  label: string;
  className: string;
  icon: ElementType;
}

interface ProgressStep {
  key: string;
  label: string;
  description: string;
  date?: string | null;
}

interface ApiErrorBody {
  message?: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending_tutor: { label: 'Chờ gia sư xác nhận', className: 'statusPending', icon: Clock3 },
  accepted: { label: 'Chờ đặt cọc', className: 'statusWarning', icon: CreditCard },
  pending_payment: { label: 'Chờ thanh toán', className: 'statusWarning', icon: CreditCard },
  deposit_paid: { label: 'Đã thanh toán buổi đầu', className: 'statusActive', icon: CheckCircle2 },
  pending_remaining_payment: { label: 'Chờ thanh toán còn lại', className: 'statusWarning', icon: WalletCards },
  paid: { label: 'Đã thanh toán đủ', className: 'statusActive', icon: CheckCircle2 },
  active: { label: 'Đang học', className: 'statusActive', icon: BookOpen },
  ongoing: { label: 'Đang học', className: 'statusActive', icon: BookOpen },
  completed: { label: 'Đã hoàn thành', className: 'statusCompleted', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', className: 'statusCancelled', icon: XCircle },
  cancelled_noshow: { label: 'Đã hủy do vắng mặt', className: 'statusCancelled', icon: XCircle },
  payment_timeout: { label: 'Hết hạn thanh toán', className: 'statusCancelled', icon: XCircle },
};

const LESSON_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Đã lên lịch', className: 'lessonScheduled' },
  reserved: { label: 'Đã giữ chỗ', className: 'lessonScheduled' },
  in_progress: { label: 'Đang diễn ra', className: 'lessonCurrent' },
  pending_confirmation: { label: 'Chờ xác nhận', className: 'lessonPending' },
  completed: { label: 'Hoàn thành', className: 'lessonCompleted' },
  cancelled: { label: 'Đã hủy', className: 'lessonCancelled' },
  cancelled_noshow: { label: 'Hủy do vắng mặt', className: 'lessonCancelled' },
  disputed: { label: 'Đang khiếu nại', className: 'lessonPending' },
  no_show: { label: 'Vắng mặt', className: 'lessonCancelled' },
};

const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const formatPrice = (amount?: number | null) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value?: string | null) => {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (value?: string | null) => {
  const date = parseDate(value);
  if (!date) return 'Chưa xác định';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 'Chưa xác định';
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${startDate.toLocaleTimeString('vi-VN', options)} - ${endDate.toLocaleTimeString('vi-VN', options)}`;
};

const formatGrade = (booking: BookingResponseDTO) => {
  const value = booking.gradeLevel?.gradeName ?? booking.student?.gradeLevelName ?? booking.student?.gradeLevel;
  if (!value) return 'Chưa cập nhật';
  return /^\d+$/.test(value) ? `Lớp ${value}` : value;
};

const formatPackage = (booking: BookingResponseDTO) => {
  if (booking.package?.name) return booking.package.name;
  const type = Number(booking.packageType);
  if (type === 1) return 'Gói lịch linh hoạt';
  if (type === 2) return 'Gói lịch cố định';
  return booking.packageType ? `Gói ${booking.packageType}` : 'Chưa cập nhật';
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return 'Chưa cập nhật';
  if (minutes % 60 === 0) return `${minutes / 60} giờ/buổi`;
  return `${minutes} phút/buổi`;
};

// Luồng mới: parent thanh toán buổi học đầu tiên TRƯỚC, sau đó gia sư mới xác nhận.
// Thứ tự timeline: tạo → thanh toán buổi đầu → gia sư xác nhận → thanh toán còn lại → học → xong.
const getProgressIndex = (status: string) => {
  if (status === 'pending_payment' || status === 'accepted') return 1;
  if (status === 'pending_tutor') return 2;
  if (status === 'deposit_paid' || status === 'pending_remaining_payment') return 3;
  if (status === 'paid' || status === 'active' || status === 'ongoing') return 4;
  if (status === 'completed') return 5;
  return 0;
};

const getProgressSteps = (booking: BookingResponseDTO, lessons: Lesson[]): ProgressStep[] => {
  const firstLesson = lessons[0];
  const lastLesson = lessons.at(-1);
  const tutorConfirmed = !['pending_payment', 'pending_tutor'].includes(booking.status);
  const depositPaid = Boolean(booking.depositPaidAt);
  const remainingPaid = Boolean(booking.remainingPaidAt);

  return [
    {
      key: 'created',
      label: 'Yêu cầu đặt lịch đã được tạo',
      description: 'Yêu cầu học đã được hệ thống ghi nhận',
      date: booking.createdAt,
    },
    {
      key: 'deposit_paid',
      label: 'Thanh toán buổi học đầu tiên',
      description: depositPaid
        ? 'Đã thanh toán buổi học đầu tiên'
        : 'Hoàn tất thanh toán buổi đầu để gửi yêu cầu tới gia sư',
      date: booking.depositPaidAt,
    },
    {
      key: 'tutor_confirmed',
      label: 'Gia sư xác nhận',
      description: tutorConfirmed ? 'Gia sư đã đồng ý nhận lớp' : 'Đang chờ gia sư phản hồi yêu cầu',
    },
    {
      key: 'remaining_paid',
      label: 'Thanh toán các buổi còn lại',
      description: remainingPaid ? 'Học phí đã được thanh toán đầy đủ' : 'Thanh toán các buổi học còn lại',
      date: booking.remainingPaidAt,
    },
    {
      key: 'ongoing',
      label: booking.status === 'ongoing' || booking.status === 'active' ? 'Đang học' : 'Bắt đầu học',
      description:
        booking.status === 'ongoing' || booking.status === 'active'
          ? 'Khóa học đang diễn ra'
          : 'Khóa học bắt đầu theo lịch đã xác nhận',
      date: firstLesson?.scheduledStart ?? booking.startDate,
    },
    {
      key: 'completed',
      label: 'Hoàn thành khóa học',
      description: 'Tất cả buổi học đã hoàn tất',
      date: booking.status === 'completed' ? lastLesson?.scheduledEnd : null,
    },
  ];
};

const BookingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';
  const bookingId = Number(id);
  const isValidBookingId = Boolean(id) && Number.isInteger(bookingId) && bookingId > 0;

  const [booking, setBooking] = useState<BookingResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!isValidBookingId) return;

    const fetchBooking = async () => {
      try {
        setLoading(true);
        const response = await getBookingById(bookingId);
        setBooking(response.content);

        if (
          ['cancelled', 'cancelled_noshow', 'completed', 'payment_timeout'].includes(response.content.status) &&
          ['Escrowed', 'paid'].includes(response.content.paymentStatus)
        ) {
          const feedbackResponse = await canLeaveBookingFeedback(bookingId);
          setCanReview(feedbackResponse.content);
        }
      } catch {
        antMessage.error('Không thể tải chi tiết đặt lịch.');
      } finally {
        setLoading(false);
      }
    };

    void fetchBooking();
  }, [bookingId, isValidBookingId]);

  if (!isValidBookingId) return <Navigate to="/404" replace />;

  if (loading) {
    return (
      <div className={styles.loadingOverlay}>
        <Spin size="large" tip="Đang tải chi tiết..." />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <AlertCircle size={48} />
          <h2>Không tìm thấy lịch đặt</h2>
          <p>Yêu cầu đặt lịch #{id} không tồn tại hoặc bạn không có quyền xem.</p>
          <button className={styles.backBtnPrimary} onClick={() => navigate(`${basePath}/booking`)} type="button">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending_tutor;
  const StatusIcon = statusConfig.icon;
  const lessons = [...(booking.lessons ?? [])].sort(
    (first, second) => new Date(first.scheduledStart).getTime() - new Date(second.scheduledStart).getTime(),
  );
  const firstLesson = lessons[0];
  const lastLesson = lessons.at(-1);
  const completedLessons = lessons.filter((lesson) => lesson.status === 'completed').length;
  const weeklySchedule = Array.from(
    new Map(
      (booking.schedule ?? []).map((slot) => [`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`, slot]),
    ).values(),
  );
  const progressSteps = getProgressSteps(booking, lessons);
  const progressIndex = getProgressIndex(booking.status);
  const isCourseCompleted = booking.status === 'completed';
  const progressPercent = isCourseCompleted ? 100 : Math.round((progressIndex / (progressSteps.length - 1)) * 100);
  const isCancelled = ['cancelled', 'cancelled_noshow', 'payment_timeout'].includes(booking.status);
  const paymentBadge = getPaymentBadge(booking.status, booking.paymentStatus);
  const parentServiceFee = Math.max(0, booking.finalPrice - (booking.price - booking.discountApplied));
  const depositPaid =
    Boolean(booking.depositPaidAt) || ['DepositEscrowed', 'Escrowed', 'paid'].includes(booking.paymentStatus);
  const remainingPaid = Boolean(booking.remainingPaidAt) || ['Escrowed', 'paid'].includes(booking.paymentStatus);
  const canCancel = [
    'pending_tutor',
    'accepted',
    'pending_payment',
    'deposit_paid',
    'pending_remaining_payment',
    'ongoing',
    'paid',
  ].includes(booking.status);
  const canPayDeposit = ['accepted', 'pending_payment'].includes(booking.status);
  // Chỉ cho thanh toán đợt 2 khi buổi học đầu tiên đã kết thúc.
  const isRemainingStage = ['deposit_paid', 'pending_remaining_payment'].includes(booking.status);
  const canPayRemaining = isRemainingStage && isFirstLessonFinished(booking);
  const remainingLocked = isRemainingStage && !isFirstLessonFinished(booking);
  const hasActions = canReview || canCancel || canPayDeposit || canPayRemaining || remainingLocked;

  const copyBookingCode = async () => {
    try {
      await navigator.clipboard.writeText(`BK-${booking.bookingId}`);
      antMessage.success('Đã sao chép mã đặt lịch');
    } catch {
      antMessage.warning('Không thể sao chép mã đặt lịch');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(`${basePath}/booking`)} type="button">
          <ArrowLeft size={18} />
          <span>Danh sách đặt lịch</span>
        </button>
        <div className={styles.topBarRight}>
          <button className={styles.bookingCode} onClick={copyBookingCode} type="button">
            <Copy size={13} />
            BK-{booking.bookingId}
          </button>
          <span className={`${styles.statusBadgeLg} ${styles[statusConfig.className]}`}>
            <StatusIcon size={15} />
            {statusConfig.label}
          </span>
        </div>
      </div>

      <main className={styles.pageContent}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Chi tiết khóa học</span>
            <h1>{booking.subject?.subjectName || 'Khóa học của bạn'}</h1>
          </div>
          <div className={styles.heroFacts}>
            <div>
              <BookOpen size={18} />
              <span>Môn học</span>
              <strong>{booking.subject?.subjectName || 'Chưa cập nhật'}</strong>
            </div>
            <div>
              <GraduationCap size={18} />
              <span>Cấp lớp</span>
              <strong>{formatGrade(booking)}</strong>
            </div>
            <div>
              <CalendarCheck2 size={18} />
              <span>Số buổi</span>
              <strong>{booking.totalSessions ?? booking.sessionCount} buổi</strong>
            </div>
            <div>
              <Timer size={18} />
              <span>Thời lượng</span>
              <strong>{formatDuration(booking.durationMinutesPerSession)}</strong>
            </div>
          </div>
        </header>

        <div className={styles.detailGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionIcon}>
                    <UserRound size={18} />
                  </span>
                  <div>
                    <p>Thông tin chung</p>
                    <h2>Gia sư và học sinh</h2>
                  </div>
                </div>
              </div>

              <div className={styles.peopleGrid}>
                <article className={styles.personCard}>
                  <div className={styles.tutorAvatar}>
                    {booking.tutor?.avatarUrl ? (
                      <img src={booking.tutor.avatarUrl} alt={booking.tutor.fullName} />
                    ) : (
                      <span>{booking.tutor?.fullName?.charAt(0) || 'G'}</span>
                    )}
                  </div>
                  <div>
                    <span className={styles.personRole}>Gia sư phụ trách</span>
                    <h3>{booking.tutor?.fullName || 'Chưa cập nhật'}</h3>
                    <p>{formatPrice(booking.pricePerHour ?? booking.tutor?.hourlyRate)}/giờ</p>
                  </div>
                </article>
                <article className={styles.personCard}>
                  <div className={styles.studentAvatar}>
                    <span>{booking.student?.fullName?.charAt(0) || 'H'}</span>
                  </div>
                  <div>
                    <span className={styles.personRole}>Học sinh</span>
                    <h3>{booking.student?.fullName || 'Chưa cập nhật'}</h3>
                    <p>{formatGrade(booking)}</p>
                  </div>
                </article>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <ReceiptText size={17} />
                  <div>
                    <span>Gói học</span>
                    <strong>{formatPackage(booking)}</strong>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <CalendarDays size={17} />
                  <div>
                    <span>Ngày tạo yêu cầu</span>
                    <strong>{formatDateTime(booking.createdAt)}</strong>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Banknote size={17} />
                  <div>
                    <span>Học phí theo giờ</span>
                    <strong>{formatPrice(booking.pricePerHour ?? booking.tutor?.hourlyRate)}</strong>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Timer size={17} />
                  <div>
                    <span>Thời lượng mỗi buổi</span>
                    <strong>{formatDuration(booking.durationMinutesPerSession)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionIcon}>
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <p>Lịch học</p>
                    <h2>Lộ trình và các buổi học</h2>
                  </div>
                </div>
                <span className={styles.sessionProgress}>
                  {completedLessons}/{booking.sessionCount} buổi hoàn thành
                </span>
              </div>

              <div className={styles.scheduleOverview}>
                <div>
                  <span>Bắt đầu</span>
                  <strong>{formatDateOnly(firstLesson?.scheduledStart ?? booking.startDate)}</strong>
                </div>
                <ArrowRight size={18} />
                <div>
                  <span>Kết thúc dự kiến</span>
                  <strong>{formatDateOnly(lastLesson?.scheduledEnd)}</strong>
                </div>
              </div>

              {weeklySchedule.length > 0 && (
                <div className={styles.weeklySchedule}>
                  <span>Lịch học hằng tuần</span>
                  <div>
                    {weeklySchedule.map((slot) => (
                      <span key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`}>
                        <strong>{DAY_NAMES[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`}</strong>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <BookingMonthCalendar
                lessons={booking.lessons}
                startDate={booking.startDate}
                schedule={booking.schedule}
                sessionCount={booking.sessionCount}
              />

              <div className={styles.lessonSection}>
                <div className={styles.lessonSectionTitle}>
                  <h3>Danh sách buổi học</h3>
                  <span>{lessons.length || booking.sessionCount} buổi</span>
                </div>
                {lessons.length > 0 ? (
                  <div className={styles.lessonList}>
                    {lessons.map((lesson, index) => {
                      const lessonStatus = LESSON_STATUS_CONFIG[lesson.status ?? 'scheduled'] ?? {
                        label: 'Chưa cập nhật',
                        className: 'lessonScheduled',
                      };
                      return (
                        <article className={styles.lessonItem} key={lesson.lessonId}>
                          <span className={styles.lessonNumber}>{index + 1}</span>
                          <div className={styles.lessonDate}>
                            <strong>{formatDateOnly(lesson.scheduledStart)}</strong>
                            <span>{formatTimeRange(lesson.scheduledStart, lesson.scheduledEnd)}</span>
                          </div>
                          <span className={`${styles.lessonBadge} ${styles[lessonStatus.className]}`}>
                            {lessonStatus.label}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyLessons}>
                    <CalendarDays size={22} />
                    <span>Danh sách buổi học cụ thể đang được cập nhật.</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            {!isCancelled && (
              <section className={`${styles.card} ${styles.progressCard}`}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.sectionIcon}>
                      <CheckCircle2 size={18} />
                    </span>
                    <div>
                      <p>Trạng thái</p>
                      <h2>Tiến trình đặt lịch</h2>
                    </div>
                  </div>
                  <strong className={styles.progressValue}>{progressPercent}%</strong>
                </div>
                <div className={styles.progressBar} aria-label={`Tiến trình ${progressPercent}%`}>
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <div className={styles.timeline}>
                  {progressSteps.map((step, index) => {
                    const isCompleted = isCourseCompleted || index < progressIndex;
                    const isCurrent = !isCourseCompleted && index === progressIndex;
                    return (
                      <div
                        className={`${styles.timelineStep} ${isCurrent ? styles.timelineStepCurrent : ''}`}
                        key={step.key}
                      >
                        <div className={styles.timelineIndicator}>
                          {isCompleted ? (
                            <CheckCircle2 className={styles.timelineCompleted} size={20} />
                          ) : isCurrent ? (
                            <span className={styles.timelineCurrentDot} />
                          ) : (
                            <Circle className={styles.timelineUpcoming} size={20} />
                          )}
                          {index < progressSteps.length - 1 && (
                            <span
                              className={`${styles.timelineLine} ${index < progressIndex ? styles.timelineLineCompleted : ''}`}
                            />
                          )}
                        </div>
                        <div className={styles.timelineContent}>
                          <strong>{step.label}</strong>
                          <span>{step.description}</span>
                          {step.date && <time>{formatDateTime(step.date)}</time>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {isCancelled && (
              <section className={styles.cancelledCard}>
                <XCircle size={22} />
                <div>
                  <span>Lịch đặt đã kết thúc</span>
                  <h2>{statusConfig.label}</h2>
                  <p>
                    {booking.status === 'payment_timeout'
                      ? 'Yêu cầu đặt lịch tự động bị hủy do quá hạn thanh toán.'
                      : booking.cancellationReason || 'Lịch đặt đã được hủy theo yêu cầu.'}
                  </p>
                  {booking.cancelledAt && <time>{formatDateTime(booking.cancelledAt)}</time>}
                </div>
              </section>
            )}

            <section className={`${styles.card} ${styles.paymentCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionIcon}>
                    <CreditCard size={18} />
                  </span>
                  <div>
                    <p>Học phí</p>
                    <h2>Chi tiết thanh toán</h2>
                  </div>
                </div>
              </div>

              <div className={styles.totalPayment}>
                <span>Tổng thanh toán</span>
                <strong>{formatPrice(booking.finalPrice)}</strong>
              </div>
              <div className={styles.priceBreakdown}>
                <div className={styles.priceRow}>
                  <span>Học phí gốc</span>
                  <strong>{formatPrice(booking.price)}</strong>
                </div>
                {booking.discountApplied > 0 && (
                  <div className={`${styles.priceRow} ${styles.priceDiscount}`}>
                    <span>
                      <Tag size={13} /> Ưu đãi
                    </span>
                    <strong>-{formatPrice(booking.discountApplied)}</strong>
                  </div>
                )}
                <div className={styles.priceRow}>
                  <span>Phí dịch vụ (5%)</span>
                  <strong>+{formatPrice(parentServiceFee)}</strong>
                </div>
              </div>

              <div className={styles.paymentPhases}>
                <div className={depositPaid ? styles.phasePaid : ''}>
                  <span>{depositPaid ? <CheckCircle2 size={17} /> : <Circle size={17} />}</span>
                  <div>
                    <small>Đợt 1 · Buổi học đầu tiên</small>
                    <strong>{formatPrice(booking.depositAmount)}</strong>
                  </div>
                  <time>{booking.depositPaidAt ? formatDateTime(booking.depositPaidAt) : 'Chưa thanh toán'}</time>
                </div>
                <div className={remainingPaid ? styles.phasePaid : ''}>
                  <span>{remainingPaid ? <CheckCircle2 size={17} /> : <Circle size={17} />}</span>
                  <div>
                    <small>Đợt 2 · Phần còn lại</small>
                    <strong>{formatPrice(booking.remainingAmount)}</strong>
                  </div>
                  <time>{booking.remainingPaidAt ? formatDateTime(booking.remainingPaidAt) : 'Chưa thanh toán'}</time>
                </div>
              </div>

              {paymentBadge && (
                <div className={`${styles.paymentStatusBox} ${styles[`paymentTone${paymentBadge.tone}`]}`}>
                  {paymentBadge.tone === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                  <span>{paymentBadge.label}</span>
                </div>
              )}
              {booking.paymentCode && (
                <div className={styles.paymentMeta}>
                  <span>Mã thanh toán</span>
                  <strong>{booking.paymentCode}</strong>
                </div>
              )}
              {booking.paymentDueAt && !remainingPaid && (
                <div className={styles.paymentDue}>
                  <Clock3 size={15} />
                  <span>Hạn thanh toán: {formatDateTime(booking.paymentDueAt)}</span>
                </div>
              )}
              {booking.refundAmount != null && booking.refundAmount > 0 && (
                <div className={styles.refundBox}>
                  <span>Tiền hoàn lại</span>
                  <strong>{formatPrice(booking.refundAmount)}</strong>
                  <small>{booking.refundStatus === 'refunded' ? 'Đã hoàn trả' : 'Đang xử lý'}</small>
                </div>
              )}
            </section>

            {hasActions && (
              <section className={styles.actionPanel}>
                {canReview && (
                  <button className={styles.primaryBtn} type="button" onClick={() => setShowReviewModal(true)}>
                    <MessageSquare size={17} /> Đánh giá khóa học
                  </button>
                )}
                {canPayDeposit && (
                  <button
                    className={styles.primaryBtn}
                    type="button"
                    onClick={() => navigate(`${basePath}/booking/${booking.bookingId}/payment`)}
                  >
                    <CreditCard size={17} /> Thanh toán đặt cọc
                  </button>
                )}
                {canPayRemaining && (
                  <button
                    className={styles.primaryBtn}
                    type="button"
                    onClick={() => navigate(`${basePath}/booking/${booking.bookingId}/payment`)}
                  >
                    <CreditCard size={17} /> Thanh toán phần còn lại
                  </button>
                )}
                {remainingLocked && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      color: '#9a3412',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <Clock3 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Bạn có thể thanh toán các buổi học còn lại sau khi buổi học đầu tiên kết thúc.</span>
                  </div>
                )}
                {canCancel && (
                  <button className={styles.cancelBtn} type="button" onClick={() => setShowCancelModal(true)}>
                    <XCircle size={17} /> Hủy đặt lịch
                  </button>
                )}
              </section>
            )}
          </aside>
        </div>
      </main>

      <CreateFeedbackModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => {
          setShowReviewModal(false);
          setCanReview(false);
        }}
        feedbackType="early_termination"
        bookingId={booking.bookingId}
        tutorId={booking.tutor?.tutorId || ''}
        tutorName={booking.tutor?.fullName}
        subjectName={booking.subject?.subjectName}
      />

      <Modal
        title="Hủy đặt lịch"
        open={showCancelModal}
        onCancel={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
        confirmLoading={cancelLoading}
        onOk={async () => {
          if (!cancelReason.trim()) {
            antMessage.warning('Vui lòng nhập lý do hủy đặt lịch');
            return;
          }
          setCancelLoading(true);
          try {
            await cancelBooking(booking.bookingId, cancelReason.trim());
            antMessage.success('Hủy đặt lịch thành công');
            setShowCancelModal(false);
            const response = await getBookingById(booking.bookingId);
            setBooking(response.content);
            if (
              ['cancelled', 'cancelled_noshow', 'completed', 'payment_timeout'].includes(response.content.status) &&
              ['Escrowed', 'paid'].includes(response.content.paymentStatus)
            ) {
              const feedbackResponse = await canLeaveBookingFeedback(booking.bookingId);
              setCanReview(feedbackResponse.content);
            }
          } catch (error) {
            const apiError = error as AxiosError<ApiErrorBody>;
            antMessage.error(apiError.response?.data?.message || 'Không thể hủy đặt lịch');
          } finally {
            setCancelLoading(false);
          }
        }}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
      >
        <div className={styles.cancelModalCopy}>
          <p>
            Bạn có chắc chắn muốn hủy lịch đặt <strong>BK-{booking.bookingId}</strong> không?
          </p>
          {(depositPaid || remainingPaid) && (
            <p>Bạn đã thanh toán cho khóa học này. Hệ thống sẽ tính tiền hoàn lại dựa trên số buổi gia sư đã dạy.</p>
          )}
        </div>
        <Input.TextArea
          rows={4}
          placeholder="Vui lòng nhập lý do hủy đặt lịch..."
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          required
        />
      </Modal>
    </div>
  );
};

export default BookingDetailPage;
