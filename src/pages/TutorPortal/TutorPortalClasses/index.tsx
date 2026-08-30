import { useMemo, useState } from 'react';
import { Pagination } from 'antd';
import { LayoutGrid, List, Search } from 'lucide-react';
import { PageContainer } from '../../../components/shared';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
    ClassCard,
    ClassDetailModal,
    ClassTable,
    STATUS_FILTERS,
    useTutorClasses,
    type ClassItem,
    type StatusFilterKey,
    type ViewMode,
} from './classes-components';

export default function TutorPortalClasses() {
    const [view, setView] = useState<ViewMode>('grid');
    const [statusKey, setStatusKey] = useState<StatusFilterKey>('all');
    const [searchInput, setSearchInput] = useState('');
    const [selected, setSelected] = useState<ClassItem | null>(null);

    const search = useDebouncedValue(searchInput, 400);
    const status = useMemo(
        () => STATUS_FILTERS.find((f) => f.key === statusKey)?.status,
        [statusKey],
    );

    const { items, totalCount, page, setPage, pageSize, loading, resetPage } = useTutorClasses(
        status,
        search,
    );

    // Đổi bộ lọc / từ khoá thì quay về trang 1 để không rơi vào trang trống.
    const changeStatus = (key: StatusFilterKey) => {
        setStatusKey(key);
        resetPage();
    };

    const changeSearch = (value: string) => {
        setSearchInput(value);
        resetPage();
    };

    const viewToggle = (mode: ViewMode, Icon: typeof LayoutGrid, label: string) => (
        <button
            type="button"
            onClick={() => setView(mode)}
            aria-label={label}
            aria-pressed={view === mode}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
                view === mode ? 'bg-white text-[#3e2f28]' : 'text-[#7a6a60] hover:text-[#3e2f28]'
            }`}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <PageContainer
            eyebrow="Giảng dạy"
            title="Lớp học"
            subtitle="Theo dõi tiến độ và tài liệu của từng lớp bạn đang phụ trách"
            maxWidth="wide"
        >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => changeStatus(f.key)}
                            className={`rounded-sm border px-3 py-2 text-[13px] font-medium transition-colors ${
                                statusKey === f.key
                                    ? 'border-[#3e2f28] bg-[#3e2f28] text-white'
                                    : 'border-[rgba(62,47,40,0.1)] bg-white text-[#7a6a60] hover:text-[#3e2f28]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b5a99f]"
                        />
                        <input
                            value={searchInput}
                            onChange={(e) => changeSearch(e.target.value)}
                            placeholder="Tìm theo học sinh, môn học…"
                            className="w-full rounded-sm border border-[rgba(62,47,40,0.1)] bg-white py-2 pl-9 pr-3 text-[13px] text-[#3e2f28] outline-none placeholder:text-[#b5a99f] focus:border-[rgba(62,47,40,0.32)] md:w-64"
                        />
                    </div>
                    <div className="flex items-center gap-1 rounded-sm border border-[rgba(62,47,40,0.1)] bg-[#faf9f2] p-1">
                        {viewToggle('grid', LayoutGrid, 'Xem dạng lưới')}
                        {viewToggle('table', List, 'Xem dạng bảng')}
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="py-16 text-center text-[13px] text-[#7a6a60]">Đang tải lớp học…</p>
            ) : items.length === 0 ? (
                <div className="rounded-sm border border-dashed border-[rgba(62,47,40,0.18)] py-16 text-center">
                    <p className="text-[14px] font-medium text-[#3e2f28]">Chưa có lớp học nào</p>
                    <p className="mt-1 text-[13px] text-[#7a6a60]">
                        Lớp sẽ xuất hiện sau khi bạn nhận và học sinh thanh toán booking.
                    </p>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                        <ClassCard key={item.bookingId} item={item} onOpen={setSelected} />
                    ))}
                </div>
            ) : (
                <ClassTable items={items} onOpen={setSelected} />
            )}

            {totalCount > pageSize && (
                <div className="mt-5 flex justify-end">
                    <Pagination
                        current={page}
                        total={totalCount}
                        pageSize={pageSize}
                        showSizeChanger={false}
                        onChange={setPage}
                    />
                </div>
            )}

            <ClassDetailModal
                key={selected?.bookingId ?? 'none'}
                item={selected}
                onClose={() => setSelected(null)}
            />
        </PageContainer>
    );
}
