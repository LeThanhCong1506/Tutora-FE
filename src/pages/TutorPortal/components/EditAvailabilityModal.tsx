import type { FunctionComponent } from 'react';
import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import styles from './AddAvailabilityModal.module.css';
import { updateAvailability, DAY_OF_WEEK_MAP } from '../../../services/availability.service';
import { useFormDraft } from '../../../hooks/useFormDraft';

// Translate common English API messages to Vietnamese
const translateScheduleMsg = (msg: string): string => {
    if (!msg) return 'Không thể cập nhật lịch rảnh. Vui lòng thử lại.';
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

// Hour options: 0 to 23 (temporarily expanded)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
        value: hour.toString(),
        label: hour.toString().padStart(2, '0')
    };
});

// Minute options: 00, 30 — đồng nhất với grid 30 phút trong onboarding.
const MINUTE_OPTIONS = [
    { value: '0', label: '00' },
    { value: '30', label: '30' },
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

// Helper to parse time string to hour and minute
const parseTime = (timeStr: string): { hour: string; minute: string } => {
    if (!timeStr) return { hour: '', minute: '0' };
    const [hour, minute] = timeStr.split(':');
    return { hour: parseInt(hour).toString(), minute: parseInt(minute).toString() };
};

interface EditAvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    availabilityData: {
        id: number;
        dayOfWeek: number;  // API format: 0-6 (0=Sunday, 6=Saturday)
        startTime: string;
        endTime: string;
    } | null;
}

// Interface for API validation errors
interface FieldErrors {
    startTime?: string;
    endTime?: string;
    dayOfWeek?: string;
}

const EditAvailabilityModal: FunctionComponent<EditAvailabilityModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    availabilityData,
}) => {
    const [dayOfWeek, setDayOfWeek] = useState<number>(1);  // Default: Monday=1
    const [fromHour, setFromHour] = useState('');
    const [fromMinute, setFromMinute] = useState('0');
    const [toHour, setToHour] = useState('');
    const [toMinute, setToMinute] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isVisible, setIsVisible] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
        dayOfWeek: number; fromHour: string; fromMinute: string; toHour: string; toMinute: string;
    }>(`draft_edit_availability_${availabilityData?.id ?? 0}`);

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

    // Update form when availabilityData changes — prioritize draft
    useEffect(() => {
        if (availabilityData && isOpen) {
            const draft = loadDraft();
            if (draft) {
                setDayOfWeek(draft.dayOfWeek ?? availabilityData.dayOfWeek);
                setFromHour(draft.fromHour ?? '');
                setFromMinute(draft.fromMinute ?? '0');
                setToHour(draft.toHour ?? '');
                setToMinute(draft.toMinute ?? '0');
            } else {
                setDayOfWeek(availabilityData.dayOfWeek);
                const startParsed = parseTime(availabilityData.startTime);
                const endParsed = parseTime(availabilityData.endTime);
                setFromHour(startParsed.hour);
                setFromMinute(startParsed.minute);
                setToHour(endParsed.hour);
                setToMinute(endParsed.minute);
            }
            setFieldErrors({});
        }
    }, [availabilityData, isOpen, loadDraft]);

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

    if (!isOpen || !availabilityData) return null;

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
            await updateAvailability(availabilityData.id, {
                dayofweek: dayOfWeek,
                starttime: fromTime,
                endtime: toTime,
            });

            toast.success('Cập nhật lịch rảnh thành công!');
            clearDraft();
            setFieldErrors({});

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error: unknown) {
            console.error('Error updating availability:', error);

            const axiosError = error as { response?: { data?: { message?: string; title?: string; errors?: Record<string, string[]> } } };

            // Check if API returned validation errors
            const apiErrors = axiosError.response?.data?.errors;
            if (apiErrors && typeof apiErrors === 'object') {
                const parsedErrors = parseApiErrors(apiErrors);
                setFieldErrors(parsedErrors);

                // Show toast with general message
                toast.error('Vui lòng kiểm tra lại thông tin nhập vào');
            } else {
                // Generic error message
                const rawMsg = axiosError.response?.data?.message || axiosError.response?.data?.title || '';
                toast.error(translateScheduleMsg(rawMsg));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFieldErrors({});
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
                    <h2 className={styles.title}>Chỉnh sửa lịch rảnh</h2>
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
                                        onChange={(e) => {
                                            setDayOfWeek(Number(e.target.value));
                                            clearFieldError('dayOfWeek');
                                        }}
                                        required
                                    >
                                        {Object.entries(DAY_OF_WEEK_MAP).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {fieldErrors.dayOfWeek && (
                                    <span className={styles.errorMessage}>{fieldErrors.dayOfWeek}</span>
                                )}
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

                            {/* Time hint */}
                            {/* <p className={styles.timeHint}>
                                Lưu ý: Thời gian phải nằm trong khoảng 07:00 - 21:00
                            </p> */}
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actions}>
                            <button
                                type="submit"
                                className={styles.primaryBtn}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Lưu thay đổi'}
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

export default EditAvailabilityModal;
