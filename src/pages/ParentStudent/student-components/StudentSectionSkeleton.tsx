import styles from '../styles.module.css';

/**
 * Khung xương của một khối con: hàng danh tính + dải Tổng quát.
 *
 * Dựng theo chế độ TỔNG QUÁT vì đó là chế độ mặc định — khung xương phải cao đúng bằng thứ sắp
 * hiện ra, không thì trang giật một nhịp khi dữ liệu về. (Trước đây khung này vẽ 2 thẻ khoá học,
 * cao gấp đôi dải tổng quát.)
 *
 * Từng "dòng chữ" giả được bọc trong hộp cao đúng bằng line-box của dòng thật rồi mới vẽ vạch xám
 * ở giữa — lấy thẳng chiều cao vạch làm chiều cao dòng thì khung xương hụt so với khối thật đúng
 * bằng cú giật mà nó sinh ra để tránh.
 *
 * `aria-hidden`: trạng thái tải đã được thông báo bằng `aria-busy` ở vùng lưới của trang cha.
 */
const StudentSectionSkeleton = ({ index }: { index: number }) => (
  <section
    className={styles.studentSection}
    style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
    aria-hidden="true"
  >
    <header className={styles.studentHead}>
      <span className={`${styles.studentAvatar} ${styles.shimmer}`} />
      <div className={styles.studentIdentity}>
        <span className="flex h-[24px] items-center">
          <span className={`block h-[12px] w-40 rounded-[3px] ${styles.shimmer}`} />
        </span>
        <span className="mt-0.5 flex h-[20px] items-center">
          <span className={`block h-[10px] w-56 rounded-[3px] ${styles.shimmer}`} />
        </span>
      </div>
      {/* Cao đúng 32px như segmented control "Tổng quát | Chi tiết" thật. */}
      <span className={`block h-[32px] w-[150px] rounded-[9px] ${styles.shimmer}`} />
      <span className={`block h-[16px] w-28 rounded-[3px] ${styles.shimmer}`} />
      <span className={`block h-[28px] w-[28px] rounded-full ${styles.shimmer}`} />
    </header>

    <div className={styles.sectionBody}>
      <div className={styles.overview}>
        <div className={styles.overviewProgress}>
          <div className="flex h-[19px] items-center justify-between">
            <span className={`block h-[10px] w-44 rounded-[3px] ${styles.shimmer}`} />
            <span className={`block h-[10px] w-9 rounded-[3px] ${styles.shimmer}`} />
          </div>
          <span className={`block h-1.5 rounded-full ${styles.shimmer}`} />
        </div>

        <div className={styles.overviewChips}>
          <span className={`block h-[20px] w-24 rounded-[6px] ${styles.shimmer}`} />
          <span className={`block h-[20px] w-32 rounded-[6px] ${styles.shimmer}`} />
          <span className={`block h-[20px] w-28 rounded-[6px] ${styles.shimmer}`} />
        </div>

        <span className="flex h-[19px] items-center">
          <span className={`block h-[10px] w-3/5 rounded-[3px] ${styles.shimmer}`} />
        </span>

        <div className={styles.overviewActions}>
          {/* Cao đúng 36px như nút "Xem lịch học" thật — hàng hành động chỉ còn một nút. */}
          <span className={`ml-auto block h-[36px] w-[112px] rounded-[11px] ${styles.shimmer}`} />
        </div>
      </div>
    </div>
  </section>
);

export default StudentSectionSkeleton;
