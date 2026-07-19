import styles from './styles.module.css';
import type { BookingResponseDTO } from '../../services/booking.service';
import { CalendarClock, CircleDot, MonitorSmartphone } from 'lucide-react';

interface SessionContextCardProps {
  booking: BookingResponseDTO;
  isTutor?: boolean;
}

const formatStatus = (status: string) => {
  const statusLabels: Record<string, string> = {
    pending_tutor: 'Chờ gia sư xác nhận',
    accepted: 'Đã chấp nhận',
    confirmed: 'Đã xác nhận',
    declined: 'Đã từ chối',
    cancelled: 'Đã hủy',
    completed: 'Đã hoàn thành',
  };

  return statusLabels[status] ?? status;
};

const formatTeachingMode = (mode?: string | number | null) => {
  const modeLabels: Record<string, string> = {
    online: 'Học trực tuyến',
    offline: 'Học trực tiếp',
    hybrid: 'Linh hoạt',
    flexible: 'Lịch linh hoạt',
    fixed: 'Lịch cố định',
    '1': 'Lịch linh hoạt',
    '2': 'Lịch cố định',
  };

  if (!mode) return 'Chưa cập nhật hình thức';
  const normalizedMode = String(mode);
  return modeLabels[normalizedMode.toLowerCase()] ?? normalizedMode;
};

const SessionContextCard = ({ booking, isTutor = false }: SessionContextCardProps) => {
  const safeDateString =
    booking.createdAt.includes('Z') || booking.createdAt.includes('+') ? booking.createdAt : `${booking.createdAt}Z`;
  const formattedDate = new Date(safeDateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={styles.sessionContextCard}>
      <span className={styles.sessionContextCaption}>
        Yêu cầu #{booking.bookingId} · {formattedDate}
      </span>
      <span className={styles.sessionContextTitle}>
        {booking.subject?.subjectName || 'Môn học chưa cập nhật'} · {booking.student?.fullName || 'Học sinh'}
      </span>
      <div className={styles.sessionContextMeta}>
        <span className={styles.sessionContextItem}>
          <CalendarClock size={15} aria-hidden="true" />
          {booking.sessionCount} buổi học
        </span>
        <span className={styles.sessionContextItem}>
          <CircleDot size={15} aria-hidden="true" />
          {formatStatus(booking.status)}
        </span>
        <span className={styles.sessionContextItem}>
          <MonitorSmartphone size={15} aria-hidden="true" />
          {formatTeachingMode(booking.teachingMode || booking.packageType)}
        </span>
      </div>
      {booking.status === 'pending_tutor' && (
        <div className={styles.bookingActionPrompt}>
          <p>{isTutor ? 'Yêu cầu đang chờ bạn xem xét và phản hồi.' : 'Yêu cầu đang chờ gia sư xác nhận.'}</p>
        </div>
      )}
    </div>
  );
};

export default SessionContextCard;
