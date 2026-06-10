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
    validateTeachingMode
} from '../utils/validation';
import {
    VIETNAM_PROVINCES,
    VIETNAM_DISTRICTS
} from '../data/vietnamLocations';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './ProfileHeroModal.module.css';

// NOTE: Môn học, cấp độ & giá KHÔNG còn chỉnh sửa ở đây nữa — gia sư thiết lập tại
// trang Onboarding (/tutor-portal/onboarding) theo model SubjectGradePrices.
// Modal này chỉ còn: avatar, tiêu đề, khu vực dạy, hình thức dạy.

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

interface ProfileHeroData {
    avatarUrl: string;
    avatarFile: File | null;
    headline: string;
    teachingAreaCity: string;
    teachingAreaDistrict: string;
    teachingMode: 'online' | 'offline' | 'both' | '';
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

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        const headlineValidation = validateHeadline(formData.headline);
        if (!headlineValidation.isValid) {
            newErrors.headline = headlineValidation.error || '';
        }

        const cityValidation = validateCity(formData.teachingAreaCity);
        if (!cityValidation.isValid) {
            newErrors.city = cityValidation.error || '';
        }

        const districtValidation = validateDistrict(formData.teachingAreaDistrict);
        if (!districtValidation.isValid) {
            newErrors.district = districtValidation.error || '';
        }

        const modeValidation = validateTeachingMode(formData.teachingMode);
        if (!modeValidation.isValid) {
            newErrors.teachingMode = modeValidation.error || '';
        }

        setErrors(newErrors);

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

                {/* Gợi ý: môn học, cấp độ & giá được thiết lập ở trang Onboarding. */}
                <p style={{ fontSize: 13, color: 'rgba(62, 47, 40, 0.6)', marginTop: 4 }}>
                    Môn học, cấp độ &amp; giá được thiết lập ở trang Onboarding.
                </p>
            </div>
        </EditModal>
    );
};

export default ProfileHeroModal;
