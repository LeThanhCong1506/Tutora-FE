import { useState, useRef } from 'react';
import styles from './AddStudentModal.module.css';
import { Trash2, AlertCircle } from 'lucide-react';
import type { ICreateParentStudent } from '../../../services/student.service';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: ICreateParentStudent) => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
    fullName: 'Họ và tên',
    birthDate: 'Ngày sinh',
    school: 'Trường',
    gradeLevel: 'Khối lớp',
    learningGoals: 'Mục tiêu học tập',
    general: 'Lỗi',
};

const AddStudentModal = ({ isOpen, onClose, onSubmit }: AddStudentModalProps) => {
    const [formData, setFormData] = useState({
        fullName: '',
        birthDate: '',
        school: '',
        gradeLevel: '',
        learningGoals: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Họ tên là bắt buộc';
        } else if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
        } else if (formData.fullName.trim().length > 100) {
            newErrors.fullName = 'Họ tên không được vượt quá 100 ký tự';
        }
        if (!formData.birthDate) {
            newErrors.birthDate = 'Ngày sinh là bắt buộc';
        } else if (new Date(formData.birthDate) > new Date()) {
            newErrors.birthDate = 'Ngày sinh không được là ngày trong tương lai';
        }
        if (!formData.school.trim()) newErrors.school = 'Trường là bắt buộc';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Scroll to first error field
            setTimeout(() => {
                const firstErrorField = formRef.current?.querySelector('[data-error="true"]') as HTMLElement;
                firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (firstErrorField as HTMLInputElement)?.focus();
            }, 50);
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                fullname: formData.fullName,
                birthdate: formData.birthDate,
                school: formData.school,
                gradelevel: formData.gradeLevel || undefined,
                learninggoals: formData.learningGoals || undefined,
            });
            // Reset form after successful submission
            setFormData({
                fullName: '',
                birthDate: '',
                school: '',
                gradeLevel: '',
                learningGoals: '',
            });
            setErrors({});
        } catch (err: any) {
            console.error('Error in modal submit:', err);
            const backendErrors = err.response?.data?.errors;
            if (backendErrors && typeof backendErrors === 'object') {
                const mapped: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(backendErrors)) {
                    const fieldKey = key.charAt(0).toLowerCase() + key.slice(1);
                    mapped[fieldKey] = Array.isArray(msgs) ? (msgs as string[])[0] : String(msgs);
                }
                setErrors(mapped);
            } else if (err.response?.data?.message) {
                setErrors({ general: err.response.data.message });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Thêm học sinh mới</h2>
                    <button className={styles.modalCloseBtn} onClick={onClose} type="button" disabled={submitting}>
                        <Trash2 size={20} />
                    </button>
                </div>

                <form className={styles.addStudentForm} onSubmit={handleSubmit} ref={formRef}>
                    {/* Error summary banner */}
                    {Object.keys(errors).length > 0 && (
                        <div className={styles.errorSummary}>
                            <AlertCircle size={16} className={styles.errorSummaryIcon} />
                            <div>
                                <p className={styles.errorSummaryTitle}>Vui lòng kiểm tra lại thông tin:</p>
                                <ul className={styles.errorSummaryList}>
                                    {Object.entries(errors).map(([field, msg]) => msg && (
                                        <li key={field}>
                                            <strong>{FIELD_LABELS[field] ?? field}:</strong> {msg}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>
                            Họ và tên <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className={`${styles.formInput} ${errors.fullName ? styles.formInputError : ''}`}
                            placeholder="Nhập họ tên học sinh"
                            disabled={submitting}
                            data-error={!!errors.fullName}
                        />
                        {errors.fullName && (
                            <span className={styles.errorMessage}>
                                <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                {errors.fullName}
                            </span>
                        )}
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>
                            Ngày sinh <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className={`${styles.formInput} ${errors.birthDate ? styles.formInputError : ''}`}
                            disabled={submitting}
                            data-error={!!errors.birthDate}
                        />
                        {errors.birthDate && (
                            <span className={styles.errorMessage}>
                                <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                {errors.birthDate}
                            </span>
                        )}
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>
                            Trường <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            name="school"
                            value={formData.school}
                            onChange={handleChange}
                            className={`${styles.formInput} ${errors.school ? styles.formInputError : ''}`}
                            placeholder="Nhập tên trường"
                            disabled={submitting}
                            data-error={!!errors.school}
                        />
                        {errors.school && (
                            <span className={styles.errorMessage}>
                                <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                {errors.school}
                            </span>
                        )}
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>
                            Khối lớp
                        </label>
                        <input
                            type="text"
                            name="gradeLevel"
                            value={formData.gradeLevel}
                            onChange={handleChange}
                            className={styles.formInput}
                            placeholder="Nhập khối lớp (ví dụ: Lớp 8)"
                            disabled={submitting}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.formLabel}>
                            Mục tiêu học tập
                        </label>
                        <textarea
                            name="learningGoals"
                            value={formData.learningGoals}
                            onChange={handleChange}
                            className={styles.formTextarea}
                            placeholder="Nhập mục tiêu học tập..."
                            rows={3}
                            disabled={submitting}
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.modalBtn} onClick={onClose} disabled={submitting}>
                            Huỷ
                        </button>
                        <button type="submit" className={styles.modalBtnPrimary} disabled={submitting}>
                            {submitting ? 'Đang thêm...' : 'Thêm học sinh'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentModal;
