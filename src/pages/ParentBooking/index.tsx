import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Plus,
  Search,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { PageContainer } from '../../components/shared';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { getParentBookings, isFirstLessonFinished, type BookingResponseDTO } from '../../services/booking.service';
import { getBookingResponseDeadlineState } from '../../utils/bookingDeadline';
import { formatVNDNumber } from '../../utils/formatters';
import styles from './styles.module.css';
import { getApiErrorMessage } from '../../utils/apiError';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_tutor', label: 'Chờ gia sư' },
  // 'accepted' không còn được BE gán ở luồng hiện tại (booking đi thẳng
  // pending_payment → pending_tutor → deposit_paid) — giữ trong filter chỉ để
  // không bỏ sót các booking cũ còn mang status này.
  { key: 'pending_payment,accepted', label: 'Chờ đặt cọc' },
  { key: 'deposit_paid', label: 'Đã đặt cọc' },
  { key: 'pending_remaining_payment', label: 'Thanh toán còn lại' },
  { key: 'ongoing', label: 'Đang học' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled,cancelled_noshow,payment_timeout', label: 'Đã hủy' },
];

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending_tutor: { label: 'Chờ gia sư xác nhận', tone: 'pending' },
  accepted: { label: 'Chờ đặt cọc', tone: 'warning' },
  pending_payment: { label: 'Chờ thanh toán', tone: 'warning' },
  deposit_paid: { label: 'Đã thanh toán buổi đầu', tone: 'paid' },
  pending_remaining_payment: { label: 'Thanh toán còn lại', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'paid' },
  ongoing: { label: 'Đang học', tone: 'active' },
  completed: { label: 'Hoàn thành', tone: 'completed' },
  cancelled: { label: 'Đã hủy', tone: 'cancelled' },
  cancelled_noshow: { label: 'Hủy do vắng mặt', tone: 'cancelled' },
  payment_timeout: { label: 'Hết hạn thanh toán', tone: 'cancelled' },
};

const EMPTY_STATE_COPY: Record<string, { title: string; description: string }> = {
  all: {
    title: 'Chưa có lịch học nào',
    description: 'Tìm một gia sư phù hợp và bắt đầu lên lịch học cho con bạn.',
  },
  pending_tutor: {
    title: 'Không có yêu cầu đang chờ',
    description: 'Các yêu cầu đang chờ gia sư xác nhận sẽ xuất hiện tại đây.',
  },
  'pending_payment,accepted': {
    title: 'Không có lịch chờ đặt cọc',
    description: 'Lịch vừa tạo, đang chờ bạn thanh toán buổi học đầu tiên sẽ xuất hiện tại đây.',
  },
  deposit_paid: {
    title: 'Chưa có lịch đã đặt cọc',
    description: 'Các lịch đã hoàn tất khoản đặt cọc sẽ xuất hiện tại đây.',
  },
  pending_remaining_payment: {
    title: 'Không có khoản cần thanh toán',
    description: 'Hiện không có booking nào cần hoàn tất phần thanh toán còn lại.',
  },
  ongoing: {
    title: 'Chưa có lớp đang học',
    description: 'Các booking đang diễn ra sẽ xuất hiện tại đây.',
  },
  completed: {
    title: 'Chưa có lớp hoàn thành',
    description: 'Những lớp đã hoàn thành sẽ được lưu tại đây.',
  },
  'cancelled,cancelled_noshow,payment_timeout': {
    title: 'Chưa có lịch đã hủy',
    description: 'Các booking bị hủy, hết hạn hoặc vắng mặt sẽ được lưu tại đây.',
  },
};

const formatPrice = (amount: number) => `${formatVNDNumber(Math.max(0, amount))} ₫`;

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatGrade = (grade?: string) => {
  if (!grade) return 'Chưa cập nhật lớp';
  return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
};

const getRelevantLesson = (booking: BookingResponseDTO) => {
  const lessons = [...(booking.lessons ?? [])].sort(
    (first, second) => new Date(first.scheduledStart).getTime() - new Date(second.scheduledStart).getTime(),
  );
  const now = Date.now();

  return (
    lessons.find(
      (lesson) =>
        new Date(lesson.scheduledEnd).getTime() >= now &&
        !['completed', 'cancelled', 'cancelled_noshow'].includes(lesson.status ?? ''),
    ) ?? lessons.at(-1)
  );
};

