import React, { useState } from 'react';
import { Upload, Button, Input } from 'antd';
import { toast } from 'react-toastify';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadClassSessionAttachment, type ReportAttachment } from '../../../services/classSession.service';
import styles from './AttachmentUploader.module.css';

interface AttachmentUploaderProps {
  classSessionId: number;
  onUploadComplete?: (attachment: ReportAttachment) => void;
  onRemoveComplete?: (url: string) => void;
  /** Gọi khi gia sư sửa mô tả của một tệp đã tải lên. */
  onDescriptionChange?: (url: string, description: string) => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  classSessionId,
  onUploadComplete,
  onRemoveComplete,
  onDescriptionChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; description: string }[]>([]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const response = await uploadClassSessionAttachment(classSessionId, file);
      const url = response.content || '';
      setUploadedFiles((prev) => [...prev, { name: file.name, url, description: '' }]);
      toast.success(`Tải lên ${file.name} thành công!`);
      onUploadComplete?.({ url, description: null });
    } catch {
      toast.error(`Tải lên ${file.name} thất bại.`);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleRemove = (index: number) => {
    const removedFile = uploadedFiles[index];
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (removedFile) onRemoveComplete?.(removedFile.url);
  };

  const handleDescriptionChange = (index: number, description: string) => {
    setUploadedFiles((prev) => prev.map((item, i) => (i === index ? { ...item, description } : item)));
    const target = uploadedFiles[index];
    if (target) onDescriptionChange?.(target.url, description);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h4>Tài liệu đính kèm</h4>
        </div>
        <small>Ảnh, PDF hoặc Word</small>
      </div>

      <Upload
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
        showUploadList={false}
        accept="image/*,.pdf,.doc,.docx"
        multiple
      >
        <Button icon={<UploadOutlined />} loading={uploading} className={styles.uploadButton}>
          Chọn file đính kèm
        </Button>
      </Upload>

      {uploadedFiles.length > 0 && (
        <div className={styles.fileList}>
          {uploadedFiles.map((file, index) => (
            <div key={file.url} className={styles.fileRow}>
              <div className={styles.fileHead}>
                <span className={styles.fileName}>{file.name}</span>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(index)}
                  aria-label={`Xóa tệp ${file.name}`}
                />
              </div>
              {/* Tên file do storage sinh ra rất khó đọc; mô tả này là thứ phụ huynh nhìn thấy. */}
              <Input
                className={styles.descriptionInput}
                size="small"
                maxLength={120}
                value={file.description}
                placeholder="Mô tả ngắn (vd: Đề bài buổi 5) — phụ huynh sẽ thấy dòng này"
                aria-label={`Mô tả cho tệp ${file.name}`}
                onChange={(event) => handleDescriptionChange(index, event.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
