import { type FunctionComponent, useState, useEffect, useMemo } from 'react';
import { X, Clock, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import styles from './AddAvailabilityModal.module.css';
import { createAvailability, DAY_OF_WEEK_MAP } from '../../../services/availability.service';

// Translate common English API messages to Vietnamese
const translateScheduleMsg = (msg: string): string => {
    if (!msg) return 'Không thể thêm lịch rảnh. Vui lòng thử lại.';
    if (/time slot overlaps/i.test(msg)) {
        const match = msg.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        return match
            ? `Khung giờ bị trùng với lịch hiện có: ${match[1]} - ${match[2]}`
            : 'Khung giờ bị trùng với lịch rảnh hiện có';
    }
    if (/start time must be before/i.test(msg)) return 'Giờ bắt đầu phải trước giờ kết thúc';
    if (/invalid time/i.test(msg)) return 'Thời gian không hợp lệ';
    if (/already exists/i.test(msg)) return 'Lịch rảnh này đã tồn tại';
    return msg;
};
import { useFormDraft } from '../../../hooks/useFormDraft';

// Hour options: 0 to 23 (temporarily expanded)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
        value: hour.toString(),
        label: hour.toString().padStart(2, '0')
    };
});

// Minute options: 00, 15, 30, 45
const MINUTE_OPTIONS = [
    { value: '0', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
];

// Helper to combine hour and minute to time string
const combineTime = (hour: string, minute: string): string => {
    if (!hour) return '';
    return `${hour.padStart(2, '0')}:${(minute || '0').padStart(2, '0')}`;
};

// Helper to compare times
const isTimeBefore = (h1: string, m1: string, h2: string, m2: string): boolean => {
    const time1 = parseInt(h1) * 60 + parseInt(m1 || '0');
    const time2 = parseInt(h2) * 60 + parseInt(m2 || '0');
    return time1 < time2;
};

interface AddAvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;  // Callback when availability is created successfully
}

// Interface for API validation errors
interface FieldErrors {
    startTime?: string;
    endTime?: string;
    dayOfWeek?: string;
}

