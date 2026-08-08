import { useState, useEffect } from 'react';
import { Popconfirm } from 'antd';
import { toast } from 'react-toastify';
import styles from './styles.module.css';
import type { StudentType } from '../../types/student.type';
import {
  getStudents,
  deleteStudent,
  createParentStudentWithCredentials,
  updateParentStudent,
  resetStudentPassword,
  type ICreateParentStudent,
  type StudentCredentials,
} from '../../services/student.service';
import StatCard from '../../components/shared/StatCard/StatCard';
import AddStudentModal from './components/AddStudentModal';
import EditStudentModal from './components/EditStudentModal';
import CredentialsModal from './components/CredentialsModal';

// BE cố tình giữ nguyên các message validate học sinh bằng tiếng Anh — FE tự dịch sang tiếng
// Việt trước khi hiển thị. Dùng "includes" (không so khớp tuyệt đối) vì có message BE gửi kèm
// tiền tố tiếng Việt có sẵn (vd "Dữ liệu không hợp lệ: Birthdate must be today or in past.").
const ENGLISH_TO_VIETNAMESE_MESSAGES: Array<[string, string]> = [
  ['Birthdate must be today or in past.', 'Ngày sinh không được ở tương lai.'],
  ['Birthdate must be a valid date in yyyy-MM-dd format.', 'Ngày sinh không đúng định dạng.'],
  ['Full name must not be empty.', 'Họ và tên không được để trống.'],
  ['Full name must contain between 2 and 100 characters.', 'Họ và tên phải có từ 2 đến 100 ký tự.'],
  ['School name must not exceed 255 characters.', 'Tên trường không được vượt quá 255 ký tự.'],
  ['Learning goals must not exceed 1000 characters.', 'Mục tiêu học tập không được vượt quá 1000 ký tự.'],
  ['Gender must be a valid value.', 'Giới tính không hợp lệ.'],
  ['Request body is required.', 'Vui lòng nhập đầy đủ thông tin.'],
  ['Invalid value format.', 'Định dạng dữ liệu không hợp lệ.'],
];

const translateApiMessage = (message: string): string => {
  const match = ENGLISH_TO_VIETNAMESE_MESSAGES.find(([en]) => message.includes(en));
  return match ? message.replace(match[0], match[1]) : message;
};

// Bóc chi tiết lỗi từ envelope APIResponse của BE: ưu tiên field `error` — dict lỗi theo từng
// trường do [ApiController] tự validate DataAnnotations (vd { fullName: [...], birthdate: [...] }) —
// gộp lại thành 1 chuỗi để người dùng biết chính xác trường nào sai, thay vì chỉ hiện `message`
// chung chung "Dữ liệu đầu vào không hợp lệ." không nói rõ sai ở đâu. Mỗi message được dịch
// sang tiếng Việt qua translateApiMessage trước khi hiển thị.
const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { message?: string; title?: string; error?: unknown } } })?.response
    ?.data;
  if (!data) return fallback;

  if (data.error && typeof data.error === 'object') {
    const fieldMessages = Object.values(data.error as Record<string, string[]>).flat();
    if (fieldMessages.length > 0) return fieldMessages.map(translateApiMessage).join(' ');
  }

  const message = data.message || data.title;
  return message ? translateApiMessage(message) : fallback;
};

// ── Icons ──

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="6" r="4.5" />
    <path d="M9.5 9.5L13 13" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 2v10M2 7h10" strokeLinecap="round" />
  </svg>
);

// Horizontal three-dot menu (matching Figma)
const MoreHorizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    <circle cx="4" cy="9" r="1.5" />
    <circle cx="9" cy="9" r="1.5" />
    <circle cx="14" cy="9" r="1.5" />
  </svg>
);

// Verified checkmark badge
const VerifiedBadge = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" fill="var(--color-navy)" />
    <path
      d="M5.5 9l2.5 2.5L12.5 7"
      stroke="var(--color-gold)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Stat card icons
const PeopleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7 9a3 3 0 100-6 3 3 0 000 6zM1 17c0-3.31 2.69-6 6-6s6 2.69 6 6H1z" />
    <path d="M13.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 11c2.21 0 4 1.79 4 4v2h-4" opacity=".6" />
  </svg>
);

const SessionsStatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <rect x="2" y="3" width="16" height="12" rx="2" />
    <path d="M8 7v4l3-2-3-2z" fill="#fff" />
    <rect x="6" y="17" width="8" height="1.5" rx=".75" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 16l5-5 3 3 6-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ClockAlertIcon - commented out to avoid TS6133 (noUnusedLocals)
