import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Check, ChevronRight, Clock, MessageCircle, Search, Star, User, Wallet, X } from 'lucide-react';
import { Input, Modal, Pagination } from 'antd';
import { toast } from 'react-toastify';
import BookingMonthCalendar from '../../components/BookingMonthCalendar/BookingMonthCalendar';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import styles from '../../styles/pages/tutor-portal-bookings.module.css';
import {
  acceptBooking,
  declineBooking,
  getTutorBookings,
  type BookingResponseDTO,
} from '../../services/booking.service';
import { getChats, getOrCreateBookingChannel, type ChatChannel } from '../../services/chat.service';
import { getBookingFeedback, type FeedbackDto } from '../../services/feedback.service';
import ReplyFeedbackModal from './components/ReplyFeedbackModal';
import { getBookingResponseDeadlineState } from '../../utils/bookingDeadline';
import { formatVNDNumber } from '../../utils/formatters';

const STATUS_TABS = [
  { key: 'pending_tutor', label: 'Chờ xác nhận' },
  { key: 'deposit_paid,pending_remaining_payment,paid,ongoing', label: 'Đã thanh toán' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled,cancelled_noshow,payment_timeout', label: 'Đã hủy' },
];

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending_tutor: { label: 'Chờ xác nhận', tone: 'pending' },
  pending_payment: { label: 'Chờ thanh toán', tone: 'pending' },
  accepted: { label: 'Đã chấp nhận', tone: 'accepted' },
  deposit_paid: { label: 'Đã đặt cọc', tone: 'paid' },
  pending_remaining_payment: { label: 'Chờ TT còn lại', tone: 'paid' },
  paid: { label: 'Đã thanh toán', tone: 'paid' },
  ongoing: { label: 'Đang học', tone: 'paid' },
  completed: { label: 'Hoàn thành', tone: 'completed' },
  cancelled: { label: 'Đã hủy', tone: 'cancelled' },
  cancelled_noshow: { label: 'Hủy do vắng mặt', tone: 'cancelled' },
  declined: { label: 'Đã từ chối', tone: 'cancelled' },
  payment_timeout: { label: 'Hết hạn thanh toán', tone: 'cancelled' },
};

const EMPTY_STATE_COPY: Record<string, { title: string; description: string }> = {
  pending_tutor: {
    title: 'Không có yêu cầu đang chờ',
    description: 'Các yêu cầu đặt lịch mới từ phụ huynh sẽ xuất hiện tại đây.',
  },
  'deposit_paid,pending_remaining_payment,paid,ongoing': {
    title: 'Chưa có yêu cầu đã thanh toán',
    description: 'Booking đã thanh toán cọc hoặc đầy đủ sẽ được cập nhật tại đây.',
  },
  completed: {
    title: 'Chưa có yêu cầu hoàn thành',
    description: 'Các khóa học đã hoàn tất sẽ được lưu tại đây.',
  },
  'cancelled,cancelled_noshow,payment_timeout': {
    title: 'Chưa có yêu cầu đã hủy',
    description: 'Các yêu cầu bị hủy, từ chối hoặc hết hạn sẽ được lưu tại đây.',
  },
};

const formatDayName = (dayOfWeek: number) => {
  if (dayOfWeek === 0 || dayOfWeek === 7) return 'Chủ nhật';
  return `Thứ ${dayOfWeek + 1}`;
};

const formatGrade = (grade?: string): string => {
  if (!grade) return 'Chưa cập nhật lớp';
  return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
};

const formatPrice = (amount: number) => `${formatVNDNumber(Math.max(0, amount))} ₫`;

const formatRequestDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getBookingPeriod = (booking: BookingResponseDTO) => {
  const lessons = [...(booking.lessons ?? [])].sort(
    (first, second) => new Date(first.scheduledStart).getTime() - new Date(second.scheduledStart).getTime(),
  );

  return {
    startDate: lessons[0]?.scheduledStart ?? booking.startDate,
    endDate: lessons.at(-1)?.scheduledEnd,
  };
};

const formatTime = (value?: string) => (value ? value.slice(0, 5) : '');

