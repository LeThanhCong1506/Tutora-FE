import React, { useState } from 'react';
import { Upload, Button } from 'antd';
import { toast } from 'react-toastify';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadClassSessionAttachment } from '../../../services/classSession.service';
import styles from './AttachmentUploader.module.css';

interface AttachmentUploaderProps {
  classSessionId: number;
  onUploadComplete?: (url: string) => void;
  onRemoveComplete?: (url: string) => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  classSessionId,
  onUploadComplete,
  onRemoveComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const response = await uploadClassSessionAttachment(classSessionId, file);
      const url = response.content || '';
      setUploadedFiles((prev) => [...prev, { name: file.name, url }]);
      toast.success(`Tải lên ${file.name} thành công!`);
      onUploadComplete?.(url);
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
            <div key={file.url}>
              <span>{file.name}</span>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(index)}
                aria-label={`Xóa tệp ${file.name}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
