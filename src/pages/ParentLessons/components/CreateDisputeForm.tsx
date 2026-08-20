import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, Button, Tag } from 'antd';
import { toast } from 'react-toastify';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createDispute } from '../../../services/parent-lesson.service';
import {
  createTutorClassSessionDispute,
  getParentCalendar,
  type CalendarClassSessionResponse,
  type CreateDisputeRequest,
} from '../../../services/classSession.service';
import { getClassSessionStatusMeta } from '../../../utils/classSessionStatus';

const { TextArea } = Input;

interface CreateDisputeFormProps {
  open: boolean;
  /** Bỏ qua nếu muốn người dùng tự chọn buổi học ngay trong popup (xem `lessonId`/`ELIGIBLE_STATUSES` bên dưới). */
  lessonId?: number;
  onSuccess: () => void;
  onCancel: () => void;
  /** Ai đang tạo khiếu nại — quyết định API gọi và nhãn hiển thị. Mặc định 'parent' (phụ huynh/học
   * sinh) để không phá các chỗ đang dùng form này. Khi 'tutor', bắt buộc phải kèm sẵn `lessonId`
   * (không hỗ trợ chọn buổi học ngay trong popup ở chiều này). */
  viewerRole?: 'parent' | 'tutor';
}

/** Chỉ những buổi học ở 2 trạng thái này mới được phép tạo khiếu nại — khớp với BE (CreateDisputeAsync). */
const ELIGIBLE_STATUSES = ['pending_confirmation', 'completed'];
const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled', 'cancelled_noshow'];

const PARENT_DISPUTE_TYPES = [
  { value: 'no_show', label: 'Gia sư vắng mặt' },
  { value: 'quality', label: 'Chất lượng buổi học' },
  { value: 'payment', label: 'Vấn đề thanh toán' },
  { value: 'other', label: 'Khác' },
];

const TUTOR_DISPUTE_TYPES = [
  { value: 'no_show', label: 'Học sinh/phụ huynh vắng mặt' },
  { value: 'quality', label: 'Vấn đề trong buổi học' },
  { value: 'payment', label: 'Vấn đề thanh toán' },
  { value: 'other', label: 'Khác' },
];

/** Thẻ gợi ý lý do mặc định — tick vào sẽ điền thẳng vào ô "Lý do" bên trên. */
const PARENT_QUICK_REASONS = [
  'Gia sư vắng mặt',
  'Gia sư đến trễ',
  'Chất lượng buổi học không tốt',
  'Gia sư dạy không đúng nội dung đã thỏa thuận',
  'Gia sư có thái độ không phù hợp',
  'Buổi học bị gián đoạn do lỗi kỹ thuật',
  'Vấn đề về thanh toán',
  'Bị tính phí sai',
];

const TUTOR_QUICK_REASONS = [
  'Học sinh vắng mặt',
  'Học sinh/phụ huynh đến trễ',
  'Học sinh/phụ huynh có thái độ không phù hợp',
  'Buổi học bị gián đoạn do lỗi từ phía học sinh',
  'Chưa thanh toán đúng hạn',
];

