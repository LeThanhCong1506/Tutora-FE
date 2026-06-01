import React, { useState } from 'react';
import { toast } from 'react-toastify';
import IdCardUploader from '../../../components/IdCardUploader';
import { uploadIdCard } from '../../../services/supabase.service';
import { submitVerification } from '../../../services/verification.service';
import type { IdCardUploadState } from '../../../types/verification.types';
import styles from '../../../styles/pages/tutor-portal-profile.module.css';

interface EditHeroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const EditHeroModal: React.FC<EditHeroModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [uploadState, setUploadState] = useState<IdCardUploadState>({
        frontImage: null,
        backImage: null,
        frontPath: null,
        backPath: null,
        frontPreview: null,
        backPreview: null,
        isUploading: false,
        uploadProgress: 0
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle front image selection
    const handleFrontSelected = async (file: File, preview: string) => {
        setUploadState(prev => ({
            ...prev,
            frontImage: file,
            frontPreview: preview,
            isUploading: true
        }));

        const result = await uploadIdCard(file, 'front');

        if (result.error) {
            toast.error(result.error);
            setUploadState(prev => ({
                ...prev,
                frontImage: null,
                frontPreview: null,
                isUploading: false
            }));
            return;
        }

        toast.success('Upload ảnh mặt trước thành công!');
        setUploadState(prev => ({
            ...prev,
            frontPath: result.path,
            isUploading: false
        }));
    };

    // Handle back image selection
    const handleBackSelected = async (file: File, preview: string) => {
        setUploadState(prev => ({
            ...prev,
            backImage: file,
            backPreview: preview,
            isUploading: true
        }));

        const result = await uploadIdCard(file, 'back');

        if (result.error) {
            toast.error(result.error);
            setUploadState(prev => ({
                ...prev,
                backImage: null,
                backPreview: null,
                isUploading: false
            }));
            return;
        }

        toast.success('Upload ảnh mặt sau thành công!');
        setUploadState(prev => ({
            ...prev,
            backPath: result.path,
            isUploading: false
        }));
    };

    // Handle remove front image
    const handleRemoveFront = () => {
        setUploadState(prev => ({
            ...prev,
            frontImage: null,
            frontPath: null,
            frontPreview: null
        }));
    };

    // Handle remove back image
    const handleRemoveBack = () => {
        setUploadState(prev => ({
            ...prev,
            backImage: null,
            backPath: null,
            backPreview: null
        }));
    };

    // Handle submit verification
    const handleSubmit = async () => {
        if (!uploadState.frontPath || !uploadState.backPath) {
            toast.warning('Vui lòng upload đầy đủ ảnh CCCD cả 2 mặt!');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await submitVerification(
                uploadState.frontPath,
                uploadState.backPath
            );

            if (response.success) {
                toast.success('Gửi xác thực thành công! Admin sẽ xét duyệt trong 24-48h.');
                onSuccess?.();
                handleClose();
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi xác thực');
            }
        } catch (error) {
            toast.error('Không thể kết nối với server. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle close and reset state
    const handleClose = () => {
        setUploadState({
            frontImage: null,
            backImage: null,
            frontPath: null,
            backPath: null,
            frontPreview: null,
            backPreview: null,
            isUploading: false,
            uploadProgress: 0
        });
        setIsSubmitting(false);
        onClose();
    };

    const isReadyToSubmit = uploadState.frontPath && uploadState.backPath && !uploadState.isUploading;

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Xác thực danh tính</h2>
                    <button className={styles.modalCloseBtn} onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className={styles.modalBody}>
                    {/* Instructions */}
                    <div className={styles.verificationInstructions}>
                        <div className={styles.instructionIcon}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 12a1 1 0 110-2 1 1 0 010 2zm1-4a1 1 0 01-2 0V7a1 1 0 112 0v3z" />
                            </svg>
                        </div>
                        <div className={styles.instructionText}>
                            <p className={styles.instructionTitle}>Hướng dẫn chụp ảnh CCCD</p>
                            <ul className={styles.instructionList}>
                                <li>Chụp rõ nét, đủ ánh sáng, không bị mờ</li>
                                <li>Đảm bảo toàn bộ thẻ nằm trong khung hình</li>
                                <li>File ảnh dưới 5MB, định dạng JPG hoặc PNG</li>
                            </ul>
                        </div>
                    </div>

                    {/* Upload Grid */}
                    <div className={styles.uploadGrid}>
                        <IdCardUploader
                            side="front"
                            label="Mặt trước CCCD"
                            onFileSelected={handleFrontSelected}
                            onRemove={handleRemoveFront}
                            preview={uploadState.frontPreview}
                            isUploading={uploadState.isUploading}
                        />

                        <IdCardUploader
                            side="back"
                            label="Mặt sau CCCD"
                            onFileSelected={handleBackSelected}
                            onRemove={handleRemoveBack}
                            preview={uploadState.backPreview}
                            isUploading={uploadState.isUploading}
                        />
                    </div>

                    {/* Security Notice */}
                    <div className={styles.securityNotice}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1L3 3v4c0 3.5 2 6 5 8 3-2 5-4.5 5-8V3l-5-2z" />
                        </svg>
                        <p>Thông tin của bạn được mã hóa và bảo mật tuyệt đối.</p>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className={styles.modalFooter}>
                    <button
                        className={styles.modalCancelBtn}
                        onClick={handleClose}
                        disabled={isSubmitting || uploadState.isUploading}
                    >
                        Hủy
                    </button>
                    <button
                        className={`${styles.modalSubmitBtn} ${isReadyToSubmit ? styles.ready : ''}`}
                        onClick={handleSubmit}
                        disabled={!isReadyToSubmit || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className={styles.btnSpinner}></span>
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 1L3 3v4c0 3.5 2 6 5 8 3-2 5-4.5 5-8V3l-5-2z" />
                                </svg>
                                Gửi xác thực
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditHeroModal;
