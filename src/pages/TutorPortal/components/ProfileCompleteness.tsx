import React, { useMemo } from 'react';
import styles from './ProfileCompleteness.module.css';
import { getProfileCompletionItems, type ProfileCompletionData } from '../profileCompletion';

// Icons
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 7.2L5.6 9.8L11 4.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const BoltIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 4.6 13.1c-.4.5 0 1.2.6 1.2H11l-1 7.7 8.4-11.1c.4-.5 0-1.2-.6-1.2H12L13 2Z" />
    </svg>
);

const AwardIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="6" />
        <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
    </svg>
);

const VideoIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="14" height="12" rx="2.5" />
        <path d="M16 10.5 22 7v10l-6-3.5" />
    </svg>
);

interface ProfileCompletenessProps {
    profileData: ProfileCompletionData;
    /** Trạng thái tổng thể hồ sơ (draft / pending_approval / active / rejected). */
    profileStatus?: string | null;
    onSectionClick?: (section: string) => void;
}

const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({
    profileData,
    profileStatus,
    onSectionClick
}) => {
    // Hồ sơ đã gửi, đang chờ Admin duyệt → KHÔNG báo "đủ điều kiện hiển thị" nữa.
    const isPendingApproval = profileStatus?.toLowerCase() === 'pending_approval';
    // Mỗi bước có trọng số NHƯ NHAU — tiến độ = số bước hoàn thành / tổng số bước.
    // Thứ tự hiển thị từ trên xuống theo luồng hồ sơ gia sư.
    const completionItems = useMemo(() => getProfileCompletionItems(profileData), [profileData]);

    const total = completionItems.length;
    const completedCount = useMemo(
        () => completionItems.filter((item) => item.completed).length,
        [completionItems],
    );
    const percent = Math.round((completedCount / total) * 100);
    const firstIncompleteIndex = completionItems.findIndex((item) => !item.completed);
    const allDone = completedCount === total;

    // Chứng chỉ KHÔNG thuộc checklist trên: Admin duyệt riêng từng chứng chỉ,
    // chỉ chứng chỉ đã duyệt mới hiển thị trên marketplace.
    const certCounts = useMemo(() => {
        const list = profileData.credentials;
        const verified = list.filter((c) => c.verificationStatus === 'verified').length;
        const rejected = list.filter((c) => c.verificationStatus === 'rejected').length;
        return { total: list.length, verified, rejected, pending: list.length - verified - rejected };
    }, [profileData.credentials]);

    const certSummary =
        certCounts.total === 0
            ? 'Chưa có chứng chỉ — bạn có thể bổ sung bất cứ lúc nào.'
            : [
                  certCounts.verified > 0 ? `${certCounts.verified} đã duyệt` : null,
                  certCounts.pending > 0 ? `${certCounts.pending} chờ duyệt` : null,
                  certCounts.rejected > 0 ? `${certCounts.rejected} bị từ chối` : null,
              ]
                  .filter(Boolean)
                  .join(' · ');

    const handleItemClick = (key: string) => onSectionClick?.(key);

    return (
        <div className={styles.card}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.label}>Tiến trình hồ sơ</span>
                <span className={styles.count}>
                    {completedCount}
                    <span className={styles.countTotal}>/{total}</span>
                </span>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>

            {/* Status Message */}
            <div className={styles.statusMessage}>
                {isPendingApproval ? (
                    <span className={styles.pending}>Hồ sơ đang chờ Admin xét duyệt</span>
                ) : allDone ? (
                    <span className={styles.complete}>Hồ sơ đủ điều kiện hiển thị trên marketplace!</span>
                ) : (
                    <span className={styles.needsWork}>Bắt buộc hoàn thành để hiển thị trên marketplace</span>
                )}
            </div>

            {/* Stepper checklist */}
            <div className={styles.steps}>
                {completionItems.map((item, idx) => {
                    const isCurrent = !item.completed && idx === firstIncompleteIndex;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            className={`${styles.step} ${item.completed ? styles.stepDone : ''} ${isCurrent ? styles.stepCurrent : ''}`}
                            onClick={() => handleItemClick(item.key)}
                        >
                            <span className={styles.stepDot}>
                                {item.completed ? <CheckIcon /> : <span className={styles.stepNum}>{idx + 1}</span>}
                            </span>
                            <span className={styles.stepLabel}>{item.label}</span>
                            {isCurrent && <span className={styles.stepNext}>Tiếp theo</span>}
                        </button>
                    );
                })}
            </div>

            {/* Video giới thiệu — khuyến khích, không bắt buộc để gửi hồ sơ hay hiển thị marketplace */}
            <div className={styles.certBlock}>
                <button type="button" className={styles.certRow} onClick={() => handleItemClick('video')}>
                    <span className={styles.certDot}>
                        {profileData.videoIntroUrl ? <CheckIcon /> : <VideoIcon />}
                    </span>
                    <span className={styles.certLabel}>Video giới thiệu</span>
                    <span className={styles.certBadge}>Khuyến khích</span>
                </button>
                <p className={styles.certSummary}>
                    {profileData.videoIntroUrl
                        ? 'Đã thêm video giới thiệu.'
                        : 'Hồ sơ có video giới thiệu thường thu hút học viên hơn.'}
                </p>
            </div>

            {/* Bằng cấp, chứng chỉ — Admin duyệt riêng, không tính vào tiến trình gửi hồ sơ */}
            <div className={styles.certBlock}>
                <button type="button" className={styles.certRow} onClick={() => handleItemClick('credentials')}>
                    <span className={styles.certDot}>
                        <AwardIcon />
                    </span>
                    <span className={styles.certLabel}>Bằng cấp, chứng chỉ</span>
                    <span className={styles.certBadge}>Duyệt riêng</span>
                </button>
                <p className={styles.certSummary}>{certSummary}</p>
            </div>

            {/* Action Button */}
            {!allDone && firstIncompleteIndex >= 0 && (
                <button
                    className={styles.actionBtn}
                    onClick={() => handleItemClick(completionItems[firstIncompleteIndex].key)}
                >
                    <BoltIcon />
                    Cần hoàn thành: {completionItems[firstIncompleteIndex].label}
                </button>
            )}
        </div>
    );
};

export default ProfileCompleteness;
