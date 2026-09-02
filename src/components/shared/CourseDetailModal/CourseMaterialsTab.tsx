import { Download, FileText } from 'lucide-react';
import type { LearningMaterialResponse } from '../../../services/materials.service';
import { parseUtc } from '../../../utils/datetime';

export interface CourseMaterialsTabProps {
  materials: LearningMaterialResponse[];
  loading: boolean;
  failed: boolean;
}

const iconTint = (fileType?: string): string => {
  const type = (fileType || '').toLowerCase();
  if (type.includes('pdf')) return 'bg-[#fbecea] text-[#a43732]';
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg'))
    return 'bg-[#e8f5ec] text-[#16803c]';
  if (type.includes('word') || type.includes('doc')) return 'bg-[#eaf3fa] text-[#2f6f9f]';
  return 'bg-[#f2f4f7] text-[#6b7385]';
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatUploadedAt = (iso?: string): string => {
  const date = parseUtc(iso);
  return date
    ? date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';
};

/**
 * Tài liệu của lớp, phía NGƯỜI HỌC — chỉ xem và tải về.
 *
 * Bản đối ứng của `MaterialsTab` ở portal gia sư, bỏ hẳn nút "Tải lên" và "Gỡ": BE chỉ cho gia
 * sư của booking upload/xoá (`LearningMaterialService.UploadAsync/DeleteAsync`), nên hiện nút
 * ở đây chỉ dẫn tới một lần bấm rồi ăn lỗi 403.
 */
const CourseMaterialsTab = ({ materials, loading, failed }: CourseMaterialsTabProps) => {
  if (loading) {
    return <p className="py-8 text-center text-[13px] text-[#6b7385]">Đang tải tài liệu…</p>;
  }

  if (failed) {
    return (
      <p className="rounded-[13px] border border-[rgba(217,119,6,0.28)] bg-[#fffaf1] px-4 py-3 text-[13px] text-[#8a5a12]">
        Chưa tải được tài liệu của lớp. Kiểm tra kết nối rồi mở lại khoá học này — lịch học và tiến độ ở trên vẫn chính
        xác.
      </p>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[13px] border border-dashed border-[rgba(23,33,58,0.16)] py-12 text-center">
        <FileText size={28} className="text-[#98a0af]" />
        <p className="mt-3 text-[14px] font-medium text-[#17213a]">Chưa có tài liệu nào</p>
        <p className="mt-1 text-[13px] text-[#6b7385]">Giáo án và tài liệu gia sư gửi cho lớp sẽ hiển thị tại đây.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-[#6b7385]">{materials.length} tài liệu gia sư đã gửi cho lớp</p>

      <div className="overflow-hidden rounded-[13px] border border-[rgba(23,33,58,0.1)] bg-white">
        {materials.map((material) => (
          <div
            key={material.materialId}
            className="flex items-center gap-3 border-b border-[rgba(23,33,58,0.07)] px-4 py-3 last:border-b-0"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${iconTint(material.fileType)}`}
            >
              <FileText size={17} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#17213a]" title={material.title}>
                {material.title}
              </p>
              <p className="truncate text-[12px] text-[#6b7385]">
                {formatFileSize(material.fileSize)} · {formatUploadedAt(material.createdAt)}
                {material.description && ` · ${material.description}`}
              </p>
            </div>

            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Tải tài liệu ${material.title}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#6b7385] transition-colors hover:bg-[#f2f4f7] hover:text-[#17213a]"
            >
              <Download size={15} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseMaterialsTab;
