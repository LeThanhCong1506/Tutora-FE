import React, { useEffect, useRef } from 'react';
import styles from './EditModal.module.css';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    title: string;
    children: React.ReactNode;
    isLoading?: boolean;
    saveLabel?: string;
    cancelLabel?: string;
    size?: 'small' | 'medium' | 'large';
    saveDisabled?: boolean;
    hideCancel?: boolean;  // Hide cancel button (for view-only mode)
}

const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
        <path d="M15 8a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const EditModal: React.FC<EditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    title,
    children,
    isLoading = false,
    saveLabel = 'Lưu',
    cancelLabel = 'Hủy',
    size = 'medium',
    saveDisabled = false,
    hideCancel = false
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, isLoading, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle click outside
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div
                ref={modalRef}
                className={`${styles.modal} ${styles[size]}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="modal-title" className={styles.title}>{title}</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="Dong"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <fieldset disabled={isLoading} className={`${styles.fieldset} ${isLoading ? styles.fieldsetDisabled : ''}`}>
                        {children}
                    </fieldset>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    {!hideCancel && (
                        <button
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        className={`${styles.saveBtn} ${hideCancel ? styles.fullWidth : ''}`}
                        onClick={onSave}
                        disabled={isLoading || saveDisabled}
                    >
                        {isLoading && <LoadingSpinner />}
                        {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;
