import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Checkbox, Button } from 'antd';
import { toast } from 'react-toastify';
import {
  submitClassSessionReport,
  type SubmitReportRequest,
  type ClassSessionDetailResponse,
} from '../../../services/classSession.service';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './LessonReportForm.module.css';

const { TextArea } = Input;

interface LessonReportFormProps {
  classSessionId: number;
  attachmentUrls?: string[];
  onSubmitSuccess: (detail: ClassSessionDetailResponse) => void;
  onCancel?: () => void;
}

interface ReportFormValues {
  lessonContent: string;
  homework?: string;
  tutorNotes?: string;
  isStudentPresent?: boolean;
  attendanceNote?: string;
}

const LessonReportForm: React.FC<LessonReportFormProps> = ({
  classSessionId,
  attachmentUrls,
  onSubmitSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<Partial<ReportFormValues>>(
    `draft_lesson_report_${classSessionId}`,
  );

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      form.setFieldsValue(draft);
    }
  }, [loadDraft, form]);

  // Auto-save draft on field changes
  const handleValuesChange = useCallback(
    (_: Partial<ReportFormValues>, allValues: Partial<ReportFormValues>) => {
      saveDraft(allValues);
    },
    [saveDraft],
  );

  const handleSubmit = async (values: ReportFormValues) => {
    try {
      setSubmitting(true);
      const request: SubmitReportRequest = {
        contentCovered: values.lessonContent,
        homeworkAssigned: values.homework || '',
        tutorNotes: values.tutorNotes || '',
        isStudentPresent: values.isStudentPresent ?? true,
        attendanceNote: values.attendanceNote || '',
        attachments: attachmentUrls && attachmentUrls.length > 0 ? attachmentUrls : undefined,
      };
      const response = await submitClassSessionReport(classSessionId, request);
      toast.success('Nộp báo cáo buổi học thành công!');
      clearDraft();
      onSubmitSuccess(response.content);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Không thể nộp báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span>Nội dung buổi học</span>
        <h3>Báo cáo buổi học</h3>
        <p>Báo cáo sẽ được gửi tới học sinh và phụ huynh để xác nhận.</p>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{ isStudentPresent: true }}
        className={styles.form}
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

        <div className={styles.actions}>
          {onCancel && (
            <Button onClick={onCancel} className={styles.cancelButton}>
              Hủy
            </Button>
          )}
          <Button type="primary" htmlType="submit" loading={submitting} className={styles.submitButton}>
            Nộp báo cáo
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default LessonReportForm;
