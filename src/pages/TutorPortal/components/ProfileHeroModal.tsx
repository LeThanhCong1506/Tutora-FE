import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { toast } from 'react-toastify';
import { AutoComplete } from 'antd';
import EditModal from './EditModal';
import FormField from './FormField';
import {
    validateAvatar,
    validateHeadline,
    validateCity,
    validateDistrict,
    validateTeachingMode,
    validateSubjects
} from '../utils/validation';
import {
    VIETNAM_PROVINCES,
    VIETNAM_DISTRICTS
} from '../data/vietnamLocations';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './ProfileHeroModal.module.css';



const SUBJECTS = [
    { id: 1, name: 'Toán' },
    { id: 2, name: 'Tiếng Anh' },
    { id: 3, name: 'Vật Lý' },
    { id: 4, name: 'Hóa Học' },
    { id: 5, name: 'Ngữ Văn' },
    { id: 6, name: 'Sinh Học' },
    { id: 7, name: 'Lịch Sử' },
    { id: 8, name: 'Địa Lý' },
    { id: 9, name: 'Tin Học' },
    { id: 10, name: 'IELTS' },
];

const GRADE_LEVELS = [
    { value: 'grade_1', label: 'Lớp 1' },
    { value: 'grade_2', label: 'Lớp 2' },
    { value: 'grade_3', label: 'Lớp 3' },
    { value: 'grade_4', label: 'Lớp 4' },
    { value: 'grade_5', label: 'Lớp 5' },
    { value: 'grade_6', label: 'Lớp 6' },
    { value: 'grade_7', label: 'Lớp 7' },
    { value: 'grade_8', label: 'Lớp 8' },
    { value: 'grade_9', label: 'Lớp 9' },
    { value: 'grade_10', label: 'Lớp 10' },
    { value: 'grade_11', label: 'Lớp 11' },
    { value: 'grade_12', label: 'Lớp 12' },
];

const TEACHING_MODES = [
    { value: 'online', label: 'Dạy Online' },
    { value: 'offline', label: 'Dạy trực tiếp' },
    { value: 'both', label: 'Cả hai hình thức' },
];

// Icons
const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4V14M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

interface SubjectSelection {
    subjectId: number;
    subjectName: string;
    gradeLevels: string[];  // ['grade_10', 'grade_11', ...]
    tags: string[];  // Tags for this subject (max 5, required)
}

interface ProfileHeroData {
    avatarUrl: string;
    avatarFile: File | null;
    headline: string;
    teachingAreaCity: string;
    teachingAreaDistrict: string;
    teachingMode: 'online' | 'offline' | 'both' | '';
    subjects: SubjectSelection[];
}

interface ProfileHeroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ProfileHeroData) => void | Promise<void>;
    initialData: ProfileHeroData;
}

