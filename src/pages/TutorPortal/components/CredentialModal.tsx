import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { AutoComplete, Modal } from 'antd';
import EditModal from './EditModal';
import FormField from './FormField';
import {
    validateCredentialName,
    validateInstitution,
    validateCertificateFile
} from '../utils/validation';
import {
    CERTIFICATE_TYPES,
    getCertificateLabel
} from '../data/certificateTypes';
import {
    uploadCertificate,
    submitCertificateForReview,
    type CertificateValidationResult
} from '../../../services/certificate.service';
import { getUserIdFromToken } from '../../../services/auth.service';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './CredentialModal.module.css';

// Icons
const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4V14M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const FileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M11 1H5C3.89543 1 3 1.89543 3 3V17C3 18.1046 3.89543 19 5 19H15C16.1046 19 17 18.1046 17 17V7L11 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 1V7H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

const WarningIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.58 20.74C2.9 20.92 3.26 21.01 3.64 21H20.36C20.74 21.01 21.1 20.92 21.42 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.95 3.15C12.63 2.98 12.27 2.89 11.9 2.89C11.53 2.89 11.17 2.98 10.85 3.15C10.53 3.32 10.27 3.56 10.09 3.86H10.29Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export interface CredentialData {
    id?: string;
    name: string;
    certificateType: string;
    institution: string;
    issueYear: number | null;
    credentialId?: string | null;
    credentialUrl?: string | null;
    certificateFile: File | null;
    certificateUrl?: string;
    createdAt?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verificationNote?: string | null;
}

interface CredentialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CredentialData) => void;
    initialData?: CredentialData;
    isEditing?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => ({
    value: String(CURRENT_YEAR - i),
    label: String(CURRENT_YEAR - i)
}));

