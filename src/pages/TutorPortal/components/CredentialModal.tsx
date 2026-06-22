import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { AutoComplete, Modal } from 'antd';
import EditModal from './EditModal';
import FormField from './FormField';
import { validateCredentialName, validateInstitution, validateCertificateFile } from '../utils/validation';
import { CERTIFICATE_TYPES, getCertificateLabel } from '../data/certificateTypes';
import { uploadCertificate } from '../../../services/certificate.service';
import { getUserIdFromToken } from '../../../services/auth.service';
import { useFormDraft } from '../../../hooks/useFormDraft';
import styles from './CredentialModal.module.css';

// Icons
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 4V14M12 4L8 8M12 4L16 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
  label: String(CURRENT_YEAR - i),
}));

const getCertificatePreviewUrl = (url: string | null, fullSize = false): string | null => {
  if (!url) return null;
  if (!/\.pdf(?:$|[?#])/i.test(url)) return url;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'res.cloudinary.com' || !parsedUrl.pathname.includes('/image/upload/')) {
      return null;
    }

    const transformation = fullSize
      ? 'pg_1,w_1800,c_limit,q_auto,f_jpg'
      : 'pg_1,w_320,h_240,c_pad,b_white,q_auto,f_jpg';

    parsedUrl.pathname = parsedUrl.pathname
      .replace('/image/upload/', `/image/upload/${transformation}/`)
      .replace(/\.pdf$/i, '.jpg');
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    return null;
  }
};

const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}) => {
  const defaultData: CredentialData = {
    name: '',
    certificateType: '',
    institution: '',
    issueYear: null,
    credentialId: '',
    credentialUrl: '',
    certificateFile: null,
    verificationStatus: 'pending',
  };

  const [formData, setFormData] = useState<CredentialData>(initialData || defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [certificateTypeSearch, setCertificateTypeSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<CredentialData>('draft_credential');
  const previewImageUrl = getCertificatePreviewUrl(filePreview);
  const fullPreviewImageUrl = getCertificatePreviewUrl(filePreview, true);

  // Reset form when modal opens — prioritize draft over initialData
  useEffect(() => {
    if (isOpen) {
      const draft = loadDraft();
      const dataToUse = draft ? { ...draft, certificateFile: null } : initialData || defaultData;
      setFormData(dataToUse);
      setErrors({});
      setFilePreview(dataToUse.certificateUrl || null);
      setIsImagePreviewOpen(false);
      // Set initial search value
      if (dataToUse.certificateType) {
        setCertificateTypeSearch(getCertificateLabel(dataToUse.certificateType));
      } else {
        setCertificateTypeSearch('');
      }
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
        setErrors((prev) => ({ ...prev, certificateFile: validation.error || '' }));
        return;
      }

      setFormData((prev) => ({ ...prev, certificateFile: file }));
      setErrors((prev) => ({ ...prev, certificateFile: '' }));

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
    setFormData((prev) => ({ ...prev, certificateFile: null, certificateUrl: undefined }));
    setFilePreview(null);
    setIsImagePreviewOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle year change
  const handleYearChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      issueYear: value ? parseInt(value) : null,
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
        CertificateFile: formData.certificateFile,
      });

      if (response.content) {
        const { certificate } = response.content;

        // BE đã bỏ auto-OCR — chứng chỉ luôn được gửi thẳng cho admin xét duyệt,
        // ở trạng thái "đang chờ duyệt".
        toast.success('Đã gửi chứng chỉ. Chứng chỉ đang chờ admin xét duyệt.');
        clearDraft();

        onSave({
          ...formData,
          id: certificate.certificateId,
          certificateUrl: certificate.certificateFileUrl,
          verificationStatus: 'pending',
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
      disableEscape={isImagePreviewOpen}
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
          onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
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
            options={CERTIFICATE_TYPES.map((cert) => ({
              value: cert.label,
              key: cert.value,
            }))}
            onSelect={(value) => {
              const certType = CERTIFICATE_TYPES.find((c) => c.label === value);
              if (certType) {
                setCertificateTypeSearch(value);
                setFormData((prev) => ({ ...prev, certificateType: certType.value }));
                setErrors((prev) => ({ ...prev, certificateType: '' }));
              }
            }}
            onChange={(value) => {
              setCertificateTypeSearch(value);
              // Also allow custom type
              const certType = CERTIFICATE_TYPES.find((c) => c.label === value);
              if (certType) {
                setFormData((prev) => ({ ...prev, certificateType: certType.value }));
              } else if (value) {
                setFormData((prev) => ({ ...prev, certificateType: value }));
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
              setFormData((prev) => ({ ...prev, certificateType: '' }));
            }}
          />
          {errors.certificateType && <span className={styles.error}>{errors.certificateType}</span>}
        </div>

        {/* Institution */}
        <FormField
          type="text"
          name="institution"
          label="Tổ chức cấp"
          value={formData.institution}
          onChange={(value) => setFormData((prev) => ({ ...prev, institution: value }))}
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
          onChange={(value) => setFormData((prev) => ({ ...prev, credentialId: value }))}
          placeholder="Không bắt buộc, giúp tăng khả năng được duyệt."
          maxLength={100}
        />

        {/* Credential URL (Optional) */}
        <FormField
          type="text"
          name="credentialUrl"
          label="Link xác minh"
          value={formData.credentialUrl || ''}
          onChange={(value) => setFormData((prev) => ({ ...prev, credentialUrl: value }))}
          placeholder="Không bắt buộc, giúp tăng khả năng được duyệt."
          maxLength={500}
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
              {previewImageUrl ? (
                <button
                  type="button"
                  className={styles.previewImageButton}
                  onClick={() => setIsImagePreviewOpen(true)}
                  aria-label="Xem trước ảnh chứng chỉ"
                  title="Xem ảnh"
                >
                  <img
                    src={previewImageUrl}
                    alt="Ảnh xem trước chứng chỉ"
                    className={styles.previewImage}
                    onError={() => setFilePreview(null)}
                  />
                </button>
              ) : (
                <span className={styles.fileTypeFallback}>
                  {formData.certificateFile?.type === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(formData.certificateUrl || '')
                    ? 'PDF'
                    : 'Tệp'}
                </span>
              )}
              <div className={styles.fileInfo}>
                <strong>{formData.certificateFile?.name || 'Ảnh chứng chỉ đã tải lên'}</strong>
                <span>{previewImageUrl ? 'Sẵn sàng xem trước' : 'File chứng chỉ'}</span>
              </div>
              <button
                type="button"
                className={styles.removeFileBtn}
                onClick={handleRemoveFile}
                aria-label="Xóa file chứng chỉ"
                title="Xóa file"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          {/* Upload Area */}
          {!formData.certificateFile && !formData.certificateUrl && (
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
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

          {errors.certificateFile && <span className={styles.error}>{errors.certificateFile}</span>}
        </div>

        {/* Note */}
        <div className={styles.note}>
          <p>
            Chứng chỉ của bạn sẽ được gửi cho admin xét duyệt thủ công, thường trong vòng 24-48 giờ. Bạn có thể theo dõi
            trạng thái duyệt ngay tại mục này.
          </p>
        </div>
      </div>
    </EditModal>

      <Modal
        open={isImagePreviewOpen && Boolean(fullPreviewImageUrl)}
        onCancel={() => setIsImagePreviewOpen(false)}
        footer={null}
        centered
        width={960}
        zIndex={1200}
        title="Xem trước chứng chỉ"
        className={styles.imagePreviewModal}
      >
        {fullPreviewImageUrl && (
          <div className={styles.imagePreviewCanvas}>
            <img
              src={fullPreviewImageUrl}
              alt="Ảnh chứng chỉ đầy đủ"
              className={styles.imagePreviewFull}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default CredentialModal;
