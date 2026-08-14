import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Input, Button } from 'antd';
import { toast } from 'react-toastify';
import {
  submitClassSessionReport,
  triggerReportAiFill,
  getReportAiFillStatus,
  type SubmitReportRequest,
  type ClassSessionDetailResponse,
  type ReportAttachment,
  type ClassSessionAiJobResponse,
  type TutorReportAiFillResult,
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
  /** Nhãn nút phụ. Trong modal cuối buổi là "Để sau" chứ không phải huỷ hẳn. */
  cancelText?: string;
}

interface ReportFormValues {
  lessonContent: string;
  homework?: string;
  tutorNotes?: string;
}

type AiFillableField = keyof ReportFormValues;
type AiJobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

const LessonReportForm: React.FC<LessonReportFormProps> = ({
  classSessionId,
  attachments,
  onUploadComplete,
  onRemoveComplete,
  onDescriptionChange,
  onSubmitSuccess,
  onCancel,
  cancelText = 'Hủy',
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<Partial<ReportFormValues>>(
    `draft_lesson_report_${classSessionId}`,
  );

  // Điền bằng AI: mỗi field có dấu "*" riêng — bấm field nào thì chỉ field đó được điền, không
  // phải điền hết cả form 1 lượt. Cả 3 field vẫn dùng chung 1 lần gọi Gemini (aiResult) — bấm
  // field khác sau khi đã có kết quả thì áp dụng ngay, không phải chờ lại.
  const [aiResult, setAiResult] = useState<TutorReportAiFillResult | null>(null);
  const [aiJobStatus, setAiJobStatus] = useState<AiJobStatus>('idle');
  const [aiAppliedFields, setAiAppliedFields] = useState<Set<AiFillableField>>(new Set());
  // Field nào đang "chờ" được áp dụng khi job xong — dùng ref vì chỉ đọc trong callback polling,
  // không cần re-render khi thay đổi.
  const pendingAiFieldsRef = useRef<Set<AiFillableField>>(new Set());

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

  // Ant Design chỉ bắn onValuesChange khi người dùng tự gõ, KHÔNG bắn khi code gọi setFieldsValue —
  // nên nội dung AI điền không tự vào nháp. Không lưu tay ở đây thì gia sư F5 là mất sạch phần AI vừa
  // điền (trừ khi tình cờ gõ thêm chữ nào đó sau đó, nên lỗi lúc gặp lúc không).
  const applyAiPatch = useCallback((patch: Partial<ReportFormValues>) => {
    form.setFieldsValue(patch);
    saveDraft(form.getFieldsValue() as Partial<ReportFormValues>);
  }, [form, saveDraft]);

  const applyAiJob = useCallback((job: ClassSessionAiJobResponse) => {
    setAiJobStatus(job.status === 'none' ? 'idle' : job.status);

    if (job.status === 'failed') {
      pendingAiFieldsRef.current.clear();
      return;
    }

    if (job.status === 'completed' && job.resultJson) {
      setAiResult(job.resultJson);
      const fieldsToApply = Array.from(pendingAiFieldsRef.current);
      if (fieldsToApply.length > 0) {
        const patch: Partial<ReportFormValues> = {};
        fieldsToApply.forEach((field) => {
          patch[field] = job.resultJson![field];
        });
        applyAiPatch(patch);
        setAiAppliedFields((prev) => {
          const next = new Set(prev);
          fieldsToApply.forEach((field) => next.add(field));
          return next;
        });
      }
      pendingAiFieldsRef.current.clear();
    }
  }, [applyAiPatch]);

  // Lấy trạng thái job khi mở form. Không có bước này thì job chạy nền bị "quên" mỗi lần rời trang/F5:
  // aiJobStatus quay về 'idle' nên nút "*" sáng lại như chưa từng bấm, và kết quả xong trong lúc gia sư
  // đi vắng cũng không được lấy về. pendingAiFieldsRef lúc này rỗng nên applyAiJob chỉ nạp sẵn aiResult
  // chứ không tự điền — đúng ý, không đè lên nội dung gia sư đang gõ dở.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await getReportAiFillStatus(classSessionId);
        if (!cancelled) applyAiJob(response.content);
      } catch (error) {
        console.error('Failed to load AI report fill status', error);
      }
    })();
    return () => { cancelled = true; };
  }, [classSessionId, applyAiJob]);

  // Poll trong lúc Gemini đang xử lý (video có thể vài tiếng, mất vài phút) — dừng khi có kết quả.
  useEffect(() => {
    if (aiJobStatus !== 'pending' && aiJobStatus !== 'processing') return;
    const timer = window.setInterval(async () => {
      try {
        const response = await getReportAiFillStatus(classSessionId);
        applyAiJob(response.content);
      } catch (error) {
        console.error('Failed to poll AI report fill status', error);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [aiJobStatus, classSessionId, applyAiJob]);

  const handleAiFillField = async (field: AiFillableField) => {
    // Đã có kết quả sẵn (field khác trigger trước đó, hoặc job cũ vừa nạp lúc mở form) — áp dụng ngay,
    // không cần gọi lại API.
    if (aiResult) {
      applyAiPatch({ [field]: aiResult[field] });
      setAiAppliedFields((prev) => new Set(prev).add(field));
      return;
    }

    pendingAiFieldsRef.current.add(field);
    if (aiJobStatus === 'pending' || aiJobStatus === 'processing') return;

    setAiJobStatus('pending');
    try {
      const response = await triggerReportAiFill(classSessionId);
      applyAiJob(response.content);
    } catch (error: unknown) {
      setAiJobStatus('failed');
      pendingAiFieldsRef.current.clear();
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Không thể gợi ý nội dung bằng AI. Vui lòng thử lại.');
    }
  };

  const renderLabel = (field: AiFillableField, text: string) => (
    <span>
      {text}
      {!aiAppliedFields.has(field) && (
        <button
          type="button"
          className={styles.aiFillBadge}
          disabled={aiJobStatus === 'pending' || aiJobStatus === 'processing'}
          onClick={(event) => {
            event.preventDefault();
            void handleAiFillField(field);
          }}
          title="Điền nội dung này bằng AI (đọc video buổi học)"
        >
          *
        </button>
      )}
    </span>
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
          label={renderLabel('lessonContent', 'Nội dung đã dạy')}
          rules={[{ required: true, message: 'Vui lòng nhập nội dung đã dạy' }]}
        >
          <TextArea rows={4} placeholder="Mô tả nội dung buổi học..." />
        </Form.Item>

        <Form.Item name="homework" label={renderLabel('homework', 'Bài tập về nhà')}>
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

        <Form.Item name="tutorNotes" label={renderLabel('tutorNotes', 'Ghi chú')}>
          <TextArea rows={2} placeholder="Ghi chú thêm về buổi học..." />
        </Form.Item>

        <div className={styles.actions}>
          {onCancel && (
            <Button onClick={onCancel} className={styles.cancelButton}>
              {cancelText}
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
