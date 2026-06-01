import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import EditModal from './EditModal';
import { uploadIdCard } from '../../../services/supabase.service';
import { submitVerification } from '../../../services/verification.service';
import styles from './IdentityVerificationModal.module.css';

// Icons
const IdCardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 16C5 14.5 6.5 13.5 8 13.5C9.5 13.5 11 14.5 11 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 9H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PendingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SpinnerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={styles.spinner}>
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
        <path d="M10 2C14.4183 2 18 5.58172 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export interface IdentityVerificationData {
    idNumber: string;
    fullNameOnId: string;
    dateOfBirth: string;
    address?: string;
    hometown?: string;
    gender?: string;
    idFrontImage: File | null;
    idFrontImageUrl?: string;
    idBackImage: File | null;
    idBackImageUrl?: string;
    verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
    rejectionReason?: string;
}

interface IdentityVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: IdentityVerificationData) => void;
    initialData?: IdentityVerificationData;
}

// Validation functions
const validateIdImage = (file: File | null, existingUrl?: string): { isValid: boolean; error?: string } => {
    if (!file && !existingUrl) {
        return { isValid: false, error: 'Vui lòng tải lên ảnh' };
    }
    if (file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { isValid: false, error: 'Kích thước ảnh không được vượt quá 5MB' };
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return { isValid: false, error: 'Chỉ chấp nhận định dạng JPG hoặc PNG' };
        }
    }
    return { isValid: true };
};

