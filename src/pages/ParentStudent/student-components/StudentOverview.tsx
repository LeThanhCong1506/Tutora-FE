import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/shared';
import styles from '../styles.module.css';
import { summaryNextSessionLabel } from './utils';
import type { StudentSummary } from './utils';

export interface StudentOverviewProps {
  summary: StudentSummary;
  onViewSchedule: () => void;
  /** Nhận id buổi chờ xác nhận cũ nhất trên mọi khoá của con. */
  onReviewPending: (classSessionId: number) => void;
}

/**
 * Chế độ TỔNG QUÁT của một con: một dải gọn thay cho toàn bộ lưới thẻ khoá học.
 *
 * Vì sao cần: một con có thể có 10 khoá. Mặc định bung hết ra thành 10 thẻ làm trang dài mấy nghìn
 * pixel, mà phần lớn trong đó là khoá đã xong hoặc đã huỷ — thứ phụ huynh không cần xem hằng ngày.
 * Dải này trả lời ba câu hỏi thường trực (đang đi tới đâu / có bao nhiêu khoá ở trạng thái nào /
 * buổi kế tiếp là khi nào), rồi ai cần xem sâu thì bấm nút "Chi tiết (N)" ở hàng header.
 *
 * KHÔNG có nút "Xem từng khoá" riêng ở đây: nó làm đúng việc mà nút "Chi tiết (N)" trên header đã
 * làm — hai nút cho cùng một hành động, lại nằm cách nhau vài dòng trong cùng một thẻ.
 *
 * KHÔNG có ảnh cover ở đây: cover là thứ để phân biệt các thẻ với nhau trong một lưới; một dải
 * duy nhất thì nó chỉ tốn chiều cao.
 */
const StudentOverview = ({ summary, onViewSchedule, onReviewPending }: StudentOverviewProps) => (
  <div className={styles.overview}>
    {/* Thanh tiến độ chung — chỉ hiện khi có buổi để đếm. Khoá đã huỷ không vào đây (xem
        summarizeStudentBookings), nên con nào chỉ còn khoá đã huỷ sẽ không có thanh, và dải chip
        cùng dòng "Buổi kế tiếp" bên dưới nói rõ tình trạng. */}
    {summary.total > 0 && (
      <div className={styles.overviewProgress}>
        <div className={styles.overviewProgressHead}>
          <span>
            Tiến độ chung {summary.done}/{summary.total} buổi
          </span>
          <strong>{summary.percent}%</strong>
        </div>
        <div className={styles.overviewBar}>
          <div className={styles.overviewBarFill} style={{ width: `${summary.percent}%` }} />
        </div>
      </div>
    )}

    {summary.statusCounts.length > 0 && (
      <div className={styles.overviewChips}>
        {summary.statusCounts.map((entry) => (
          <StatusBadge key={entry.label} variant={entry.variant} shape="tag">
            {entry.count} {entry.label.toLowerCase()}
          </StatusBadge>
        ))}
      </div>
    )}

    <p className={styles.overviewNext} title={summaryNextSessionLabel(summary)}>
      Buổi kế tiếp: <span>{summaryNextSessionLabel(summary)}</span>
    </p>

    <div className={styles.overviewActions}>
      {summary.pending > 0 && summary.pendingSessionId !== null && (
        <button
          type="button"
          className={styles.pendingAlert}
          onClick={() => onReviewPending(summary.pendingSessionId!)}
          title="Gia sư đã gửi báo cáo buổi học. Bạn xác nhận thì gia sư mới được nhận tiền buổi đó — quá 12 giờ hệ thống sẽ tự xác nhận."
        >
          <span>{summary.pending} buổi chờ bạn xác nhận</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      )}
      <button type="button" className={styles.primaryBtn} onClick={onViewSchedule}>
        Xem lịch học
      </button>
    </div>
  </div>
);

export default StudentOverview;
