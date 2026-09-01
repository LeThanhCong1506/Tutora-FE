import { StatusBadge } from '../../../../components/shared';
import type { ClassItem } from './types';
import {
    classStatusMeta,
    initialsOf,
    nextSessionLabel,
    progressOf,
    totalSessionsWithReserved,
} from './utils';

interface ClassTableProps {
    items: ClassItem[];
    onOpen: (item: ClassItem) => void;
}

const TH = 'px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[#7a6a60]';

export default function ClassTable({ items, onOpen }: ClassTableProps) {
    return (
        <div className="overflow-x-auto rounded-sm border border-[rgba(62,47,40,0.1)] bg-white">
            <table className="w-full min-w-180 border-collapse">
                <thead>
                    <tr className="border-b border-[rgba(62,47,40,0.1)] bg-[#faf9f2]">
                        <th className={TH}>Lớp học</th>
                        <th className={TH}>Học sinh</th>
                        <th className={TH}>Lịch cố định</th>
                        <th className={TH}>Tiến độ</th>
                        <th className={TH}>Buổi kế tiếp</th>
                        <th className={TH}>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => {
                        const status = classStatusMeta(item.status);
                        const totalSessions = totalSessionsWithReserved(item);
                        const percent = progressOf(item.completedSessions, totalSessions);

                        return (
                            <tr
                                key={item.bookingId}
                                onClick={() => onOpen(item)}
                                className="cursor-pointer border-b border-[rgba(62,47,40,0.07)] transition-colors last:border-b-0 hover:bg-[#faf9f2]"
                            >
                                <td className="px-4 py-3">
                                    <p className="text-[14px] font-semibold text-[#3e2f28]">
                                        {item.subjectName || 'Lớp học'}
                                    </p>
                                    <p className="text-[12px] text-[#7a6a60]">Mã lớp #{item.bookingId}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f0e4] text-[11px] font-semibold text-[#3e2f28]">
                                            {initialsOf(item.studentName)}
                                        </span>
                                        <span className="text-[13px] text-[#3e2f28]">
                                            {item.studentName || 'Học sinh'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#7a6a60]">
                                    {item.schedule || '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#f2f0e4]">
                                            <div
                                                className="h-full rounded-full bg-[#3e2f28]"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span className="whitespace-nowrap text-[12px] text-[#7a6a60]">
                                            {item.completedSessions}/{totalSessions}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[13px] text-[#7a6a60]">
                                    {nextSessionLabel(item)}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge variant={status.variant} shape="tag">
                                        {status.label}
                                    </StatusBadge>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
