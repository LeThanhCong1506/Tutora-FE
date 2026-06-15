import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { toast } from 'react-toastify';
import styles from './ProfileHeroModal.module.css';

// Modal chỉ phụ trách crop ảnh đại diện đã được chọn từ file picker.

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nhận file ảnh đã cắt — parent gọi API updateAvatar và đóng modal khi xong. */
  onSave: (file: File) => boolean | void | Promise<boolean | void>;
  imageSrc: string | null;
  fileName?: string;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ isOpen, onClose, onSave, imageSrc, fileName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, imageSrc]);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsLoading(true);
    let shouldClose = false;
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, fileName || 'avatar.jpg');
      const saved = await onSave(croppedFile);
      if (saved !== false) {
        shouldClose = true;
      }
    } catch (err) {
      console.error('Crop failed:', err);
      toast.error('Không thể cắt ảnh. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      if (shouldClose) {
        onClose();
      }
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className={styles.cropperOverlay}>
      <div className={styles.cropperModal}>
        <div className={styles.cropperHeader}>
          <h3>Cắt ảnh đại diện</h3>
        </div>
        <div className={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
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
          <button type="button" className={styles.cropCancelBtn} onClick={onClose} disabled={isLoading}>
            Hủy
          </button>
          <button type="button" className={styles.cropConfirmBtn} onClick={handleCropConfirm} disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarModal;
