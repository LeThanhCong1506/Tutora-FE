import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Checkbox, Button } from 'antd';
import { toast } from 'react-toastify';
import { submitLessonReport, type SubmitReportRequest } from '../../../services/lesson.service';
import { useFormDraft } from '../../../hooks/useFormDraft';

const { TextArea } = Input;

interface LessonReportFormProps {
  lessonId: number;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
}

const LessonReportForm: React.FC<LessonReportFormProps> = ({
  lessonId,
  onSubmitSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<Record<string, any>>(`draft_lesson_report_${lessonId}`);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      form.setFieldsValue(draft);
    }
  }, [loadDraft, form]);

  // Auto-save draft on field changes
  const handleValuesChange = useCallback((_: any, allValues: any) => {
    saveDraft(allValues);
  }, [saveDraft]);

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const request: SubmitReportRequest = {
        contentCovered: values.lessonContent,
        homeworkAssigned: values.homework || '',
        tutorNotes: values.tutorNotes || '',
        isStudentPresent: values.isStudentPresent ?? true,
        attendanceNote: values.attendanceNote || '',
      };
      await submitLessonReport(lessonId, request);
      toast.success('Nộp báo cáo buổi học thành công!');
      clearDraft();
      onSubmitSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể nộp báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid rgba(26,34,56,0.1)' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#1a2238' }}>
        Báo cáo buổi học
      </h3>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{ isStudentPresent: true }}
      >
        <Form.Item
          name="lessonContent"
          label="Nội dung đã dạy"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung đã dạy' }]}
        >
          <TextArea rows={4} placeholder="Mô tả nội dung buổi học..." />
        </Form.Item>

        <Form.Item name="homework" label="Bài tập về nhà">
          <TextArea rows={3} placeholder="Bài tập giao cho học sinh (nếu có)..." />
        </Form.Item>

        <Form.Item name="tutorNotes" label="Ghi chú">
          <TextArea rows={2} placeholder="Ghi chú thêm về buổi học..." />
        </Form.Item>

        <Form.Item name="isStudentPresent" valuePropName="checked">
          <Checkbox>Học sinh có mặt</Checkbox>
        </Form.Item>

        <Form.Item name="attendanceNote" label="Ghi chú điểm danh">
          <Input placeholder="Ghi chú về việc tham gia của học sinh..." />
        </Form.Item>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {onCancel && (
            <Button onClick={onCancel}>Hủy</Button>
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{ background: '#3e2f28', borderColor: '#3e2f28' }}
          >
            Nộp báo cáo
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default LessonReportForm;
