import React, { useEffect, useRef, useState } from 'react';
import styles from './ConfirmDialog.module.css';

export type ConfirmType = 'warning-strong' | 'warning' | 'information' | 'success';

const ICON_SRC: Record<ConfirmType, string> = {
    'warning-strong': '/images/icons/warning-strong.png',
    warning: '/images/icons/warning.png',
    information: '/images/icons/information.png',
    success: '/images/icons/success.png',
};

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message?: React.ReactNode;
    type?: ConfirmType;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

/**
 * Hộp thoại xác nhận dùng chung cho mọi hành động cần chốt lại một lần:
 * xóa bản ghi, đăng xuất, hủy đặt lịch…
 *
 * ```tsx
 * <ConfirmDialog
 *     open={confirming}
 *     type="warning-strong"
 *     title="Xóa học sinh?"
 *     message={<>Hồ sơ <b>{name}</b> sẽ bị xóa và không thể khôi phục.</>}
 *     confirmText="Xóa"
 *     onConfirm={handleDelete}
 *     onCancel={() => setConfirming(false)}
 * />
 * ```
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    type = 'warning',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    hideCancel = false,
    onConfirm,
    onCancel,
}) => {
    const [processing, setProcessing] = useState(false);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    // Đóng bằng Escape — chặn khi đang xử lý để không bỏ dở việc đã gửi đi.
    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !processing) onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, processing, onCancel]);

    useEffect(() => {
        if (!open) return undefined;

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    useEffect(() => {
        if (open) confirmBtnRef.current?.focus();
    }, [open]);

    if (!open) return null;

    const handleConfirm = async () => {
        const result = onConfirm();
        if (!(result instanceof Promise)) return;

        setProcessing(true);
        try {
            await result;
        } finally {
            setProcessing(false);
        }
    };

    const handleOverlayClick = () => {
        if (!processing) onCancel();
    };

    const confirmToneClass = type === 'warning-strong' || type === 'warning'
        ? styles.confirmBtnDanger
        : styles.confirmBtnPrimary;

    return (
        <div className={styles.overlay} role="presentation" onClick={handleOverlayClick}>
            <div
                className={styles.dialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-busy={processing || undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <img
                    className={styles.icon}
                    src={ICON_SRC[type]}
                    alt=""
                    aria-hidden="true"
                    width={44}
                    height={44}
                />

                <h2 id="confirm-dialog-title" className={styles.title}>{title}</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.actions}>
                    {!hideCancel && (
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onCancel}
                            disabled={processing}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        ref={confirmBtnRef}
                        className={`${styles.confirmBtn} ${confirmToneClass}`}
                        onClick={handleConfirm}
                        disabled={processing}
                    >
                        {processing ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