const formatLessonTime = (start?: string, end?: string) => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${startDate.toLocaleTimeString('vi-VN', options)} - ${endDate.toLocaleTimeString('vi-VN', options)}`;
};

const getPaymentAction = (booking: BookingResponseDTO) => {
  if (booking.status === 'accepted' || booking.status === 'pending_payment') {
    // Cọc = buổi học đầu tiên = finalPrice / số buổi (BE làm tròn về số nguyên đồng).
    const sessions = booking.totalSessions || booking.sessionCount || 1;
    return {
      label: 'Thanh toán buổi đầu',
      summaryLabel: 'Buổi học đầu tiên',
      amount: booking.depositAmount ?? Math.round(booking.finalPrice / sessions),
      locked: false,
    };
  }

  if (booking.status === 'deposit_paid' || booking.status === 'pending_remaining_payment') {
    const amount = booking.remainingAmount ?? Math.max(0, booking.finalPrice - (booking.depositAmount ?? 0));
    // Chỉ cho thanh toán đợt 2 khi buổi học đầu tiên đã kết thúc.
    if (!isFirstLessonFinished(booking)) {
      return {
        label: 'Chờ buổi học đầu tiên',
        summaryLabel: 'Còn lại cần trả',
        amount,
        locked: true,
      };
    }
    return {
      label: 'Thanh toán còn lại',
      summaryLabel: 'Còn lại cần trả',
      amount,
      locked: false,
    };
  }

  return null;
};

const ParentBooking = () => {
  const navigate = useNavigate();
  const currentTime = useCurrentTime();
  // Tab + trang sống trong URL (không phải useState cục bộ) — để "Xem chi tiết" rồi bấm back
  // (hoặc quay lại từ trang khác) trả về đúng tab/trang đang xem, thay vì luôn reset về "Tất cả".
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('status') || 'all';
  const currentPage = Number(searchParams.get('page')) || 1;
  const [bookings, setBookings] = useState<BookingResponseDTO[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 5;

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getParentBookings({
        status: activeTab === 'all' ? undefined : activeTab,
        page: currentPage,
        pageSize,
      });
      setBookings(response.content.items || []);
      setTotalItems(response.content.totalCount || 0);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải danh sách đặt lịch.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const emptyCopy = EMPTY_STATE_COPY[activeTab] ?? EMPTY_STATE_COPY.all;

  const handleTabChange = (tabKey: string) => {
    const next = new URLSearchParams(searchParams);
    if (tabKey === 'all') next.delete('status');
    else next.set('status', tabKey);
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <PageContainer
      className={styles.page}
      title="Đặt lịch"
      titleInfo="Quản lý lịch học, thanh toán và tiến độ các booking của bạn."
      maxWidth="wide"
      headerAction={
        <div className={styles.headerActions}>
          <button className={styles.newBookingBtn} type="button" onClick={() => navigate('/tutor-search')}>
            <Plus size={17} />
            Đặt gia sư mới
          </button>
        </div>
      }
    >

      <main className={styles.content}>
        <div className={styles.tabBar} role="tablist" aria-label="Lọc booking theo trạng thái" data-tour="booking-tabs">
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
              {activeTab === tab.key && !loading && <span className={styles.tabCount}>{totalItems}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} aria-hidden="true" />
            <div>
              <strong>Đang tải lịch học</strong>
              <p>Thông tin booking mới nhất sẽ hiển thị trong giây lát.</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Search size={28} />
            </div>
            <h2>{emptyCopy.title}</h2>
            <p>{emptyCopy.description}</p>
            {activeTab === 'all' && (
              <button type="button" onClick={() => navigate('/tutor-search')}>
                <Plus size={17} /> Đặt gia sư ngay
              </button>
            )}
          </div>
        ) : (
          <div className={styles.bookingList}>
            {bookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status] ?? {
                label: booking.status,
                tone: 'pending',
              };
              const paymentAction = getPaymentAction(booking);
              const relevantLesson = getRelevantLesson(booking);
              const lessonDate = formatDate(relevantLesson?.scheduledStart ?? booking.startDate);
              const lessonTime = formatLessonTime(relevantLesson?.scheduledStart, relevantLesson?.scheduledEnd);
              const grade =
                booking.gradeLevel?.gradeName ?? booking.student?.gradeLevelName ?? booking.student?.gradeLevel;
              const duration = booking.durationMinutesPerSession
                ? ` · ${booking.durationMinutesPerSession} phút/buổi`
                : '';
              const responseDeadline =
                booking.status === 'pending_tutor'
                  ? getBookingResponseDeadlineState(booking.responseDeadline, currentTime)
                  : null;
              const responseDeadlineTone =
                responseDeadline?.urgency === 'critical'
                  ? styles.responseDeadline_critical
                  : responseDeadline?.urgency === 'warning'
                    ? styles.responseDeadline_warning
                    : '';

              return (
                <article key={booking.bookingId} className={styles.bookingCard} data-tour="booking-card">
                  <div className={styles.cardTop}>
                    <div className={styles.peopleInfo}>
                      <div className={styles.tutorInfo}>
                        <div className={styles.tutorAvatar} aria-hidden="true">
                          {booking.tutor?.avatarUrl ? (
                            <img src={booking.tutor.avatarUrl} alt="" />
                          ) : (
                            <span>{booking.tutor?.fullName?.trim().charAt(0).toUpperCase() || 'G'}</span>
                          )}
                        </div>
                        <div className={styles.personIdentity}>
                          <span className={styles.tutorLabel}>Gia sư phụ trách</span>
                          <h2>{booking.tutor?.fullName || 'Gia sư chưa cập nhật tên'}</h2>
                        </div>
                      </div>

                      <div className={styles.studentInfo}>
                        <div className={styles.studentAvatar} aria-hidden="true">
                          {booking.student?.fullName?.trim().charAt(0).toUpperCase() || <UserRound size={18} />}
                        </div>
                        <div className={styles.personIdentity}>
                          <span className={styles.studentLabel}>Học sinh</span>
                          <h2>{booking.student?.fullName || 'Chưa cập nhật học sinh'}</h2>
                          <p>{formatGrade(grade)}</p>
                        </div>
                      </div>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>{status.label}</span>
                  </div>

                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryIcon}>
                        <BookOpen size={17} />
                      </span>
                      <div>
                        <span>Môn học</span>
                        <strong>{booking.subject?.subjectName || 'Chưa cập nhật'}</strong>
                      </div>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryIcon}>
                        <Clock3 size={17} />
                      </span>
                      <div>
                        <span>Lộ trình</span>
                        <strong>
                          {booking.sessionCount} buổi{duration}
                        </strong>
                      </div>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryIcon}>
                        <CalendarDays size={17} />
                      </span>
                      <div>
                        <span>{relevantLesson ? 'Buổi học gần nhất' : 'Ngày bắt đầu'}</span>
                        <strong>{lessonDate || 'Chưa xác định'}</strong>
                        {lessonTime && <small>{lessonTime}</small>}
                      </div>
                    </div>
                    <div className={`${styles.summaryItem} ${paymentAction ? styles.summaryItemDue : ''}`}>
                      <span className={styles.summaryIcon}>
                        <WalletCards size={17} />
                      </span>
                      <div>
                        <span>{paymentAction?.summaryLabel ?? 'Tổng học phí'}</span>
                        <strong>{formatPrice(paymentAction?.amount ?? booking.finalPrice)}</strong>
                      </div>
                    </div>
                  </div>

                  {booking.status === 'pending_tutor' && (
                    <div className={`${styles.responseDeadline} ${responseDeadlineTone}`}>
                      <Clock3 size={17} aria-hidden="true" />
                      <div>
                        <strong>
                          {responseDeadline
                            ? responseDeadline.isExpired
                              ? 'Gia sư đã hết thời gian phản hồi'
                              : `Gia sư còn ${responseDeadline.remainingLabel} để phản hồi`
                            : 'Đang chờ gia sư phản hồi'}
                        </strong>
                        <span>
                          {responseDeadline
                            ? responseDeadline.deadlineLabel
                            : 'Yêu cầu đã được gửi và đang chờ gia sư xác nhận.'}
                        </span>
                      </div>
                    </div>
                  )}

                  <footer className={styles.cardFooter}>
                    <span className={styles.bookingMeta}>
                      BK-{booking.bookingId}
                      <span aria-hidden="true">•</span>
                      Tạo ngày {formatDate(booking.createdAt) || 'Chưa cập nhật'}
                    </span>
                    <div className={styles.cardActions}>
                      {paymentAction &&
                        (paymentAction.locked ? (
                          <button
                            type="button"
                            className={styles.paymentBtn}
                            disabled
                            style={{ opacity: 0.55, cursor: 'not-allowed' }}
                            title="Có thể thanh toán các buổi còn lại sau khi buổi học đầu tiên kết thúc."
                          >
                            <Clock3 size={16} /> {paymentAction.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.paymentBtn}
                            onClick={() => navigate(`/parent-portal/booking/${booking.bookingId}/payment`)}
                          >
                            {paymentAction.label} <ChevronRight size={16} />
                          </button>
                        ))}
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => navigate(`/parent-portal/booking/${booking.bookingId}`)}
                      >
                        <Eye size={16} /> Xem chi tiết
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </PageContainer>
  );
};

export default ParentBooking;
