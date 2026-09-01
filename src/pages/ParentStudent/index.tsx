import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { ConfirmDialog, PageContainer } from '../../components/shared';
import type { StudentType } from '../../types/student.type';
import AddStudentModal from './components/AddStudentModal';
import CredentialsModal from './components/CredentialsModal';
import EditStudentModal from './components/EditStudentModal';
import {
  bookingScheduleAnchor,
  EmptyState,
  StudentSection,
  StudentSectionSkeleton,
  useParentStudents,
} from './student-components';
import type { BookingProgress } from './student-components';
import styles from './styles.module.css';

/** Ô tìm kiếm chỉ có ý nghĩa khi danh sách đủ dài để phải cuộn tìm. */
const SEARCH_THRESHOLD = 3;

const LESSONS_PATH = '/parent-portal/lessons';

/**
 * Quản lý học sinh (phụ huynh).
 *
 * Trang này trả lời đúng hai câu hỏi của phụ huynh: "hồ sơ con tôi có đúng không" và "từng khoá
 * học của con đang thế nào". Vì vậy mỗi con là MỘT KHỐI (hồ sơ + tài khoản đăng nhập + hành động
 * quản lý), và trong khối là MỘT THẺ CHO MỖI KHOÁ HỌC.
 *
 * Trước đây mỗi con chỉ có một thẻ, gộp mọi booking vào một thanh tiến độ. Con số đúng về phép
 * cộng nhưng vô dụng: một con 10 khoá (nhiều môn, nhiều gia sư, có khi hai lần đặt cùng một môn)
 * cho ra "12/32 buổi" — không cho biết khoá nào đang chạy, khoá nào cần thanh toán tiếp.
 *
 * Mọi số liệu đều có nguồn thật:
 *   - Hồ sơ + tài khoản đăng nhập: `GET /api/parent/students`
 *   - Khoá học, tiến độ, buổi kế tiếp, buổi chờ xác nhận: `GET /api/parent/class-sessions`
 * Không có ô placeholder — phần nào chưa có dữ liệu thì ẩn hẳn thay vì hiện "—".
 */
