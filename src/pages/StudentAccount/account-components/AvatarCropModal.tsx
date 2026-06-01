import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import styles from "../styles.module.css";
import { SpinnerIcon } from "./icons";

interface Props {
    previewUrl: string;
    crop: Point;
    setCrop: (p: Point) => void;
    zoom: number;
    setZoom: (z: number) => void;
    onCropComplete: (a: Area, p: Area) => void;
    uploadingAvatar: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const AvatarCropModal: React.FC<Props> = ({
    previewUrl,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    uploadingAvatar,
    onConfirm,
    onCancel,
}) => (
    <div className={styles.modalOverlay} onClick={onCancel}>
        <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Chỉnh sửa ảnh đại diện</h3>
                <p className={styles.modalSubtitle}>Kéo để di chuyển · Cuộn để phóng to</p>
            </div>

            <div className={styles.cropContainer}>
                <Cropper
                    image={previewUrl}
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

            <div className={styles.zoomControl}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className={styles.zoomSlider}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </div>

            <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={onCancel} type="button">
                    Hủy
                </button>
                <button
                    className={styles.modalConfirmBtn}
                    onClick={onConfirm}
                    disabled={uploadingAvatar}
                    type="button"
                >
                    {uploadingAvatar ? (
                        <>
                            <SpinnerIcon />
                            Đang tải lên...
                        </>
                    ) : "Lưu ảnh đại diện"}
                </button>
            </div>
        </div>
    </div>
);

export default AvatarCropModal;
