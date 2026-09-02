import { useMemo, useState } from 'react';
import type { ClassSessionResponse } from '../../../../services/classSession.service';
import { groupSessions } from './groupSessions';
import SessionRow from './SessionRow';
import type { ClassItem } from './types';
import { progressOf } from './utils';

interface OverviewTabProps {
    item: ClassItem;
    sessions: ClassSessionResponse[];
    loading: boolean;
}

export default function OverviewTab({ item, sessions, loading }: OverviewTabProps) {
    const percent = progressOf(item.completedSessions, item.totalSessions);
    // Buổi phụ / học lại được gom vào buổi gốc, mặc định thu gọn.
    const groups = useMemo(() => groupSessions(sessions), [sessions]);
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    const toggle = (id: number) =>
        setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
        <div className="flex flex-col gap-5">
            <div>
                <div className="mb-2 flex items-end justify-between">
                    <p className="text-[13px] font-medium text-[#3e2f28]">Tiến độ khoá học</p>
                    <p className="text-[13px] text-[#7a6a60]">
                        <span className="font-semibold text-[#3e2f28]">{item.completedSessions}</span>
                        /{item.totalSessions} buổi · {percent}%
                    </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f2f0e4]">
                    <div
                        className="h-full rounded-full bg-[#3e2f28] transition-[width]"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            <div>
                <p className="mb-2 text-[13px] font-medium text-[#3e2f28]">
                    {/* Đếm theo nhóm (buổi trong gói), buổi phụ/học lại nằm trong nhánh con. */}
                    Danh sách buổi học {!loading && `(${groups.length})`}
                </p>

                {loading ? (
                    <p className="py-6 text-center text-[13px] text-[#7a6a60]">Đang tải buổi học…</p>
                ) : sessions.length === 0 ? (
                    <p className="rounded-sm border border-dashed border-[rgba(62,47,40,0.18)] py-8 text-center text-[13px] text-[#7a6a60]">
                        Lớp này chưa có buổi học nào.
                    </p>
                ) : (
                    <div className="overflow-hidden rounded-sm border border-[rgba(62,47,40,0.1)] bg-white">
                        {groups.map((group, index) => {
                            const expanded = expandedIds.includes(group.parent.classSessionId);

                            return (
                                <div key={group.parent.classSessionId}>
                                    <SessionRow
                                        session={group.parent}
                                        index={index + 1}
                                        childCount={group.children.length}
                                        expanded={expanded}
                                        onToggle={() => toggle(group.parent.classSessionId)}
                                    />
                                    {expanded &&
                                        group.children.map((child) => (
                                            <SessionRow key={child.classSessionId} session={child} nested />
                                        ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