const ParentStudent = () => {
  const navigate = useNavigate();
  const {
    rows,
    loading,
    insightsLoading,
    insightsFailed,
    credentials,
    credentialsTitle,
    dismissCredentials,
    addStudent,
    editStudent,
    removeStudent,
    resetPassword,
  } = useParentStudents();

  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StudentType | null>(null);
  const [deleting, setDeleting] = useState<StudentType | null>(null);
  const [resetting, setResetting] = useState<StudentType | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter(
      ({ student }) =>
        student.fullName.toLowerCase().includes(keyword) || (student.username ?? '').toLowerCase().includes(keyword),
    );
  }, [rows, query]);

  const showSearch = rows.length >= SEARCH_THRESHOLD;
  const insightsReady = !insightsLoading && !insightsFailed;
  const bookingTotal = insightsReady ? rows.reduce((sum, { bookings }) => sum + bookings.length, 0) : 0;
  const pendingTotal = insightsReady
    ? rows.reduce((sum, { bookings }) => sum + bookings.reduce((n, booking) => n + booking.pending, 0), 0)
    : 0;

  /**
   * Trang chờ CẢ HAI lượt gọi API rồi mới vẽ.
   *
   * Hồ sơ hiện ngay rồi điền khoá học sau nghe hợp lý, nhưng phần điền sau chính là toàn bộ lưới
   * thẻ — khối con hiện ra rồi tự cao thêm vài trăm pixel, cả trang giật xuống một nhịp. Chờ trọn
   * vẹn thì đổi lấy vài trăm mili giây để không có cú nhảy nào.
   *
   * HAI ngoại lệ, đều để không bắt người dùng chờ một thứ vô ích:
   *   - Tải số liệu LỖI (`insightsFailed`): `insightsLoading` đã về false, trang vẽ hồ sơ kèm dòng
   *     báo lỗi. Chờ tiếp thì chờ mãi.
   *   - Chưa có hồ sơ con nào: hiện luôn màn hình rỗng, không việc gì phải đợi một API buổi học
   *     chắc chắn trả về mảng trống.
   */
  const waitingForData = loading || (insightsLoading && rows.length > 0);

  /** Số khung xương. Biết số con rồi thì dựng đúng bấy nhiêu để trang không đổi hình khi dữ liệu
   *  về; chưa biết (lượt tải đầu) thì 2 — đa số gia đình có 1–2 con. */
  const skeletonCount = rows.length > 0 ? Math.min(rows.length, 4) : 2;

  const subtitle = waitingForData
    ? 'Đang tải…'
    : rows.length === 0
      ? 'Chưa có hồ sơ nào'
      : [
          `${rows.length} hồ sơ`,
          insightsReady ? `${bookingTotal} khoá học` : null,
          pendingTotal > 0 ? `${pendingTotal} buổi chờ bạn xác nhận` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  /**
   * Mở thời khoá biểu ở đúng tuần chứa buổi kế tiếp của khoá vừa bấm. Không có buổi đã mở thì
   * không truyền ngày — buổi giữ chỗ không hiện trên lịch, neo vào đó chỉ mở ra một tuần trống.
   */
  const viewSchedule = (student: StudentType, booking: BookingProgress | null) => {
    const anchor = booking ? bookingScheduleAnchor(booking) : null;
    navigate(`${LESSONS_PATH}?child=${student.studentId}${anchor ? `&date=${anchor}` : ''}`);
  };

  /**
   * Mở TRANG CHI TIẾT của đúng buổi cần xác nhận.
   *
   * Trước đây nút này mở danh sách thời khoá biểu với `?status=pending_confirmation&view=list`.
   * Sai hai lần: (1) danh sách chỉ tải đúng MỘT THÁNG quanh `?date=` — không truyền ngày thì mở
   * tháng hiện tại, mà buổi chờ xác nhận thường là buổi đã dạy tháng trước nên danh sách rỗng
   * trơn; (2) ngay cả khi thấy, danh sách KHÔNG có nút Xác nhận — nút đó chỉ có ở trang chi tiết
   * (`ParentLessonDetail` + `ConfirmLessonModal`), nên phụ huynh vẫn phải bấm thêm một nhịp.
   */
  const reviewPending = (classSessionId: number) => navigate(`${LESSONS_PATH}/${classSessionId}`);

  return (
    <PageContainer
      className={styles.page}
      title="Quản lý học sinh"
      titleInfo="Quản lý hồ sơ, tài khoản đăng nhập và từng khoá học của các con."
      subtitle={subtitle}
      maxWidth="wide"
      headerAction={
        <div className={styles.headerActions}>
          {showSearch && (
            <div className={styles.searchWrap}>
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên con"
                aria-label="Tìm hồ sơ học sinh"
              />
            </div>
          )}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setAddOpen(true)}
            data-tour="parent-student-add-btn"
          >
            <Plus size={15} aria-hidden="true" /> Thêm con
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        {waitingForData ? (
          /* `aria-busy` + `aria-label` ở đây là chỗ DUY NHẤT trạng thái tải được thông báo cho
             trình đọc màn hình — từng khung xương bên trong đều aria-hidden vì chúng không có
             nội dung gì để đọc. */
          <div className={styles.sections} role="status" aria-busy="true" aria-label="Đang tải danh sách học sinh">
            {Array.from({ length: skeletonCount }, (_, index) => (
              <StudentSectionSkeleton key={index} index={index} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState variant="none" onAdd={() => setAddOpen(true)} onClearSearch={() => setQuery('')} />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="search"
            query={query}
            onAdd={() => setAddOpen(true)}
            onClearSearch={() => setQuery('')}
          />
        ) : (
          <>
            {insightsFailed && (
              <p className={styles.insightsNotice}>
                Chưa tải được dữ liệu buổi học, phần khoá học và tiến trình tạm ẩn. Hồ sơ bên dưới vẫn chính xác.
              </p>
            )}
            <div className={styles.sections}>
              {filtered.map(({ student, bookings }) => (
                <StudentSection
                  key={student.studentId}
                  student={student}
                  bookings={bookings}
                  insightsReady={insightsReady}
                  onEdit={() => setEditing(student)}
                  onResetPassword={() => setResetting(student)}
                  onDelete={() => setDeleting(student)}
                  onViewSchedule={(booking) => viewSchedule(student, booking)}
                  onReviewPending={reviewPending}
                  onBookTutor={() => navigate('/tutor-search')}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AddStudentModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSubmit={addStudent} />

      <EditStudentModal
        key={editing?.studentId ?? 'no-student'}
        isOpen={editing !== null}
        student={editing}
        onClose={() => setEditing(null)}
        onSubmit={editStudent}
      />

      <ConfirmDialog
        open={deleting !== null}
        type="warning-strong"
        title="Xoá hồ sơ học sinh?"
        message={
          <>
            Hồ sơ <b>{deleting?.fullName}</b> và tài khoản đăng nhập của con sẽ bị xoá khỏi tài khoản phụ huynh của bạn.
            Thao tác này không thể hoàn tác.
          </>
        }
        confirmText="Xoá hồ sơ"
        onConfirm={async () => {
          const target = deleting;
          setDeleting(null);
          if (target) await removeStudent(target.studentId);
        }}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={resetting !== null}
        type="warning"
        title="Đặt lại mật khẩu?"
        message={
          <>
            Mật khẩu hiện tại của <b>{resetting?.fullName}</b> sẽ ngừng hoạt động. Bạn sẽ nhận mật khẩu mới ngay sau đó
            và cần gửi lại cho con.
          </>
        }
        confirmText="Đặt lại mật khẩu"
        onConfirm={async () => {
          const target = resetting;
          setResetting(null);
          if (target) await resetPassword(target.studentId);
        }}
        onCancel={() => setResetting(null)}
      />

      <CredentialsModal credentials={credentials} onClose={dismissCredentials} title={credentialsTitle} />
    </PageContainer>
  );
};

export default ParentStudent;
