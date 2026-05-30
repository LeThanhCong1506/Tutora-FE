import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';

interface IdCardUploaderProps {
    side: 'front' | 'back';
    label: string;
    onFileSelected: (file: File, preview: string) => void;
    onRemove: () => void;
    preview: string | null;
    isUploading: boolean;
}

const IdCardUploader: React.FC<IdCardUploaderProps> = ({
    side,
    label,
    onFileSelected,
    onRemove,
    preview,
    isUploading
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    const handleFileChange = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chỉ upload file ảnh (JPG, PNG, etc.)');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Kích thước file không được vượt quá 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            const previewUrl = reader.result as string;
            onFileSelected(file, previewUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    return (
        <div className="id-card-uploader">
            <label className="uploader-label">{label}</label>

            {!preview ? (
                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="upload-loading">
                            <div className="spinner"></div>
                            <p>Đang upload...</p>
                        </div>
                    ) : (
                        <>
                            <svg className="upload-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <path d="M24 16V32M16 24H32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                            <p className="upload-text">Kéo thả ảnh vào đây</p>
                            <p className="upload-subtext">hoặc click để chọn file</p>
                            <p className="upload-hint">JPG, PNG • Tối đa 5MB</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="preview-container">
                    <img src={preview} alt={`CCCD ${side}`} className="preview-image" />
                    <button
                        type="button"
                        className="remove-button"
                        onClick={onRemove}
                        disabled={isUploading}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6 6L14 14M6 14L14 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    {isUploading && (
                        <div className="upload-overlay">
                            <div className="spinner"></div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        .id-card-uploader {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .uploader-label {
          font-size: 14px;
          font-weight: 600;
          color: #1a2238;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .upload-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f9fafb;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .upload-zone:hover {
          border-color: #1a2238;
          background: #f3f4f6;
        }

        .upload-zone.dragging {
          border-color: #1a2238;
          background: #e5e7eb;
          transform: scale(1.02);
        }

        .upload-zone.uploading {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .upload-icon {
          color: #9ca3af;
          margin-bottom: 12px;
        }

        .upload-text {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 4px 0;
        }

        .upload-subtext {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 8px 0;
        }

        .upload-hint {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }

        .upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .preview-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .preview-image {
          width: 100%;
          height: auto;
          display: block;
          max-height: 300px;
          object-fit: contain;
          background: #f9fafb;
        }

        .remove-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(220, 38, 38, 0.9);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .remove-button:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        .remove-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #1a2238;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default IdCardUploader;