const ProfileHeroModal: React.FC<ProfileHeroModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [formData, setFormData] = useState<ProfileHeroData>(initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [avatarPreview, setAvatarPreview] = useState<string>(initialData.avatarUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [citySearch, setCitySearch] = useState<string>('');
    const [districtSearch, setDistrictSearch] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<ProfileHeroData>('draft_hero');

    // Reset form when modal opens — prioritize draft over initialData
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            const dataToUse = draft ? { ...draft, avatarFile: null } : initialData;
            setFormData(dataToUse);
            setAvatarPreview(dataToUse.avatarUrl);
            setErrors({});
            // Set initial search values from saved data
            const selectedCity = VIETNAM_PROVINCES.find(p => p.value === dataToUse.teachingAreaCity);
            setCitySearch(selectedCity?.label || '');
            const selectedDistrict = VIETNAM_DISTRICTS[dataToUse.teachingAreaCity]?.find(d => d.value === dataToUse.teachingAreaDistrict);
            setDistrictSearch(selectedDistrict?.label || '');
        }
    }, [isOpen, initialData, loadDraft]);

    // Auto-save draft on form data change
    useEffect(() => {
        if (isOpen) {
            saveDraft(formData);
        }
    }, [formData, isOpen, saveDraft]);

    // Handle avatar upload — opens cropper instead of directly setting preview
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validation = validateAvatar(file);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, avatar: validation.error || '' }));
                return;
            }

            setErrors(prev => ({ ...prev, avatar: '' }));

            // Read file as base64 and open cropper
            const reader = new FileReader();
            reader.onload = (e) => {
                setCropImageSrc(e.target?.result as string);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // Cropper: track crop area
    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Cropper: confirm crop
    const handleCropConfirm = async () => {
        if (!cropImageSrc || !croppedAreaPixels) return;

        try {
            const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels, 'avatar.jpg');

            // Create preview from cropped file
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarPreview(e.target?.result as string);
            };
            reader.readAsDataURL(croppedFile);

            setFormData(prev => ({ ...prev, avatarFile: croppedFile }));
            setShowCropper(false);
            setCropImageSrc(null);

            // Reset file input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Crop failed:', err);
            toast.error('Không thể cắt ảnh. Vui lòng thử lại.');
        }
    };

    // Cropper: cancel
    const handleCropCancel = () => {
        setShowCropper(false);
        setCropImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Handle city change (reset district)
    const handleCityChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            teachingAreaCity: value,
            teachingAreaDistrict: ''
        }));
    };

    // Handle subject toggle
    const handleSubjectToggle = (subjectId: number, subjectName: string) => {
        setFormData(prev => {
            const existing = prev.subjects.find(s => s.subjectId === subjectId);
            if (existing) {
                return {
                    ...prev,
                    subjects: prev.subjects.filter(s => s.subjectId !== subjectId)
                };
            } else {
                if (prev.subjects.length >= 5) {
                    setErrors(e => ({ ...e, subjects: 'Chỉ được chọn tối đa 5 môn học' }));
                    return prev;
                }
                return {
                    ...prev,
                    subjects: [...prev.subjects, { subjectId, subjectName, gradeLevels: [], tags: [] }]
                };
            }
        });
        setErrors(prev => ({ ...prev, subjects: '' }));
    };

    // Handle grade level toggle for a subject
    const handleGradeLevelToggle = (subjectId: number, gradeLevel: string) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.map(subject => {
                if (subject.subjectId === subjectId) {
                    const hasLevel = subject.gradeLevels.includes(gradeLevel);
                    return {
                        ...subject,
                        gradeLevels: hasLevel
                            ? subject.gradeLevels.filter(l => l !== gradeLevel)
                            : [...subject.gradeLevels, gradeLevel]
                    };
                }
                return subject;
            })
        }));
    };

    // Handle adding tag to a subject
    const handleSubjectTagAdd = (subjectId: number, tagValue: string) => {
        if (!tagValue.trim()) return;

        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.map(subject => {
                if (subject.subjectId === subjectId) {
                    if (subject.tags.length >= 5) {
                        setErrors(e => ({ ...e, [`tags_${subjectId}`]: 'Tối đa 5 thẻ cho mỗi môn học' }));
                        return subject;
                    }
                    if (tagValue.length > 50) {
                        setErrors(e => ({ ...e, [`tags_${subjectId}`]: 'Thẻ không được vượt quá 50 ký tự' }));
                        return subject;
                    }
                    if (subject.tags.includes(tagValue.trim())) {
                        setErrors(e => ({ ...e, [`tags_${subjectId}`]: 'Thẻ này đã tồn tại' }));
                        return subject;
                    }
                    setErrors(e => ({ ...e, [`tags_${subjectId}`]: '' }));
                    return {
                        ...subject,
                        tags: [...subject.tags, tagValue.trim()]
                    };
                }
                return subject;
            })
        }));
    };

    // Handle removing tag from a subject
    const handleSubjectTagRemove = (subjectId: number, tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.map(subject => {
                if (subject.subjectId === subjectId) {
                    return {
                        ...subject,
                        tags: subject.tags.filter(t => t !== tagToRemove)
                    };
                }
                return subject;
            })
        }));
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate headline
        const headlineValidation = validateHeadline(formData.headline);
        if (!headlineValidation.isValid) {
            newErrors.headline = headlineValidation.error || '';
        }

        // Validate city
        const cityValidation = validateCity(formData.teachingAreaCity);
        if (!cityValidation.isValid) {
            newErrors.city = cityValidation.error || '';
        }

        // Validate district
        const districtValidation = validateDistrict(formData.teachingAreaDistrict);
        if (!districtValidation.isValid) {
            newErrors.district = districtValidation.error || '';
        }

        // Validate teaching mode
        const modeValidation = validateTeachingMode(formData.teachingMode);
        if (!modeValidation.isValid) {
            newErrors.teachingMode = modeValidation.error || '';
        }

        // Validate subjects
        const subjectsValidation = validateSubjects(formData.subjects);
        if (!subjectsValidation.isValid) {
            newErrors.subjects = subjectsValidation.error || '';
        }

        // Validate grade levels for each selected subject
        const subjectsWithoutLevels = formData.subjects.filter(s => s.gradeLevels.length === 0);
        if (subjectsWithoutLevels.length > 0) {
            newErrors.gradeLevels = 'Vui lòng chọn cấp độ cho mỗi môn học';
        }

        // Validate tags for each selected subject (required, at least 1 tag per subject)
        const subjectsWithoutTags = formData.subjects.filter(s => s.tags.length === 0);
        if (subjectsWithoutTags.length > 0) {
            newErrors.subjectTags = 'Mỗi môn học phải có ít nhất 1 thẻ mô tả';
        }

        setErrors(newErrors);

        // Show toast if validation fails
        if (Object.keys(newErrors).length > 0) {
            const firstError = Object.values(newErrors)[0];
            toast.error(firstError);
        }

        return Object.keys(newErrors).length === 0;
    };

    // Handle save
    const handleSave = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Call onSave - parent handles API call and closing modal
            await onSave(formData);
            clearDraft();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSave}
            title="Chỉnh sửa thông tin cơ bản"
            isLoading={isLoading}
            size="large"
        >
            <div className={styles.form}>
                {/* Avatar Upload */}
                <div className={styles.avatarSection}>
                    <label className={styles.sectionLabel}>Ảnh đại diện</label>
                    <div className={styles.avatarUpload}>
                        <div
                            className={styles.avatarPreview}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar preview" />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    <UploadIcon />
                                    <span>Tải ảnh lên</span>
                                </div>
                            )}
                            <div className={styles.avatarOverlay}>
                                <UploadIcon />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleAvatarChange}
                            className={styles.fileInput}
                        />
                        <div className={styles.avatarHint}>
                            <p>Định dạng: JPG, PNG</p>
                            <p>Kích thước tối đa: 5MB</p>
                        </div>
                    </div>
                    {errors.avatar && <span className={styles.error}>{errors.avatar}</span>}
                </div>

                {/* Cropper Overlay */}
                {showCropper && cropImageSrc && (
                    <div className={styles.cropperOverlay}>
                        <div className={styles.cropperModal}>
                            <div className={styles.cropperHeader}>
                                <h3>Cắt ảnh đại diện</h3>
                            </div>
                            <div className={styles.cropperContainer}>
                                <Cropper
                                    image={cropImageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                            <div className={styles.cropperControls}>
                                <label className={styles.zoomLabel}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M7 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    Thu phóng
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className={styles.zoomSlider}
                                />
                            </div>
                            <div className={styles.cropperActions}>
                                <button
                                    type="button"
                                    className={styles.cropCancelBtn}
                                    onClick={handleCropCancel}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className={styles.cropConfirmBtn}
                                    onClick={handleCropConfirm}
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Headline */}
                <FormField
                    type="textarea"
                    name="headline"
                    label="Tiêu đề giới thiệu"
                    value={formData.headline}
                    onChange={(value) => setFormData(prev => ({ ...prev, headline: value }))}
                    placeholder="VD: Gia sư Toán - Lý 10 năm kinh nghiệm"
                    maxLength={200}
                    required
                    error={errors.headline}
                    hint="10-200 ký tự, mô tả ngắn gọn về bản thân"
                />

                {/* Location */}
                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Thành phố <span className={styles.required}>*</span>
                        </label>
                        <AutoComplete
                            value={citySearch}
                            options={VIETNAM_PROVINCES.map(p => ({
                                value: p.label,
                                key: p.value
                            }))}
                            onSelect={(value) => {
                                const province = VIETNAM_PROVINCES.find(p => p.label === value);
                                if (province) {
                                    setCitySearch(value);
                                    handleCityChange(province.value);
                                    setDistrictSearch('');
                                }
                            }}
                            onChange={(value) => {
                                setCitySearch(value);
                            }}
                            placeholder="Nhập tên thành phố..."
                            className={styles.autocomplete}
                            filterOption={(inputValue, option) =>
                                option?.value?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
                            }
                            allowClear
                            onClear={() => {
                                setCitySearch('');
                                setDistrictSearch('');
                                setFormData(prev => ({ ...prev, teachingAreaCity: '', teachingAreaDistrict: '' }));
                            }}
                        />
                        {errors.city && <span className={styles.error}>{errors.city}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Quận/Huyện <span className={styles.required}>*</span>
                        </label>
                        <AutoComplete
                            value={districtSearch}
                            options={(VIETNAM_DISTRICTS[formData.teachingAreaCity] || []).map(d => ({
                                value: d.label,
                                key: d.value
                            }))}
                            onSelect={(value) => {
                                const district = (VIETNAM_DISTRICTS[formData.teachingAreaCity] || []).find(d => d.label === value);
                                if (district) {
                                    setDistrictSearch(value);
                                    setFormData(prev => ({ ...prev, teachingAreaDistrict: district.value }));
                                }
                            }}
                            onChange={(value) => {
                                setDistrictSearch(value);
                            }}
                            placeholder="Nhập tên quận/huyện..."
                            disabled={!formData.teachingAreaCity}
                            className={styles.autocomplete}
                            filterOption={(inputValue, option) =>
                                option?.value?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
                            }
                            allowClear
                            onClear={() => {
                                setDistrictSearch('');
                                setFormData(prev => ({ ...prev, teachingAreaDistrict: '' }));
                            }}
                        />
                        {errors.district && <span className={styles.error}>{errors.district}</span>}
                    </div>
                </div>

                {/* Teaching Mode */}
                <FormField
                    type="radio"
                    name="teachingMode"
                    label="Hình thức dạy học"
                    value={formData.teachingMode}
                    onChange={(value) => setFormData(prev => ({ ...prev, teachingMode: value as ProfileHeroData['teachingMode'] }))}
                    options={TEACHING_MODES}
                    required
                    error={errors.teachingMode}
                />

                {/* Subjects */}
                <div className={styles.subjectsSection}>
                    <label className={styles.sectionLabel}>
                        Môn học <span className={styles.required}>*</span>
                        <span className={styles.hint}>(Chọn 1-5 môn)</span>
                    </label>
                    <div className={styles.subjectGrid}>
                        {SUBJECTS.map(subject => (
                            <button
                                key={subject.id}
                                type="button"
                                className={`${styles.subjectChip} ${formData.subjects.find(s => s.subjectId === subject.id) ? styles.selected : ''}`}
                                onClick={() => handleSubjectToggle(subject.id, subject.name)}
                            >
                                {subject.name}
                            </button>
                        ))}
                    </div>
                    {errors.subjects && <span className={styles.error}>{errors.subjects}</span>}
                </div>

                {/* Grade Levels and Tags per Subject */}
                {formData.subjects.length > 0 && (
                    <div className={styles.gradeLevelsSection}>
                        <label className={styles.sectionLabel}>
                            Cấp độ dạy <span className={styles.required}>*</span>
                        </label>
                        {formData.subjects.map(subject => (
                            <div key={subject.subjectId} className={styles.subjectGradeLevels}>
                                <span className={styles.subjectName}>{subject.subjectName}</span>
                                <div className={styles.gradeLevelGrid}>
                                    {GRADE_LEVELS.map(level => (
                                        <button
                                            key={level.value}
                                            type="button"
                                            className={`${styles.gradeChip} ${subject.gradeLevels.includes(level.value) ? styles.selected : ''}`}
                                            onClick={() => handleGradeLevelToggle(subject.subjectId, level.value)}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                                {/* Subject Tags Input */}
                                <div className={styles.subjectTagsSection}>
                                    <div className={styles.tagInputRow}>
                                        <input
                                            type="text"
                                            id={`tag-input-${subject.subjectId}`}
                                            placeholder="VD: Luyện thi đại học, Kiên nhẫn..."
                                            maxLength={50}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const input = e.target as HTMLInputElement;
                                                    handleSubjectTagAdd(subject.subjectId, input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(`tag-input-${subject.subjectId}`) as HTMLInputElement;
                                                if (input) {
                                                    handleSubjectTagAdd(subject.subjectId, input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className={styles.tagHint}>
                                        Thẻ mô tả môn học ({subject.tags.length}/5) <span className={styles.required}>*</span>
                                    </span>
                                    {subject.tags.length > 0 && (
                                        <div className={styles.tagsList}>
                                            {subject.tags.map(tag => (
                                                <span key={tag} className={styles.tag}>
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSubjectTagRemove(subject.subjectId, tag)}
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {errors[`tags_${subject.subjectId}`] && (
                                        <span className={styles.error}>{errors[`tags_${subject.subjectId}`]}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {errors.gradeLevels && <span className={styles.error}>{errors.gradeLevels}</span>}
                        {errors.subjectTags && <span className={styles.error}>{errors.subjectTags}</span>}
                    </div>
                )}
            </div>
        </EditModal>
    );
};

export default ProfileHeroModal;
