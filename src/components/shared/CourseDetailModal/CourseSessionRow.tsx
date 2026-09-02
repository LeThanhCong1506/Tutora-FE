import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../StatusBadge';
import { getClassSessionStatusMeta } from '../../../utils/classSessionStatus';
import { extraSessionLabel, formatSessionTime } from './courseSessions';
import type { CourseSessionLike } from './types';

export interface CourseSessionRowProps {
  session: CourseSessionLike;
  /** Trang chi tiết buổi học của portal đang mở modal. */
  href: string;
  /** Số thứ tự buổi trong gói — buổi sinh thêm không có số nên truyền undefined. */
  index?: number;
  /** Số buổi con; > 0 thì hiện nút bung/thu ở đầu dòng. */
  childCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
  /** Dòng con thụt vào và nền nhạt hơn để thấy rõ quan hệ với buổi cha. */
  nested?: boolean;
  /** Đóng modal trước khi điều hướng, để lúc quay lại không còn drawer treo trên trang. */
  onNavigate?: () => void;
}

/**
 * Một dòng buổi học trong modal chi tiết khoá — bản đối ứng của `SessionRow` ở portal gia sư,
 * đổi bảng màu sang tông của portal phụ huynh/học sinh và trỏ tới trang chi tiết buổi học
 * tương ứng của portal đó.
 */
const CourseSessionRow = ({
  session,
  href,
  index,
  childCount = 0,
  expanded = false,
  onToggle,
  nested = false,
  onNavigate,
}: CourseSessionRowProps) => {
  const meta = getClassSessionStatusMeta(session.status);
  const extra = extraSessionLabel(session);
  const { date, range } = formatSessionTime(session.scheduledStart, session.scheduledEnd);

  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 border-b border-[rgba(23,33,58,0.07)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#f6f7f9] ${
        nested ? 'bg-[#f6f7f9] pl-12' : ''
      }`}
    >
      {childCount > 0 ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle?.();
          }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Thu gọn buổi liên quan' : 'Xem buổi liên quan'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f4f7] text-[#17213a] transition-colors hover:bg-[#e3e7ec]"
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      ) : (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
            nested ? 'bg-white text-[#6b7385]' : 'bg-[#f2f4f7] text-[#17213a]'
          }`}
        >
          {nested ? '↳' : index}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#17213a]">
          {date}
          {range && ` · ${range}`}
        </p>
        <p className="truncate text-[13px] text-[#6b7385]">
          Buổi #{session.classSessionId}
          {extra && ` · ${extra}`}
          {childCount > 0 && ` · ${childCount} buổi liên quan`}
        </p>
      </div>

      <StatusBadge variant={meta.variant} shape="tag">
        {meta.label}
      </StatusBadge>
      {/* Dòng con đã thụt lề + có ký hiệu ↳ nên bỏ mũi tên cho đỡ rối. */}
      {!nested && <ChevronRight size={16} className="shrink-0 text-[#98a0af]" />}
    </Link>
  );
};

export default CourseSessionRow;