const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const defaultData: IdentityVerificationData = {
        idNumber: '',
        fullNameOnId: '',
        dateOfBirth: '',
        idFrontImage: null,
        idBackImage: null,
        verificationStatus: 'not_submitted'
    };

    const [formData, setFormData] = useState<IdentityVerificationData>(initialData || defaultData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFrontUploading, setIsFrontUploading] = useState(false);
    const [isBackUploading, setIsBackUploading] = useState(false);
    const [frontPath, setFrontPath] = useState<string | null>(null);
    const [backPath, setBackPath] = useState<string | null>(null);
    const [previews, setPreviews] = useState<{
        front: string | null;
        back: string | null;
    }>({
        front: initialData?.idFrontImageUrl || null,
        back: initialData?.idBackImageUrl || null
    });

    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || defaultData);
            setPreviews({
                front: initialData?.idFrontImageUrl || null,
                back: initialData?.idBackImageUrl || null
            });
            setErrors({});
            setFrontPath(null);
            setBackPath(null);
        }
    }, [isOpen, initialData]);

    // Handle file upload for front image
    const handleFrontSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateIdImage(file);
        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, front: validation.error || '' }));
            return;
        }

        // Create preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, front: reader.result as string }));
        };
        reader.readAsDataURL(file);

        setFormData(prev => ({ ...prev, idFrontImage: file }));
        setErrors(prev => ({ ...prev, front: '' }));
        setIsFrontUploading(true);

        // Upload to Supabase
        const result = await uploadIdCard(file, 'front');

        if (result.error) {
            toast.error(result.error);
            setFormData(prev => ({ ...prev, idFrontImage: null }));
            setPreviews(prev => ({ ...prev, front: null }));
            setIsFrontUploading(false);
            return;
        }

        toast.success('Upload ảnh mặt trước thành công!');
        setFrontPath(result.publicUrl || result.path);
        setIsFrontUploading(false);
    };

    // Handle file upload for back image
    const handleBackSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateIdImage(file);
        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, back: validation.error || '' }));
            return;
        }

        // Create preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, back: reader.result as string }));
        };
        reader.readAsDataURL(file);

        setFormData(prev => ({ ...prev, idBackImage: file }));
        setErrors(prev => ({ ...prev, back: '' }));
        setIsBackUploading(true);

        // Upload to Supabase
        const result = await uploadIdCard(file, 'back');

        if (result.error) {
            toast.error(result.error);
            setFormData(prev => ({ ...prev, idBackImage: null }));
            setPreviews(prev => ({ ...prev, back: null }));
            setIsBackUploading(false);
            return;
        }

        toast.success('Upload ảnh mặt sau thành công!');
        setBackPath(result.publicUrl || result.path);
        setIsBackUploading(false);
    };

    // Remove uploaded file
    const handleRemoveFile = (type: 'front' | 'back') => {
        const fieldMap = {
            front: 'idFrontImage',
            back: 'idBackImage'
        } as const;

        const urlMap = {
            front: 'idFrontImageUrl',
            back: 'idBackImageUrl'
        } as const;

        setFormData(prev => ({
            ...prev,
            [fieldMap[type]]: null,
            [urlMap[type]]: undefined
        }));
        setPreviews(prev => ({ ...prev, [type]: null }));

        if (type === 'front') {
            setFrontPath(null);
            if (frontInputRef.current) frontInputRef.current.value = '';
        } else {
            setBackPath(null);
            if (backInputRef.current) backInputRef.current.value = '';
        }
    };

    // Validate form before submit
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate front image - must have uploaded path
        if (!frontPath && !formData.idFrontImageUrl) {
            newErrors.front = 'Vui lòng tải lên ảnh mặt trước CCCD';
        }

        // Validate back image - must have uploaded path
        if (!backPath && !formData.idBackImageUrl) {
            newErrors.back = 'Vui lòng tải lên ảnh mặt sau CCCD';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit verification
    const handleSave = async () => {
        if (!validateForm()) return;

        // Check if still uploading
        if (isFrontUploading || isBackUploading) {
            toast.warning('Vui lòng chờ upload ảnh hoàn tất!');
            return;
        }

        // Use uploaded paths or existing URLs
        const frontImagePath = frontPath || formData.idFrontImageUrl;
        const backImagePath = backPath || formData.idBackImageUrl;

        if (!frontImagePath || !backImagePath) {
            toast.error('Vui lòng upload đầy đủ ảnh CCCD cả 2 mặt!');
            return;
        }

        setIsLoading(true);

        try {
            const response = await submitVerification(frontImagePath, backImagePath);

            if (response.success) {
                // Check if eKYC returned data immediately (verified)
                const isVerified = response.status === 'approved' && response.content;

                if (isVerified && response.content) {
                    toast.success('Xác thực danh tính thành công!');

                    // Update form data with verified status and eKYC data
                    const updatedData: IdentityVerificationData = {
                        ...formData,
                        idNumber: response.content.id || '',
                        fullNameOnId: response.content.name || '',
                        dateOfBirth: response.content.dob || '',
                        address: response.content.address || '',
                        hometown: response.content.home || '',
                        gender: response.content.sex || '',
                        idFrontImageUrl: frontImagePath,
                        idBackImageUrl: backImagePath,
                        verificationStatus: 'verified'
                    };

                    onSave(updatedData);
                } else {
                    toast.success('Đã gửi yêu cầu xác thực. Admin sẽ xét duyệt trong 24-48h.');

                    // Update form data with pending status
                    const updatedData: IdentityVerificationData = {
                        ...formData,
                        idFrontImageUrl: frontImagePath,
                        idBackImageUrl: backImagePath,
                        verificationStatus: 'pending'
                    };

                    onSave(updatedData);
                }
                onClose();
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi xác thực');
            }
        } catch (error) {
            console.error('Submit verification error:', error);
            toast.error('Không thể kết nối với server. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = () => {
        switch (formData.verificationStatus) {
            case 'verified':
                return (
                    <div className={`${styles.statusBadge} ${styles.verified}`}>
                        <CheckIcon />
                        <span>Đã xác minh</span>
                    </div>
                );
            case 'rejected':
                return (
                    <div className={`${styles.statusBadge} ${styles.rejected}`}>
                        <CloseIcon />
                        <span>Bị từ chối</span>
                    </div>
                );
            case 'pending':
                return (
                    <div className={`${styles.statusBadge} ${styles.pending}`}>
                        <PendingIcon />
                        <span>Đang chờ duyệt</span>
                    </div>
                );
            default:
                return (
                    <div className={`${styles.statusBadge} ${styles.notSubmitted}`}>
                        <IdCardIcon />
                        <span>Chưa xác minh</span>
                    </div>
                );
        }
    };

    const isAlreadyVerified = formData.verificationStatus === 'verified';
    const isReadyToSubmit = (frontPath || formData.idFrontImageUrl) &&
        (backPath || formData.idBackImageUrl) &&
        !isFrontUploading && !isBackUploading;

    // When verified, clicking "Đóng" just closes the modal
    const handleSaveOrClose = () => {
        if (isAlreadyVerified) {
            onClose();
        } else {
            handleSave();
        }
    };

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSaveOrClose}
            title="Xác minh danh tính"
            isLoading={isLoading}
            saveLabel={isAlreadyVerified ? 'Đóng' : 'Gửi xác minh'}
            size="large"
            saveDisabled={!isReadyToSubmit && !isAlreadyVerified}
            hideCancel={isAlreadyVerified}
        >
            <div className={styles.form}>
                {/* Verification Status */}
                <div className={styles.statusSection}>
                    <label className={styles.sectionLabel}>Trạng thái xác minh</label>
                    {getStatusBadge()}
                    {formData.verificationStatus === 'rejected' && formData.rejectionReason && (
                        <div className={styles.rejectionReason}>
                            <strong>Lý do từ chối:</strong> {formData.rejectionReason}
                        </div>
                    )}
                </div>

                {/* Instructions - only show if not yet verified */}
                {!isAlreadyVerified && (
                    <div className={styles.instructions}>
                        <h4>Hướng dẫn xác minh</h4>
                        <ul>
                            <li>Chụp ảnh CCCD/CMND rõ ràng, không bị mờ, không bị cắt góc</li>
                            <li>Đảm bảo ánh sáng đủ, không bị chói sáng</li>
                            <li>Toàn bộ thẻ CCCD phải nằm trong khung hình</li>
                            <li>File ảnh dưới 5MB, định dạng JPG hoặc PNG</li>
                        </ul>
                    </div>
                )}

                {/* ID Card Images */}
                <div className={styles.imageUploads}>
                    {/* Front Image */}
                    <div className={styles.uploadSection}>
                        <label className={styles.sectionLabel}>
                            Mặt trước CCCD/CMND {!isAlreadyVerified && <span className={styles.required}>*</span>}
                        </label>
                        {previews.front ? (
                            <div className={styles.imagePreview}>
                                <img src={previews.front} alt="ID Front" />
                                {isFrontUploading && (
                                    <div className={styles.uploadOverlay}>
                                        <SpinnerIcon />
                                        <span>Đang upload...</span>
                                    </div>
                                )}
                                {!isAlreadyVerified && !isFrontUploading && (
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => handleRemoveFile('front')}
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                                {frontPath && !isFrontUploading && (
                                    <div className={styles.uploadSuccess}>
                                        <CheckIcon />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className={styles.uploadArea}
                                onClick={() => !isAlreadyVerified && frontInputRef.current?.click()}
                            >
                                <IdCardIcon />
                                <span>Tải lên mặt trước</span>
                                <span className={styles.uploadHint}>JPG, PNG - Tối đa 5MB</span>
                            </div>
                        )}
                        <input
                            ref={frontInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleFrontSelected}
                            className={styles.fileInput}
                            disabled={isAlreadyVerified || isFrontUploading}
                        />
                        {errors.front && <span className={styles.error}>{errors.front}</span>}
                    </div>

                    {/* Back Image */}
                    <div className={styles.uploadSection}>
                        <label className={styles.sectionLabel}>
                            Mặt sau CCCD/CMND {!isAlreadyVerified && <span className={styles.required}>*</span>}
                        </label>
                        {previews.back ? (
                            <div className={styles.imagePreview}>
                                <img src={previews.back} alt="ID Back" />
                                {isBackUploading && (
                                    <div className={styles.uploadOverlay}>
                                        <SpinnerIcon />
                                        <span>Đang upload...</span>
                                    </div>
                                )}
                                {!isAlreadyVerified && !isBackUploading && (
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => handleRemoveFile('back')}
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                                {backPath && !isBackUploading && (
                                    <div className={styles.uploadSuccess}>
                                        <CheckIcon />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className={styles.uploadArea}
                                onClick={() => !isAlreadyVerified && backInputRef.current?.click()}
                            >
                                <IdCardIcon />
                                <span>Tải lên mặt sau</span>
                                <span className={styles.uploadHint}>JPG, PNG - Tối đa 5MB</span>
                            </div>
                        )}
                        <input
                            ref={backInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleBackSelected}
                            className={styles.fileInput}
                            disabled={isAlreadyVerified || isBackUploading}
                        />
                        {errors.back && <span className={styles.error}>{errors.back}</span>}
                    </div>
                </div>

                {/* eKYC Extracted Data - show below images when verified */}
                {isAlreadyVerified && formData.idNumber && (
                    <div className={styles.ekycDataSection}>
                        <h4 className={styles.ekycTitle}>
                            <CheckIcon />
                            Thông tin trích xuất từ CCCD
                        </h4>
                        <div className={styles.ekycGrid}>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Số CCCD</span>
                                <span className={styles.ekycValue}>{formData.idNumber}</span>
                            </div>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Họ và tên</span>
                                <span className={styles.ekycValue}>{formData.fullNameOnId || '—'}</span>
                            </div>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Ngày sinh</span>
                                <span className={styles.ekycValue}>{formData.dateOfBirth || '—'}</span>
                            </div>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Giới tính</span>
                                <span className={styles.ekycValue}>{formData.gender || '—'}</span>
                            </div>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Quê quán</span>
                                <span className={styles.ekycValue}>{formData.hometown || '—'}</span>
                            </div>
                            <div className={styles.ekycItem}>
                                <span className={styles.ekycLabel}>Địa chỉ thường trú</span>
                                <span className={styles.ekycValue}>{formData.address || '—'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Privacy Note */}
                <div className={styles.privacyNote}>
                    <p>
                        Thông tin CCCD/CMND của bạn được bảo mật tuyệt đối và chỉ được sử dụng
                        để xác minh danh tính. Chúng tôi cam kết không chia sẻ thông tin này
                        với bất kỳ bên thứ ba nào.
                    </p>
                </div>
            </div>
        </EditModal>
    );
};

export default IdentityVerificationModal;
