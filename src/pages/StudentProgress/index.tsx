import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CourseDetailModal, PageContainer } from '../../components/shared';
import type { CourseDetailSummary } from '../../components/shared';
import {
  CourseCard,
  CourseCardSkeleton,
  courseProgressBar,
  courseStatusMeta,
  EmptyState,
  isCourseCancelled,
  nextSessionLabel,
  scheduleAnchorDate,
  useStudentProgress,
} from './progress-components';
import type { CourseProgress } from './progress-components';
import styles from './styles.module.css';

/** Ô tìm kiếm chỉ có ý nghĩa khi danh sách đủ dài để phải cuộn tìm. */
const SEARCH_THRESHOLD = 3;

const CALENDAR_PATH = '/student-portal/calendar';

/**
 * Tiến trình học tập (học sinh).
 *
 * Bản đối ứng của trang "Quản lý học sinh" bên phụ huynh (`pages/ParentStudent`): cùng bố cục
 * lưới thẻ, cùng dải cover + nhãn trạng thái, cùng thanh tiến độ và dòng buổi kế tiếp. Khác chiều
 * gộp dữ liệu — bên phụ huynh mỗi thẻ là MỘT ĐỨA CON, ở đây mỗi thẻ là MỘT LỚP (môn × gia sư)
 * của chính học sinh đang đăng nhập. Học sinh chỉ có một mình, nên gộp theo con người thì cả
 * trang chỉ còn đúng một thẻ.
 *
 * Mọi con số đều có nguồn thật từ `GET /api/student/class-sessions` — không có ô placeholder;
 * tải lỗi thì hiện panel lỗi kèm nút thử lại chứ không hiện số 0 sai.
 */
