import React, { useState } from 'react';
import { Modal, Button, DatePicker, Input, Upload } from 'antd';
import viVN from 'antd/es/date-picker/locale/vi_VN';
import { UploadOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { reportNoShow } from '../../../services/parent-lesson.service';

dayjs.locale('vi');

const { TextArea } = Input;

interface ReportNoShowModalProps {
  open: boolean;
  lessonId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReportNoShowModal: React.FC<ReportNoShowModalProps> = ({
  open,
  lessonId,
  onSuccess,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [reportedAt, setReportedAt] = useState<Dayjs>(() => dayjs());
  const [reason, setReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const resetForm = () => {
    setReportedAt(dayjs());
    setReason('');
    setEvidenceFiles([]);
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleReport = async () => {
    try {
      setSubmitting(true);
      await reportNoShow(lessonId, {
        reportedAt: reportedAt.toISOString(),
        reason: reason.trim() || undefined,
      }, evidenceFiles);

      toast.success('Đã báo cáo gia sư vắng mặt.');
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Báo cáo vắng mặt"
      open={open}
      onCancel={handleCancel}
      footer={null}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          Xác nhận gia sư không có mặt cho buổi học này?
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
            Thời điểm gia sư vắng mặt
          </label>
          <DatePicker
            showTime
            format="HH:mm DD/MM/YYYY"
            value={reportedAt}
            onChange={(value) => value && setReportedAt(value)}
            style={{ width: '100%' }}
            allowClear={false}
            locale={viVN}
            popupClassName="time-picker-with-labels"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
            Lý do (tùy chọn)
          </label>
          <TextArea
            rows={3}
            placeholder="Mô tả thêm về việc gia sư vắng mặt..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
            Bằng chứng (tùy chọn)
          </label>
          <Upload
            beforeUpload={(file) => {
              setEvidenceFiles((prev) => [...prev, file]);
              return false;
            }}
            onRemove={(file) => {
              setEvidenceFiles((prev) => prev.filter((f) => f.name !== file.name));
            }}
            accept="image/*,.pdf"
            multiple
          >
            <Button icon={<UploadOutlined />}>Tải lên bằng chứng</Button>
          </Upload>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button onClick={handleCancel}>Hủy</Button>
          <Button type="primary" danger loading={submitting} onClick={handleReport}>
            Xác nhận báo vắng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportNoShowModal;
