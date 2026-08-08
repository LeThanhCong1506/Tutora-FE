import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button } from 'antd';
import { toast } from 'react-toastify';
import {
  submitClassSessionReport,
  type SubmitReportRequest,
  type ClassSessionDetailResponse,
  type ReportAttachment,
} from '../../../services/classSession.service';
import { useFormDraft } from '../../../hooks/useFormDraft';
import AttachmentUploader from './AttachmentUploader';
import styles from './LessonReportForm.module.css';

const { TextArea } = Input;

interface LessonReportFormProps {
  classSessionId: number;
  attachments?: ReportAttachment[];
  onUploadComplete?: (attachment: ReportAttachment) => void;
  onRemoveComplete?: (url: string) => void;
  onDescriptionChange?: (url: string, description: string) => void;
  onSubmitSuccess: (detail: ClassSessionDetailResponse) => void;
  onCancel?: () => void;
}

interface ReportFormValues {
  lessonContent: string;
  homework?: string;
  tutorNotes?: string;
}

const LessonReportForm: React.FC<LessonReportFormProps> = ({
  classSessionId,
  attachments,
  onUploadComplete,
  onRemoveComplete,
  onDescriptionChange,
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
        // Nộp được báo cáo nghĩa là buổi học đã diễn ra với học sinh — không cần hỏi lại điểm danh.
        isStudentPresent: true,
        attendanceNote: '',
        attachmentDetails: attachments && attachments.length > 0 ? attachments : undefined,
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
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

        <div className={styles.attachmentSection}>
          <AttachmentUploader
            classSessionId={classSessionId}
            onUploadComplete={onUploadComplete}
            onRemoveComplete={onRemoveComplete}
            onDescriptionChange={onDescriptionChange}
          />
        </div>

        <Form.Item name="tutorNotes" label="Ghi chú">
          <TextArea rows={2} placeholder="Ghi chú thêm về buổi học..." />
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
