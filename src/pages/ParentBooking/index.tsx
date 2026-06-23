import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getParentBookings, type BookingResponseDTO } from '../../services/booking.service';
import styles from './styles.module.css';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_tutor', label: 'Chờ gia sư' },
  { key: 'accepted', label: 'Chờ đặt cọc' },
  { key: 'deposit_paid', label: 'Đã đặt cọc' },
  { key: 'pending_remaining_payment', label: 'Thanh toán còn lại' },
  { key: 'ongoing', label: 'Đang học' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
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
  cancelled_noshow: { label: 'Đã hủy', tone: 'cancelled' },
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
  accepted: {
    title: 'Không có lịch chờ đặt cọc',
    description: 'Lịch được gia sư chấp nhận và chờ đặt cọc sẽ xuất hiện tại đây.',
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
  cancelled: {
    title: 'Chưa có lịch đã hủy',
    description: 'Các booking bị hủy hoặc hết hạn sẽ được lưu tại đây.',
  },
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));

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
    };
  }

  if (booking.status === 'deposit_paid' || booking.status === 'pending_remaining_payment') {
    return {
      label: 'Thanh toán còn lại',
      summaryLabel: 'Còn lại cần trả',
      amount: booking.remainingAmount ?? Math.max(0, booking.finalPrice - (booking.depositAmount ?? 0)),
    };
  }

  return null;
};

const ParentBooking = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
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
    } catch {
      toast.error('Không thể tải danh sách đặt lịch.');
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
    setCurrentPage(1);
    setActiveTab(tabKey);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Đặt lịch</h1>
          <p>Quản lý lịch học, thanh toán và tiến độ các booking của bạn.</p>
        </div>
        <button className={styles.newBookingBtn} type="button" onClick={() => navigate('/tutor-search')}>
          <Plus size={17} />
          Đặt gia sư mới
        </button>
      </header>

      <main className={styles.content}>
        <div className={styles.tabBar} role="tablist" aria-label="Lọc booking theo trạng thái">
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

              return (
                <article key={booking.bookingId} className={styles.bookingCard}>
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

                  <footer className={styles.cardFooter}>
                    <span className={styles.bookingMeta}>
                      BK-{booking.bookingId}
                      <span aria-hidden="true">•</span>
                      Tạo ngày {formatDate(booking.createdAt) || 'Chưa cập nhật'}
                    </span>
                    <div className={styles.cardActions}>
                      {paymentAction && (
                        <button
                          type="button"
                          className={styles.paymentBtn}
                          onClick={() => navigate(`/parent-portal/booking/${booking.bookingId}/payment`)}
                        >
                          {paymentAction.label} <ChevronRight size={16} />
                        </button>
                      )}
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
                  onClick={() => setCurrentPage((page) => page - 1)}
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
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ParentBooking;
