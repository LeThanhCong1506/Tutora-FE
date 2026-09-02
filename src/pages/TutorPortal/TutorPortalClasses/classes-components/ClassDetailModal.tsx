import { useState } from 'react';
import { Drawer } from 'antd';
import { BookOpen, CalendarDays, GraduationCap, Hash, X } from 'lucide-react';
import { StatusBadge } from '../../../../components/shared';
import { useClassDetail } from './hooks/useClassDetail';
import MaterialsTab from './MaterialsTab';
import OverviewTab from './OverviewTab';
import type { ClassItem } from './types';
import { classStatusMeta, coverFor, initialsOf, nextSessionLabel } from './utils';

interface ClassDetailModalProps {
    item: ClassItem | null;
    onClose: () => void;
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
            <span className="mt-0.5 text-[#b5a99f]">{icon}</span>
            <div className="min-w-0">
                <p className="text-[12px] text-[#7a6a60]">{label}</p>
                <p className="break-words text-[13px] font-medium text-[#3e2f28]">{value}</p>
            </div>
        </div>
    );
}

/**
 * Trang gọi truyền `key={item.bookingId}` cho component này, nên state `tab` tự reset về
 * "Tổng quan" mỗi khi gia sư mở một lớp khác — không cần effect đồng bộ.
 */
export default function ClassDetailModal({ item, onClose }: ClassDetailModalProps) {
    const [tab, setTab] = useState<TabKey>('overview');
    const detail = useClassDetail(item?.bookingId ?? null);

    const status = item ? classStatusMeta(item.status) : null;

    return (
        <Drawer
            open={Boolean(item)}
            onClose={onClose}
            placement="right"
            closable={false}
            width={960}
            styles={{
                body: { padding: 0 },
                // Chỉ bo nhẹ cạnh trái (mép phải áp sát màn hình nên không cần bo).
                section: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2, overflow: 'hidden' },
            }}
        >
            {item && (
                <div className="flex h-full flex-col lg:flex-row">
                    {/* Cột trái — nhận diện lớp + thông tin cố định */}
                    <aside className="shrink-0 overflow-y-auto border-b border-[rgba(62,47,40,0.1)] bg-[#faf9f2] lg:w-[300px] lg:border-b-0 lg:border-r">
                        <img
                            src={coverFor(item.bookingId)}
                            alt=""
                            aria-hidden="true"
                            className="h-24 w-full object-cover"
                        />
                        <div className="flex flex-col gap-4 p-5">
                            <div>
                                <h2 className="text-[17px] font-semibold text-[#3e2f28]">
                                    {item.subjectName || 'Lớp học'}
                                </h2>
                                {status && (
                                    <span className="mt-2 inline-block">
                                        <StatusBadge variant={status.variant} shape="tag">
                                            {status.label}
                                        </StatusBadge>
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2.5 rounded-sm border border-[rgba(62,47,40,0.1)] bg-white p-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f0e4] text-[12px] font-semibold text-[#3e2f28]">
                                    {initialsOf(item.studentName)}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-[13px] font-medium text-[#3e2f28]">
                                        {item.studentName || 'Học sinh'}
                                    </p>
                                    <p className="text-[12px] text-[#7a6a60]">Học sinh của lớp</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <InfoRow icon={<Hash size={15} />} label="Mã lớp" value={`#${item.bookingId}`} />
                                <InfoRow
                                    icon={<BookOpen size={15} />}
                                    label="Số buổi"
                                    value={`${item.completedSessions}/${item.totalSessions} buổi đã học`}
                                />
                                <InfoRow
                                    icon={<CalendarDays size={15} />}
                                    label="Lịch cố định"
                                    value={item.schedule || 'Chưa có'}
                                />
                                <InfoRow
                                    icon={<GraduationCap size={15} />}
                                    label="Buổi kế tiếp"
                                    // Không còn buổi đã mở thì nói rõ lý do (còn buổi chờ mở /
                                    // đã dạy xong khoá / khoá đã huỷ) thay vì "Không có".
                                    value={nextSessionLabel(item)}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Cột phải — tabs */}
                    <section className="flex min-w-0 flex-1 flex-col">
                        <header className="flex items-center justify-between gap-3 border-b border-[rgba(62,47,40,0.1)] px-5">
                            <nav className="flex">
                                {TABS.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setTab(t.key)}
                                        className={`-mb-px border-b-2 px-4 py-4 text-[14px] font-medium transition-colors ${
                                            tab === t.key
                                                ? 'border-[#3e2f28] text-[#3e2f28]'
                                                : 'border-transparent text-[#7a6a60] hover:text-[#3e2f28]'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Đóng"
                                className="flex h-8 w-8 items-center justify-center rounded-sm text-[#7a6a60] transition-colors hover:bg-[#f2f0e4] hover:text-[#3e2f28]"
                            >
                                <X size={17} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-5">
                            {tab === 'overview' ? (
                                <OverviewTab
                                    item={item}
                                    sessions={detail.sessions}
                                    loading={detail.loadingSessions}
                                />
                            ) : (
                                <MaterialsTab
                                    materials={detail.materials}
                                    loading={detail.loadingMaterials}
                                    uploading={detail.uploading}
                                    onUpload={detail.upload}
                                    onDelete={detail.remove}
                                />
                            )}
                        </div>
                    </section>
                </div>
            )}
        </Drawer>
    );
}