const CredentialModal: React.FC<CredentialModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    isEditing = false
}) => {
    const defaultData: CredentialData = {
        name: '',
        certificateType: '',
        institution: '',
        issueYear: null,
        credentialId: '',
        credentialUrl: '',
        certificateFile: null,
        verificationStatus: 'pending'
    };

    const [formData, setFormData] = useState<CredentialData>(initialData || defaultData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [certificateTypeSearch, setCertificateTypeSearch] = useState<string>('');

    // Validation error modal state
    const [showValidationError, setShowValidationError] = useState(false);
    const [validationResult, setValidationResult] = useState<CertificateValidationResult | null>(null);
    const [pendingCertificateId, setPendingCertificateId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<CredentialData>('draft_credential');

    // Reset form when modal opens — prioritize draft over initialData
    useEffect(() => {
        if (isOpen) {
            const draft = loadDraft();
            const dataToUse = draft ? { ...draft, certificateFile: null } : (initialData || defaultData);
            setFormData(dataToUse);
            setErrors({});
            setFilePreview(dataToUse.certificateUrl || null);
            // Set initial search value
            if (dataToUse.certificateType) {
                setCertificateTypeSearch(getCertificateLabel(dataToUse.certificateType));
            } else {
                setCertificateTypeSearch('');
            }
            setShowValidationError(false);
            setValidationResult(null);
            setPendingCertificateId(null);
        }
    }, [isOpen, initialData, loadDraft]);

    // Auto-save draft on form data change
    useEffect(() => {
        if (isOpen) {
            saveDraft(formData);
        }
    }, [formData, isOpen, saveDraft]);

    // Handle file upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validation = validateCertificateFile(file);
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, certificateFile: validation.error || '' }));
                return;
            }

            setFormData(prev => ({ ...prev, certificateFile: file }));
            setErrors(prev => ({ ...prev, certificateFile: '' }));

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFilePreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                // For PDF, show file name
                setFilePreview(null);
            }
        }
    };

    // Remove uploaded file
    const handleRemoveFile = () => {
        setFormData(prev => ({ ...prev, certificateFile: null, certificateUrl: undefined }));
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle year change
    const handleYearChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            issueYear: value ? parseInt(value) : null
        }));
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate name
        const nameValidation = validateCredentialName(formData.name);
        if (!nameValidation.isValid) {
            newErrors.name = nameValidation.error || '';
        }

        // Validate certificate type
        if (!formData.certificateType) {
            newErrors.certificateType = 'Vui lòng chọn loại chứng chỉ';
        }

        // Validate institution
        const institutionValidation = validateInstitution(formData.institution);
        if (!institutionValidation.isValid) {
            newErrors.institution = institutionValidation.error || '';
        }

        // Validate certificate file (required for new credentials)
        if (!isEditing && !formData.certificateFile && !formData.certificateUrl) {
            newErrors.certificateFile = 'Vui lòng tải lên file chứng chỉ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle save
    const handleSave = async () => {
        if (!validateForm()) return;

        const userId = getUserIdFromToken();
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }

        if (!formData.certificateFile) {
            toast.error('Vui lòng tải lên file chứng chỉ');
            return;
        }

        setIsLoading(true);

        try {
            const response = await uploadCertificate(userId, {
                CertificateName: formData.name,
                CertificateType: formData.certificateType,
                IssuingOrganization: formData.institution,
                YearIssued: formData.issueYear,
                CredentialId: formData.credentialId || null,
                CredentialUrl: formData.credentialUrl || null,
                CertificateFile: formData.certificateFile
            });

            if (response.content) {
                const { certificate, validationResult: valResult } = response.content;

                // Check validation result
                if (!valResult.isValid) {
                    // Show validation error modal
                    setValidationResult(valResult);
                    setPendingCertificateId(certificate.certificateId);
                    setShowValidationError(true);
                    setIsLoading(false);
                    return;
                }

                // Success - validation passed
                toast.success('Tải lên chứng chỉ thành công!');
                clearDraft();

                onSave({
                    ...formData,
                    id: certificate.certificateId,
                    certificateUrl: certificate.certificateFileUrl,
                    verificationStatus: 'verified'
                });
                onClose();
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi tải lên chứng chỉ');
            }
        } catch (error) {
            console.error('Upload certificate error:', error);
            toast.error('Không thể kết nối với server. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle submit for review (when validation fails but user wants admin to review)
    const handleSubmitForReview = async () => {
        if (!pendingCertificateId) return;

        const userId = getUserIdFromToken();
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }

        setIsLoading(true);

        try {
            const result = await submitCertificateForReview(userId, pendingCertificateId);

            if (result.success) {
                // Show appropriate message based on whether profile was already pending
                if (result.alreadyPending) {
                    toast.success('Chứng chỉ đã được thêm vào hồ sơ đang chờ duyệt!');
                } else {
                    toast.success('Đã gửi chứng chỉ để admin xét duyệt!');
                }

                onSave({
                    ...formData,
                    id: pendingCertificateId,
                    verificationStatus: 'pending'
                });
                clearDraft();
                setShowValidationError(false);
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Submit for review error:', error);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle re-upload (close validation modal and let user upload again)
    const handleReupload = () => {
        setShowValidationError(false);
        setValidationResult(null);
        setPendingCertificateId(null);
        // Clear file so user can upload new one
        handleRemoveFile();
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
            default:
                return (
                    <div className={`${styles.statusBadge} ${styles.pending}`}>
                        <PendingIcon />
                        <span>Đang chờ duyệt</span>
                    </div>
                );
        }
    };

    return (
        <>
            <EditModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={handleSave}
                title={isEditing ? 'Chỉnh sửa chứng chỉ' : 'Thêm chứng chỉ mới'}
                isLoading={isLoading}
                saveLabel={isEditing ? 'Cập nhật' : 'Gửi duyệt'}
                size="medium"
            >
                <div className={styles.form}>
                    {/* Verification Status (only show when editing) */}
                    {isEditing && (
                        <div className={styles.statusSection}>
                            <label className={styles.sectionLabel}>Trạng thái xác minh</label>
                            {getStatusBadge()}
                        </div>
                    )}

                    {/* Credential Name */}
                    <FormField
                        type="text"
                        name="credentialName"
                        label="Tên chứng chỉ / bằng cấp"
                        value={formData.name}
                        onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                        placeholder="VD: TOEFL iBT 115, IELTS 8.0, Bằng Cử nhân..."
                        maxLength={200}
                        required
                        error={errors.name}
                    />

                    {/* Certificate Type - Searchable Dropdown */}
                    <div className={styles.formGroup}>
                        <label className={styles.sectionLabel}>
                            Loại chứng chỉ <span className={styles.required}>*</span>
                        </label>
                        <AutoComplete
                            value={certificateTypeSearch}
                            options={CERTIFICATE_TYPES.map(cert => ({
                                value: cert.label,
                                key: cert.value
                            }))}
                            onSelect={(value) => {
                                const certType = CERTIFICATE_TYPES.find(c => c.label === value);
                                if (certType) {
                                    setCertificateTypeSearch(value);
                                    setFormData(prev => ({ ...prev, certificateType: certType.value }));
                                    setErrors(prev => ({ ...prev, certificateType: '' }));
                                }
                            }}
                            onChange={(value) => {
                                setCertificateTypeSearch(value);
                                // Also allow custom type
                                const certType = CERTIFICATE_TYPES.find(c => c.label === value);
                                if (certType) {
                                    setFormData(prev => ({ ...prev, certificateType: certType.value }));
                                } else if (value) {
                                    setFormData(prev => ({ ...prev, certificateType: value }));
                                }
                            }}
                            placeholder="Nhập để tìm kiếm loại chứng chỉ..."
                            className={styles.autocomplete}
                            filterOption={(inputValue, option) =>
                                option?.value?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
                            }
                            allowClear
                            onClear={() => {
                                setCertificateTypeSearch('');
                                setFormData(prev => ({ ...prev, certificateType: '' }));
                            }}
                        />
                        {errors.certificateType && (
                            <span className={styles.error}>{errors.certificateType}</span>
                        )}
                    </div>

                    {/* Institution */}
                    <FormField
                        type="text"
                        name="institution"
                        label="Tổ chức cấp"
                        value={formData.institution}
                        onChange={(value) => setFormData(prev => ({ ...prev, institution: value }))}
                        placeholder="VD: ETS Global, British Council, Đại học..."
                        maxLength={200}
                        required
                        error={errors.institution}
                    />

                    {/* Issue Year */}
                    <FormField
                        type="select"
                        name="issueYear"
                        label="Năm cấp"
                        value={formData.issueYear?.toString() || ''}
                        onChange={handleYearChange}
                        options={YEARS}
                        placeholder="Chọn năm"
                        error={errors.issueYear}
                    />

                    {/* Credential ID (Optional) */}
                    <FormField
                        type="text"
                        name="credentialId"
                        label="Mã chứng chỉ"
                        value={formData.credentialId || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, credentialId: value }))}
                        placeholder="Mã định danh của chứng chỉ (nếu có)"
                        maxLength={100}
                        hint="Không bắt buộc"
                    />

                    {/* Credential URL (Optional) */}
                    <FormField
                        type="text"
                        name="credentialUrl"
                        label="Link xác minh"
                        value={formData.credentialUrl || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, credentialUrl: value }))}
                        placeholder="URL để xác minh chứng chỉ online (nếu có)"
                        maxLength={500}
                        hint="Không bắt buộc"
                    />

                    {/* Certificate Upload */}
                    <div className={styles.uploadSection}>
                        <label className={styles.sectionLabel}>
                            File chứng chỉ <span className={styles.required}>*</span>
                        </label>
                        <p className={styles.hint}>Định dạng: JPG, PNG, PDF. Tối đa 10MB</p>

                        {/* File Preview */}
                        {(formData.certificateFile || formData.certificateUrl) && (
                            <div className={styles.filePreview}>
                                {filePreview && filePreview.startsWith('data:image') ? (
                                    <img src={filePreview} alt="Certificate preview" className={styles.previewImage} />
                                ) : (
                                    <div className={styles.fileInfo}>
                                        <FileIcon />
                                        <span>{formData.certificateFile?.name || 'File đã tải lên'}</span>
                                    </div>
                                )}
                                <button type="button" className={styles.removeFileBtn} onClick={handleRemoveFile}>
                                    <CloseIcon />
                                </button>
                            </div>
                        )}

                        {/* Upload Area */}
                        {!formData.certificateFile && !formData.certificateUrl && (
                            <div
                                className={styles.uploadArea}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadIcon />
                                <span>Nhấn để tải lên file chứng chỉ</span>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={handleFileChange}
                            className={styles.fileInput}
                        />

                        {errors.certificateFile && (
                            <span className={styles.error}>{errors.certificateFile}</span>
                        )}
                    </div>

                    {/* Note */}
                    <div className={styles.note}>
                        <p>
                            Chứng chỉ của bạn sẽ được hệ thống tự động xác minh. Nếu không thể xác minh tự động,
                            bạn có thể gửi để admin xét duyệt thủ công trong vòng 24-48 giờ.
                        </p>
                    </div>
                </div>
            </EditModal>

            {/* Validation Error Modal */}
            <Modal
                open={showValidationError}
                title={null}
                footer={null}
                onCancel={() => setShowValidationError(false)}
                centered
                width={480}
                className={styles.validationModal}
            >
                <div className={styles.validationContent}>
                    <div className={styles.validationIcon}>
                        <WarningIcon />
                    </div>
                    <h3 className={styles.validationTitle}>Không thể xác minh tự động</h3>
                    <p className={styles.validationDesc}>
                        Hệ thống phát hiện một số vấn đề với chứng chỉ của bạn:
                    </p>

                    {validationResult && (
                        <ul className={styles.validationErrors}>
                            {validationResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    )}

                    <p className={styles.validationQuestion}>
                        Bạn muốn làm gì tiếp theo?
                    </p>

                    <div className={styles.validationActions}>
                        <button
                            className={styles.reuploadBtn}
                            onClick={handleReupload}
                            disabled={isLoading}
                        >
                            Tải lên ảnh rõ hơn
                        </button>
                        <button
                            className={styles.submitReviewBtn}
                            onClick={handleSubmitForReview}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Đang gửi...' : 'Gửi admin duyệt'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CredentialModal;
