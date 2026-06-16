import React, { useMemo } from 'react';
import styles from './ProfileCompleteness.module.css';

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

interface ProfileData {
    avatarUrl: string;
    headline: string;
    teachingAreaCity: string;
    teachingAreaDistrict: string;
    videoIntroUrl: string | null;
    bio: string;
    credentials: Array<{ id: string | number }>;
    availability: Array<{ dayOfWeek: number }>;
    identityVerification: {
        verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
    };
}

interface ProfileCompletenessProps {
    profileData: ProfileData;
    onSectionClick?: (section: string) => void;
}

interface CompletionItem {
    key: string;
    label: string;
    completed: boolean;
}

const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({
    profileData,
    onSectionClick
}) => {
    // Mỗi bước có trọng số NHƯ NHAU — tiến độ = số bước hoàn thành / tổng số bước.
    // Thứ tự hiển thị từ trên xuống theo luồng hồ sơ gia sư.
    const completionItems = useMemo<CompletionItem[]>(() => [
        {
            key: 'basicInfo',
            label: 'Thông tin cơ bản',
            completed:
                !!profileData.avatarUrl &&
                !!profileData.headline &&
                profileData.headline.length >= 10 &&
                !!profileData.teachingAreaCity &&
                !!profileData.teachingAreaDistrict,
        },
        {
            key: 'video',
            label: 'Video giới thiệu',
            completed: !!profileData.videoIntroUrl,
        },
        {
            key: 'about',
            label: 'Giới thiệu bản thân',
            completed: !!(profileData.bio && profileData.bio.length >= 100),
        },
        {
            key: 'credentials',
            label: 'Bằng cấp, chứng chỉ',
            completed: !!profileData.credentials && profileData.credentials.length >= 1,
        },
        {
            key: 'identity',
            label: 'Xác minh danh tính',
            completed: profileData.identityVerification?.verificationStatus === 'verified',
        },
        {
            key: 'schedule',
            label: 'Lịch dạy (3+ khung giờ)',
            completed: !!profileData.availability && profileData.availability.length >= 3,
        },
    ], [profileData]);

    const total = completionItems.length;
    const completedCount = useMemo(
        () => completionItems.filter((item) => item.completed).length,
        [completionItems],
    );
    const percent = Math.round((completedCount / total) * 100);
    const firstIncompleteIndex = completionItems.findIndex((item) => !item.completed);
    const allDone = completedCount === total;

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
                {allDone ? (
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
