import { StatusBadge } from '../../../../components/shared';
import type { ClassItem } from './types';
import {
    classStatusMeta,
    coverFor,
    initialsOf,
    nextSessionLabel,
    progressOf,
    totalSessionsWithReserved,
} from './utils';

interface ClassCardProps {
    item: ClassItem;
    onOpen: (item: ClassItem) => void;
}

/**
 * Thẻ lớp trong chế độ lưới. Ảnh cover chỉ để trang trí (texture màu nước dùng chung
 * với app mobile) — mọi thông tin thật nằm ở phần thân thẻ.
 */
export default function ClassCard({ item, onOpen }: ClassCardProps) {
    const status = classStatusMeta(item.status);
    const totalSessions = totalSessionsWithReserved(item);
    const percent = progressOf(item.completedSessions, totalSessions);

    return (
        <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex flex-col overflow-hidden rounded-sm border border-[rgba(62,47,40,0.1)] bg-white text-left transition-colors hover:border-[rgba(62,47,40,0.28)]"
        >
            <div className="relative h-24 shrink-0">
                <img
                    src={coverFor(item.bookingId)}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                />
                <span className="absolute right-3 top-3">
                    <StatusBadge variant={status.variant} shape="tag">
                        {status.label}
                    </StatusBadge>
                </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                    <h3 className="truncate text-[15px] font-semibold text-[#3e2f28]">
                        {item.subjectName || 'Lớp học'}
                    </h3>
                    <p className="mt-0.5 truncate text-[13px] text-[#7a6a60]">
                        Mã lớp #{item.bookingId} · {item.schedule || 'Chưa có lịch cố định'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f0e4] text-[11px] font-semibold text-[#3e2f28]">
                        {initialsOf(item.studentName)}
                    </span>
                    <span className="truncate text-[13px] text-[#3e2f28]">
                        {item.studentName || 'Học sinh'}
                    </span>
                </div>

                <div className="mt-auto">
                    <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#7a6a60]">
                        <span>
                            Tiến độ {item.completedSessions}/{totalSessions} buổi
                        </span>
                        <span className="font-semibold text-[#3e2f28]">{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f2f0e4]">
                        <div
                            className="h-full rounded-full bg-[#3e2f28] transition-[width]"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <p className="mt-2 text-[12px] text-[#7a6a60]">
                        Buổi kế tiếp: {nextSessionLabel(item)}
                    </p>
                </div>
            </div>
        </button>
    );
}
