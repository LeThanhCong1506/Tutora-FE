import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import IdCardUploader from '../../components/IdCardUploader';
import { uploadIdCard } from '../../services/supabase.service';
import { submitVerification } from '../../services/verification.service';
import type { IdCardUploadState } from '../../types/verification.types';

const TutorVerificationPage: React.FC = () => {
    const navigate = useNavigate();

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

        // Upload to Supabase
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

        // Upload to Supabase
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
        // Validation
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

                // Redirect sau 2s
                setTimeout(() => {
                    navigate('/tutor-profile');
                }, 2000);
            } else {
                toast.error(response.message || 'Có lỗi xảy ra khi gửi xác thực');
            }
        } catch (error) {
            toast.error('Không thể kết nối với server. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isReadyToSubmit = uploadState.frontPath && uploadState.backPath && !uploadState.isUploading;

    return (
        <div className="verification-page">
            <div className="verification-container">
                {/* Header */}
                <div className="verification-header">
                    <div className="header-icon">🔐</div>
                    <h1 className="header-title">Xác thực danh tính</h1>
                    <p className="header-subtitle">
                        Upload căn cước công dân để xác thực tài khoản Gia sư
                    </p>
                </div>

                {/* Instructions */}
                <div className="instructions-box">
                    <div className="instruction-icon">💡</div>
                    <div className="instruction-content">
                        <h3 className="instruction-title">Hướng dẫn chụp ảnh CCCD</h3>
                        <ul className="instruction-list">
                            <li>Chụp rõ nét, đủ ánh sáng, không bị mờ hoặc nhòe</li>
                            <li>Đảm bảo toàn bộ thẻ CCCD nằm trong khung hình</li>
                            <li>Không chụp qua kính, không có bóng đổ che thông tin</li>
                            <li>File ảnh dưới 5MB, định dạng JPG hoặc PNG</li>
                        </ul>
                    </div>
                </div>

                {/* Upload Grid */}
                <div className="upload-grid">
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
                <div className="security-notice">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1L3 3v4c0 3.5 2 6 5 8 3-2 5-4.5 5-8V3l-5-2z" />
                    </svg>
                    <p>
                        Thông tin của bạn được mã hóa và bảo mật tuyệt đối.
                        Chỉ Admin có quyền xem để xác thực.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/tutor-profile')}
                        disabled={isSubmitting || uploadState.isUploading}
                    >
                        Hủy
                    </button>

                    <button
                        type="button"
                        className={`btn-submit ${isReadyToSubmit ? 'ready' : ''}`}
                        onClick={handleSubmit}
                        disabled={!isReadyToSubmit || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="btn-spinner"></div>
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2L2 6v5c0 4 3 7 8 10 5-3 8-6 8-10V6l-8-4z" />
                                </svg>
                                Gửi xác thực
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
        .verification-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .verification-container {
          max-width: 900px;
          width: 100%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          padding: 40px;
        }

        .verification-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .header-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a2238;
          margin: 0 0 8px 0;
        }

        .header-subtitle {
          font-size: 16px;
          color: #6b7280;
          margin: 0;
        }

        .instructions-box {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
          display: flex;
          gap: 16px;
        }

        .instruction-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .instruction-content {
          flex: 1;
        }

        .instruction-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a2238;
          margin: 0 0 12px 0;
        }

        .instruction-list {
          margin: 0;
          padding-left: 20px;
          color: #374151;
          font-size: 14px;
          line-height: 1.6;
        }

        .instruction-list li {
          margin-bottom: 8px;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .security-notice {
          background: #e0f2fe;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 32px;
        }

        .security-notice svg {
          color: #0284c7;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .security-notice p {
          margin: 0;
          font-size: 14px;
          color: #075985;
          line-height: 1.5;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 12px 24px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover:not(:disabled) {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-submit {
          padding: 12px 32px;
          border: none;
          background: #9ca3af;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          cursor: not-allowed;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-submit.ready {
          background: linear-gradient(135deg, #1a2238 0%, #2c3652 100%);
          cursor: pointer;
        }

        .btn-submit.ready:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(26, 34, 56, 0.3);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .verification-container {
            padding: 24px;
          }

          .upload-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column-reverse;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
        </div>
    );
};

export default TutorVerificationPage;
