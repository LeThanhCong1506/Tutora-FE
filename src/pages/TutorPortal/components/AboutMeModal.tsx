import React, { useState, useEffect } from 'react';
import EditModal from './EditModal';
import FormField from './FormField';
import {
    validateBio,
    validateEducation,
    validateGPA,
    validateExperience
} from '../utils/validation';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './AboutMeModal.module.css';

interface AboutMeData {
    bio: string;
    education: string;
    gpaScale: 4 | 10 | null;
    gpa: number | null;
    experience: string;
}

interface AboutMeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AboutMeData) => Promise<boolean>;
    initialData: AboutMeData;
}

const GPA_SCALES = [
    { value: '', label: 'Chọn thang điểm' },
    { value: '4', label: 'Thang 4.0' },
    { value: '10', label: 'Thang 10' },
];

const AboutMeModal: React.FC<AboutMeModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [formData, setFormData] = useState<AboutMeData>(initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<AboutMeData>('draft_aboutme');

    // Reset form when modal opens — prioritize draft over initialData
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            setFormData(draft ?? initialData);
            setErrors({});
        }
    }, [isOpen, initialData, loadDraft]);

    // Handle GPA scale change
    const handleGpaScaleChange = (value: string) => {
        const scale = value ? (parseInt(value) as 4 | 10) : null;
        setFormData(prev => ({
            ...prev,
            gpaScale: scale,
            gpa: null // Reset GPA when scale changes
        }));
    };

    // Handle GPA value change
    const handleGpaChange = (value: string) => {
        if (!value.trim()) {
            setFormData(prev => ({ ...prev, gpa: null }));
            return;
        }
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setFormData(prev => ({ ...prev, gpa: numValue }));
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate bio
        const bioValidation = validateBio(formData.bio);
        if (!bioValidation.isValid) {
            newErrors.bio = bioValidation.error || '';
        }

        // Validate education
        const educationValidation = validateEducation(formData.education);
        if (!educationValidation.isValid) {
            newErrors.education = educationValidation.error || '';
        }

        // Validate GPA
        const gpaValidation = validateGPA(formData.gpa, formData.gpaScale);
        if (!gpaValidation.isValid) {
            newErrors.gpa = gpaValidation.error || '';
        }

        // Validate experience
        const experienceValidation = validateExperience(formData.experience);
        if (!experienceValidation.isValid) {
            newErrors.experience = experienceValidation.error || '';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Auto-save draft on form data change
    useEffect(() => {
        if (isOpen) {
            saveDraft(formData);
        }
    }, [formData, isOpen, saveDraft]);

    // Handle save
    const handleSave = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        const success = await onSave(formData);
        setIsLoading(false);

        if (success) {
            clearDraft();
            onClose();
        }
    };

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSave}
            title="Chỉnh sửa giới thiệu bản thân"
            isLoading={isLoading}
            size="large"
        >
            <div className={styles.form}>
                {/* Bio */}
                <FormField
                    type="textarea"
                    name="bio"
                    label="Giới thiệu bản thân"
                    value={formData.bio}
                    onChange={(value) => setFormData(prev => ({ ...prev, bio: value }))}
                    placeholder="Hãy viết một đoạn giới thiệu về bản thân, kinh nghiệm và phương pháp giảng dạy của bạn..."
                    maxLength={2000}
                    rows={6}
                    required
                    error={errors.bio}
                    hint="100-2000 ký tự"
                />

                {/* Education */}
                <FormField
                    type="text"
                    name="education"
                    label="Trình độ học vấn"
                    value={formData.education}
                    onChange={(value) => setFormData(prev => ({ ...prev, education: value }))}
                    placeholder="VD: Cử nhân Sư phạm Toán - Đại học Sư phạm Hà Nội"
                    maxLength={255}
                    required
                    error={errors.education}
                />

                {/* GPA */}
                <div className={styles.gpaRow}>
                    <FormField
                        type="select"
                        name="gpaScale"
                        label="Thang điểm"
                        value={formData.gpaScale?.toString() || ''}
                        onChange={handleGpaScaleChange}
                        options={GPA_SCALES.slice(1)}
                        placeholder="Chọn thang điểm"
                    />
                    <FormField
                        type="number"
                        name="gpa"
                        label="Điểm GPA"
                        value={formData.gpa?.toString() || ''}
                        onChange={handleGpaChange}
                        placeholder={formData.gpaScale === 4 ? 'VD: 3.5' : formData.gpaScale === 10 ? 'VD: 8.5' : 'Chọn thang điểm trước'}
                        disabled={!formData.gpaScale}
                        error={errors.gpa}
                    />
                </div>

                {/* Experience */}
                <FormField
                    type="textarea"
                    name="experience"
                    label="Kinh nghiệm giảng dạy"
                    value={formData.experience}
                    onChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}
                    placeholder="Mô tả kinh nghiệm giảng dạy của bạn: số năm kinh nghiệm, các lớp đã dạy, thành tích học sinh..."
                    maxLength={2000}
                    rows={5}
                    required
                    error={errors.experience}
                    hint="50-2000 ký tự"
                />

                {/* Writing Tips */}
                <div className={styles.tips}>
                    <h4>Mẹo viết giới thiệu hiệu quả</h4>
                    <ul>
                        <li>Nêu rõ phương pháp giảng dạy đặc trưng của bạn</li>
                        <li>Chia sẻ thành tích của học sinh trước đó</li>
                        <li>Giải thích tại sao bạn đam mê việc giảng dạy</li>
                        <li>Sử dụng ngôn ngữ thân thiện, dễ tiếp cận</li>
                    </ul>
                </div>
            </div>
        </EditModal>
    );
};

export default AboutMeModal;
