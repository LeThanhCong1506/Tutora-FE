import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/shared';
import { isBookingCancelled } from '../../../utils/bookingStatus';
import styles from '../styles.module.css';
import { bookingNextSessionLabel, bookingProgress, bookingStatusMeta, coverForBooking } from './utils';
import type { BookingProgress } from './types';

export interface BookingCardProps {
  booking: BookingProgress;
  /** Thứ tự trong lưới — chỉ dùng để lệch nhẹ hiệu ứng xuất hiện. */
  index: number;
  /** Mở modal chi tiết khoá học. Bấm vào bất cứ đâu trên thẻ đều rơi vào đây. */
  onOpen: () => void;
  /** Nhận id buổi chờ xác nhận để mở đúng trang chi tiết buổi đó — nơi DUY NHẤT có nút Xác nhận. */
  onReviewPending: (classSessionId: number) => void;
}

/**
 * Thẻ MỘT khoá học (một booking) của một con.
 *
 * Trước đây mỗi thẻ là một ĐỨA CON, gộp mọi khoá của con đó vào một thanh tiến độ. Con số ra đúng
 * về phép cộng nhưng vô dụng: một con có 10 booking (nhiều môn, nhiều gia sư, có khi hai lần đặt
 * cùng một môn) cho ra "12/32 buổi" — không cho biết khoá nào đang chạy, khoá nào cần thanh toán
 * tiếp, khoá nào đã xong.
 *
 * Danh tính + hành động cấp CON (sửa hồ sơ, đặt lại mật khẩu, xoá, sao chép tài khoản) không nằm
 * ở đây mà ở `StudentSection` — nếu để trong thẻ thì một con 10 khoá sẽ có 10 nút "Xoá hồ sơ".
 */
const BookingCard = ({ booking, index, onOpen, onReviewPending }: BookingCardProps) => {
  const status = bookingStatusMeta(booking);
  const progress = bookingProgress(booking);
  const isCancelled = isBookingCancelled(booking.bookingStatus);

  return (
    <article className={styles.card} style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}>
      {/* Cả thẻ là một nút mở modal — giống thẻ lớp bên portal gia sư.
          Cách làm: một nút PHỦ KÍN thẻ nằm dưới, các phần tử bấm được bên trong (nhắc xác nhận,
          nút ở chân thẻ) nổi lên trên bằng z-index. Không bọc cả thẻ trong <button> vì bên trong
          đã có sẵn button — button lồng button là HTML không hợp lệ và Firefox bỏ luôn nút con. */}
      <button
        type="button"
        className={styles.cardOpen}
        onClick={onOpen}
        aria-label={`Xem chi tiết khoá ${booking.subjectName} — mã lớp #${booking.bookingId}`}
      />

      {/* Dải cover + nhãn trạng thái, cùng chiều cao 96px với thẻ lớp ở portal gia sư. */}
      <div className="relative h-24 shrink-0 overflow-hidden">
        <img
          src={coverForBooking(booking.bookingId)}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <span className="absolute right-3 top-3">
          <StatusBadge variant={status.variant} shape="tag">
            {status.label}
          </StatusBadge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          {/* Môn học là chủ thể của thẻ. "Mã lớp #N" để phân biệt hai khoá cùng môn cùng gia sư —
              cùng cách gọi với portal gia sư, để hai bên nói về cùng một khoá bằng cùng một mã. */}
          <h3 className="truncate text-[15px] font-semibold text-[#17213a]" title={booking.subjectName}>
            {booking.subjectName}
          </h3>
          <p
            className="mt-0.5 truncate text-[13px] text-[#6b7385]"
            title={`Mã lớp #${booking.bookingId} · Gia sư ${booking.tutorName}`}
          >
            Mã lớp #{booking.bookingId} · {booking.tutorName}
          </p>
        </div>

        {booking.pending > 0 && booking.nextPending && (
          <button
            type="button"
            className={styles.pendingAlert}
            onClick={() => onReviewPending(booking.nextPending!.classSessionId)}
            title="Gia sư đã gửi báo cáo buổi học. Bạn xác nhận thì gia sư mới được nhận tiền buổi đó — quá 12 giờ hệ thống sẽ tự xác nhận."
          >
            <span>{booking.pending} buổi chờ bạn xác nhận</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}

        {/* `mt-auto` ghim khối này xuống đáy để các thẻ cùng hàng có thanh tiến độ thẳng hàng nhau
            dù phần trên cao thấp khác nhau. */}
        <div className="mt-auto">
          {/* Khoá đã huỷ thì KHÔNG vẽ thanh tiến độ: mẫu số lúc đó chỉ còn các buổi đã dạy, nên
              thanh luôn đầy 100% — đọc cạnh nhãn "Đã huỷ" thành ra tự phủ nhận nhau. Điều đáng nói
              ở khoá đã huỷ là đã học được mấy buổi, không phải tỉ lệ. */}
          {isCancelled ? (
            booking.completed > 0 && (
              <p className="text-[12px] text-[#6b7385]">Đã học {booking.completed} buổi trước khi huỷ</p>
            )
          ) : (
            progress.total > 0 && (
              <>
                <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#6b7385]">
                  <span>
                    Tiến độ {progress.done}/{progress.total} buổi
                  </span>
                  <span className="font-semibold text-[#17213a]">{progress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#f2f4f7]">
                  <div
                    className="h-full rounded-full bg-[#17213a] transition-[width]"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </>
            )
          )}

          <p className="mt-2 truncate text-[12px] text-[#6b7385]" title={bookingNextSessionLabel(booking)}>
            Buổi kế tiếp: {bookingNextSessionLabel(booking)}
          </p>
        </div>
      </div>

      {/* Nút này trước đây điều hướng thẳng sang thời khoá biểu. Giờ nó mở modal chi tiết khoá —
          nơi có đủ danh sách buổi, tài liệu, VÀ nút "Xem lịch học" cho đường đi cũ. */}
      <footer className={`${styles.cardFoot} ${styles.cardFootSingle}`}>
        <button type="button" className={styles.primaryBtn} onClick={onOpen}>
          Xem chi tiết
        </button>
      </footer>
    </article>
  );
};

export default BookingCard;
