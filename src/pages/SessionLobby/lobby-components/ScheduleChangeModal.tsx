import { CalendarClock, Check, Clock3, ShieldCheck, X } from 'lucide-react';
import type { ScheduleChangeState } from './types';
import styles from '../styles.module.css';

interface Props {
  open: boolean;
  state: ScheduleChangeState;
  currentRole: string;
  loading: boolean;
  onRespond: (confirmed: boolean) => void;
  onClose: () => void;
}

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const ScheduleChangeModal = ({ open, state, currentRole, loading, onRespond, onClose }: Props) => {
  if (!open) return null;

  const normalizedRole = currentRole.toLowerCase();
  const isTutor = normalizedRole === 'tutor';
  const isLearnerApprover = normalizedRole === state.requiredLearnerRole?.toLowerCase();
  const currentConfirmed = isTutor ? Boolean(state.tutorConfirmedAt) : Boolean(state.learnerConfirmedAt);
  const canConfirm = state.status === 'pending' && (isTutor || isLearnerApprover) && !currentConfirmed;
  const learnerLabel = state.requiredLearnerRole === 'Parent' ? 'Phụ huynh' : 'Học sinh';
  const approved = state.status === 'approved' || state.status === 'applied';
  const rejected = state.status === 'rejected';

  return (
    <div className={styles.scheduleModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="schedule-title">
      <div className={styles.scheduleModal}>
        {approved && (
          <button type="button" className={styles.scheduleModalClose} onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        )}
        <div className={styles.scheduleModalIcon}>
          <CalendarClock size={28} />
        </div>
        <h2 id="schedule-title" className={styles.scheduleModalTitle}>Xác nhận học ngoài lịch dự kiến</h2>
        <p className={styles.scheduleModalDescription}>
          Buổi học đang được mở ngoài khung giờ đã đặt. Gia sư và {learnerLabel.toLowerCase()} phải đồng thuận trước
          khi phòng học được mở.
        </p>

        <div className={styles.scheduleSummary}>
          <div>
            <span>Lịch ban đầu</span>
            <strong>{formatDateTime(state.originalScheduledStart)} – {formatDateTime(state.originalScheduledEnd)}</strong>
          </div>
          <div>
            <span>Lịch mới</span>
            <strong>Bắt đầu khi cả gia sư và học sinh cùng vào phòng</strong>
          </div>
          <div>
            <span>Thời lượng giữ nguyên</span>
            <strong>{state.durationMinutes} phút</strong>
          </div>
        </div>

        <div className={styles.confirmationList}>
          <div className={state.tutorConfirmedAt ? styles.confirmationDone : styles.confirmationPending}>
            <span className={styles.confirmationStatusIcon}>
              {state.tutorConfirmedAt ? <Check size={16} /> : <Clock3 size={16} />}
            </span>
            <span>
              <strong>Gia sư · {state.tutorName || 'Gia sư'}</strong>
              <small>{state.tutorConfirmedAt ? `Đã xác nhận lúc ${formatDateTime(state.tutorConfirmedAt)}` : 'Chưa xác nhận'}</small>
            </span>
          </div>
          <div className={state.learnerConfirmedAt ? styles.confirmationDone : styles.confirmationPending}>
            <span className={styles.confirmationStatusIcon}>
              {state.learnerConfirmedAt ? <Check size={16} /> : <Clock3 size={16} />}
            </span>
            <span>
              <strong>{learnerLabel} · {state.requiredLearnerName || state.studentName || learnerLabel}</strong>
              <small>{state.learnerConfirmedAt ? `Đã xác nhận lúc ${formatDateTime(state.learnerConfirmedAt)}` : 'Chưa xác nhận'}</small>
            </span>
          </div>
        </div>

        <div className={styles.scheduleAuditNote}>
          <ShieldCheck size={18} />
          <span>
            Xác nhận, lịch cũ, lịch mới và thời điểm đồng thuận sẽ được lưu làm bằng chứng khi quản trị viên xử lý
            khiếu nại.
          </span>
        </div>

        {rejected ? (
          <p className={styles.scheduleRejected}>Một bên đã từ chối đổi lịch. Phòng học vẫn bị khóa và lịch ban đầu không thay đổi.</p>
        ) : approved ? (
          <div className={styles.scheduleApproved}><Check size={18} /> Đã đủ xác nhận. Phòng học sẽ mở khi gia sư và học sinh cùng có mặt.</div>
        ) : currentConfirmed ? (
          <p className={styles.scheduleWaiting}>Bạn đã xác nhận. Đang chờ phía còn lại đồng ý.</p>
        ) : !canConfirm ? (
          <p className={styles.scheduleWaiting}>
            {normalizedRole === 'student' && state.requiredLearnerRole === 'Parent'
              ? 'Bạn chưa đủ 16 tuổi. Phụ huynh và gia sư cần xác nhận trước khi bạn vào lớp.'
              : `Đang chờ ${learnerLabel.toLowerCase()} và gia sư xác nhận.`}
          </p>
        ) : null}

        <div className={styles.scheduleModalActions}>
          {canConfirm ? (
            <>
              <button type="button" className={styles.scheduleRejectButton} disabled={loading} onClick={() => onRespond(false)}>
                Từ chối
              </button>
              <button type="button" className={styles.scheduleConfirmButton} disabled={loading} onClick={() => onRespond(true)}>
                {loading ? 'Đang gửi…' : 'Đồng ý đổi lịch'}
              </button>
            </>
          ) : (
            <button type="button" className={styles.scheduleConfirmButton} onClick={onClose}>Đã hiểu</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleChangeModal;
