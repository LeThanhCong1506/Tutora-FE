import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck, UserRound, X } from 'lucide-react';
import type { StudentCredentials } from '../../../services/student.service';
import styles from './AddStudentModal.module.css';

interface Props {
    credentials: StudentCredentials | null;
    onClose: () => void;
    title?: string;
}

const CredentialsModal = ({ credentials, onClose, title }: Props) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        if (!credentials) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [credentials, onClose]);

    if (!credentials) return null;

    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 1800);
    };

    const copyAll = () =>
        handleCopy(
            `Tên đăng nhập: ${credentials.username}\nMật khẩu tạm: ${credentials.temporaryPassword}`,
            'all',
        );

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={`${styles.modalContent} ${styles.credentialsModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="credentials-title"
                aria-describedby="credentials-description"
                onClick={(event) => event.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <span className={`${styles.modalIcon} ${styles.successIcon}`} aria-hidden="true">
                        <ShieldCheck size={20} />
                    </span>
                    <div className={styles.modalHeading}>
                        <span className={styles.modalEyebrow}>Tài khoản của con</span>
                        <h2 className={styles.modalTitle} id="credentials-title">
                            {title || 'Đã tạo tài khoản'}
                        </h2>
                        <p className={styles.modalDescription} id="credentials-description">
                            Lưu lại thông tin cho <strong>{credentials.fullName}</strong>. Mật khẩu tạm chỉ hiển thị lần này.
                        </p>
                    </div>
                    <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Đóng thông tin đăng nhập">
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.credentialsBody}>
                    <div className={styles.credentialList}>
                        <div className={styles.credentialRow}>
                            <span className={styles.credentialKind}>
                                <UserRound size={15} aria-hidden="true" /> Tên đăng nhập
                            </span>
                            <strong className={styles.credentialValue}>{credentials.username}</strong>
                            <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => handleCopy(credentials.username, 'username')}
                                aria-label="Sao chép tên đăng nhập"
                            >
                                {copiedField === 'username' ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedField === 'username' ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                        </div>

                        <div className={styles.credentialRow}>
                            <span className={styles.credentialKind}>
                                <KeyRound size={15} aria-hidden="true" /> Mật khẩu tạm
                            </span>
                            <strong className={`${styles.credentialValue} ${styles.passwordValue}`}>
                                {credentials.temporaryPassword}
                            </strong>
                            <button
                                type="button"
                                className={styles.copyBtn}
                                onClick={() => handleCopy(credentials.temporaryPassword, 'password')}
                                aria-label="Sao chép mật khẩu tạm"
                            >
                                {copiedField === 'password' ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedField === 'password' ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                        </div>
                    </div>

                    <p className={styles.credentialsHint}>
                        Gửi riêng thông tin này cho con và nhắc con đổi mật khẩu sau lần đăng nhập đầu tiên.
                    </p>

                    <span className={styles.copyStatus} aria-live="polite">
                        {copiedField ? 'Đã sao chép vào bộ nhớ tạm.' : ''}
                    </span>
                </div>

                <div className={`${styles.modalActions} ${styles.credentialsActions}`}>
                    <button type="button" className={styles.modalBtn} onClick={copyAll}>
                        {copiedField === 'all' ? <Check size={14} /> : <Copy size={14} />}
                        {copiedField === 'all' ? 'Đã sao chép' : 'Sao chép tất cả'}
                    </button>
                    <button type="button" className={styles.modalBtnPrimary} onClick={onClose}>
                        Đã lưu, đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CredentialsModal;