// const ClockAlertIcon = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//     <circle cx="8" cy="8" r="7" fill="#ef4444" />
//     <path d="M8 4v4l2.5 1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
//   </svg>
// );

// Calendar icon for next lesson
const CalSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="#6b7280" />
    <path d="M1.5 6h13" stroke="#fff" strokeWidth="1" />
    <path d="M5 1v2.5M11 1v2.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M8.5 2.5l3 3M2 9l6.5-6.5 3 3L5 12H2V9z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path
      d="M3 4h8l-.5 8a1 1 0 01-1 1H4.5a1 1 0 01-1-1L3 4zM5.5 6v4M8.5 6v4M1 4h12M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4"
      strokeLinecap="round"
    />
  </svg>
);

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
    <circle cx="9.5" cy="4.5" r="3" />
    <path d="M7 7l-5 5M4 10l2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ParentStudent = () => {
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newCredentials, setNewCredentials] = useState<StudentCredentials | null>(null);
  const [credentialsTitle, setCredentialsTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await getStudents();
        if (response.statusCode === 200) {
          setStudents(response.content);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  const handleAddClick = () => setIsAddModalOpen(true);
  const handleAddModalClose = () => setIsAddModalOpen(false);

  const handleAddStudent = async (payload: ICreateParentStudent) => {
    try {
      const result = await createParentStudentWithCredentials(payload);
      toast.success('Thêm học sinh thành công!');
      const response = await getStudents();
      if (response.statusCode === 200) setStudents(response.content);
      setIsAddModalOpen(false);
      // Show auto-generated credentials
      if (result.content) {
        setNewCredentials(result.content);
      }
    } catch (err) {
      console.error('Error adding student:', err);
      toast.error(extractApiErrorMessage(err, 'Thêm học sinh thất bại'));
      throw err;
    }
  };

  const handleEditClick = (student: StudentType) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleEditModalClose = () => {
    setEditingStudent(null);
    setIsEditModalOpen(false);
  };

  const handleEditSubmit = async (id: string, payload: ICreateParentStudent) => {
    try {
      await updateParentStudent(id, payload);
      toast.success('Cập nhật thông tin thành công!');
      const response = await getStudents();
      if (response.statusCode === 200) setStudents(response.content);
      handleEditModalClose();
    } catch (err) {
      console.error('Error updating student:', err);
      toast.error(extractApiErrorMessage(err, 'Cập nhật thất bại'));
      throw err;
    }
  };

  const handleDeleteConfirm = async (student: StudentType) => {
    try {
      await deleteStudent(student.studentId);
      toast.success('Xoá học sinh thành công!');
      setStudents((prev) => prev.filter((s) => s.studentId !== student.studentId));
      setOpenMenuId(null);
    } catch (err: any) {
      console.error('Error deleting student:', err);
      const msg = err.response?.data?.message || '';
      if (msg.includes('ACTIVE_BOOKING')) {
        toast.error('Không thể xóa học sinh vì đang có lịch học. Vui lòng hủy lịch học trước.');
      } else {
        toast.error('Xoá học sinh thất bại');
      }
    }
  };

  const handleResetPassword = async (student: StudentType) => {
    setOpenMenuId(null);
    try {
      const result = await resetStudentPassword(student.studentId);
      toast.success('Đặt lại mật khẩu thành công!');
      if (result.content) {
        setCredentialsTitle('Đặt lại mật khẩu thành công!');
        setNewCredentials(result.content);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error('Đặt lại mật khẩu thất bại');
    }
  };

  const filteredStudents = students.filter((s) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const activeCount = students.length;

  return (
    <div className={styles.page}>
      {/* ── Header Top Bar ── */}
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Quản lý con</h1>
        <div className={styles.topBarActions}>
          <div className={styles.searchWrap}>
            <div className={styles.searchIconPos}>
              <SearchIcon />
            </div>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={`${styles.addChildBtn} ${styles.btnGold}`} onClick={handleAddClick} type="button">
            <PlusIcon />
            <span>Thêm con</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Đang tải...</p>
        </div>
      ) : (
        <div className={styles.content}>
          {/* ── Quick Stats ── */}
          <div className={styles.quickStats}>
            <StatCard
              icon={<PeopleIcon />}
              value={activeCount}
              label="Số con"
              badgeVariant="green"
              infoTooltip="Số học sinh (con) đang được liên kết trong tài khoản của bạn."
            />
            <StatCard
              icon={<SessionsStatIcon />}
              value="—"
              label="Tổng buổi học"
              badgeVariant="blue"
              infoTooltip="Tổng số buổi học của tất cả các con."
            />
            <StatCard
              icon={<ChartIcon />}
              value="—"
              label="Tiến độ TB"
              badgeVariant="blue"
              infoTooltip="Mức độ tiến bộ trung bình của các con trong quá trình học."
            />
          </div>

          {students.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <PlusIcon />
              </div>
              <h3 className={styles.emptyTitle}>Chưa có hồ sơ học sinh nào</h3>
              <p className={styles.emptyText}>
                Bắt đầu bằng cách thêm thông tin con của bạn để theo dõi hành trình học tập.
              </p>
              <button className={`${styles.addChildBtn} ${styles.btnNavy}`} onClick={handleAddClick} type="button">
                <PlusIcon />
                <span>Thêm con đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className={styles.leftColumn}>
              {filteredStudents.map((student) => (
                <div key={student.studentId} className={styles.childCard}>
                  {/* Card Header: Avatar + Info + Menu */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <div className={styles.avatarWrap}>
                        <div className={styles.avatar}>
                          {student.avatarURL ? (
                            <img
                              src={student.avatarURL}
                              alt={student.fullName}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const span = e.currentTarget.parentElement?.querySelector('span');
                                if (span) span.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span className={styles.avatarInitials} style={student.avatarURL ? { display: 'none' } : {}}>
                            {getInitials(student.fullName)}
                          </span>
                        </div>
                        <div className={styles.verifiedBadge}>
                          <VerifiedBadge />
                        </div>
                      </div>
                      <div className={styles.childInfo}>
                        <h4 className={styles.childName}>{student.fullName}</h4>
                        <div className={styles.childMeta}>
                          {student.username && (
                            <>
                              <span
                                className={styles.childGrade}
                                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
                              >
                                @{student.username}
                              </span>
                              <span className={styles.metaDot}>•</span>
                            </>
                          )}
                          {student.gradeLevel && (
                            <>
                              <span className={styles.childGrade}>{student.gradeLevel}</span>
                              <span className={styles.metaDot}>•</span>
                            </>
                          )}
                          <span className={styles.childStatus}>Đang hoạt động</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardMenuWrap}>
                      <button
                        className={styles.moreBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === student.studentId ? null : student.studentId);
                        }}
                        type="button"
                      >
                        <MoreHorizIcon />
                      </button>
                      {openMenuId === student.studentId && (
                        <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => handleEditClick(student)}
                            type="button"
                          >
                            <EditIcon />
                            <span>Chỉnh sửa</span>
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => handleResetPassword(student)}
                            type="button"
                          >
                            <KeyIcon />
                            <span>Đặt lại mật khẩu</span>
                          </button>
                          <Popconfirm
                            title="Xoá học sinh"
                            description={`Bạn có chắc muốn xoá ${student.fullName}?`}
                            onConfirm={() => handleDeleteConfirm(student)}
                            okText="Xoá"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                          >
                            <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} type="button">
                              <TrashIcon />
                              <span>Xoá</span>
                            </button>
                          </Popconfirm>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className={styles.cardStats}>
                    <div className={styles.cardStatItem}>
                      <span className={styles.cardStatLabel}>Buổi học</span>
                      <span className={styles.cardStatValue}>—</span>
                    </div>
                    <div className={styles.cardStatItem}>
                      <span className={styles.cardStatLabel}>Tiến độ</span>
                      <span className={styles.cardStatValue}>—</span>
                    </div>
                    <div className={styles.cardStatItem}>
                      <span className={styles.cardStatLabel}>Chuỗi</span>
                      <span className={styles.cardStatValue}>—</span>
                    </div>
                  </div>

                  {/* Next Lesson / School Bar */}
                  <div className={styles.nextBar}>
                    <CalSmallIcon />
                    <span className={styles.nextBarText}>
                      Trường: <strong>{student.school || 'Chưa cập nhật'}</strong>
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className={styles.cardActions}>
                    <button className={styles.viewDetailsBtn} type="button" onClick={() => handleEditClick(student)}>
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddStudentModal isOpen={isAddModalOpen} onClose={handleAddModalClose} onSubmit={handleAddStudent} />
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSubmit={handleEditSubmit}
        student={editingStudent}
      />
      <CredentialsModal
        credentials={newCredentials}
        onClose={() => {
          setNewCredentials(null);
          setCredentialsTitle(undefined);
        }}
        title={credentialsTitle}
      />
    </div>
  );
};

export default ParentStudent;
