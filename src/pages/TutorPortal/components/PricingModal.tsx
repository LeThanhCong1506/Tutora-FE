import React, { useState, useEffect } from 'react';
import EditModal from './EditModal';
import FormField from './FormField';
import {
    validateHourlyRate,
    validateTrialPrice,
    formatVND,
    parseVND
} from '../utils/validation';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './PricingModal.module.css';

interface PricingData {
    hourlyRate: number;
    trialLessonPrice: number | null;
    allowPriceNegotiation: boolean;
}

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: PricingData) => Promise<boolean>;
    initialData: PricingData;
}

// Display "" for 0/null so the input shows the placeholder (e.g. "VD: 200,000 VND")
// instead of an off-putting "0 VND" prefill on first open.
const displayPrice = (value: number | null | undefined): string =>
    value && value > 0 ? formatVND(value) : '';

const PricingModal: React.FC<PricingModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [formData, setFormData] = useState<PricingData>(initialData);
    const [hourlyRateDisplay, setHourlyRateDisplay] = useState(displayPrice(initialData.hourlyRate));
    const [trialPriceDisplay, setTrialPriceDisplay] = useState(displayPrice(initialData.trialLessonPrice));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<PricingData>('draft_pricing');

    // Reset form when modal opens — prioritize draft over initialData
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            const dataToUse = draft ?? initialData;
            setFormData(dataToUse);
            setHourlyRateDisplay(displayPrice(dataToUse.hourlyRate));
            setTrialPriceDisplay(displayPrice(dataToUse.trialLessonPrice));
            setErrors({});
        }
    }, [isOpen, initialData, loadDraft]);

    // Auto-save draft on form data change
    useEffect(() => {
        if (isOpen) {
            saveDraft(formData);
        }
    }, [formData, isOpen, saveDraft]);

    // Handle hourly rate change
    const handleHourlyRateChange = (value: string) => {
        const numValue = parseVND(value);
        setFormData(prev => ({ ...prev, hourlyRate: numValue }));
        setHourlyRateDisplay(value);
    };


    // Handle trial price change
    const handleTrialPriceChange = (value: string) => {
        if (!value.trim()) {
            setFormData(prev => ({ ...prev, trialLessonPrice: null }));
            setTrialPriceDisplay('');
            return;
        }
        const numValue = parseVND(value);
        setFormData(prev => ({ ...prev, trialLessonPrice: numValue }));
        setTrialPriceDisplay(value);
    };


    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate hourly rate
        const hourlyValidation = validateHourlyRate(formData.hourlyRate);
        if (!hourlyValidation.isValid) {
            newErrors.hourlyRate = hourlyValidation.error || '';
        }

        // Validate trial price
        const trialValidation = validateTrialPrice(formData.trialLessonPrice, formData.hourlyRate);
        if (!trialValidation.isValid) {
            newErrors.trialPrice = trialValidation.error || '';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

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
            title="Chỉnh sửa giá dạy"
            isLoading={isLoading}
            size="small"
        >
            <div className={styles.form}>
                {/* Hourly Rate */}
                <div className={styles.priceField}>
                    <FormField
                        type="text"
                        name="hourlyRate"
                        label="Giá theo giờ"
                        value={hourlyRateDisplay}
                        onChange={handleHourlyRateChange}
                        placeholder="VD: 200,000 VND"
                        required
                        error={errors.hourlyRate}
                        hint="50,000 - 2,000,000 VND"
                    />
                </div>

                {/* Trial Lesson Price */}
                <div className={styles.priceField}>
                    <FormField
                        type="text"
                        name="trialPrice"
                        label="Giá buổi học thử"
                        value={trialPriceDisplay}
                        onChange={handleTrialPriceChange}
                        placeholder="Để trống nếu không có"
                        error={errors.trialPrice}
                        hint="Phải thấp hơn giá theo giờ"
                    />
                </div>

                {/* Allow Negotiation */}
                <FormField
                    type="checkbox"
                    name="allowPriceNegotiation"
                    label="Cho phép thương lượng giá"
                    checked={formData.allowPriceNegotiation}
                    onChange={(checked) => setFormData(prev => ({ ...prev, allowPriceNegotiation: checked }))}
                />

                {/* Pricing Tips */}
                <div className={styles.tips}>
                    <h4>Mẹo đặt giá</h4>
                    <ul>
                        <li>Giá buổi học thử thấp hơn sẽ thu hút nhiều học sinh hơn</li>
                        <li>Xem xét giá thị trường trong khu vực của bạn</li>
                        <li>Có thể điều chỉnh giá theo cấp độ và độ khó của môn học</li>
                    </ul>
                </div>
            </div>
        </EditModal>
    );
};

export default PricingModal;
