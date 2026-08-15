import { useEffect, useState } from 'react';
import styles from './AddStudentModal.module.css';
import { Pencil, X } from 'lucide-react';
import type { StudentType } from '../../../types/student.type';
import type { ICreateParentStudent } from '../../../services/student.service';
import { useGradeLevels } from '../../../hooks/useGradeLevels';

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: string, payload: ICreateParentStudent) => Promise<void>;
    student: StudentType | null;
}

const formStateFrom = (student: StudentType | null) => ({
    fullName: student?.fullName ?? '',
    birthDate: student?.birthDate ?? '',
    school: student?.school ?? '',
    gradeLevelId: student?.gradeLevelId != null ? String(student.gradeLevelId) : '',
    learningGoals: student?.learningGoals ?? '',
});

const today = new Date().toISOString().slice(0, 10);

const EditStudentModal = ({ isOpen, onClose, onSubmit, student }: EditStudentModalProps) => {
    const { gradeLevels } = useGradeLevels();
    const [formData, setFormData] = useState(() => formStateFrom(student));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

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

        if (!student) return;

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
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(student.studentId, {
                fullname: formData.fullName,
                birthdate: formData.birthDate,
                school: formData.school.trim() || undefined,
                gradeLevelId: formData.gradeLevelId ? Number(formData.gradeLevelId) : undefined,
                learninggoals: formData.learningGoals || undefined,
            });
            onClose();
        } catch (err) {
            console.error('Error in modal submit:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={submitting ? undefined : onClose}>
            <div
                className={styles.modalContent}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-student-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <span className={styles.modalIcon} aria-hidden="true">
                        <Pencil size={18} />
                    </span>
                    <div className={styles.modalHeading}>
                        <span className={styles.modalEyebrow}>Hồ sơ học sinh</span>
                        <h2 className={styles.modalTitle} id="edit-student-title">Chỉnh sửa thông tin</h2>
                    </div>
                    <button
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                        type="button"
                        disabled={submitting}
                        aria-label="Đóng cửa sổ chỉnh sửa học sinh"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form className={styles.addStudentForm} onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={`${styles.formRow} ${styles.formRowWide}`}>
                            <label className={styles.formLabel} htmlFor="edit-student-full-name">
                                Họ và tên <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="edit-student-full-name"
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.fullName ? styles.formInputError : ''}`}
                                placeholder="Ví dụ: Nguyễn Minh Anh"
                                autoComplete="name"
                                autoFocus
                                disabled={submitting}
                                aria-invalid={Boolean(errors.fullName)}
                            />
                            {errors.fullName && <span className={styles.errorMessage}>{errors.fullName}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel} htmlFor="edit-student-birth-date">
                                Ngày sinh <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="edit-student-birth-date"
                                type="date"
                                name="birthDate"
                                max={today}
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.birthDate ? styles.formInputError : ''}`}
                                disabled={submitting}
                                aria-invalid={Boolean(errors.birthDate)}
                            />
                            {errors.birthDate && <span className={styles.errorMessage}>{errors.birthDate}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel} htmlFor="edit-student-grade">
                                Khối lớp <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <select
                                id="edit-student-grade"
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
                            <label className={styles.formLabel} htmlFor="edit-student-school">
                                Trường đang học <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <input
                                id="edit-student-school"
                                type="text"
                                name="school"
                                value={formData.school}
                                onChange={handleChange}
                                className={`${styles.formInput} ${errors.school ? styles.formInputError : ''}`}
                                placeholder="Ví dụ: THCS Nguyễn Du"
                                disabled={submitting}
                                aria-invalid={Boolean(errors.school)}
                            />
                            {errors.school && <span className={styles.errorMessage}>{errors.school}</span>}
                        </div>

                        <div className={`${styles.formRow} ${styles.formRowWide}`}>
                            <label className={styles.formLabel} htmlFor="edit-student-goals">
                                Điều con đang cần hỗ trợ <span className={styles.optional}>Tuỳ chọn</span>
                            </label>
                            <textarea
                                id="edit-student-goals"
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
                            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentModal;
