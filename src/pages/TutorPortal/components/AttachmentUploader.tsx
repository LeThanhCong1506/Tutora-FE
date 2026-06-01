import React, { useState } from 'react';
import { Upload, Button } from 'antd';
import { toast } from 'react-toastify';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadLessonAttachment } from '../../../services/lesson.service';

interface AttachmentUploaderProps {
  lessonId: number;
  onUploadComplete?: (url: string) => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  lessonId,
  onUploadComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const response = await uploadLessonAttachment(lessonId, file);
      const url = response.content || '';
      setUploadedFiles((prev) => [...prev, { name: file.name, url }]);
      toast.success(`Tải lên ${file.name} thành công!`);
      onUploadComplete?.(url);
    } catch (error: any) {
      toast.error(`Tải lên ${file.name} thất bại.`);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleRemove = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid rgba(26,34,56,0.1)' }}>
      <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#1a2238' }}>
        Tài liệu đính kèm
      </h4>

      <Upload
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
        showUploadList={false}
        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
        multiple
      >
        <Button icon={<UploadOutlined />} loading={uploading} style={{ marginBottom: '12px' }}>
          Chọn file đính kèm
        </Button>
      </Upload>

      {uploadedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#333' }}>{file.name}</span>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
