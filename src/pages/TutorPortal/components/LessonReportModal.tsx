import React, { useState } from 'react';
import { Modal } from 'antd';
import LessonReportForm from './LessonReportForm';
import type { ClassSessionDetailResponse, ReportAttachment } from '../../../services/classSession.service';

interface LessonReportModalProps {
  open: boolean;
  classSessionId: number;
  /**
   * Gia sư đóng modal mà chưa nộp. Bản nháp trong form vẫn được giữ, và báo cáo
   * viết lại được ở trang chi tiết buổi học — nên đây không phải huỷ hẳn.
   */
  onSkip: () => void;
  onSubmitted: (detail: ClassSessionDetailResponse) => void;
}

/**
 * Form báo cáo buổi học dạng modal, dùng ngay khi gia sư bấm "Kết thúc buổi học"
 * trong phòng live. Bọc lại `LessonReportForm` (cùng form với trang chi tiết buổi
 * học) và tự giữ danh sách tệp đính kèm đã upload nhưng chưa nộp.
 *
 * `maskClosable={false}`: bấm nhầm ra ngoài giữa lúc đang gõ báo cáo thì mất công
 * viết lại — muốn thoát thì bấm "Để sau" hoặc nút X.
 */
const LessonReportModal: React.FC<LessonReportModalProps> = ({ open, classSessionId, onSkip, onSubmitted }) => {
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);

  return (
    <Modal
      open={open}
      onCancel={onSkip}
      title="Báo cáo buổi học"
      footer={null}
      width={640}
      centered
      maskClosable={false}
    >
      <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        Buổi học đã kết thúc. Ghi lại nội dung ngay lúc còn nhớ rõ — chưa viết bây giờ cũng được, báo cáo vẫn mở ở
        trang chi tiết buổi học.
      </p>
      <LessonReportForm
        classSessionId={classSessionId}
        attachments={attachments}
        onUploadComplete={(attachment) => setAttachments((current) => [...current, attachment])}
        onDescriptionChange={(url, description) =>
          setAttachments((current) => current.map((item) => (item.url === url ? { ...item, description } : item)))
        }
        onRemoveComplete={(url) => setAttachments((current) => current.filter((item) => item.url !== url))}
        onSubmitSuccess={onSubmitted}
        onCancel={onSkip}
        cancelText="Để sau"
      />
    </Modal>
  );
};

export default LessonReportModal;
