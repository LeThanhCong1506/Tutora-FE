import styles from './DeleteConfirmModal.module.css';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studentName: string;
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, studentName }: DeleteConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.deleteModalIcon}>
                    <Trash2 size={48} />
                </div>
                <h2 className={styles.deleteModalTitle}>Xóa học sinh</h2>
                <p className={styles.deleteModalText}>
                    Bạn có chắc chắn muốn xóa <strong>{studentName}</strong>? Hành động này không thể hoàn tác.
                </p>
                <div className={styles.deleteModalActions}>
                    <button type="button" className={styles.modalBtn} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="button" className={styles.modalBtnDanger} onClick={onConfirm}>
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
