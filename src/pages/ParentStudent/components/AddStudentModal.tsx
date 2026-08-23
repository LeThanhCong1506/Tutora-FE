import { useEffect, useRef, useState } from 'react';
import styles from './AddStudentModal.module.css';
import { AlertCircle, UserPlus, X } from 'lucide-react';
import type { ICreateParentStudent } from '../../../services/student.service';
import { useGradeLevels } from '../../../hooks/useGradeLevels';
import { extractApiErrorMessage } from '../student-components/apiMessages';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: ICreateParentStudent) => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
    fullName: 'Họ và tên',
    birthDate: 'Ngày sinh',
    school: 'Trường',
    gradeLevelId: 'Khối lớp',
    learningGoals: 'Mục tiêu học tập',
    general: 'Lỗi',
};

interface SubmitError {
    response?: {
        data?: {
            errors?: Record<string, string[] | string>;
            message?: string;
        };
    };
}

const today = new Date().toISOString().slice(0, 10);

const AddStudentModal = ({ isOpen, onClose, onSubmit }: AddStudentModalProps) => {
    const { gradeLevels } = useGradeLevels();
    const [formData, setFormData] = useState({
        fullName: '',
        birthDate: '',
        school: '',
        gradeLevelId: '',
        learningGoals: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !submitting) onClose();
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose, submitting]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
                school: formData.school.trim() || undefined,
                gradeLevelId: formData.gradeLevelId ? Number(formData.gradeLevelId) : undefined,
                learninggoals: formData.learningGoals || undefined,
            });
            setFormData({
                fullName: '',
                birthDate: '',
                school: '',
                gradeLevelId: '',
                learningGoals: '',
            });
            setErrors({});
            onClose();
        } catch (error: unknown) {
            const err = error as SubmitError;
            console.error('Error in modal submit:', err);
            const backendErrors = err.response?.data?.errors;
            if (backendErrors && typeof backendErrors === 'object') {
                const mapped: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(backendErrors)) {
                    const fieldKey = key.charAt(0).toLowerCase() + key.slice(1);
                    mapped[fieldKey] = Array.isArray(msgs) ? (msgs as string[])[0] : String(msgs);
                }
                setErrors(mapped);
            } else {
                setErrors({ general: extractApiErrorMessage(err, 'Thêm học sinh thất bại. Vui lòng thử lại.') });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const visibleErrors = Object.entries(errors).filter((entry): entry is [string, string] => Boolean(entry[1]));

    return (
        <div className={styles.modalOverlay} onClick={submitting ? undefined : onClose}>
            <div
                className={styles.modalContent}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-student-title"
                aria-describedby="add-student-description"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <span className={styles.modalIcon} aria-hidden="true">
                        <UserPlus size={19} />
                    </span>
                    <div className={styles.modalHeading}>
                        <span className={styles.modalEyebrow}>Hồ sơ học sinh</span>
                        <h2 className={styles.modalTitle} id="add-student-title">Thêm con</h2>
                        <p className={styles.modalDescription} id="add-student-description">
                            Chỉ cần thông tin cơ bản để bắt đầu đặt lịch và theo dõi việc học.
                        </p>
                    </div>
                    <button
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                        type="button"
                        disabled={submitting}
                        aria-label="Đóng cửa sổ thêm học sinh"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form className={styles.addStudentForm} onSubmit={handleSubmit} ref={formRef}>
                    {visibleErrors.length > 0 && (
                        <div className={styles.errorSummary} role="alert">
                            <AlertCircle size={16} className={styles.errorSummaryIcon} />
                            <div>
                                <p className={styles.errorSummaryTitle}>Vui lòng kiểm tra lại thông tin:</p>
                                <ul className={styles.errorSummaryList}>
                                    {visibleErrors.map(([field, msg]) => (
                                        <li key={field}>
                                            <strong>{FIELD_LABELS[field] ?? field}:</strong> {msg}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className={styles.formGrid}>
                        <div className={`${styles.formRow} ${styles.formRowWide}`}>
                            <label className={styles.formLabel} htmlFor="add-student-full-name">
                                Họ và tên <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="add-student-full-name"
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.fullName ? styles.formInputError : ''}`}
                                placeholder="Ví dụ: Nguyễn Minh Anh"
                                autoComplete="name"
                                autoFocus
                                disabled={submitting}
                                data-error={!!errors.fullName}
                                aria-invalid={Boolean(errors.fullName)}
                            />
                            {errors.fullName && <span className={styles.errorMessage}>{errors.fullName}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel} htmlFor="add-student-birth-date">
                                Ngày sinh <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="add-student-birth-date"
                                type="date"
                                name="birthDate"
                                max={today}
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.birthDate ? styles.formInputError : ''}`}
                                disabled={submitting}
                                data-error={!!errors.birthDate}
                                aria-invalid={Boolean(errors.birthDate)}
                            />
                            {errors.birthDate && <span className={styles.errorMessage}>{errors.birthDate}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel} htmlFor="add-student-grade">
                                Khối lớp <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <select
                                id="add-student-grade"
                                name="gradeLevelId"
                                value={formData.gradeLevelId}
                                onChange={handleChange}
                                className={styles.formInput}
                                disabled={submitting}
                            >
                                <option value="">Chọn khối lớp</option>
                                {gradeLevels.map((grade) => (
                                    <option key={grade.gradeLevelId} value={grade.gradeLevelId}>
                                        {grade.gradeName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={`${styles.formRow} ${styles.formRowWide}`}>
                            <label className={styles.formLabel} htmlFor="add-student-school">
                                Trường đang học <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <input
                                id="add-student-school"
                                type="text"
                                name="school"
                                value={formData.school}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.school ? styles.formInputError : ''}`}
                                placeholder="Ví dụ: THCS Nguyễn Du"
                                disabled={submitting}
                                data-error={!!errors.school}
                                aria-invalid={Boolean(errors.school)}
                            />
                            {errors.school && <span className={styles.errorMessage}>{errors.school}</span>}
                        </div>

                        <div className={`${styles.formRow} ${styles.formRowWide}`}>
                            <label className={styles.formLabel} htmlFor="add-student-goals">
                                Điều con đang cần hỗ trợ <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <textarea
                                id="add-student-goals"
                                name="learningGoals"
                                value={formData.learningGoals}
                                onChange={handleChange}
                                className={styles.formTextarea}
                                placeholder="Ví dụ: Củng cố Toán lớp 8 và tự tin hơn khi làm bài"
                                rows={3}
                                disabled={submitting}
                            />
                        </div>
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
