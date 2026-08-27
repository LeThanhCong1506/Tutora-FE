import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { getBookingById, type BookingResponseDTO } from '../../services/booking.service';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { formatVNDNumber } from '../../utils/formatters';
import { PageContainer, SectionCard, StatusBadge, type StatusVariant } from '../../components/shared';
import styles from '../../styles/pages/tutor-portal-booking-detail.module.css';

const STATUS_META: Record<string, { label: string; variant: StatusVariant }> = {
  pending_tutor: { label: 'Chờ xác nhận', variant: 'warning' },
  pending_payment: { label: 'Chờ thanh toán', variant: 'warning' },
  accepted: { label: 'Đã chấp nhận', variant: 'info' },
  deposit_paid: { label: 'Đã đặt cọc', variant: 'info' },
  pending_remaining_payment: { label: 'Chờ TT còn lại', variant: 'info' },
  paid: { label: 'Đã thanh toán', variant: 'info' },
  ongoing: { label: 'Đang học', variant: 'info' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
  cancelled_by_dispute: { label: 'Đã hủy (theo tranh chấp)', variant: 'error' },
  cancelled_noshow: { label: 'Hủy do vắng mặt', variant: 'error' },
  declined: { label: 'Đã từ chối', variant: 'error' },
  payment_timeout: { label: 'Hết hạn thanh toán', variant: 'error' },
};

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const formatMoney = (amount?: number | null) => `${formatVNDNumber(Math.max(0, amount ?? 0))} ₫`;

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa xác định';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTime = (value?: string) => (value ? value.slice(0, 5) : '');

const TutorPortalBookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const bookingId = Number(id);

    (async () => {
      if (!bookingId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getBookingById(bookingId);
        setBooking(response.content ?? null);
        setNotFound(!response.content);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <PageContainer className={styles.container} title="Chi tiết booking" maxWidth="wide">
        <div className={styles.content}>
          <div className={styles.loadingContainer}>
            <strong>Đang tải thông tin booking...</strong>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (notFound || !booking) {
    return (
      <PageContainer className={styles.container} title="Chi tiết booking" maxWidth="wide">
        <div className={styles.content}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div className={styles.emptyState}>
            <h3>Không tìm thấy booking</h3>
            <p>Booking này không tồn tại hoặc bạn không có quyền xem.</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const status = STATUS_META[booking.status] ?? { label: booking.status, variant: 'neutral' as StatusVariant };
  const uniqueSchedule = Array.from(
    new Map(
      (booking.schedule ?? []).map((slot) => [`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`, slot]),
    ).values(),
  );
  const sessions = [...(booking.lessons ?? [])].sort(
    (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
  );

  return (
    <PageContainer
      className={styles.container}
      title="Chi tiết booking"
      titleInfo="Thông tin đầy đủ về lịch học, học phí và trạng thái của booking này."
      maxWidth="wide"
    >
      <div className={styles.content}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className={styles.header}>
          <div className={styles.headerIdentity}>
            <div className={styles.avatar} aria-hidden="true">
              {booking.student?.fullName?.trim().charAt(0).toUpperCase() || <User size={20} />}
            </div>
            <div>
              <div className={styles.headerTitleRow}>
                <h2>{booking.student?.fullName || 'Học sinh chưa cập nhật tên'}</h2>
                <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
              </div>
              <p className={styles.headerMeta}>
                Booking #{booking.bookingId} · {booking.subject?.subjectName || 'Chưa rõ môn học'}
                {booking.gradeLevel?.gradeName ? ` · ${booking.gradeLevel.gradeName}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.primaryColumn}>
            {sessions.length > 0 && (
              <SectionCard title={`Danh sách buổi học (${sessions.length})`}>
                <div className={styles.sectionBody}>
                  <div className={styles.sessionList}>
                    {sessions.map((session) => {
                      const meta = getClassSessionStatusMeta(session.status);
                      return (
                        <div key={session.lessonId} className={styles.sessionRow}>
                          <span className={styles.sessionIndex}>#{session.sessionIndex}</span>
                          <span className={styles.sessionDate}>{formatDateTime(session.scheduledStart)}</span>
                          <StatusBadge variant={meta.variant} shape="tag">
                            {meta.label}
                          </StatusBadge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Học phí">
              <div className={styles.sectionBody}>
                <div className={styles.feeRow}>
                  <span>Học phí gốc</span>
                  <span>{formatMoney(booking.baseAmount ?? booking.totalAmount)}</span>
                </div>
                {(booking.discountApplied ?? 0) > 0 && (
                  <div className={styles.feeRow}>
                    <span>Giảm giá</span>
                    <span>-{formatMoney(booking.discountApplied)}</span>
                  </div>
                )}
                <div className={styles.feeRow}>
                  <span>Phí dịch vụ gia sư</span>
                  <span>-{formatMoney(booking.tutorServiceFee)}</span>
                </div>
                <div className={`${styles.feeRow} ${styles.feeRowTotal}`}>
                  <span>Gia sư nhận được</span>
                  <span>{formatMoney(booking.tutorReceivable)}</span>
                </div>
                {booking.depositAmount != null && (
                  <div className={styles.feeRow}>
                    <span>Đã đặt cọc {booking.depositPaidAt ? `(${formatDateTime(booking.depositPaidAt)})` : ''}</span>
                    <span>{formatMoney(booking.depositAmount)}</span>
                  </div>
                )}
                {booking.remainingAmount != null && (
                  <div className={styles.feeRow}>
                    <span>
                      Phần còn lại {booking.remainingPaidAt ? `(đã TT ${formatDateTime(booking.remainingPaidAt)})` : ''}
                    </span>
                    <span>{formatMoney(booking.remainingAmount)}</span>
                  </div>
                )}
              </div>
            </SectionCard>

            {booking.cancellationReason && (
              <SectionCard title="Thông tin hủy">
                <div className={styles.sectionBody}>
                  <div className={styles.infoList}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoRowLabel}>Lý do</span>
                      <span className={styles.infoRowValue}>{booking.cancellationReason}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoRowLabel}>Hủy bởi</span>
                      <span className={styles.infoRowValue}>{booking.cancelledBy || '—'}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoRowLabel}>Thời điểm hủy</span>
                      <span className={styles.infoRowValue}>{formatDateTime(booking.cancelledAt)}</span>
                    </div>
                    {booking.refundAmount != null && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoRowLabel}>Số tiền hoàn</span>
                        <span className={styles.infoRowValue}>{formatMoney(booking.refundAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          <aside className={styles.sidebar}>
            <SectionCard title="Thông tin chung">
              <div className={styles.sectionBody}>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Mã booking</span>
                    <span className={styles.infoRowValue}>#{booking.bookingId}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Ngày tạo</span>
                    <span className={styles.infoRowValue}>{formatDateTime(booking.createdAt)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Số buổi học</span>
                    <span className={styles.infoRowValue}>{booking.sessionCount || booking.totalSessions || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Thời lượng / buổi</span>
                    <span className={styles.infoRowValue}>
                      {booking.durationMinutesPerSession ? `${booking.durationMinutesPerSession} phút` : '—'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Trạng thái thanh toán</span>
                    <span className={styles.infoRowValue}>{booking.paymentStatus || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Trạng thái escrow</span>
                    <span className={styles.infoRowValue}>{booking.escrowStatus || '—'}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {uniqueSchedule.length > 0 && (
              <SectionCard title="Lịch học cố định">
                <div className={styles.sectionBody}>
                  <div className={styles.scheduleList}>
                    {uniqueSchedule.map((slot, idx) => (
                      <div key={idx} className={styles.scheduleRow}>
                        <span>{DAY_NAMES[slot.dayOfWeek] ?? `Thứ ${slot.dayOfWeek}`}</span>
                        <span>
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}
          </aside>
        </div>
      </div>
    </PageContainer>
  );
};

export default TutorPortalBookingDetail;