const getUniqueSchedule = (booking: BookingResponseDTO) => {
  const uniqueSlots = new Map<string, BookingResponseDTO['schedule'][number]>();

  (booking.schedule ?? []).forEach((slot) => {
    const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`;
    if (!uniqueSlots.has(key)) uniqueSlots.set(key, slot);
  });

  return Array.from(uniqueSlots.values());
};

const getFeeBreakdown = (booking: BookingResponseDTO) => {
  const originalTuition = Math.max(0, booking.totalAmount ?? booking.price ?? 0);
  const discount = Math.max(0, booking.discountApplied ?? 0);
  const baseAmount = Math.max(0, booking.baseAmount ?? originalTuition - discount);
  const parentFee = Math.max(0, booking.parentFee ?? booking.finalPrice - baseAmount);
  const tutorServiceFee = Math.max(0, booking.tutorServiceFee ?? (booking.platformFee ?? 0) - parentFee);
  const tutorReceivable = Math.max(0, booking.tutorReceivable ?? baseAmount - tutorServiceFee);
  const sessionCount = Math.max(1, booking.sessionCount || booking.totalSessions || 1);
  const firstSessionPayment = Math.max(0, booking.depositAmount ?? Math.floor(booking.finalPrice / sessionCount));
  const paymentStatus = (booking.paymentStatus ?? '').toLowerCase();
  const isFirstSessionPaid =
    Boolean(booking.depositPaidAt) || ['depositedescrowed', 'escrowed', 'paid'].includes(paymentStatus);

  return {
    originalTuition,
    discount,
    baseAmount,
    parentFee,
    tutorServiceFee,
    tutorReceivable,
    firstSessionPayment,
    isFirstSessionPaid,
  };
};

const TutorPortalBookings = () => {
  const [bookings, setBookings] = useState<BookingResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_tutor');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [processingBooking, setProcessingBooking] = useState<{
    id: number;
    action: 'accept' | 'decline';
  } | null>(null);
  const [openingChatId, setOpeningChatId] = useState<number | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackDto>>({});
  const [replyModal, setReplyModal] = useState<{ open: boolean; feedback: FeedbackDto | null }>({
    open: false,
    feedback: null,
  });
  const currentTime = useCurrentTime();
  const navigate = useNavigate();

  /**
   * Nạp đánh giá cho các booking đã hoàn thành trên trang hiện tại. Gọi theo từng booking
   * thay vì lấy cả danh sách đánh giá của gia sư rồi ghép: danh sách đó phân trang riêng nên
   * gia sư nhiều đánh giá sẽ bị thiếu. Tối đa `pageSize` request, chạy song song.
   */
  const fetchFeedbacksFor = async (items: BookingResponseDTO[]) => {
    const completed = items.filter((b) => b.status === 'completed');
    if (completed.length === 0) {
      setFeedbacks({});
      return;
    }

    const results = await Promise.all(
      completed.map(async (b) => {
        try {
          const response = await getBookingFeedback(b.bookingId);
          return [b.bookingId, response.content] as const;
        } catch {
          return [b.bookingId, null] as const;
        }
      }),
    );

    const map: Record<number, FeedbackDto> = {};
    for (const [bookingId, feedback] of results) {
      if (feedback) map[bookingId] = feedback;
    }
    setFeedbacks(map);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getTutorBookings({ status: activeTab, page: currentPage, pageSize });

      // API can return either a paged payload or a direct array in older environments.
      const payload = response.content as unknown as
        | BookingResponseDTO[]
        | {
            items?: BookingResponseDTO[];
            totalCount?: number;
            content?: BookingResponseDTO[];
            totalElements?: number;
          };
      let items: BookingResponseDTO[] = [];
      let total = 0;

      if (Array.isArray(payload)) {
        items = payload;
        total = payload.length;
      } else if (payload && Array.isArray(payload.items)) {
        items = payload.items;
        total = payload.totalCount || items.length;
      } else if (payload && Array.isArray(payload.content)) {
        items = payload.content;
        total = payload.totalElements || payload.totalCount || items.length;
      }

      setBookings(items);
      setTotalCount(total);
      await fetchFeedbacksFor(items);
    } catch (error: unknown) {
      console.error('Fetch bookings error:', error);
      const apiError = error as { response?: { status?: number }; message?: string };
      if (apiError.response?.status === 403) {
        toast.error('Bạn không có quyền truy cập. Vui lòng kiểm tra lại tài khoản hoặc quyền gia sư.');
      } else {
        toast.error(`Không thể tải danh sách yêu cầu đặt lịch: ${apiError.message || 'Lỗi không xác định'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, pageSize]);

  const handleTabChange = (tabKey: string) => {
    setCurrentPage(1);
    setActiveTab(tabKey);
  };

  const handleAccept = async (id: number) => {
    try {
      setProcessingBooking({ id, action: 'accept' });
      await acceptBooking(id);
      toast.success('Đã chấp nhận yêu cầu!');
      await fetchBookings();
    } catch {
      toast.error('Có lỗi xảy ra khi chấp nhận yêu cầu.');
    } finally {
      setProcessingBooking(null);
    }
  };

  const handleDecline = (id: number) => {
    setSelectedBookingId(id);
    setDeclineModalVisible(true);
  };

  const handleContactParent = async (booking: BookingResponseDTO) => {
    try {
      setOpeningChatId(booking.bookingId);
      const channelResponse = await getOrCreateBookingChannel(booking.bookingId);
      const channelId = channelResponse.content?.channelId;
      if (!channelId) throw new Error('Thiếu channelId');

      const channelsResponse = await getChats();
      const existingChannel = channelsResponse.content.find((channel) => channel.channelId === channelId);
      const openChannel: ChatChannel = existingChannel
        ? { ...existingChannel, bookingId: booking.bookingId }
        : {
            channelId,
            bookingId: booking.bookingId,
            otherUserId: booking.parentId ?? '',
            otherUserName: `Phụ huynh của ${booking.student?.fullName || 'học sinh'}`,
            otherUserAvatarUrl: '',
            status: 'active',
            lastMessageAt: '',
            lastMessagePreview: '',
          };

      navigate('/tutor-portal/messages', { state: { openChannel } });
    } catch {
      toast.error('Không mở được cuộc trò chuyện với phụ huynh. Vui lòng thử lại.');
    } finally {
      setOpeningChatId(null);
    }
  };

  const closeDeclineModal = () => {
    if (processingBooking?.action === 'decline') return;
    setDeclineModalVisible(false);
    setDeclineReason('');
    setSelectedBookingId(null);
  };

  const confirmDecline = async () => {
    if (selectedBookingId === null) return;
    if (!declineReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối trước khi xác nhận.');
      return;
    }
    if (declineReason.trim().length < 10) {
      toast.warning('Lý do từ chối phải có ít nhất 10 ký tự.');
      return;
    }

    try {
      setProcessingBooking({ id: selectedBookingId, action: 'decline' });
      await declineBooking(selectedBookingId, declineReason.trim());
      toast.success('Đã từ chối yêu cầu.');
      setDeclineModalVisible(false);
      setDeclineReason('');
      setSelectedBookingId(null);
      await fetchBookings();
    } catch {
      toast.error('Có lỗi xảy ra khi từ chối yêu cầu.');
    } finally {
      setProcessingBooking(null);
    }
  };

  const emptyCopy = EMPTY_STATE_COPY[activeTab] ?? EMPTY_STATE_COPY.pending_tutor;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Yêu cầu đặt lịch</h1>
          <p>Kiểm tra thông tin lớp học và phản hồi yêu cầu từ phụ huynh.</p>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.tabBar} role="tablist" aria-label="Lọc yêu cầu theo trạng thái">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span className={styles.tabDot} aria-hidden="true" />
              {tab.label}
              {activeTab === tab.key && !loading && <span className={styles.tabCount}>{totalCount}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} aria-hidden="true" />
            <div>
              <strong>Đang tải yêu cầu</strong>
              <p>Thông tin mới nhất sẽ hiển thị trong giây lát.</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Search size={28} />
            </div>
            <h3>{emptyCopy.title}</h3>
            <p>{emptyCopy.description}</p>
          </div>
        ) : (
          <div className={styles.bookingList}>
            {bookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status] ?? {
                label: booking.status,
                tone: 'pending',
              };
              const schedule = getUniqueSchedule(booking);
              const requestDate = formatRequestDate(booking.createdAt);
              const bookingPeriod = getBookingPeriod(booking);
              const feeBreakdown = getFeeBreakdown(booking);
              const isAccepting = processingBooking?.id === booking.bookingId && processingBooking.action === 'accept';
              const isProcessing = processingBooking?.id === booking.bookingId;
              const responseDeadline =
                booking.status === 'pending_tutor'
                  ? getBookingResponseDeadlineState(booking.responseDeadline, currentTime)
                  : null;
              const bookingFeedback = feedbacks[booking.bookingId];
              const responseHintTone = responseDeadline ? styles[`responseHint_${responseDeadline.urgency}`] : '';
              const deadlineBadgeTone =
                responseDeadline?.urgency === 'critical'
                  ? styles.deadlineBadgeCritical
                  : responseDeadline?.urgency === 'warning'
                    ? styles.deadlineBadgeWarning
                    : '';

              return (
                <article key={booking.bookingId} className={styles.bookingCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.studentInfo}>
                      <div className={styles.avatar} aria-hidden="true">
                        {booking.student?.fullName?.trim().charAt(0).toUpperCase() || <User size={20} />}
                      </div>
                      <div className={styles.studentIdentity}>
                        <div className={styles.studentNameRow}>
                          <h3>{booking.student?.fullName || 'Học sinh chưa cập nhật tên'}</h3>
                          <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
                            {status.label}
                          </span>
                          {responseDeadline && (
                            <span
                              className={`${styles.deadlineBadge} ${deadlineBadgeTone}`}
                              title={responseDeadline.deadlineLabel}
                            >
                              <Clock size={13} aria-hidden="true" />
                              {responseDeadline.isExpired
                                ? 'Hết hạn phản hồi'
                                : `Còn ${responseDeadline.compactRemainingLabel}`}
                            </span>
                          )}
                        </div>
                        <p>
                          {formatGrade(booking.student?.gradeLevel)}
                          {requestDate && (
                            <>
                              <span aria-hidden="true">•</span>
                              Gửi ngày {requestDate}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.bookingDetails}>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>
                            <BookOpen size={18} />
                          </span>
                          <div>
                            <span className={styles.infoLabel}>Môn học</span>
                            <strong>{booking.subject?.subjectName || 'Chưa cập nhật'}</strong>
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>
                            <Calendar size={18} />
                          </span>
                          <div>
                            <span className={styles.infoLabel}>Thời lượng</span>
                            <strong>{booking.sessionCount} buổi học</strong>
                          </div>
                        </div>
                      </div>

                      <section className={styles.scheduleSection} aria-label="Lịch học dự kiến">
                        <div className={styles.sectionHeading}>
                          <div>
                            <Calendar size={17} />
                            <h4>Lịch học dự kiến</h4>
                          </div>
                        </div>
                        <div className={styles.scheduleBody}>
                          <div className={styles.scheduleSummary}>
                            <div className={styles.bookingPeriod}>
                              <div>
                                <span>Bắt đầu</span>
                                <strong>{formatRequestDate(bookingPeriod.startDate) || 'Chưa xác định'}</strong>
                              </div>
                              <span className={styles.periodDivider} aria-hidden="true">
                                →
                              </span>
                              <div>
                                <span>Kết thúc</span>
                                <strong>{formatRequestDate(bookingPeriod.endDate) || 'Chưa xác định'}</strong>
                              </div>
                            </div>
                            {schedule.length > 0 ? (
                              <div className={styles.scheduleList}>
                                {schedule.map((slot) => (
                                  <div
                                    key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`}
                                    className={styles.scheduleTag}
                                  >
                                    <span>{formatDayName(slot.dayOfWeek)}</span>
                                    <strong>
                                      {formatTime(slot.startTime)}
                                      {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ''}
                                    </strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={styles.noSchedule}>Phụ huynh chưa chọn khung giờ học.</p>
                            )}
                          </div>
                          <BookingMonthCalendar
                            lessons={booking.lessons}
                            startDate={booking.startDate}
                            schedule={booking.schedule}
                            sessionCount={booking.sessionCount}
                          />
                        </div>
                      </section>
                    </div>

                    <aside className={styles.payoutCard} aria-label="Thông tin thanh toán">
                      <div className={styles.payoutTitle}>
                        <span>
                          <Wallet size={18} />
                        </span>
                        <div>
                          <p>Bạn thực nhận toàn khóa</p>
                          <strong>{formatPrice(feeBreakdown.tutorReceivable)}</strong>
                        </div>
                      </div>

                      <div
                        className={`${styles.depositSummary} ${!feeBreakdown.isFirstSessionPaid ? styles.depositPending : ''}`}
                      >
                        <div className={styles.depositSummaryHeader}>
                          <span>
                            <Check size={13} />
                            {feeBreakdown.isFirstSessionPaid
                              ? 'Phụ huynh đã thanh toán buổi đầu'
                              : 'Thanh toán buổi đầu dự kiến'}
                          </span>
                        </div>
                        <strong>{formatPrice(feeBreakdown.firstSessionPayment)}</strong>
                        {!feeBreakdown.isFirstSessionPaid && (
                          <small>Số tiền cần thanh toán để gửi yêu cầu cho gia sư.</small>
                        )}
                      </div>

                      <div className={styles.priceBreakdown}>
                        <div>
                          <span>Học phí gốc</span>
                          <strong>{formatPrice(feeBreakdown.originalTuition)}</strong>
                        </div>
                        {feeBreakdown.discount > 0 && (
                          <>
                            <div>
                              <span>Ưu đãi</span>
                              <strong className={styles.negativeAmount}>− {formatPrice(feeBreakdown.discount)}</strong>
                            </div>
                            <div>
                              <span>Học phí sau ưu đãi</span>
                              <strong>{formatPrice(feeBreakdown.baseAmount)}</strong>
                            </div>
                          </>
                        )}
                        <div>
                          <span>Phí phụ huynh (5%)</span>
                          <strong className={styles.positiveAmount}>+ {formatPrice(feeBreakdown.parentFee)}</strong>
                        </div>
                        <div className={styles.parentTotalRow}>
                          <span>Phụ huynh cần thanh toán</span>
                          <strong>{formatPrice(booking.finalPrice)}</strong>
                        </div>
                        <div className={styles.tutorFeeRow}>
                          <span>Phí gia sư (5%)</span>
                          <strong className={styles.negativeAmount}>
                            − {formatPrice(feeBreakdown.tutorServiceFee)}
                          </strong>
                        </div>
                      </div>
                      <p className={styles.payoutNote}>Hai khoản phí 5% được tính riêng cho phụ huynh và gia sư.</p>
                    </aside>
                  </div>

                  {bookingFeedback && (
                    <section className={styles.feedbackBlock}>
                      <div className={styles.feedbackHead}>
                        <Star size={16} />
                        <strong>Đánh giá của phụ huynh</strong>
                        <span className={styles.feedbackStars} aria-hidden="true">
                          {'★'.repeat(bookingFeedback.rating)}
                          <span className={styles.feedbackStarsDim}>
                            {'★'.repeat(Math.max(0, 5 - bookingFeedback.rating))}
                          </span>
                        </span>
                        <span className={styles.feedbackMeta}>{bookingFeedback.rating}/5</span>
                        {bookingFeedback.isVisible === false && (
                          <span className={styles.feedbackHidden}>Đang bị ẩn bởi quản trị viên</span>
                        )}
                      </div>

                      {bookingFeedback.isVisible === false && bookingFeedback.hiddenReason && (
                        <p className={styles.feedbackHiddenReason}>
                          Lý do ẩn: {bookingFeedback.hiddenReason}
                        </p>
                      )}

                      {bookingFeedback.comment && (
                        <p className={styles.feedbackComment}>“{bookingFeedback.comment}”</p>
                      )}

                      {bookingFeedback.reply ? (
                        <div className={styles.feedbackReply}>
                          <strong>Phản hồi của bạn</strong>
                          <p>{bookingFeedback.reply}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.feedbackReplyBtn}
                          onClick={() => setReplyModal({ open: true, feedback: bookingFeedback })}
                        >
                          <MessageCircle size={15} /> Phản hồi đánh giá
                        </button>
                      )}
                    </section>
                  )}

                  <footer className={styles.cardFooter}>
                    <div className={`${styles.responseHint} ${responseHintTone}`}>
                      <Clock size={16} />
                      <div>
                        {responseDeadline ? (
                          <>
                            <strong>
                              {responseDeadline.isExpired
                                ? 'Đã hết thời gian phản hồi'
                                : `Còn ${responseDeadline.remainingLabel} để xác nhận yêu cầu`}
                            </strong>
                            <span>{responseDeadline.deadlineLabel}</span>
                          </>
                        ) : (
                          <span>
                            {booking.status === 'pending_tutor'
                              ? 'Phản hồi sớm để phụ huynh chủ động sắp xếp lịch học.'
                              : `Yêu cầu hiện ở trạng thái “${status.label}”.`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.actions}>
                      {booking.status !== 'pending_tutor' && (
                        <button
                          type="button"
                          className={styles.chatBtn}
                          disabled={openingChatId === booking.bookingId}
                          onClick={() => handleContactParent(booking)}
                        >
                          <MessageCircle size={16} />
                          {openingChatId === booking.bookingId ? 'Đang mở...' : 'Liên hệ phụ huynh'}
                          <ChevronRight size={16} />
                        </button>
                      )}
                      {booking.status === 'pending_tutor' && (
                        <>
                          <button
                            type="button"
                            className={styles.declineBtn}
                            disabled={isProcessing}
                            onClick={() => handleDecline(booking.bookingId)}
                          >
                            <X size={16} /> Từ chối
                          </button>
                          <button
                            type="button"
                            className={styles.acceptBtn}
                            disabled={isProcessing}
                            onClick={() => handleAccept(booking.bookingId)}
                          >
                            <Check size={16} />
                            {isAccepting ? 'Đang chấp nhận...' : 'Chấp nhận yêu cầu'}
                          </button>
                        </>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}

            {totalCount > 0 && (
              <div className={styles.pagination}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalCount}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size || 10);
                  }}
                  showSizeChanger
                  showTotal={(total) => `${total} yêu cầu`}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <Modal
        title="Từ chối yêu cầu đặt lịch"
        open={declineModalVisible}
        onOk={confirmDecline}
        onCancel={closeDeclineModal}
        okText={processingBooking?.action === 'decline' ? 'Đang xử lý...' : 'Xác nhận từ chối'}
        cancelText="Quay lại"
        okButtonProps={{ danger: true, loading: processingBooking?.action === 'decline' }}
        cancelButtonProps={{ disabled: processingBooking?.action === 'decline' }}
        className={styles.declineModal}
      >
        <div className={styles.declineContent}>
          <p>
            Lý do này sẽ giúp phụ huynh hiểu tình trạng và chủ động tìm lịch học khác.
            <span className={styles.requiredMark}> *</span>
          </p>
          <Input.TextArea
            rows={4}
            placeholder="Ví dụ: Tôi hiện không còn lịch trống vào khung giờ này..."
            value={declineReason}
            maxLength={500}
            showCount
            onChange={(event) => setDeclineReason(event.target.value)}
            status={declineReason.trim().length > 0 && declineReason.trim().length < 10 ? 'error' : undefined}
          />
          {declineReason.trim().length > 0 && declineReason.trim().length < 10 && (
            <p className={styles.validationMessage}>
              Vui lòng nhập ít nhất 10 ký tự ({declineReason.trim().length}/10).
            </p>
          )}
        </div>
      </Modal>

      <ReplyFeedbackModal
        open={replyModal.open}
        onClose={() => setReplyModal({ open: false, feedback: null })}
        onSuccess={() => {
          setReplyModal({ open: false, feedback: null });
          // Nạp lại để thẻ đổi từ nút "Phản hồi" sang nội dung đã trả lời.
          void fetchFeedbacksFor(bookings);
        }}
        feedbackId={replyModal.feedback?.feedbackId || 0}
        parentName={replyModal.feedback?.parentName}
        rating={replyModal.feedback?.rating}
        comment={replyModal.feedback?.comment}
        createdAt={replyModal.feedback?.createdAt}
      />
    </div>
  );
};

export default TutorPortalBookings;
