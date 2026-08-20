import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Copy, KeyRound, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import styles from '../styles.module.css';
import { buildStudentMeta, formatSessionSlot, getInitials } from './utils';
import type { StudentWithInsight } from './types';

export interface StudentCardProps extends StudentWithInsight {
  /** Ẩn khối số liệu khi chưa tải xong / tải lỗi — thà không hiện còn hơn hiện số 0 sai. */
  insightsReady: boolean;
  /** Thứ tự trong lưới — chỉ dùng để lệch nhẹ hiệu ứng xuất hiện. */
  index: number;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onViewSchedule: () => void;
  onReviewPending: () => void;
  onBookTutor: () => void;
}

/**
 * Card một học sinh.
 *
 * Nguyên tắc bố cục: chỉ 3 vùng (danh tính → buổi tiếp theo → hành động), ngăn bằng đường kẻ
 * mảnh chứ không lồng hộp nền. Mọi thứ phụ huynh không cần khi liếc qua danh sách — mục tiêu
 * học tập, danh sách gia sư đầy đủ, thao tác sửa/xoá — nằm trong menu ⋯ hoặc trang lịch học.
 */
const StudentCard = ({
  student,
  insight,
  insightsReady,
  index,
  onEdit,
  onResetPassword,
  onDelete,
  onViewSchedule,
  onReviewPending,
  onBookTutor,
}: StudentCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const copyUsername = async () => {
    if (!student.username) return;
    try {
      await navigator.clipboard.writeText(student.username);
    } catch {
      // Clipboard API cần HTTPS — fallback cho môi trường dev chạy http.
      const field = document.createElement('textarea');
      field.value = student.username;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      document.body.removeChild(field);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const meta = buildStudentMeta(student);
  const showAvatar = Boolean(student.avatarURL) && !avatarFailed;

  // Hai con số trung thực, mỗi số một nguồn rõ ràng. Cố ý bỏ "tổng buổi đã đặt" làm mẫu số:
  // buổi đã trôi qua mà gia sư chưa chốt báo cáo khiến tỉ lệ % trông như con đang học chậm.
  const summary = [
    insight.completed > 0 ? `${insight.completed} buổi đã học` : null,
    insight.upcoming > 0 ? `${insight.upcoming} buổi sắp tới` : null,
  ].filter(Boolean);

  return (
    <article
      className={styles.card}
      style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
      data-tour="parent-student-card"
    >
      <header className={styles.cardHead}>
        <div className={styles.avatar} aria-hidden="true">
          {showAvatar ? (
            <img src={student.avatarURL} alt="" onError={() => setAvatarFailed(true)} />
          ) : (
            getInitials(student.fullName)
          )}
        </div>

        <div className={styles.identity}>
          {/* Tên và trường dài bị cắt bằng ellipsis — giữ `title` để hover vẫn đọc được đủ. */}
          <h2 className={styles.studentName} title={student.fullName}>
            {student.fullName}
          </h2>
          {meta && (
            <p className={styles.studentMeta} title={meta}>
              {meta}
            </p>
          )}
        </div>

        <div className={styles.menuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={`Tuỳ chọn cho ${student.fullName}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Pencil size={14} /> Chỉnh sửa hồ sơ
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onResetPassword();
                }}
              >
                <KeyRound size={14} /> Đặt lại mật khẩu
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItemDanger}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={14} /> Xoá hồ sơ
              </button>
            </div>
          )}
        </div>
      </header>

      {insightsReady && insight.pending > 0 && (
        <button type="button" className={styles.pendingAlert} onClick={onReviewPending}>
          <span>{insight.pending} buổi chờ bạn xác nhận</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      )}

      {/* Không lấy được buổi học thì bỏ hẳn vùng này — để lại khung rỗng sẽ bị đọc nhầm
          thành "con chưa có buổi học nào". */}
      {insightsReady && (
        <div className={styles.schedule}>
          <span className={styles.blockLabel}>Buổi học tiếp theo</span>
          {insight.next ? (
            <>
              <strong className={styles.nextTime}>
                {formatSessionSlot(insight.next.scheduledStart, insight.next.scheduledEnd)}
              </strong>
              <span className={styles.nextDetail}>
                {[insight.next.subjectName, insight.next.tutorName].filter(Boolean).join(' · ') || 'Buổi học'}
              </span>
            </>
          ) : (
            <>
              <strong className={`${styles.nextTime} ${styles.nextTimeMuted}`}>Chưa có lịch</strong>
              <button type="button" className={styles.linkBtn} onClick={onBookTutor}>
                Tìm gia sư cho con <ArrowRight size={13} aria-hidden="true" />
              </button>
            </>
          )}
          {summary.length > 0 && <span className={styles.summary}>{summary.join(' · ')}</span>}
        </div>
      )}

      <footer className={styles.cardFoot}>
        {student.username && (
          <button
            type="button"
            className={styles.account}
            onClick={copyUsername}
            title="Sao chép tên đăng nhập của con"
          >
            <span className={styles.accountName}>@{student.username}</span>
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          </button>
        )}
        <button type="button" className={styles.primaryBtn} onClick={onViewSchedule}>
          Xem lịch học
        </button>
      </footer>
    </article>
  );
};

export default StudentCard;
