import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { toast } from 'react-toastify';
import { reportNoShow } from '../../../services/parent-lesson.service';

interface ReportNoShowModalProps {
  open: boolean;
  lessonId: number;
  scheduledStart: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReportNoShowModal: React.FC<ReportNoShowModalProps> = ({
  open,
  lessonId,
  scheduledStart,
  onSuccess,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    try {
      setSubmitting(true);
      await reportNoShow(lessonId);
      toast.success('Đã báo cáo gia sư vắng mặt.');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const startTime = new Date(scheduledStart);

  return (
    <Modal
      title="Báo cáo vắng mặt"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ marginBottom: '8px', color: '#666' }}>
          Gia sư không có mặt cho buổi học lúc{' '}
          <strong>{startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
          {' ngày '}
          <strong>{startTime.toLocaleDateString('vi-VN')}</strong>?
        </p>
        <p style={{ marginBottom: '20px', color: '#999', fontSize: '13px' }}>
          Chức năng này chỉ khả dụng khi đã qua 15 phút sau giờ bắt đầu buổi học và gia sư chưa check-in.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" danger loading={submitting} onClick={handleReport}>
            Xác nhận báo vắng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportNoShowModal;
