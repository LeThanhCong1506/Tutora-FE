import React, { useState } from 'react';
import { Modal, Form, Input, Select, Upload, Button } from 'antd';
import { toast } from 'react-toastify';
import { UploadOutlined } from '@ant-design/icons';
import { createDispute, uploadDisputeEvidence } from '../../../services/parent-lesson.service';

const { TextArea } = Input;

interface CreateDisputeFormProps {
  open: boolean;
  lessonId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const DISPUTE_TYPES = [
  { value: 'no_show', label: 'Gia sư vắng mặt' },
  { value: 'quality', label: 'Chất lượng buổi học' },
  { value: 'payment', label: 'Vấn đề thanh toán' },
  { value: 'other', label: 'Khác' },
];

const CreateDisputeForm: React.FC<CreateDisputeFormProps> = ({
  open,
  lessonId,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      // Upload evidence files first
      const evidenceUrls: string[] = [];
      for (const file of evidenceFiles) {
        try {
          const res = await uploadDisputeEvidence(lessonId, file);
          if (res.content) evidenceUrls.push(res.content);
        } catch {
          // Continue even if one upload fails
        }
      }

      await createDispute(lessonId, {
        disputeType: values.disputeType,
        reason: values.reason,
        evidence: evidenceUrls,
      });

      toast.success('Khiếu nại đã được gửi thành công!');
      form.resetFields();
      setEvidenceFiles([]);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi khiếu nại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo khiếu nại"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ paddingTop: '8px' }}>
        <Form.Item
          name="disputeType"
          label="Loại khiếu nại"
          rules={[{ required: true, message: 'Vui lòng chọn loại khiếu nại' }]}
        >
          <Select placeholder="Chọn loại khiếu nại" options={DISPUTE_TYPES} />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do"
          rules={[{ required: true, message: 'Vui lòng nhập lý do khiếu nại' }]}
        >
          <TextArea rows={4} placeholder="Mô tả chi tiết lý do khiếu nại..." />
        </Form.Item>

        <Form.Item label="Bằng chứng (tùy chọn)">
          <Upload
            beforeUpload={(file) => {
              setEvidenceFiles(prev => [...prev, file]);
              return false;
            }}
            onRemove={(file) => {
              setEvidenceFiles(prev => prev.filter(f => f.name !== file.name));
            }}
            accept="image/*,.pdf"
            multiple
          >
            <Button icon={<UploadOutlined />}>Tải lên bằng chứng</Button>
          </Upload>
        </Form.Item>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            danger
          >
            Gửi khiếu nại
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateDisputeForm;
