import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared';
import type { StudentType } from '../../types/student.type';
import AddStudentModal from './components/AddStudentModal';
import CredentialsModal from './components/CredentialsModal';
import EditStudentModal from './components/EditStudentModal';
import { EmptyState, StudentCard, useParentStudents } from './student-components';
import styles from './styles.module.css';

/** Ô tìm kiếm chỉ có ý nghĩa khi danh sách đủ dài để phải cuộn tìm. */
const SEARCH_THRESHOLD = 3;

/**
 * Quản lý học sinh (phụ huynh).
 *
 * Trang này trả lời đúng hai câu hỏi của phụ huynh: "hồ sơ con tôi có đúng không" và "con tôi
 * đang học thế nào". Vì vậy mỗi card chỉ hiển thị dữ liệu có nguồn thật:
 *   - Hồ sơ + tài khoản đăng nhập: `GET /api/parent/students`
 *   - Buổi tiếp theo, tiến trình, gia sư/môn, buổi chờ xác nhận: `GET /api/parent/class-sessions`
 * Không có ô số liệu placeholder — phần nào chưa có dữ liệu thì ẩn hẳn thay vì hiện "—".
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
  const pendingTotal = insightsReady ? rows.reduce((sum, { insight }) => sum + insight.pending, 0) : 0;

  const subtitle = loading
    ? 'Đang tải hồ sơ…'
    : rows.length === 0
      ? 'Chưa có hồ sơ nào'
      : pendingTotal > 0
        ? `${rows.length} hồ sơ · ${pendingTotal} buổi chờ bạn xác nhận`
        : `${rows.length} hồ sơ`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.title}>Quản lý học sinh</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

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
      </header>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.grid} aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className={styles.skeletonCard} />
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
                Chưa tải được dữ liệu buổi học, phần lịch học và tiến trình tạm ẩn. Hồ sơ bên dưới vẫn chính xác.
              </p>
            )}
            <div className={styles.grid}>
              {filtered.map(({ student, insight }, index) => (
                <StudentCard
                  key={student.studentId}
                  student={student}
                  insight={insight}
                  insightsReady={insightsReady}
                  index={index}
                  onEdit={() => setEditing(student)}
                  onResetPassword={() => setResetting(student)}
                  onDelete={() => setDeleting(student)}
                  onViewSchedule={() => navigate(`/parent-portal/lessons?child=${student.studentId}`)}
                  onReviewPending={() =>
                    navigate(`/parent-portal/lessons?child=${student.studentId}&status=pending_confirmation&view=list`)
                  }
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
    </div>
  );
};

export default ParentStudent;
