import { useRef, useState } from 'react';
import { Download, FileText, LayoutGrid, List, Trash2, Upload } from 'lucide-react';
import { Popconfirm } from 'antd';
import type { LearningMaterialResponse } from '../../../../services/materials.service';
import type { ViewMode } from './types';
import { formatDateTime, formatFileSize } from './utils';

interface MaterialsTabProps {
    materials: LearningMaterialResponse[];
    loading: boolean;
    uploading: boolean;
    onUpload: (file: File, title: string) => void;
    onDelete: (materialId: number) => void;
}

const iconTint = (fileType?: string) => {
    const t = (fileType || '').toLowerCase();
    if (t.includes('pdf')) return 'bg-[#fdeceb] text-[#b4433a]';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return 'bg-[#eaf3ec] text-[#3f7a52]';
    if (t.includes('word') || t.includes('doc')) return 'bg-[#eaf0f8] text-[#3a5f9e]';
    return 'bg-[#f2f0e4] text-[#7a6a60]';
};

export default function MaterialsTab({
    materials,
    loading,
    uploading,
    onUpload,
    onDelete,
}: MaterialsTabProps) {
    const [view, setView] = useState<ViewMode>('grid');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Tên file làm tiêu đề mặc định — gia sư đổi tên sau ở màn tài liệu chi tiết.
        if (file) onUpload(file, file.name.replace(/\.[^.]+$/, ''));
        e.target.value = '';
    };

    const toggleBtn = (mode: ViewMode, Icon: typeof LayoutGrid, label: string) => (
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
        <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#7a6a60]">
                    {loading ? 'Đang tải…' : `${materials.length} tài liệu đã gửi cho lớp`}
                </p>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-sm border border-[rgba(62,47,40,0.1)] bg-[#faf9f2] p-1">
                        {toggleBtn('grid', LayoutGrid, 'Xem dạng lưới')}
                        {toggleBtn('table', List, 'Xem dạng danh sách')}
                    </div>
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-sm bg-[#3e2f28] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        <Upload size={15} />
                        {uploading ? 'Đang tải lên…' : 'Tải lên'}
                    </button>
                    <input ref={fileInputRef} type="file" hidden onChange={handlePick} />
                </div>
            </div>

            {!loading && materials.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-sm border border-dashed border-[rgba(62,47,40,0.18)] py-12 text-center">
                    <FileText size={28} className="text-[#b5a99f]" />
                    <p className="mt-3 text-[14px] font-medium text-[#3e2f28]">Chưa có tài liệu nào</p>
                    <p className="mt-1 text-[13px] text-[#7a6a60]">
                        Giáo án và tài liệu gửi cho lớp sẽ hiển thị tại đây.
                    </p>
                </div>
            )}

            {view === 'grid' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {materials.map((m) => (
                        <div
                            key={m.materialId}
                            className="flex flex-col gap-3 rounded-sm border border-[rgba(62,47,40,0.1)] bg-white p-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${iconTint(m.fileType)}`}
                                >
                                    <FileText size={17} />
                                </span>
                                <MaterialActions material={m} onDelete={onDelete} />
                            </div>
                            <div>
                                <p className="line-clamp-2 text-[14px] font-semibold text-[#3e2f28]">
                                    {m.title}
                                </p>
                                {m.description && (
                                    <p className="mt-1 line-clamp-2 text-[12px] text-[#7a6a60]">
                                        {m.description}
                                    </p>
                                )}
                            </div>
                            <p className="mt-auto text-[12px] text-[#7a6a60]">
                                {formatFileSize(m.fileSize)} · {formatDateTime(m.createdAt)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                materials.length > 0 && (
                    <div className="overflow-hidden rounded-sm border border-[rgba(62,47,40,0.1)] bg-white">
                        {materials.map((m) => (
                            <div
                                key={m.materialId}
                                className="flex items-center gap-3 border-b border-[rgba(62,47,40,0.07)] px-4 py-3 last:border-b-0"
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${iconTint(m.fileType)}`}
                                >
                                    <FileText size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-medium text-[#3e2f28]">
                                        {m.title}
                                    </p>
                                    <p className="truncate text-[12px] text-[#7a6a60]">
                                        {formatFileSize(m.fileSize)} · {formatDateTime(m.createdAt)}
                                    </p>
                                </div>
                                <MaterialActions material={m} onDelete={onDelete} />
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

function MaterialActions({
    material,
    onDelete,
}: {
    material: LearningMaterialResponse;
    onDelete: (id: number) => void;
}) {
    return (
        <div className="flex shrink-0 items-center gap-1">
            <a
                href={material.fileUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Tải tài liệu ${material.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-[#7a6a60] transition-colors hover:bg-[#f2f0e4] hover:text-[#3e2f28]"
            >
                <Download size={15} />
            </a>
            <Popconfirm
                title="Gỡ tài liệu"
                description="Học sinh sẽ không còn thấy tài liệu này."
                okText="Gỡ"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(material.materialId)}
            >
                <button
                    type="button"
                    aria-label={`Gỡ tài liệu ${material.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-[#7a6a60] transition-colors hover:bg-[#fdeceb] hover:text-[#b4433a]"
                >
                    <Trash2 size={15} />
                </button>
            </Popconfirm>
        </div>
    );
}
