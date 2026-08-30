import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components/shared';
import type { ClassSessionResponse } from '../../../../services/classSession.service';
import { getClassSessionStatusMeta } from '../../../../utils/classSessionStatus';
import { extraSessionLabel, formatSessionTime } from './utils';

interface SessionRowProps {
    session: ClassSessionResponse;
    /** Số thứ tự buổi trong gói — buổi sinh thêm không có số nên truyền undefined. */
    index?: number;
    /** Số buổi con; > 0 thì hiện nút bung/thu ở đầu dòng. */
    childCount?: number;
    expanded?: boolean;
    onToggle?: () => void;
    /** Dòng con thụt vào và nền nhạt hơn để thấy rõ quan hệ với buổi cha. */
    nested?: boolean;
}

export default function SessionRow({
    session,
    index,
    childCount = 0,
    expanded = false,
    onToggle,
    nested = false,
}: SessionRowProps) {
    const meta = getClassSessionStatusMeta(session.status);
    const extra = extraSessionLabel(session);
    const { date, range } = formatSessionTime(session.scheduledStart, session.scheduledEnd);

    return (
        <Link
            to={`/tutor-portal/class-sessions/${session.classSessionId}`}
            className={`flex items-center gap-3 border-b border-[rgba(62,47,40,0.07)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#faf9f2] ${
                nested ? 'bg-[#faf9f2] pl-12' : ''
            }`}
        >
            {childCount > 0 ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle?.();
                    }}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Thu gọn buổi liên quan' : 'Xem buổi liên quan'}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f0e4] text-[#3e2f28] transition-colors hover:bg-[#e6e2d0]"
                >
                    {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
            ) : (
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                        nested ? 'bg-white text-[#7a6a60]' : 'bg-[#f2f0e4] text-[#3e2f28]'
                    }`}
                >
                    {nested ? '↳' : index}
                </span>
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#3e2f28]">
                    {date} · {range}
                </p>
                <p className="truncate text-[13px] text-[#7a6a60]">
                    Buổi #{session.classSessionId}
                    {extra && ` · ${extra}`}
                    {childCount > 0 && ` · ${childCount} buổi liên quan`}
                </p>
            </div>

            <StatusBadge variant={meta.variant} shape="tag">
                {meta.label}
            </StatusBadge>
            {/* Dòng con đã thụt lề + có ký hiệu ↳ nên bỏ mũi tên cho đỡ rối. */}
            {!nested && <ChevronRight size={16} className="shrink-0 text-[#b5a99f]" />}
        </Link>
    );
}
