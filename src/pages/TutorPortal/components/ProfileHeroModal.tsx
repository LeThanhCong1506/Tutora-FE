import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AutoComplete } from 'antd';
import EditModal from './EditModal';
import FormField from './FormField';
import {
    validateHeadline,
    validateCity,
    validateDistrict,
    validateTeachingMode
} from '../utils/validation';
import { useProvinces, useWards } from '../../../hooks/useVietnamLocations';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './ProfileHeroModal.module.css';

// Modal này chỉ còn: tiêu đề, khu vực dạy, hình thức dạy.
// - Ảnh đại diện đã tách sang AvatarModal (gọi API riêng updateAvatar).
// - Môn học, cấp độ & giá thiết lập tại Onboarding (model SubjectGradePrices).

const TEACHING_MODES = [
    { value: 'online', label: 'Dạy Online' },
    { value: 'offline', label: 'Dạy trực tiếp' },
    { value: 'both', label: 'Cả hai hình thức' },
];

interface ProfileHeroData {
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
    const [isLoading, setIsLoading] = useState(false);
    const [citySearch, setCitySearch] = useState<string>('');
    const [districtSearch, setDistrictSearch] = useState<string>('');
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<ProfileHeroData>('draft_hero');

    // Địa danh từ API v2 (provinces.open-api.vn). teachingAreaCity giờ lưu TÊN tỉnh
    // (vd "Thành phố Hồ Chí Minh") nên suy ngược ra mã để nạp danh sách phường/xã.
    const { provinces } = useProvinces();
    const selectedProvinceCode = provinces.find(p => p.name === formData.teachingAreaCity)?.code ?? null;
    const { wards, loading: wardsLoading } = useWards(selectedProvinceCode);

    // Reset form when modal opens — prioritize draft over initialData
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            const base = draft ?? initialData;
            // Hiện chỉ hỗ trợ 1 hình thức dạy: Online → ép teachingMode = 'online' khi mở modal
            // (Dạy trực tiếp & Cả hai hình thức sẽ mở trong tương lai).
            const dataToUse: ProfileHeroData = { ...base, teachingMode: 'online' };
            setFormData(dataToUse);
            setErrors({});
            // teachingAreaCity/District giờ lưu thẳng TÊN (tỉnh & phường/xã) nên hiển thị trực tiếp.
            setCitySearch(dataToUse.teachingAreaCity || '');
            setDistrictSearch(dataToUse.teachingAreaDistrict || '');
        }
    }, [isOpen, initialData, loadDraft]);

    // Auto-save draft on form data change
    useEffect(() => {
        if (isOpen) {
            saveDraft(formData);
        }
    }, [formData, isOpen, saveDraft]);

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
            // Call onSave - parent handles API call (updateBasicInfo) and closing modal
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
                            options={provinces.map(p => ({
                                value: p.name,
                                key: String(p.code)
                            }))}
                            onSelect={(value) => {
                                // Lưu tên tỉnh, reset phường/xã (useWards sẽ nạp lại theo tỉnh mới).
                                setCitySearch(value);
                                handleCityChange(value);
                                setDistrictSearch('');
                            }}
                            onChange={(value) => {
                                setCitySearch(value);
                            }}
                            placeholder="Nhập tên tỉnh/thành phố..."
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
                            Phường/Xã <span className={styles.required}>*</span>
                        </label>
                        <AutoComplete
                            value={districtSearch}
                            options={wards.map(w => ({
                                value: w.name,
                                key: String(w.code)
                            }))}
                            onSelect={(value) => {
                                setDistrictSearch(value);
                                setFormData(prev => ({ ...prev, teachingAreaDistrict: value }));
                            }}
                            onChange={(value) => {
                                setDistrictSearch(value);
                            }}
                            placeholder={wardsLoading ? 'Đang tải phường/xã...' : 'Nhập tên phường/xã...'}
                            disabled={!formData.teachingAreaCity || wardsLoading}
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

                {/* Teaching Mode — hiện chỉ hỗ trợ Online; Dạy trực tiếp & Cả hai sẽ mở trong tương lai. */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Hình thức dạy học <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.teachingModeGroup}>
                        {TEACHING_MODES.map((mode) => {
                            const available = mode.value === 'online';
                            return (
                                <label
                                    key={mode.value}
                                    className={`${styles.teachingModeOption} ${available ? '' : styles.teachingModeOptionDisabled}`}
                                    title={available ? undefined : 'Tính năng sẽ được hỗ trợ trong tương lai'}
                                >
                                    <input
                                        type="radio"
                                        name="teachingMode"
                                        value={mode.value}
                                        checked={formData.teachingMode === mode.value}
                                        disabled={!available}
                                        onChange={() => setFormData(prev => ({ ...prev, teachingMode: 'online' }))}
                                    />
                                    <span>{mode.label}</span>
                                    {!available && <span className={styles.comingSoonBadge}>Sắp hỗ trợ</span>}
                                </label>
                            );
                        })}
                    </div>
                    {errors.teachingMode && <span className={styles.error}>{errors.teachingMode}</span>}
                </div>

                {/* Gợi ý: môn học, cấp độ & giá được thiết lập ở trang Onboarding. */}
                <p style={{ fontSize: 13, color: 'rgba(62, 47, 40, 0.6)', marginTop: 4 }}>
                    Môn học, cấp độ &amp; giá được thiết lập ở trang Onboarding.
                </p>
            </div>
        </EditModal>
    );
};

export default ProfileHeroModal;
