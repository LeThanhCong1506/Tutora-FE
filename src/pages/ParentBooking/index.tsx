import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Check, ChevronLeft, ChevronRight, Clock, Eye, Plus, Search, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import BookingMonthCalendar from '../../components/BookingMonthCalendar/BookingMonthCalendar';
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
  deposit_paid: { label: 'Đã đặt cọc 50%', tone: 'paid' },
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

const formatTime = (value?: string) => (value ? value.slice(0, 5) : '');

const formatDayName = (dayOfWeek: number) => {
  if (dayOfWeek === 0 || dayOfWeek === 7) return 'Chủ nhật';
  return `Thứ ${dayOfWeek + 1}`;
};

const formatGrade = (grade?: string) => {
  if (!grade) return 'Chưa cập nhật lớp';
  return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
};

const getUniqueSchedule = (booking: BookingResponseDTO) => {
  const uniqueSlots = new Map<string, BookingResponseDTO['schedule'][number]>();

  (booking.schedule ?? []).forEach((slot) => {
    const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`;
    if (!uniqueSlots.has(key)) uniqueSlots.set(key, slot);
  });

  return Array.from(uniqueSlots.values());
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

const getPaymentAction = (booking: BookingResponseDTO) => {
  if (booking.status === 'accepted' || booking.status === 'pending_payment') {
    return {
      label: 'Thanh toán đặt cọc',
      summaryLabel: 'Cần đặt cọc',
      amount: booking.depositAmount ?? Math.ceil(booking.finalPrice * 0.5),
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

const getStatusHint = (status: string) => {
  const hints: Record<string, string> = {
    pending_tutor: 'Yêu cầu đang chờ gia sư xem lịch và xác nhận.',
    accepted: 'Gia sư đã xác nhận. Hoàn tất đặt cọc để giữ lịch học.',
    pending_payment: 'Hoàn tất thanh toán để giữ lịch học đã chọn.',
    deposit_paid: 'Bạn đã đặt cọc. Hãy hoàn tất khoản còn lại đúng hạn.',
    pending_remaining_payment: 'Vui lòng hoàn tất khoản thanh toán còn lại.',
    paid: 'Booking đã được thanh toán đầy đủ.',
    ongoing: 'Lớp học đang diễn ra theo lịch đã thống nhất.',
    completed: 'Lớp học đã hoàn thành.',
    cancelled: 'Booking này đã được hủy.',
    payment_timeout: 'Booking đã hết hạn thanh toán.',
  };
  return hints[status] ?? 'Theo dõi chi tiết booking để cập nhật trạng thái mới nhất.';
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
              const schedule = getUniqueSchedule(booking);
              const bookingPeriod = getBookingPeriod(booking);
              const paymentAction = getPaymentAction(booking);
              const requestDate = formatDate(booking.createdAt);

              return (
                <article key={booking.bookingId} className={styles.bookingCard}>
                  <header className={styles.cardHeader}>
                    <div className={styles.tutorInfo}>
                      <div className={styles.tutorAvatar} aria-hidden="true">
                        {booking.tutor?.avatarUrl ? (
                          <img src={booking.tutor.avatarUrl} alt="" />
                        ) : (
                          <span>{booking.tutor?.fullName?.trim().charAt(0).toUpperCase() || 'G'}</span>
                        )}
                      </div>
                      <div className={styles.tutorIdentity}>
                        <div className={styles.tutorNameRow}>
                          <h2>{booking.tutor?.fullName || 'Gia sư chưa cập nhật tên'}</h2>
                          <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
                            {status.label}
                          </span>
                        </div>
                        <p>
                          Học sinh: {booking.student?.fullName || 'Chưa cập nhật'}
                          <span aria-hidden="true">•</span>
                          {formatGrade(booking.student?.gradeLevel)}
                          {requestDate && (
                            <>
                              <span aria-hidden="true">•</span>
                              Đặt ngày {requestDate}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </header>

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
                          <Calendar size={17} />
                          <h3>Lịch học dự kiến</h3>
                        </div>
                        <div className={styles.scheduleBody}>
                          <div className={styles.scheduleSummary}>
                            <div className={styles.bookingPeriod}>
                              <div>
                                <span>Bắt đầu</span>
                                <strong>{formatDate(bookingPeriod.startDate) || 'Chưa xác định'}</strong>
                              </div>
                              <span className={styles.periodDivider} aria-hidden="true">
                                →
                              </span>
                              <div>
                                <span>Kết thúc</span>
                                <strong>{formatDate(bookingPeriod.endDate) || 'Chưa xác định'}</strong>
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
                              <p className={styles.noSchedule}>Chưa có khung giờ học.</p>
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

                    <aside className={styles.paymentCard} aria-label="Thông tin học phí">
                      <div className={styles.paymentTitle}>
                        <span>
                          <Wallet size={18} />
                        </span>
                        <div>
                          <p>Tổng học phí</p>
                          <strong>{formatPrice(booking.finalPrice)}</strong>
                        </div>
                      </div>
                      <div className={styles.priceBreakdown}>
                        <div>
                          <span>Giá gốc</span>
                          <strong>{formatPrice(booking.price)}</strong>
                        </div>
                        {booking.discountApplied > 0 && (
                          <div>
                            <span>Ưu đãi</span>
                            <strong className={styles.discountValue}>− {formatPrice(booking.discountApplied)}</strong>
                          </div>
                        )}
                        {paymentAction && (
                          <div className={styles.paymentDue}>
                            <span>{paymentAction.summaryLabel}</span>
                            <strong>{formatPrice(paymentAction.amount)}</strong>
                          </div>
                        )}
                      </div>
                      <p className={styles.paymentNote}>Khoản thanh toán được bảo vệ theo chính sách của Tutora.</p>
                    </aside>
                  </div>

                  <footer className={styles.cardFooter}>
                    <div className={styles.statusHint}>
                      {booking.status === 'completed' || booking.status === 'paid' ? (
                        <Check size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                      <span>{getStatusHint(booking.status)}</span>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.viewBtn}
                        onClick={() => navigate(`/parent-portal/booking/${booking.bookingId}`)}
                      >
                        <Eye size={16} /> Chi tiết
                      </button>
                      {paymentAction && (
                        <button
                          type="button"
                          className={styles.paymentBtn}
                          onClick={() => navigate(`/parent-portal/booking/${booking.bookingId}/payment`)}
                        >
                          {paymentAction.label} <ChevronRight size={16} />
                        </button>
                      )}
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
