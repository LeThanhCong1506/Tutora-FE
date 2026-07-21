import React, { useState } from 'react';
import { Modal, Radio, Button } from 'antd';
import { toast } from 'react-toastify';
import { processNoShowAction, type NoShowActionRequest } from '../../../services/parent-lesson.service';

interface NoShowActionModalProps {
  open: boolean;
  lessonId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ACTION_OPTIONS = [
  {
    value: 'free_session',
    label: 'Hoàn tiền & hủy buổi',
    description: 'Hoàn 100% tiền buổi học về ví của bạn. Buổi học sẽ bị hủy và gia sư sẽ bị cảnh báo.',
  },
  {
    value: 'makeup',
    label: 'Dời lịch (buổi bù)',
    description: 'Tạo một buổi bù mới với cùng gia sư. Tiền giữ nguyên cho buổi bù, không cảnh báo gia sư.',
  },
  {
    value: 'change_tutor',
    label: 'Đổi gia sư',
    description: 'Hủy toàn bộ booking, hoàn tiền các buổi còn lại. Gia sư sẽ bị cảnh báo.',
  },
];

const NoShowActionModal: React.FC<NoShowActionModalProps> = ({
  open,
  lessonId,
  onSuccess,
  onCancel,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAction) {
      toast.warn('Vui lòng chọn hành động.');
      return;
    }

    try {
      setSubmitting(true);
      await processNoShowAction(lessonId, { actionType: selectedAction as NoShowActionRequest["actionType"] });
      toast.success('Đã xử lý thành công!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Chọn hành động xử lý"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          Gia sư đã được xác nhận vắng mặt. Bạn muốn xử lý như thế nào?
        </p>

        <Radio.Group
          onChange={(e) => setSelectedAction(e.target.value)}
          value={selectedAction}
          style={{ width: '100%' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ACTION_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                style={{
                  padding: '12px 16px',
                  border: selectedAction === opt.value ? '2px solid #3e2f28' : '1px solid #e8e8e8',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => setSelectedAction(opt.value)}
              >
                <Radio value={opt.value}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{opt.label}</span>
                </Radio>
                <p style={{ marginLeft: '24px', marginTop: '4px', fontSize: '13px', color: '#999' }}>
                  {opt.description}
                </p>
              </div>
            ))}
          </div>
        </Radio.Group>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleSubmit}
            disabled={!selectedAction}
            style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NoShowActionModal;
