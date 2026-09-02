import { useMemo, useState } from 'react';
import { Drawer } from 'antd';
import { BookOpen, CalendarDays, GraduationCap, Hash, User, X } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import CourseMaterialsTab from './CourseMaterialsTab';
import CourseSessionRow from './CourseSessionRow';
import { deriveSchedule, groupCourseSessions } from './courseSessions';
import { useCourseMaterials } from './useCourseMaterials';
import type { CourseDetailSummary, CourseSessionLike } from './types';

export interface CourseDetailModalProps<T extends CourseSessionLike = CourseSessionLike> {
  /** `null` = đóng. Truyền cả object để modal giữ nội dung trong lúc drawer chạy hiệu ứng đóng. */
  course: CourseDetailSummary | null;
  /** Các buổi học CỦA RIÊNG khoá này, lọc sẵn từ danh sách trang đã tải (không gọi API thêm). */
  sessions: T[];
  /** Đường dẫn trang chi tiết một buổi học của portal đang mở modal. */
  sessionHref: (classSessionId: number) => string;
  onClose: () => void;
  /** Mở thời khoá biểu ở đúng tuần của khoá này — đường đi cũ của thẻ, nay nằm trong modal. */
  onViewSchedule: () => void;
}

type TabKey = 'overview' | 'materials';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'materials', label: 'Tài liệu' },
];

/** Một dòng thông tin ở cột trái. */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[#98a0af]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] text-[#6b7385]">{label}</p>
        <p className="break-words text-[13px] font-medium text-[#17213a]">{value}</p>
      </div>
    </div>
  );
}

/** Ô số liệu nhỏ ở đầu tab Tổng quan. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-[rgba(23,33,58,0.1)] bg-[#f7f8fa] px-4 py-3">
      <p className="text-[12px] text-[#6b7385]">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-semibold text-[#17213a]">{value}</p>
    </div>
  );
}

/** Hai chữ cái đầu của tên, làm huy hiệu tròn. */
const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'GS';

/**
 * Chi tiết một khoá học cho portal PHỤ HUYNH và HỌC SINH — bản đối ứng của
 * `TutorPortal/TutorPortalClasses/classes-components/ClassDetailModal`.
 *
 * ─── Chỗ CỐ Ý khác modal bên gia sư, và vì sao ────────────────────────────────
 *
 *  1. Danh tính ở cột trái là GIA SƯ, không phải học sinh: người học mở khoá học của chính mình
 *     (hoặc của con mình) nên câu hỏi là "ai đang dạy", không phải "đang dạy ai". Portal phụ
 *     huynh truyền thêm `studentName` vì một phụ huynh có nhiều con.
 *
 *  2. Tab Tài liệu CHỈ XEM. BE cho cả hai bên đọc tài liệu của booking nhưng chỉ gia sư được
 *     upload/xoá, nên phía này bỏ hẳn nút "Tải lên" và "Gỡ".
 *
 *  3. Các con số KHÔNG tính lại trong modal mà nhận từ trang gọi — chính là con số thẻ ngoài
 *     trang đang hiển thị. Đếm lại ở đây chỉ tạo cơ hội cho thẻ và modal nói hai con số khác nhau.
 *
 *  4. Có nút "Xem lịch học": trước đây bấm vào thẻ là điều hướng thẳng sang thời khoá biểu. Giờ
 *     thẻ mở modal, nên đường đi cũ phải còn nguyên ở đây chứ không được mất.
 */
