import { useEffect, useRef, useState } from 'react';
import { X, Loader2, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { uploadMaterial } from '../../../../services/materials.service';
import { getApiErrorMessage } from '../../../../utils/apiError';
import styles from '../../styles.module.css';

interface UploadMaterialModalProps {
  bookingId: number;
  onClose: () => void;
  /** Gọi sau khi tải lên xong để tab Tài liệu nạp lại danh sách. */
  onUploaded: () => void;
}

/** Chỉ nhận PDF và ảnh — cùng ràng buộc với BE (tài liệu lớp chỉ trích được 2 loại này). */
const ACCEPT = '.pdf,image/png,image/jpeg,image/webp';
const MAX_BYTES = 50 * 1024 * 1024;

const isAllowed = (file: File) =>
  file.type === 'application/pdf'
  || file.name.toLowerCase().endsWith('.pdf')
  || file.type.startsWith('image/');

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Gia sư tải tài liệu lên ngay trong buổi học.
 */
const UploadMaterialModal = ({ bookingId, onClose, onUploaded }: UploadMaterialModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, uploading]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];

    for (const file of Array.from(incoming)) {
      if (!isAllowed(file)) {
        toast.error(`"${file.name}" không phải PDF hoặc ảnh.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" vượt quá 50MB.`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    let ok = 0;
    for (const file of files) {
      try {
        // Tiêu đề mặc định = tên file bỏ đuôi; gia sư đổi sau ở trang tài liệu.
        await uploadMaterial(bookingId, file, file.name.replace(/\.[^.]+$/, ''));
        ok += 1;
      } catch (error) {
        toast.error(getApiErrorMessage(error, `Không tải lên được "${file.name}".`));
      }
    }

    setUploading(false);
    if (ok > 0) {
      toast.success(`Đã tải lên ${ok} tài liệu.`);
      onUploaded();
      onClose();
    }
  };

  return createPortal(
    <div className={styles.uploadOverlay} onClick={uploading ? undefined : onClose}>
      <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.uploadCloseBtn}
          onClick={onClose}
          disabled={uploading}
          title="Đóng"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>

        <div
          className={`${styles.uploadDropzone} ${dragging ? styles.uploadDropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <img src="/images/icons/upload-folder.png" alt="" className={styles.uploadIcon} />

          <p className={styles.uploadHeadline}>
            Kéo thả tài liệu vào đây, hoặc{' '}
            <button type="button" className={styles.uploadBrowseBtn} onClick={() => inputRef.current?.click()}>
              Chọn tệp
            </button>
          </p>
          <p className={styles.uploadHint}>Hỗ trợ PDF và ảnh · tối đa 50MB mỗi tệp</p>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              // Reset để chọn lại đúng tệp vừa gỡ vẫn kích hoạt onChange.
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className={styles.uploadFileList}>
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className={styles.uploadFileItem}>
                <span className={styles.uploadFileIcon}>
                  {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                </span>
                <span className={styles.uploadFileBody}>
                  <span className={styles.uploadFileName}>{file.name}</span>
                  <span className={styles.uploadFileMeta}>{formatSize(file.size)}</span>
                </span>
                <button
                  type="button"
                  className={styles.uploadRemoveBtn}
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={uploading}
                  title="Bỏ tệp này"
                  aria-label={`Bỏ ${file.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className={styles.uploadFooter}>
          <button type="button" className={styles.uploadGhostBtn} onClick={onClose} disabled={uploading}>
            Huỷ
          </button>
          <button
            type="button"
            className={styles.uploadPrimaryBtn}
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={14} className={styles.practiceSpin} />
                Đang tải lên…
              </>
            ) : (
              `Tải lên${files.length > 0 ? ` (${files.length})` : ''}`
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default UploadMaterialModal;
