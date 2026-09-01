import styles from '../styles.module.css';

/**
 * Khung xương của một thẻ lớp.
 *
 * Dựng lại ĐÚNG bố cục `CourseCard` — dải cover, huy hiệu tròn, hai dòng danh tính, thanh tiến
 * độ, chân thẻ — chứ không phải một khối xám. Lý do là chống nhảy layout: thẻ thật cao bao nhiêu
 * thì khung xương cao đúng bấy nhiêu, nên lúc dữ liệu về nội dung chỉ việc thế chỗ.
 *
 * Từng "dòng chữ" giả được bọc trong hộp cao đúng bằng line-box của dòng thật (22px cho tên
 * 15px, 20px cho dòng phụ 13px, 18px cho chú thích 12px) rồi mới vẽ vạch xám ở giữa — lấy thẳng
 * chiều cao vạch làm chiều cao dòng thì khung xương hụt so với thẻ thật đúng bằng cú giật mà nó
 * sinh ra để tránh.
 *
 * `aria-hidden` cho cả thẻ: trạng thái tải đã được thông báo bằng `aria-busy` trên vùng lưới ở
 * trang cha, ở đây không có gì để trình đọc màn hình đọc.
 */
const CourseCardSkeleton = ({ index }: { index: number }) => (
  <div className={styles.card} style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }} aria-hidden="true">
    <div className={`h-24 shrink-0 ${styles.shimmer}`} />

    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className={`h-9 w-9 shrink-0 rounded-full ${styles.shimmer}`} />
        <span className="min-w-0 flex-1">
          <span className="flex h-[22px] items-center">
            <span className={`block h-[11px] w-2/3 rounded-[3px] ${styles.shimmer}`} />
          </span>
          <span className="mt-0.5 flex h-[20px] items-center">
            <span className={`block h-[10px] w-1/2 rounded-[3px] ${styles.shimmer}`} />
          </span>
        </span>
      </div>

      <div className="mt-auto">
        <div className="mb-1.5 flex h-[18px] items-center justify-between">
          <span className={`block h-[10px] w-24 rounded-[3px] ${styles.shimmer}`} />
          <span className={`block h-[10px] w-8 rounded-[3px] ${styles.shimmer}`} />
        </div>
        <span className={`block h-1.5 rounded-full ${styles.shimmer}`} />
        <span className="mt-2 flex h-[18px] items-center">
          <span className={`block h-[10px] w-1/2 rounded-[3px] ${styles.shimmer}`} />
        </span>
      </div>
    </div>

    <div className={`${styles.cardFoot} ${styles.cardFootSingle}`}>
      {/* Cao đúng 36px như nút "Xem lịch học" thật, không phải 30px. */}
      <span className={`block h-[36px] w-[104px] rounded-[10px] ${styles.shimmer}`} />
    </div>
  </div>
);

export default CourseCardSkeleton;
