import React, { useEffect } from 'react';
import styles from './ImageLightbox.module.css';

export interface ImageLightboxProps {
    /** Ảnh cần xem. Truyền null/undefined để đóng. Với file private, đây phải là BLOB URL. */
    imageUrl: string | null | undefined;
    /** Tiêu đề hiển thị trên đầu, cũng dùng làm nhãn cho trình đọc màn hình. */
    title: string;
    alt?: string;
    onClose: () => void;
}

/**
 * Xem ảnh phóng to ngay tại chỗ thay vì mở tab mới.
 *
 * Mở tab mới làm người dùng mất ngữ cảnh trang đang xem, và với ảnh nằm sau endpoint file
 * private thì tab mới còn KHÔNG mở được (thẻ điều hướng không mang token) — nên khối xem ảnh
 * biên lai buộc phải dùng lightbox.
 */
const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, title, alt, onClose }) => {
    useEffect(() => {
        if (!imageUrl) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        // Khoá cuộn nền: không khoá thì cuộn chuột trên overlay sẽ kéo trang phía sau chạy.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [imageUrl, onClose]);

    if (!imageUrl) return null;

    return (
        <div
            className={styles.overlay}
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>
                <div className={styles.body}>
                    <img src={imageUrl} alt={alt ?? title} className={styles.image} />
                </div>
            </div>
        </div>
    );
};

export default ImageLightbox;
