import { ArrowRight, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/shared';
import styles from '../styles.module.css';
import {
  courseProgressBar,
  courseStatusMeta,
  coverForCourse,
  getInitials,
  isCourseCancelled,
  nextSessionLabel,
} from './utils';
import type { CourseProgress } from './types';

export interface CourseCardProps {
  course: CourseProgress;
  /** Thứ tự trong lưới — chỉ dùng để lệch nhẹ hiệu ứng xuất hiện. */
  index: number;
  onViewSchedule: () => void;
  /** Nhận id buổi chờ xác nhận để mở đúng trang chi tiết buổi đó — nơi DUY NHẤT có nút Xác nhận. */
  onReviewPending: (classSessionId: number) => void;
  onFindTutor: () => void;
}

/**
 * Thẻ một lớp của học sinh — bố cục lấy nguyên từ thẻ học sinh ở portal phụ huynh
 * (`ParentStudent/student-components/BookingCard.tsx`): dải cover 96px có nhãn trạng thái, thân
 * thẻ với danh tính, nút nhắc xác nhận, thanh tiến độ và dòng buổi kế tiếp ghim xuống đáy.
 *
 * ─── Chỗ CỐ Ý khác thẻ bên phụ huynh, và vì sao ───────────────────────────────
 *
 *  1. KHÔNG có menu ⋯. Bên phụ huynh menu đó gom ba việc quản lý hồ sơ con (sửa, đặt lại mật
 *     khẩu, xoá) — học sinh không có quyền nào trong số đó với chính lớp của mình. Một menu chỉ
 *     để mở ra rồi thấy rỗng thì thà không có.
 *
 *  2. KHÔNG có ô sao chép tên đăng nhập ở chân thẻ. Đó là việc phụ huynh làm để gửi tài khoản
 *     cho con; học sinh đang đăng nhập bằng chính tài khoản đó. Chân thẻ vì vậy chỉ còn một nút,
 *     đẩy sang phải bằng `.cardFootSingle`.
 *
 *  3. Chủ thể của thẻ là MÔN HỌC, không phải một con người: huy hiệu tròn mang hai chữ đầu tên
 *     môn, dòng phụ là tên gia sư. Bên phụ huynh chỗ này là avatar + tên con.
 *
 *  4. Nhãn "N buổi chờ bạn xác nhận" giữ nguyên nhưng đổi người chịu trách nhiệm: học sinh tự
 *     xác nhận buổi của mình (`POST /student/class-sessions/{id}/confirm`).
 */
const CourseCard = ({ course, index, onViewSchedule, onReviewPending, onFindTutor }: CourseCardProps) => {
  const status = courseStatusMeta(course);
  const progress = courseProgressBar(course);
  const isCancelled = isCourseCancelled(course);

  return (
    <article className={styles.card} style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}>
      {/* Dải cover + nhãn trạng thái, cùng chiều cao 96px với thẻ bên phụ huynh. */}
      <div className="relative h-24 shrink-0 overflow-hidden">
        <img src={coverForCourse(course.bookingId)} alt="" aria-hidden="true" className="h-full w-full object-cover" />

        <span className="absolute right-3 top-3">
          <StatusBadge variant={status.variant} shape="tag">
            {status.label}
          </StatusBadge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f7] text-[12px] font-semibold text-[#17213a]">
            {getInitials(course.subjectName)}
          </span>
          <span className="min-w-0">
            {/* Tên môn và tên gia sư dài bị cắt bằng ellipsis — giữ `title` để hover đọc được đủ. */}
            <h2 className="truncate text-[15px] font-semibold text-[#17213a]" title={course.subjectName}>
              {course.subjectName}
            </h2>
            {/* "Mã lớp #N" để phân biệt hai khoá cùng môn cùng gia sư — cùng cách gọi với portal
                gia sư và phụ huynh, để ba bên nói về cùng một khoá bằng cùng một mã. */}
            <p
              className="mt-0.5 truncate text-[13px] text-[#6b7385]"
              title={`Mã lớp #${course.bookingId} · Gia sư ${course.tutorName}`}
            >
              Mã lớp #{course.bookingId} · {course.tutorName}
            </p>
          </span>
        </div>

        {course.pending > 0 && course.nextPending && (
          <button
            type="button"
            className={styles.pendingAlert}
            onClick={() => onReviewPending(course.nextPending!.classSessionId)}
            title="Gia sư đã gửi báo cáo buổi học. Bạn xác nhận thì gia sư mới được nhận tiền buổi đó — quá 12 giờ hệ thống sẽ tự xác nhận."
          >
            <span>{course.pending} buổi chờ bạn xác nhận</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}

        {/* `mt-auto` ghim khối này xuống đáy để các thẻ cùng hàng có thanh tiến độ thẳng hàng
            nhau dù phần danh tính cao thấp khác nhau. */}
        <div className="mt-auto">
          {/* Lớp đã huỷ thì KHÔNG vẽ thanh tiến độ: mẫu số lúc đó chỉ còn các buổi đã dạy nên thanh
              luôn đầy 100%, đọc cạnh nhãn "Đã huỷ" thành ra tự phủ nhận nhau. */}
          {isCancelled ? (
            course.completed > 0 && (
              <p className="text-[12px] text-[#6b7385]">Đã học {course.completed} buổi trước khi huỷ</p>
            )
          ) : progress.total > 0 ? (
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
          ) : (
            /* Lớp không còn buổi nào tính được (chỉ còn buổi no-show/khiếu nại) — thanh 0% sẽ bị
               đọc nhầm thành "chưa học buổi nào", nên thay bằng một đường đi tiếp. */
            <button type="button" className={styles.inlineLink} onClick={onFindTutor}>
              Tìm gia sư cho môn này <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}

          {/* Không còn buổi đã mở thì `nextSessionLabel` nói rõ lý do (còn N buổi chờ mở,
              khoá đã hoàn thành, khoá đã huỷ) thay vì để trơ một dấu "—". */}
          <p className="mt-2 truncate text-[12px] text-[#6b7385]" title={nextSessionLabel(course)}>
            Buổi kế tiếp: {nextSessionLabel(course)}
          </p>
        </div>
      </div>

      <footer className={`${styles.cardFoot} ${styles.cardFootSingle}`}>
        <button type="button" className={styles.primaryBtn} onClick={onViewSchedule}>
          Xem lịch học
        </button>
      </footer>
    </article>
  );
};

export default CourseCard;
