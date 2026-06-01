import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { toast } from 'react-toastify';
import { confirmLesson } from '../../../services/parent-lesson.service';

interface ConfirmLessonModalProps {
  open: boolean;
  lessonId: number;
  subjectName?: string;
  tutorName?: string;
  lessonPrice?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ConfirmLessonModal: React.FC<ConfirmLessonModalProps> = ({
  open,
  lessonId,
  subjectName,
  tutorName,
  lessonPrice,
  onSuccess,
  onCancel,
}) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await confirmLesson(lessonId);
      toast.success('Xác nhận buổi học thành công!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xác nhận buổi học.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      title="Xác nhận buổi học"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          Bạn xác nhận buổi học đã diễn ra và đồng ý thanh toán cho gia sư?
        </p>

        <div style={{
          background: '#f9f9f9', borderRadius: '8px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px',
        }}>
          {subjectName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#999', fontSize: '13px' }}>Môn học</span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{subjectName}</span>
            </div>
          )}
          {tutorName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#999', fontSize: '13px' }}>Gia sư</span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{tutorName}</span>
            </div>
          )}
          {lessonPrice != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#999', fontSize: '13px' }}>Giá buổi học</span>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#52c41a' }}>
                {lessonPrice.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button
            type="primary"
            loading={confirming}
            onClick={handleConfirm}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmLessonModal;
