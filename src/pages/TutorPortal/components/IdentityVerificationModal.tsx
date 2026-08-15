import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import EditModal from './EditModal';
import { uploadCccd } from '../../../services/tutorProfile.service';
import { getUserIdFromToken } from '../../../services/auth.service';
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
const validateIdImage = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return { isValid: false, error: 'Kích thước ảnh không được vượt quá 5MB' };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'Chỉ chấp nhận định dạng JPG hoặc PNG' };
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
    const [showProfileUpdateNotice, setShowProfileUpdateNotice] = useState(false);
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
        if (isOpen && !showProfileUpdateNotice) {
            setFormData(initialData || defaultData);
            setPreviews({
                front: initialData?.idFrontImageUrl || null,
                back: initialData?.idBackImageUrl || null
            });
            setErrors({});
            setShowProfileUpdateNotice(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData, showProfileUpdateNotice]);

    // Pick a file → validate + preview locally. Ảnh chỉ được upload khi bấm "Gửi xác minh"
    // (endpoint CCCD yêu cầu cả 2 mặt cùng lúc).
    const handleFileSelected = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateIdImage(file);
        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, [side]: validation.error || '' }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [side]: reader.result as string }));
        };
        reader.readAsDataURL(file);

        setFormData(prev => ({
            ...prev,
            [side === 'front' ? 'idFrontImage' : 'idBackImage']: file,
        }));
        setErrors(prev => ({ ...prev, [side]: '' }));
    };

    // Remove a staged file
    const handleRemoveFile = (side: 'front' | 'back') => {
        setFormData(prev => ({
            ...prev,
            [side === 'front' ? 'idFrontImage' : 'idBackImage']: null,
            [side === 'front' ? 'idFrontImageUrl' : 'idBackImageUrl']: undefined,
        }));
        setPreviews(prev => ({ ...prev, [side]: null }));

        const ref = side === 'front' ? frontInputRef : backInputRef;
        if (ref.current) ref.current.value = '';
    };

    // Validate that both images are staged before submitting.
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.idFrontImage) newErrors.front = 'Vui lòng tải lên ảnh mặt trước CCCD';
        if (!formData.idBackImage) newErrors.back = 'Vui lòng tải lên ảnh mặt sau CCCD';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit: CHỈ 1 API duy nhất — BE upload ảnh CCCD lên Cloudinary + OCR/eKYC ngay.
    const handleSave = async () => {
        if (!validateForm()) return;

        const userId = getUserIdFromToken();
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }

        const frontFile = formData.idFrontImage;
        const backFile = formData.idBackImage;
        if (!frontFile || !backFile) return;

        setIsLoading(true);

        try {
            const res = await uploadCccd(userId, frontFile, backFile);
            const kyc = res.content;

            if (res.statusCode !== 200 || !kyc) {
                toast.error(res.message || 'Xác minh CCCD thất bại. Vui lòng thử lại.');
                return;
            }

            if (kyc.ocrSuccess) {
                // CCCD là nguồn định danh chuẩn; BE đã đồng bộ họ tên, ngày sinh và giới tính.
                toast.success('Xác minh danh tính thành công!');
                onSave({
                    ...formData,
                    idNumber: kyc.identityNumber || '',
                    fullNameOnId: kyc.fullName || '',
                    dateOfBirth: kyc.dateOfBirth || '',
                    gender: kyc.gender || '',
                    address: kyc.address || '',
                    verificationStatus: 'verified',
                });
                if (kyc.profileDataUpdated) {
                    setShowProfileUpdateNotice(true);
                    return;
                }
            } else {
                // Không đọc được CCCD → ảnh đã lưu, chờ admin xác minh thủ công.
                toast.success(kyc.message || 'Đã gửi CCCD. Admin sẽ xác minh trong 24-48 giờ.');
                onSave({
                    ...formData,
                    verificationStatus: 'pending',
                });
            }
            onClose();
        } catch (error) {
            // BE trả message thân thiện cho lỗi file hoặc xác minh CCCD.
            const e = error as { response?: { data?: { message?: string } } };
            console.error('Upload CCCD error:', error);
            toast.error(e.response?.data?.message || 'Không thể kết nối với server. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const acknowledgeProfileUpdate = () => {
        setShowProfileUpdateNotice(false);
        onClose();
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
    // Sẵn sàng gửi khi đã chọn đủ ảnh 2 mặt (File mới — endpoint cần upload cả 2).
    const isReadyToSubmit = !!formData.idFrontImage && !!formData.idBackImage;

    // When verified, clicking "Đóng" just closes the modal
    const handleSaveOrClose = () => {
        if (isAlreadyVerified) {
            onClose();
        } else {
            handleSave();
        }
    };

    const renderUploadSection = (side: 'front' | 'back') => {
        const preview = previews[side];
        const hasFile = side === 'front' ? !!formData.idFrontImage : !!formData.idBackImage;
        const ref = side === 'front' ? frontInputRef : backInputRef;
        const label = side === 'front' ? 'Mặt trước CCCD/CMND' : 'Mặt sau CCCD/CMND';
        const uploadLabel = side === 'front' ? 'Tải lên mặt trước' : 'Tải lên mặt sau';

        return (
            <div className={styles.uploadSection}>
                <label className={styles.sectionLabel}>
                    {label} {!isAlreadyVerified && <span className={styles.required}>*</span>}
                </label>
                {preview ? (
                    <div className={styles.imagePreview}>
                        <img src={preview} alt={label} />
                        {!isAlreadyVerified && (
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => handleRemoveFile(side)}
                            >
                                <CloseIcon />
                            </button>
                        )}
                        {hasFile && (
                            <div className={styles.uploadSuccess}>
                                <CheckIcon />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className={styles.uploadArea}
                        onClick={() => !isAlreadyVerified && ref.current?.click()}
                    >
                        <IdCardIcon />
                        <span>{uploadLabel}</span>
                        <span className={styles.uploadHint}>JPG, PNG - Tối đa 5MB</span>
                    </div>
                )}
                <input
                    ref={ref}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileSelected(side)}
                    className={styles.fileInput}
                    disabled={isAlreadyVerified}
                />
                {errors[side] && <span className={styles.error}>{errors[side]}</span>}
            </div>
        );
    };

    return (
        <>
        <EditModal
            isOpen={isOpen && !showProfileUpdateNotice}
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

                {/* ID Card Images — ẩn sau khi đã xác minh (ảnh đã lưu, không cần upload lại) */}
                {!isAlreadyVerified && (
                    <div className={styles.imageUploads}>
                        {renderUploadSection('front')}
                        {renderUploadSection('back')}
                    </div>
                )}

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

        {showProfileUpdateNotice && (
            <div className={styles.profileUpdateOverlay} role="presentation">
                <div
                    className={styles.profileUpdateDialog}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="identity-profile-update-title"
                    aria-describedby="identity-profile-update-description"
                >
                    <div className={styles.profileUpdateIcon} aria-hidden="true"><CheckIcon /></div>
                    <h2 id="identity-profile-update-title">Thông tin đã được cập nhật</h2>
                    <p id="identity-profile-update-description">
                        Họ tên, ngày sinh và giới tính của bạn đã được cập nhật theo CCCD để đảm bảo
                        tính minh bạch và xác thực cho tài khoản.
                    </p>
                    <button type="button" className={styles.profileUpdateConfirm} onClick={acknowledgeProfileUpdate}>
                        Đồng ý
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default IdentityVerificationModal;