const CreateDisputeForm: React.FC<CreateDisputeFormProps> = ({
  open,
  lessonId,
  onSuccess,
  onCancel,
  viewerRole = 'parent',
}) => {
  const isTutor = viewerRole === 'tutor';
  const DISPUTE_TYPES = isTutor ? TUTOR_DISPUTE_TYPES : PARENT_DISPUTE_TYPES;
  const DEFAULT_QUICK_REASONS = isTutor ? TUTOR_QUICK_REASONS : PARENT_QUICK_REASONS;
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [customReasons, setCustomReasons] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Chọn buổi học ngay trong popup khi không có sẵn lessonId (vd bấm "+" từ trang "Khiếu nại của tôi").
  // Chiều gia sư luôn được mở kèm sẵn lessonId (từ trang chi tiết buổi học), không hỗ trợ chọn ở đây.
  const needsLessonPicker = !isTutor && lessonId == null;
  const [lessons, setLessons] = useState<CalendarClassSessionResponse[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  useEffect(() => {
    if (!open || !needsLessonPicker) return;
    let cancelled = false;
    (async () => {
      try {
        setLessonsLoading(true);
        // 6 tháng gần nhất là đủ để bao các buổi có thể khiếu nại (pending_confirmation/completed
        // đều là buổi đã diễn ra hoặc sắp tới rất gần).
        const startDate = dayjs().subtract(6, 'month').format('YYYY-MM-DD');
        const endDate = dayjs().format('YYYY-MM-DD');
        const res = await getParentCalendar(startDate, endDate);
        const eligible = (res.content || [])
          .flatMap((day) => day.classSessions)
          .filter((l) =>
            l.status
            && ELIGIBLE_STATUSES.includes(l.status)
            && !TERMINAL_BOOKING_STATUSES.includes((l.bookingStatus || '').toLowerCase()),
          )
          .sort((a, b) => dayjs(b.scheduledStart).valueOf() - dayjs(a.scheduledStart).valueOf());
        if (!cancelled) setLessons(eligible);
      } catch {
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLessonsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, needsLessonPicker]);

  const quickReasons = [...DEFAULT_QUICK_REASONS, ...customReasons];

  const resetDisputeState = () => {
    form.resetFields();
    setEvidenceFiles([]);
    setCustomReasons([]);
    setSelectedReasons([]);
    setAddingCustom(false);
    setCustomInput('');
  };

  const handleCancel = () => {
    resetDisputeState();
    onCancel();
  };

  /** Tick thẻ gợi ý: thêm/xóa đúng dòng đó trong ô "Lý do" — không đụng vào các dòng khác người dùng đã tự gõ. */
  const applyReasonToggle = (phrase: string, checked: boolean) => {
    const current = (form.getFieldValue('reason') as string | undefined) || '';
    const lines = current.split('\n').filter((line) => line.trim() !== '');

    const nextLines = checked
      ? lines.some((line) => line.trim() === phrase)
        ? lines
        : [...lines, phrase]
      : lines.filter((line) => line.trim() !== phrase);

    form.setFieldValue('reason', nextLines.join('\n'));
    // setFieldValue doesn't re-run validation on its own, so a "Vui lòng nhập lý do..." error
    // already showing (e.g. after a failed submit) would otherwise linger even once a tag fills it in.
    form.validateFields(['reason']).catch(() => {});
  };

  const handleToggleReason = (phrase: string, checked: boolean) => {
    setSelectedReasons((prev) =>
      checked ? (prev.includes(phrase) ? prev : [...prev, phrase]) : prev.filter((p) => p !== phrase),
    );
    applyReasonToggle(phrase, checked);
  };

  const handleAddCustomReason = () => {
    const label = customInput.trim().slice(0, 60);
    setAddingCustom(false);
    setCustomInput('');
    if (!label) return;

    setCustomReasons((prev) =>
      prev.some((r) => r.toLowerCase() === label.toLowerCase()) ||
      DEFAULT_QUICK_REASONS.some((r) => r.toLowerCase() === label.toLowerCase())
        ? prev
        : [...prev, label],
    );
    handleToggleReason(label, true);
  };

  const handleSubmit = async (values: any) => {
    const targetLessonId = lessonId ?? values.lessonId;
    if (!targetLessonId) {
      toast.error('Vui lòng chọn buổi học cần khiếu nại.');
      return;
    }

    try {
      setSubmitting(true);

      const request: CreateDisputeRequest = { disputeType: values.disputeType, reason: values.reason };
      if (isTutor) {
        await createTutorClassSessionDispute(targetLessonId, request, evidenceFiles);
      } else {
        await createDispute(targetLessonId, request, evidenceFiles);
      }

      toast.success('Khiếu nại đã được gửi thành công!');
      resetDisputeState();
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
      onCancel={handleCancel}
      footer={null}
      centered
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ paddingTop: '8px' }}>
        {needsLessonPicker && (
          <Form.Item
            name="lessonId"
            label="Buổi học"
            rules={[{ required: true, message: 'Vui lòng chọn buổi học cần khiếu nại' }]}
          >
            <Select
              showSearch
              loading={lessonsLoading}
              placeholder="Tìm theo môn học hoặc tên gia sư..."
              notFoundContent={lessonsLoading ? 'Đang tải...' : 'Không có buổi học nào có thể khiếu nại'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={lessons.map((l) => {
                const meta = getClassSessionStatusMeta(l.status);
                return {
                  value: l.classSessionId,
                  label: `${dayjs(l.scheduledStart).format('DD/MM/YYYY HH:mm')} · ${l.subjectName || 'N/A'} · Gia sư ${l.tutorName || 'N/A'} · ${meta.label}`,
                };
              })}
            />
          </Form.Item>
        )}

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
          style={{ marginBottom: 8 }}
          rules={[{ required: true, message: 'Vui lòng nhập lý do khiếu nại' }]}
        >
          <TextArea rows={4} placeholder="Mô tả chi tiết lý do khiếu nại..." />
        </Form.Item>

        <p style={{ fontSize: '12px', color: '#999', margin: '-4px 0 12px' }}>
          Lưu ý: thông tin gửi cho admin sẽ kèm theo thông tin chi tiết buổi học, bạn không cần mô tả lại các thông tin đó.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {quickReasons.map((phrase) => (
            <Tag.CheckableTag
              key={phrase}
              checked={selectedReasons.includes(phrase)}
              onChange={(checked) => handleToggleReason(phrase, checked)}
            >
              {phrase}
            </Tag.CheckableTag>
          ))}
          {addingCustom ? (
            <Input
              size="small"
              autoFocus
              style={{ width: 180 }}
              maxLength={60}
              value={customInput}
              placeholder="Nhập rồi nhấn Enter..."
              onChange={(e) => setCustomInput(e.target.value)}
              onPressEnter={handleAddCustomReason}
            />
          ) : (
            <Tag
              onClick={() => setAddingCustom(true)}
              style={{ cursor: 'pointer', borderStyle: 'dashed', background: 'transparent' }}
            >
              + Thêm lý do
            </Tag>
          )}
        </div>

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
          <Button onClick={handleCancel}>Hủy</Button>
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
