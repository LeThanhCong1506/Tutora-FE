import React from 'react';
import EditModal from './EditModal';
import type { EkycProfileFieldChange } from '../../../services/tutorProfile.service';
import styles from './CccdConfirmModal.module.css';

/** Thông tin đọc được từ CCCD, đã chuẩn hóa để hiển thị. */
export interface CccdScannedInfo {
    identityNumber?: string | null;
    fullName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    hometown?: string | null;
    address?: string | null;
}

interface CccdConfirmModalProps {
    isOpen: boolean;
    /** "Để sau" / đóng modal — hồ sơ giữ nguyên, vẫn có thể xác nhận lại sau. */
    onDismiss: () => void;
    /** Gia sư đồng ý ghi thông tin CCCD vào hồ sơ. */
    onConfirm: () => void;
    info: CccdScannedInfo;
    /** Các trường sẽ đổi. Rỗng = hồ sơ đã khớp CCCD, modal chỉ còn là màn hình xem lại. */
    changes: EkycProfileFieldChange[];
    isLoading?: boolean;
}

const ArrowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2 7H12M12 7L8.5 3.5M12 7L8.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 1.5L15 4V8.5C15 12 12.5 15 9 16.5C5.5 15 3 12 3 8.5V4L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.5 8.8L8.2 10.5L11.5 7.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Màn hình đối chiếu sau khi quét CCCD: gia sư xem thông tin OCR đọc được và tự quyết định
 * có đưa vào hồ sơ hay không. Trước đây BE ghi đè thẳng rồi mới báo — nếu OCR đọc nhầm tên
 * thì hồ sơ đã bị đổi sau lưng gia sư.
 *
 * Chỉ xem, KHÔNG sửa: họ tên/ngày sinh là dữ liệu định danh, cho gõ tay ở đây thì việc
 * xác minh CCCD mất ý nghĩa (khai một đằng, giấy tờ một nẻo).
 */
const CccdConfirmModal: React.FC<CccdConfirmModalProps> = ({
    isOpen,
    onDismiss,
    onConfirm,
    info,
    changes,
    isLoading = false,
}) => {
    const rows: Array<{ label: string; value?: string | null }> = [
        { label: 'Số CCCD', value: info.identityNumber },
        { label: 'Họ và tên', value: info.fullName },
        { label: 'Ngày sinh', value: info.dateOfBirth },
        { label: 'Giới tính', value: info.gender },
        { label: 'Quê quán', value: info.hometown },
        { label: 'Địa chỉ thường trú', value: info.address },
    ];

    const hasChanges = changes.length > 0;

    return (
        <EditModal
            isOpen={isOpen}
            onClose={onDismiss}
            onSave={onConfirm}
            title="Xác nhận thông tin từ CCCD"
            isLoading={isLoading}
            saveLabel={hasChanges ? 'Xác nhận & cập nhật hồ sơ' : 'Đã hiểu'}
            cancelLabel="Để sau"
            hideCancel={!hasChanges}
            size="medium"
        >
            <div className={styles.form}>
                <div className={styles.intro}>
                    <span className={styles.introIcon}><ShieldIcon /></span>
                    <p>
                        Đã đọc xong CCCD của bạn. Hãy kiểm tra thông tin bên dưới — chỉ khi bạn xác nhận,
                        các thông tin này mới được lưu vào hồ sơ.
                    </p>
                </div>

                <section className={styles.block}>
                    <h4 className={styles.blockTitle}>Thông tin đọc được</h4>
                    <dl className={styles.infoGrid}>
                        {rows.map(row => (
                            <div key={row.label} className={styles.infoItem}>
                                <dt>{row.label}</dt>
                                <dd>{row.value?.trim() ? row.value : '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {hasChanges ? (
                    <section className={styles.block}>
                        <h4 className={styles.blockTitle}>
                            Sẽ cập nhật {changes.length} thông tin trong hồ sơ
                        </h4>
                        <ul className={styles.changeList}>
                            {changes.map(change => (
                                <li key={change.field} className={styles.changeRow}>
                                    <span className={styles.changeLabel}>{change.label}</span>
                                    <span className={styles.changeValues}>
                                        <span className={styles.oldValue}>
                                            {change.currentValue?.trim() ? change.currentValue : 'Chưa có'}
                                        </span>
                                        <span className={styles.changeArrow}><ArrowIcon /></span>
                                        <span className={styles.newValue}>{change.newValue || '—'}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : (
                    <div className={styles.noChange}>
                        Hồ sơ của bạn đã khớp với CCCD — không có thông tin nào cần cập nhật.
                    </div>
                )}

                <div className={styles.note}>
                    <p>
                        Sau khi cập nhật, họ tên và ngày sinh sẽ được khóa theo CCCD để đảm bảo tính xác thực.
                        Địa chỉ thường trú bạn vẫn sửa được ở phần Tài khoản.
                    </p>
                    <p>
                        <strong>Khu vực dạy học không bị thay đổi</strong> — đây là trường riêng, bạn tự chọn
                        ở phần Thông tin cơ bản.
                    </p>
                </div>

                {hasChanges && (
                    <p className={styles.dismissHint}>
                        Chọn "Để sau" nếu bạn muốn kiểm tra lại — danh tính của bạn vẫn đã được xác minh,
                        và bạn có thể xác nhận bất cứ lúc nào ở thẻ "Xác minh danh tính".
                    </p>
                )}
            </div>
        </EditModal>
    );
};

export default CccdConfirmModal;
