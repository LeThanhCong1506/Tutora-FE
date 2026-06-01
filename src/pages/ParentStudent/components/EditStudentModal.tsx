import { useState, useEffect } from 'react';
// message import removed
import styles from './AddStudentModal.module.css';
import { Trash2 } from 'lucide-react';
import type { StudentType } from '../../../types/student.type';
import type { ICreateParentStudent } from '../../../services/student.service';

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: string, payload: ICreateParentStudent) => Promise<void>;
    student: StudentType | null;
}

const EditStudentModal = ({ isOpen, onClose, onSubmit, student }: EditStudentModalProps) => {
    const [formData, setFormData] = useState({
        fullName: '',
        birthDate: '',
        school: '',
        gradeLevel: '',
        learningGoals: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Pre-fill form when student changes
    useEffect(() => {
        if (student) {
            setFormData({
                fullName: student.fullName,
                birthDate: student.birthDate,
                school: student.school,
                gradeLevel: student.gradeLevel || '',
                learningGoals: student.learningGoals || '',
            });
        }
    }, [student]);

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

        if (!student) return;

        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Họ tên là bắt buộc';
        if (!formData.birthDate) newErrors.birthDate = 'Ngày sinh là bắt buộc';
        if (!formData.school.trim()) newErrors.school = 'Trường là bắt buộc';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(student.studentId, {
                fullname: formData.fullName,
                birthdate: formData.birthDate,
                school: formData.school,
                gradelevel: formData.gradeLevel || undefined,
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
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Chỉnh sửa thông tin</h2>
                    <button className={styles.modalCloseBtn} onClick={onClose} type="button" disabled={submitting}>
                        <Trash2 size={20} />
                    </button>
                </div>

                <form className={styles.addStudentForm} onSubmit={handleSubmit}>
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
                        />
                        {errors.fullName && <span className={styles.errorMessage}>{errors.fullName}</span>}
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
                        />
                        {errors.birthDate && <span className={styles.errorMessage}>{errors.birthDate}</span>}
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
                        />
                        {errors.school && <span className={styles.errorMessage}>{errors.school}</span>}
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
                            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentModal;
