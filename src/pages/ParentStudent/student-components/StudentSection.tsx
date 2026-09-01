import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, KeyRound, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import styles from '../styles.module.css';
import BookingCard from './BookingCard';
import StudentOverview from './StudentOverview';
import { buildStudentMeta, getInitials, summarizeStudentBookings } from './utils';
import type { BookingProgress, StudentWithBookings } from './types';

export interface StudentSectionProps extends StudentWithBookings {
  /** Ẩn khối khoá học khi số liệu buổi học chưa về / tải lỗi — thà không hiện còn hơn hiện số sai. */
  insightsReady: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  /** `null` = xem lịch của cả con (chế độ tổng quát, không có buổi đã mở nào để neo ngày). */
  onViewSchedule: (booking: BookingProgress | null) => void;
  /** Nhận id buổi chờ xác nhận để mở trang chi tiết buổi đó. */
  onReviewPending: (classSessionId: number) => void;
  onBookTutor: () => void;
}

/**
 * Một con = một khối: hàng danh tính (avatar, tên, lớp/trường, tài khoản đăng nhập, menu ⋯) rồi
 * tới lưới thẻ khoá học của con đó.
 *
 * Vì sao danh tính tách khỏi thẻ: các hành động ở đây đều là cấp CON (sửa hồ sơ, đặt lại mật khẩu,
 * xoá hồ sơ, sao chép tên đăng nhập). Nhân bản chúng lên từng thẻ khoá học sẽ cho ra 10 nút
 * "Xoá hồ sơ" cho một đứa trẻ có 10 khoá — vừa rối vừa dễ bấm nhầm.
 *
 * Con CHƯA có khoá nào vẫn hiện khối này kèm một dòng rỗng: đây là trang quản lý hồ sơ, hồ sơ nào
 * cũng phải thấy được để sửa/xoá, kể cả khi chưa từng đặt lịch.
 */
const StudentSection = ({
  student,
  bookings,
  insightsReady,
  onEdit,
  onResetPassword,
  onDelete,
  onViewSchedule,
  onReviewPending,
  onBookTutor,
}: StudentSectionProps) => {
  // Mặc định TỔNG QUÁT: đa số lượt vào trang chỉ để xem nhanh, không phải để rà từng khoá.
  // State cục bộ theo từng khối con — mỗi con mở/gập độc lập, và không cần nhớ qua lần tải sau.
  const [view, setView] = useState<'overview' | 'detail'>('overview');
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
  const summary = summarizeStudentBookings(bookings);
  const pendingTotal = summary.pending;

  const courseSummary = !insightsReady
    ? null
    : bookings.length === 0
      ? 'Chưa có khoá học'
      : pendingTotal > 0
        ? `${bookings.length} khoá học · ${pendingTotal} buổi chờ bạn xác nhận`
        : `${bookings.length} khoá học`;

  return (
    <section className={styles.studentSection} data-tour="parent-student-card">
      <header className={styles.studentHead}>
        <span className={styles.studentAvatar}>
          {showAvatar ? (
            <img src={student.avatarURL} alt="" onError={() => setAvatarFailed(true)} />
          ) : (
            getInitials(student.fullName)
          )}
        </span>

        <div className={styles.studentIdentity}>
          <h2 title={student.fullName}>{student.fullName}</h2>
          <p title={meta}>{[meta, courseSummary].filter(Boolean).join(' · ') || 'Chưa có thông tin lớp'}</p>
        </div>

        {/* Nút chuyển chế độ chỉ có nghĩa khi con thật sự có khoá học và số liệu đã về. */}
        {insightsReady && bookings.length > 0 && (
          <div className={styles.viewToggle} role="group" aria-label={`Chế độ xem tiến trình của ${student.fullName}`}>
            <button
              type="button"
              aria-pressed={view === 'overview'}
              onClick={() => setView('overview')}
              className={view === 'overview' ? styles.viewToggleActive : undefined}
            >
              Tổng quát
            </button>
            <button
              type="button"
              aria-pressed={view === 'detail'}
              onClick={() => setView('detail')}
              className={view === 'detail' ? styles.viewToggleActive : undefined}
            >
              Chi tiết ({bookings.length})
            </button>
          </div>
        )}

        {student.username && (
          <button type="button" className={styles.account} onClick={copyUsername} title="Sao chép tên đăng nhập của con">
            <span className={styles.accountName}>@{student.username}</span>
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          </button>
        )}

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

      {/* Số liệu buổi học chưa về (hoặc lỗi) → không vẽ thẻ nào. Vẽ thẻ với số 0 sẽ bị đọc thành
          "con chưa học buổi nào", sai hơn hẳn việc tạm chưa hiện. */}
      {insightsReady &&
        (bookings.length === 0 ? (
          <div className={styles.sectionBody}>
            <div className={styles.noBooking}>
              <span>Con chưa có khoá học nào.</span>
              <button type="button" className={styles.inlineLink} onClick={onBookTutor}>
                Tìm gia sư cho con <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : view === 'overview' ? (
          <div className={styles.sectionBody}>
            <StudentOverview
              summary={summary}
              /* Lịch neo theo buổi kế tiếp GẦN NHẤT trên mọi khoá của con — ở chế độ tổng quát,
                 "xem lịch học" nghĩa là lịch của cả con, không của riêng khoá nào. */
              onViewSchedule={() => onViewSchedule(summary.nextBooking)}
              onReviewPending={onReviewPending}
            />
          </div>
        ) : (
          /* Chế độ Chi tiết đổi thân thẻ sang nền kem để lưới thẻ khoá học TRẮNG có nền tương phản
             mà đứng lên — trắng-trên-trắng thì các thẻ tan vào thân thẻ của con. */
          <div className={`${styles.sectionBody} ${styles.sectionBodyGrid}`}>
            <div className={styles.grid}>
              {bookings.map((booking, index) => (
                <BookingCard
                  key={booking.bookingId}
                  booking={booking}
                  index={index}
                  onViewSchedule={() => onViewSchedule(booking)}
                  onReviewPending={onReviewPending}
                />
              ))}
            </div>
          </div>
        ))}
    </section>
  );
};

export default StudentSection;
