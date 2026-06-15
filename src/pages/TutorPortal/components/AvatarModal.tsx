import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { toast } from 'react-toastify';
import EditModal from './EditModal';
import { validateAvatar } from '../utils/validation';
import styles from './ProfileHeroModal.module.css';

// Modal CHỈ phụ trách ảnh đại diện — gọi đúng 1 API (updateAvatar) qua onSave.
// Tách khỏi ProfileHeroModal để mỗi modal một trách nhiệm / một API.

const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4V14M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

interface AvatarModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Nhận file ảnh đã cắt — parent gọi API updateAvatar và đóng modal khi xong. */
    onSave: (file: File) => void | Promise<void>;
    currentAvatarUrl: string;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ isOpen, onClose, onSave, currentAvatarUrl }) => {
    const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatarUrl);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Reset khi mở modal
    useEffect(() => {
        if (isOpen) {
            setAvatarPreview(currentAvatarUrl);
            setAvatarFile(null);
            setError('');
            setShowCropper(false);
            setCropImageSrc(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isOpen, currentAvatarUrl]);

    // Chọn ảnh → mở cropper
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateAvatar(file);
        if (!validation.isValid) {
            setError(validation.error || '');
            return;
        }
        setError('');

        const reader = new FileReader();
        reader.onload = (ev) => {
            setCropImageSrc(ev.target?.result as string);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleCropConfirm = async () => {
        if (!cropImageSrc || !croppedAreaPixels) return;
        try {
            const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels, 'avatar.jpg');

            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
            reader.readAsDataURL(croppedFile);

            setAvatarFile(croppedFile);
            setShowCropper(false);
            setCropImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Crop failed:', err);
            toast.error('Không thể cắt ảnh. Vui lòng thử lại.');
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setCropImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!avatarFile) {
            setError('Vui lòng chọn ảnh đại diện mới.');
            toast.error('Vui lòng chọn ảnh đại diện mới.');
            return;
        }
        setIsLoading(true);
        try {
            await onSave(avatarFile);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSave}
            title="Đổi ảnh đại diện"
            isLoading={isLoading}
            saveLabel="Lưu ảnh"
            size="medium"
        >
            <div className={styles.form}>
                <div className={styles.avatarSection}>
                    <label className={styles.sectionLabel}>Ảnh đại diện</label>
                    <div className={styles.avatarUpload}>
                        <div
                            className={styles.avatarPreview}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar preview" />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    <UploadIcon />
                                    <span>Tải ảnh lên</span>
                                </div>
                            )}
                            <div className={styles.avatarOverlay}>
                                <UploadIcon />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleAvatarChange}
                            className={styles.fileInput}
                        />
                        <div className={styles.avatarHint}>
                            <p>Định dạng: JPG, PNG</p>
                            <p>Kích thước tối đa: 5MB</p>
                        </div>
                    </div>
                    {error && <span className={styles.error}>{error}</span>}
                </div>

                {/* Cropper Overlay */}
                {showCropper && cropImageSrc && (
                    <div className={styles.cropperOverlay}>
                        <div className={styles.cropperModal}>
                            <div className={styles.cropperHeader}>
                                <h3>Cắt ảnh đại diện</h3>
                            </div>
                            <div className={styles.cropperContainer}>
                                <Cropper
                                    image={cropImageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                            <div className={styles.cropperControls}>
                                <label className={styles.zoomLabel}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        <path d="M7 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    Thu phóng
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className={styles.zoomSlider}
                                />
                            </div>
                            <div className={styles.cropperActions}>
                                <button type="button" className={styles.cropCancelBtn} onClick={handleCropCancel}>
                                    Hủy
                                </button>
                                <button type="button" className={styles.cropConfirmBtn} onClick={handleCropConfirm}>
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </EditModal>
    );
};

export default AvatarModal;