const StudentProgress = () => {
  const navigate = useNavigate();
  const { courses, sessionsByBooking, loading, failed, reload } = useStudentProgress();
  const [query, setQuery] = useState('');
  /** Khoá đang mở trong modal chi tiết. `null` = modal đóng. */
  const [openCourse, setOpenCourse] = useState<CourseProgress | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return courses;
    return courses.filter(
      (course) =>
        course.subjectName.toLowerCase().includes(keyword) || course.tutorName.toLowerCase().includes(keyword),
    );
  }, [courses, query]);

  const showSearch = courses.length >= SEARCH_THRESHOLD;
  const pendingTotal = courses.reduce((sum, course) => sum + course.pending, 0);

  /** Chưa biết có bao nhiêu lớp (lượt tải đầu) thì dựng 2 khung xương — đa số học sinh học 1–2 môn. */
  const skeletonCount = courses.length > 0 ? Math.min(courses.length, 6) : 2;

  const subtitle = loading
    ? 'Đang tải…'
    : failed
      ? 'Không tải được dữ liệu'
      : courses.length === 0
        ? 'Chưa có lớp nào'
        : pendingTotal > 0
          ? `${courses.length} lớp · ${pendingTotal} buổi chờ bạn xác nhận`
          : `${courses.length} lớp`;

  /**
   * Mở thời khoá biểu ở đúng tuần/ngày chứa buổi kế tiếp của lớp vừa bấm. Không mang ngày thì
   * trang luôn mở tuần hiện tại — buổi kế tiếp cách hai tuần là bấm vào không thấy gì.
   */
  const goToSchedule = (course: CourseProgress) => {
    const anchor = scheduleAnchorDate(course);
    navigate(`${CALENDAR_PATH}?view=list&status=all${anchor ? `&date=${anchor}` : ''}`);
  };
  /**
   * Mở TRANG CHI TIẾT của đúng buổi cần xác nhận.
   *
   * Trước đây mở danh sách thời khoá biểu với `?status=pending_confirmation` — sai hai lần:
   * danh sách chỉ tải một khoảng thời gian quanh `?date=` (buổi chờ xác nhận thường đã dạy từ
   * tháng trước nên rỗng trơn), và danh sách KHÔNG có nút Xác nhận — nút đó chỉ ở trang chi tiết.
   */
  const goToPending = (classSessionId: number) => navigate(`${CALENDAR_PATH}/${classSessionId}`);
  const goToTutorSearch = () => navigate('/tutor-search');

  /**
   * Số liệu cho modal — lấy lại đúng những hàm mà thẻ đang dùng, không tính lại theo cách khác.
   * Nếu modal tự đếm thì thẻ và modal sẽ có ngày nói hai con số khác nhau về cùng một khoá.
   */
  const modalCourse = useMemo<CourseDetailSummary | null>(() => {
    if (!openCourse) return null;

    const status = courseStatusMeta(openCourse);
    const progress = courseProgressBar(openCourse);

    return {
      bookingId: openCourse.bookingId,
      subjectName: openCourse.subjectName,
      tutorName: openCourse.tutorName,
      statusLabel: status.label,
      statusVariant: status.variant,
      completed: progress.done,
      total: progress.total,
      percent: progress.percent,
      pending: openCourse.pending,
      reserved: openCourse.reserved,
      onHold: openCourse.onHold,
      nextSessionLabel: nextSessionLabel(openCourse),
      cancelled: isCourseCancelled(openCourse),
    };
  }, [openCourse]);

  const modalSessions = openCourse ? (sessionsByBooking[openCourse.bookingId] ?? []) : [];

  return (
    <PageContainer
      className={styles.page}
      title="Tiến trình học tập"
      titleInfo="Theo dõi tiến độ từng môn, buổi học kế tiếp và những buổi cần bạn xác nhận."
      subtitle={subtitle}
      maxWidth="wide"
      headerAction={
        showSearch ? (
          <div className={styles.headerActions}>
            <div className={styles.searchWrap}>
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo môn hoặc gia sư"
                aria-label="Tìm lớp theo môn học hoặc tên gia sư"
              />
            </div>
          </div>
        ) : undefined
      }
    >
      <div className={styles.body}>
        {loading ? (
          /* `aria-busy` + `aria-label` ở đây là chỗ DUY NHẤT trạng thái tải được thông báo cho
             trình đọc màn hình — từng khung xương bên trong đều aria-hidden vì chúng không có
             nội dung gì để đọc. */
          <div className={styles.grid} role="status" aria-busy="true" aria-label="Đang tải tiến trình học tập">
            {Array.from({ length: skeletonCount }, (_, index) => (
              <CourseCardSkeleton key={index} index={index} />
            ))}
          </div>
        ) : failed ? (
          <div className={styles.errorPanel} role="alert">
            <p>
              Chưa tải được danh sách buổi học nên trang chưa tính được tiến độ. Kiểm tra kết nối rồi thử lại — lịch học
              của bạn không bị ảnh hưởng.
            </p>
            <button type="button" className={styles.ghostBtn} onClick={reload}>
              Thử lại
            </button>
          </div>
        ) : courses.length === 0 ? (
          <EmptyState variant="none" onFindTutor={goToTutorSearch} onClearSearch={() => setQuery('')} />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="search"
            query={query}
            onFindTutor={goToTutorSearch}
            onClearSearch={() => setQuery('')}
          />
        ) : (
          <div className={styles.grid}>
            {filtered.map((course, index) => (
              <CourseCard
                key={course.bookingId}
                course={course}
                index={index}
                onOpen={() => setOpenCourse(course)}
                onReviewPending={goToPending}
                onFindTutor={goToTutorSearch}
              />
            ))}
          </div>
        )}
      </div>

      {/* Danh sách buổi lấy từ chính dữ liệu trang đã tải — mở modal KHÔNG gọi lại API buổi học. */}
      <CourseDetailModal
        course={modalCourse}
        sessions={modalSessions}
        sessionHref={(classSessionId) => `${CALENDAR_PATH}/${classSessionId}`}
        onClose={() => setOpenCourse(null)}
        onViewSchedule={() => {
          if (openCourse) goToSchedule(openCourse);
        }}
      />
    </PageContainer>
  );
};

export default StudentProgress;