function CourseDetailModal<T extends CourseSessionLike>({
  course,
  sessions,
  sessionHref,
  onClose,
  onViewSchedule,
}: CourseDetailModalProps<T>) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // Chỉ gọi API tài liệu khi modal thực sự mở.
  const materials = useCourseMaterials(course?.bookingId ?? null);

  // Buổi phụ / học lại gom vào buổi gốc, mặc định thu gọn — giống danh sách bên gia sư.
  const groups = useMemo(() => groupCourseSessions(sessions), [sessions]);
  const schedule = useMemo(() => deriveSchedule(sessions), [sessions]);

  const toggle = (id: number) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  /** Đổi khoá học thì mọi state cục bộ phải về mặc định — trang gọi không cần nhớ `key`. */
  const handleClose = () => {
    setTab('overview');
    setExpandedIds([]);
    onClose();
  };

  const remaining = course ? Math.max(course.total - course.completed, 0) : 0;

  return (
    <Drawer
      open={Boolean(course)}
      onClose={handleClose}
      placement="right"
      closable={false}
      width={960}
      styles={{
        body: { padding: 0 },
        // Chỉ bo nhẹ cạnh trái (mép phải áp sát màn hình nên không cần bo).
        section: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2, overflow: 'hidden' },
      }}
    >
      {course && (
        <div className="flex h-full flex-col font-[inherit] lg:flex-row">
          {/* Cột trái — nhận diện khoá học + thông tin cố định */}
          <aside className="shrink-0 overflow-y-auto border-b border-[rgba(23,33,58,0.1)] bg-[#f7f8fa] lg:w-[300px] lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#17213a]">{course.subjectName}</h2>
                <span className="mt-2 inline-block">
                  <StatusBadge variant={course.statusVariant} shape="tag">
                    {course.statusLabel}
                  </StatusBadge>
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-[13px] border border-[rgba(23,33,58,0.1)] bg-white p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f7] text-[12px] font-semibold text-[#17213a]">
                  {initialsOf(course.tutorName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#17213a]" title={course.tutorName}>
                    {course.tutorName}
                  </p>
                  <p className="text-[12px] text-[#6b7385]">Gia sư của lớp</p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <InfoRow icon={<Hash size={15} />} label="Mã lớp" value={`#${course.bookingId}`} />
                {/* Chỉ portal phụ huynh truyền `studentName` — học sinh tự xem lớp của chính mình
                    thì dòng này chỉ lặp lại tên người đang đăng nhập. */}
                {course.studentName && (
                  <InfoRow icon={<User size={15} />} label="Học sinh" value={course.studentName} />
                )}
                <InfoRow
                  icon={<BookOpen size={15} />}
                  label="Số buổi"
                  value={`${course.completed}/${course.total} buổi đã học`}
                />
                <InfoRow icon={<CalendarDays size={15} />} label="Lịch cố định" value={schedule || 'Chưa có'} />
                <InfoRow
                  icon={<GraduationCap size={15} />}
                  label="Buổi kế tiếp"
                  // Không còn buổi đã mở thì nói rõ lý do (còn buổi chờ mở / đã học xong khoá /
                  // khoá đã huỷ) thay vì "Không có".
                  value={course.nextSessionLabel}
                />
              </div>

              <button
                type="button"
                onClick={onViewSchedule}
                className="mt-1 flex min-h-[38px] items-center justify-center rounded-[11px] bg-[#17213a] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Xem lịch học
              </button>
            </div>
          </aside>

          {/* Cột phải — tabs */}
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-[rgba(23,33,58,0.1)] px-5">
              <nav className="flex">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`-mb-px border-b-2 px-4 py-4 text-[14px] font-medium transition-colors ${
                      tab === item.key
                        ? 'border-[#17213a] text-[#17213a]'
                        : 'border-transparent text-[#6b7385] hover:text-[#17213a]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#6b7385] transition-colors hover:bg-[#f2f4f7] hover:text-[#17213a]"
              >
                <X size={17} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'overview' ? (
                <div className="flex flex-col gap-5">
                  {/* Khoá đã huỷ thì bỏ thanh tiến độ: mẫu số lúc đó chỉ còn buổi đã dạy nên
                      thanh luôn đầy 100%, đọc cạnh nhãn "Đã huỷ" thành tự phủ nhận nhau. */}
                  {!course.cancelled && course.total > 0 && (
                    <div>
                      <div className="mb-2 flex items-end justify-between">
                        <p className="text-[13px] font-medium text-[#17213a]">Tiến độ khoá học</p>
                        <p className="text-[13px] text-[#6b7385]">
                          <span className="font-semibold text-[#17213a]">{course.completed}</span>/{course.total} buổi ·{' '}
                          {course.percent}%
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#f2f4f7]">
                        <div
                          className="h-full rounded-full bg-[#17213a] transition-[width]"
                          style={{ width: `${course.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Còn lại" value={`${remaining} buổi`} />
                    <Stat label="Chờ xác nhận" value={`${course.pending} buổi`} />
                    <Stat label="Chờ mở" value={`${course.reserved} buổi`} />
                    {/* Buổi khiếu nại/vắng mặt/bị ngắt vẫn thuộc gói đã mua nên vẫn nằm trong
                        mẫu số — ô này nói ra chỗ chênh giữa "đã học" và "tổng buổi". */}
                    <Stat label="Đang chờ xử lý" value={`${course.onHold} buổi`} />
                  </div>

                  <div>
                    <p className="mb-2 text-[13px] font-medium text-[#17213a]">
                      {/* Đếm theo nhóm (buổi trong gói), buổi phụ/học lại nằm trong nhánh con. */}
                      Danh sách buổi học ({groups.length})
                    </p>

                    {groups.length === 0 ? (
                      <p className="rounded-[13px] border border-dashed border-[rgba(23,33,58,0.16)] py-8 text-center text-[13px] text-[#6b7385]">
                        Khoá này chưa có buổi học nào.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-[13px] border border-[rgba(23,33,58,0.1)] bg-white">
                        {groups.map((group, index) => {
                          const expanded = expandedIds.includes(group.parent.classSessionId);

                          return (
                            <div key={group.parent.classSessionId}>
                              <CourseSessionRow
                                session={group.parent}
                                href={sessionHref(group.parent.classSessionId)}
                                index={index + 1}
                                childCount={group.children.length}
                                expanded={expanded}
                                onToggle={() => toggle(group.parent.classSessionId)}
                                onNavigate={handleClose}
                              />
                              {expanded &&
                                group.children.map((child) => (
                                  <CourseSessionRow
                                    key={child.classSessionId}
                                    session={child}
                                    href={sessionHref(child.classSessionId)}
                                    nested
                                    onNavigate={handleClose}
                                  />
                                ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <CourseMaterialsTab
                  materials={materials.materials}
                  loading={materials.loading}
                  failed={materials.failed}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default CourseDetailModal;