const AddAvailabilityModal: FunctionComponent<AddAvailabilityModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [dayOfWeek, setDayOfWeek] = useState<number>(1);  // Default: Thứ 2 (Monday=1)
    const [fromHour, setFromHour] = useState('');
    const [fromMinute, setFromMinute] = useState('0');
    const [toHour, setToHour] = useState('');
    const [toMinute, setToMinute] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isVisible, setIsVisible] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
        dayOfWeek: number; fromHour: string; fromMinute: string; toHour: string; toMinute: string;
    }>('draft_add_availability');

    // Validity window — slot is valid for 30 days from creation (Vietnam time).
    // Mirrors backend logic in TutorAvailabilityResponse (ValidFrom/ValidTo).
    // Recomputed each render; cost is trivial and keeps the date fresh.
    const { startDateLabel, endDateLabel } = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 30);
        return {
            startDateLabel: formatter.format(now),
            endDateLabel: formatter.format(end),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Handle animation - delay visibility for smooth transition
    useEffect(() => {
        if (isOpen) {
            // Small delay to trigger CSS transition
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    // Load draft on open
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            if (draft) {
                setDayOfWeek(draft.dayOfWeek ?? 1);
                setFromHour(draft.fromHour ?? '');
                setFromMinute(draft.fromMinute ?? '0');
                setToHour(draft.toHour ?? '');
                setToMinute(draft.toMinute ?? '0');
            }
        }
    }, [isOpen, loadDraft]);

    // Auto-save draft on field changes
    useEffect(() => {
        if (isOpen) {
            saveDraft({ dayOfWeek, fromHour, fromMinute, toHour, toMinute });
        }
    }, [dayOfWeek, fromHour, fromMinute, toHour, toMinute, isOpen, saveDraft]);

    // Get available end hours based on start time
    const getAvailableEndHours = () => {
        if (!fromHour) return HOUR_OPTIONS;
        const startHour = parseInt(fromHour);
        return HOUR_OPTIONS.filter(opt => parseInt(opt.value) >= startHour);
    };

    // Get available end minutes based on selected hours
    const getAvailableEndMinutes = () => {
        if (!fromHour || !toHour) return MINUTE_OPTIONS;
        if (parseInt(toHour) > parseInt(fromHour)) return MINUTE_OPTIONS;
        // Same hour - filter minutes greater than start minute
        return MINUTE_OPTIONS.filter(opt => parseInt(opt.value) > parseInt(fromMinute));
    };

    if (!isOpen) return null;

    // Parse API validation errors to field errors
    const parseApiErrors = (apiErrors: Record<string, string[]>): FieldErrors => {
        const errors: FieldErrors = {};

        // Map API field names to local field names (case-insensitive)
        Object.entries(apiErrors).forEach(([key, messages]) => {
            const lowerKey = key.toLowerCase();
            const errorMessage = messages[0]; // Get first error message

            if (lowerKey === 'starttime') {
                errors.startTime = errorMessage;
            } else if (lowerKey === 'endtime') {
                errors.endTime = errorMessage;
            } else if (lowerKey === 'dayofweek') {
                errors.dayOfWeek = errorMessage;
            }
        });

        return errors;
    };

    // Clear field error when user changes input
    const clearFieldError = (field: keyof FieldErrors) => {
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setFieldErrors({});

        // Combine hour and minute
        const fromTime = combineTime(fromHour, fromMinute);
        const toTime = combineTime(toHour, toMinute);

        // Frontend validation
        const errors: FieldErrors = {};

        if (!fromHour) {
            errors.startTime = 'Vui lòng chọn giờ bắt đầu';
        }

        if (!toHour) {
            errors.endTime = 'Vui lòng chọn giờ kết thúc';
        }

        if (fromHour && toHour && !isTimeBefore(fromHour, fromMinute, toHour, toMinute)) {
            errors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
        }

        // If frontend validation fails, show errors and return
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setIsLoading(true);

        try {
            await createAvailability({
                dayofweek: dayOfWeek,
                starttime: fromTime,
                endtime: toTime,
            });

            toast.success(`Đã thêm lịch rảnh — hiệu lực đến ${endDateLabel}`);

            // Reset form and clear draft
            clearDraft();
            setDayOfWeek(1);  // Monday=1
            setFromHour('');
            setFromMinute('0');
            setToHour('');
            setToMinute('0');
            setFieldErrors({});

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error: any) {
            console.error('Error creating availability:', error);

            // Check if API returned validation errors
            const apiErrors = error.response?.data?.errors;
            if (apiErrors && typeof apiErrors === 'object') {
                const parsedErrors = parseApiErrors(apiErrors);
                setFieldErrors(parsedErrors);

                // Show toast with general message
                toast.error('Vui lòng kiểm tra lại thông tin nhập vào');
            } else {
                // Generic error message
                const rawMsg = error.response?.data?.message || error.response?.data?.title || '';
                toast.error(translateScheduleMsg(rawMsg));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`${styles.modalOverlay} ${isVisible ? styles.open : ''}`}
                onClick={handleOverlayClick}
            />

            {/* Sidebar Modal */}
            <div className={`${styles.sidebarModal} ${isVisible ? styles.open : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Thêm lịch rảnh</h2>
                    <button className={styles.closeBtn} onClick={handleCancel} type="button">
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Form Content */}
                <div className={styles.content}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formFields}>
                            {/* Day of Week Field */}
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Ngày trong tuần</label>
                                <div className={styles.inputWrapper}>
                                    <select
                                        className={styles.select}
                                        value={dayOfWeek}
                                        onChange={(e) => setDayOfWeek(Number(e.target.value))}
                                        required
                                    >
                                        {Object.entries(DAY_OF_WEEK_MAP).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Time Range Fields */}
                            <div className={styles.timeRangeGroup}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Từ</label>
                                    <div className={`${styles.timePickerRow} ${fieldErrors.startTime ? styles.inputError : ''}`}>
                                        <div className={styles.inputIcon}>
                                            <Clock size={14} strokeWidth={2} />
                                        </div>
                                        <select
                                            className={styles.timeSelect}
                                            value={fromHour}
                                            onChange={(e) => {
                                                setFromHour(e.target.value);
                                                clearFieldError('startTime');
                                                // Reset end time if it's now invalid
                                                if (toHour && !isTimeBefore(e.target.value, fromMinute, toHour, toMinute)) {
                                                    setToHour('');
                                                    setToMinute('0');
                                                }
                                            }}
                                            required
                                        >
                                            <option value="">Giờ</option>
                                            {HOUR_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className={styles.timeSeparator}>:</span>
                                        <select
                                            className={styles.timeSelect}
                                            value={fromMinute}
                                            onChange={(e) => {
                                                setFromMinute(e.target.value);
                                                // Reset end time if it's now invalid
                                                if (toHour && !isTimeBefore(fromHour, e.target.value, toHour, toMinute)) {
                                                    setToMinute('0');
                                                }
                                            }}
                                            disabled={!fromHour}
                                        >
                                            {MINUTE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {fieldErrors.startTime && (
                                        <span className={styles.errorMessage}>{fieldErrors.startTime}</span>
                                    )}
                                </div>

                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Đến</label>
                                    <div className={`${styles.timePickerRow} ${fieldErrors.endTime ? styles.inputError : ''}`}>
                                        <div className={styles.inputIcon}>
                                            <Clock size={14} strokeWidth={2} />
                                        </div>
                                        <select
                                            className={styles.timeSelect}
                                            value={toHour}
                                            onChange={(e) => {
                                                setToHour(e.target.value);
                                                clearFieldError('endTime');
                                                // Reset minute if hour changed and minute is now invalid
                                                if (e.target.value === fromHour && parseInt(toMinute) <= parseInt(fromMinute)) {
                                                    setToMinute('0');
                                                }
                                            }}
                                            required
                                            disabled={!fromHour}
                                        >
                                            <option value="">Giờ</option>
                                            {getAvailableEndHours().map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className={styles.timeSeparator}>:</span>
                                        <select
                                            className={styles.timeSelect}
                                            value={toMinute}
                                            onChange={(e) => {
                                                setToMinute(e.target.value);
                                                clearFieldError('endTime');
                                            }}
                                            disabled={!toHour}
                                        >
                                            {getAvailableEndMinutes().map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {fieldErrors.endTime && (
                                        <span className={styles.errorMessage}>{fieldErrors.endTime}</span>
                                    )}
                                </div>
                            </div>

                            {/* Validity hint - 30-day auto-expiry */}
                            <div className={styles.validityHint}>
                                <Info size={16} strokeWidth={2} className={styles.validityHintIcon} />
                                <div className={styles.validityHintContent}>
                                    <span className={styles.validityHintTitle}>Lịch rảnh hiệu lực 30 ngày</span>
                                    <span className={styles.validityHintText}>
                                        Bắt đầu từ <b>{startDateLabel}</b> và tự động hết hạn vào <b>{endDateLabel}</b>.
                                        Sau ngày này, bạn cần thêm lại lịch để tiếp tục nhận học sinh.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actions}>
                            <button
                                type="submit"
                                className={styles.primaryBtn}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Thêm lịch'}
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddAvailabilityModal;
