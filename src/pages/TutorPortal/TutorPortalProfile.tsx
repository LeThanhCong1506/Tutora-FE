import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popconfirm } from 'antd';
import { toast } from 'react-toastify';
import { useTutorProfileForm, type CredentialData } from './hooks/useTutorProfileForm';
import ProfileHeroModal from './components/ProfileHeroModal';
import AboutMeModal from './components/AboutMeModal';
import CredentialModal from './components/CredentialModal';
import type { CredentialData as ModalCredentialData } from './components/CredentialModal';
import IdentityVerificationModal from './components/IdentityVerificationModal';
// @ts-ignore - IdentityVerificationData may be used later
import type { IdentityVerificationData as _IdentityVerificationData } from './components/IdentityVerificationModal';
import IntroVideoSection from './components/IntroVideoSection';
import ProfileCompleteness from './components/ProfileCompleteness';
import BookingModal from './components/BookingModal';
import TutorProfilePreview from './components/TutorProfilePreview';
import { deleteCertificate } from '../../services/certificate.service';
import { getUserIdFromToken } from '../../services/auth.service';
import styles from '../../styles/pages/tutor-portal-profile.module.css';

// Icon Components
// PlayIcon - commented out to avoid TS6133 (noUnusedLocals)
// const PlayIcon = () => (
//     <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
//         <path d="M8.17 5.83L22.17 14L8.17 22.17V5.83Z" fill="white" />
//     </svg>
// );

const StarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#fbbf24">
        <path d="M7 0.5L8.76336 4.08316L12.6819 4.65836L9.84095 7.41684L10.5267 11.3416L7 9.475L3.47329 11.3416L4.15905 7.41684L1.31812 4.65836L5.23664 4.08316L7 0.5Z" />
    </svg>
);

const LocationIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 7.58333C8.01252 7.58333 8.83333 6.76252 8.83333 5.75C8.83333 4.73748 8.01252 3.91667 7 3.91667C5.98748 3.91667 5.16667 4.73748 5.16667 5.75C5.16667 6.76252 5.98748 7.58333 7 7.58333Z" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12.8333C9.33333 10.5 11.6667 8.41421 11.6667 5.75C11.6667 3.17267 9.57733 1.08333 7 1.08333C4.42267 1.08333 2.33333 3.17267 2.33333 5.75C2.33333 8.41421 4.66667 10.5 7 12.8333Z" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const DesktopIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.16667" y="1.75" width="11.6667" height="8.16667" rx="1.16667" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" />
        <path d="M4.08333 12.25H9.91667" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7 9.91667V12.25" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

const PlusIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const EditPencilIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M11.5 2.5L13.5 4.5M9 5L2.5 11.5V13.5H4.5L11 7M9 5L11.5 2.5L13.5 4.5L11 7M9 5L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// GraduationIcon - commented out to avoid TS6133 (noUnusedLocals)
// const GraduationIcon = () => (
//     <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
//         <path d="M10.5 2.625L1.75 7.875L10.5 13.125L19.25 7.875L10.5 2.625Z" stroke="#1a2238" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         <path d="M15.75 10.5V15.75L10.5 18.375L5.25 15.75V10.5" stroke="#1a2238" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
// );

const CertificateIcon = () => (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
        <rect x="3.5" y="2.625" width="14" height="12.25" rx="1.75" stroke="#1a2238" strokeWidth="1.5" />
        <path d="M7 7H14" stroke="#1a2238" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 10.5H11.375" stroke="#1a2238" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1.75 3.5H12.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.25 3.5V2.33333C5.25 1.86667 5.61667 1.5 6.08333 1.5H7.91667C8.38333 1.5 8.75 1.86667 8.75 2.33333V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.5 3.5V11.6667C10.5 12.1333 10.1333 12.5 9.66667 12.5H4.33333C3.86667 12.5 3.5 12.1333 3.5 11.6667V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const MessageIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.16667" y="2.33333" width="11.6667" height="9.33333" rx="1.16667" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.16667 4.08333L7 7.58333L12.8333 4.08333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.83333" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.66667 7L6.41667 8.75L9.33333 5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShareIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M6 12L12 6M12 6H7.5M12 6V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2.25" y="2.25" width="13.5" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

const VerifiedIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L9.5 3L12 2.5L11.5 5L14 6.5L12 8L14 9.5L11.5 11L12 13.5L9.5 13L8 15L6.5 13L4 13.5L4.5 11L2 9.5L4 8L2 6.5L4.5 5L4 2.5L6.5 3L8 1Z" fill="#3d4a3e" />
        <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// City/District label mapping
const CITY_LABELS: Record<string, string> = {
    'hanoi': 'Ha Noi',
    'hcm': 'TP. Ho Chi Minh',
    'danang': 'Da Nang',
    'haiphong': 'Hai Phong',
    'cantho': 'Can Tho',
};

const DISTRICT_LABELS: Record<string, Record<string, string>> = {
    'hanoi': {
        'ba-dinh': 'Ba Dinh',
        'hoan-kiem': 'Hoan Kiem',
        'dong-da': 'Dong Da',
        'hai-ba-trung': 'Hai Ba Trung',
        'cau-giay': 'Cau Giay',
        'thanh-xuan': 'Thanh Xuan',
    },
    'hcm': {
        'quan-1': 'Quan 1',
        'quan-2': 'Quan 2',
        'quan-3': 'Quan 3',
        'quan-7': 'Quan 7',
        'binh-thanh': 'Binh Thanh',
        'phu-nhuan': 'Phu Nhuan',
    },
};

const TEACHING_MODE_LABELS: Record<string, string> = {
    'Online': 'Dạy Online',
    'Offline': 'Dạy trực tiếp',
    'Hybrid': 'Online & Trực tiếp',
};

const TutorPortalProfile: React.FC = () => {
    const navigate = useNavigate();
    const [isEditMode, setIsEditMode] = useState(true);

    // Modal states
    const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
    const [editingCredential, setEditingCredential] = useState<ModalCredentialData | null>(null);
    const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);

    // Form hook
    const {
        formData,
        pricingItems,
        sectionStatuses: _sectionStatuses,
        isDirty,
        isLoading: _isLoading,
        isInitialLoading: _isInitialLoading,
        isVideoUploading,
        lastSaved,
        error: _error,
        canPublish: _canPublish,
        fetchProgress,
        updateHeroSection: _updateHeroSection,
        updateAbout,
        updateVideoUrl,
        uploadVideo,
        saveBasicInfo,
        addCredential,
        updateCredential,
        removeCredential,
        updateIdentityVerification,
        saveDraft: _saveDraft,
        publishChanges: _publishChanges
    } = useTutorProfileForm();

    // Get display location
    const getLocationDisplay = () => {
        const city = CITY_LABELS[formData.teachingAreaCity] || formData.teachingAreaCity;
        const district = DISTRICT_LABELS[formData.teachingAreaCity]?.[formData.teachingAreaDistrict] || formData.teachingAreaDistrict;
        return `${district}, ${city}`;
    };

    // Handle completeness section click
    const handleCompletenessClick = (section: string) => {
        switch (section) {
            case 'basicInfo':
                setIsHeroModalOpen(true);
                break;
            case 'video':
                // Video is inline edit
                break;
            case 'about':
                setIsAboutModalOpen(true);
                break;
            case 'credentials':
                setEditingCredential(null);
                setIsCredentialModalOpen(true);
                break;
            case 'pricing':
                // Giá theo môn × lớp được thiết lập ở Onboarding.
                navigate('/tutor-portal/onboarding');
                break;
            case 'schedule':
                // Navigate to schedule page
                window.location.href = '/tutor-portal/schedule';
                break;
            case 'identity':
                setIsIdentityModalOpen(true);
                break;
        }
    };

    // Handle credential edit - convert from form data to modal data format
    const handleEditCredential = (credential: CredentialData) => {
        // Convert CredentialData to ModalCredentialData for the modal
        const modalData: ModalCredentialData = {
            id: credential.id,
            name: credential.name,
            certificateType: credential.certificateType || '',
            institution: credential.institution,
            issueYear: credential.issueYear,
            credentialId: credential.credentialId,
            credentialUrl: credential.credentialUrl,
            certificateFile: null,  // File is not available for existing credentials
            certificateUrl: credential.certificateUrl,
            verificationStatus: credential.verificationStatus,
            verificationNote: credential.verificationNote
        };
        setEditingCredential(modalData);
        setIsCredentialModalOpen(true);
    };

    // Handle save credential - called when modal saves new/updated credential
    const handleSaveCredential = (data: ModalCredentialData) => {
        if (editingCredential) {
            // Update existing credential
            if (data.id) {
                updateCredential(data.id, {
                    name: data.name,
                    certificateType: data.certificateType,
                    institution: data.institution,
                    issueYear: data.issueYear,
                    credentialId: data.credentialId,
                    credentialUrl: data.credentialUrl,
                    certificateUrl: data.certificateUrl,
                    verificationStatus: data.verificationStatus,
                    verificationNote: data.verificationNote
                });
            }
        } else {
            // Add new credential (comes from API response after upload)
            if (data.id) {
                addCredential({
                    id: data.id,
                    name: data.name,
                    certificateType: data.certificateType,
                    institution: data.institution,
                    issueYear: data.issueYear,
                    credentialId: data.credentialId,
                    credentialUrl: data.credentialUrl,
                    certificateUrl: data.certificateUrl,
                    verificationStatus: data.verificationStatus,
                    verificationNote: data.verificationNote
                });
            }
        }
        // Refresh data from API to get updated list
        fetchProgress();
    };

    // Handle delete credential - call API and refresh
    const handleDeleteCredential = async (credentialId: string) => {
        const userId = getUserIdFromToken();
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }

        setDeletingCredentialId(credentialId);

        try {
            const result = await deleteCertificate(userId, credentialId);

            if (result.success) {
                toast.success('Đã xóa chứng chỉ thành công!');
                // Remove from local state
                removeCredential(credentialId);
                // Refresh from API to ensure sync
                fetchProgress();
            } else {
                toast.error(result.message || 'Không thể xóa chứng chỉ');
            }
        } catch (error) {
            console.error('Delete credential error:', error);
            toast.error('Có lỗi xảy ra khi xóa chứng chỉ');
        } finally {
            setDeletingCredentialId(null);
        }
    };

    return (
        <div className={styles.profilePage}>
            {/* Main Content - Conditionally render Edit or Preview mode */}
            {!isEditMode ? (
                /* Preview Mode - Show TutorProfilePreview component */
                <TutorProfilePreview formData={formData} />
            ) : (
                /* Edit Mode - Show editable sections */
                <div className={styles.mainContent}>
                    <div className={styles.contentWrapper}>
                        {/* Left Column */}
                        <div className={styles.leftColumn}>
                            {/* Intro Video Section */}
                            <div data-tour="profile-video">
                            <IntroVideoSection
                                videoUrl={formData.videoIntroUrl}
                                onChange={updateVideoUrl}
                                onUploadVideo={uploadVideo}
                                isEditMode={isEditMode}
                                isUploading={isVideoUploading}
                            />
                            </div>

                            {/* Hero Section Card */}
                            <div className={styles.sectionCard} data-tour="profile-hero">
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>Thông tin cơ bản</h2>
                                    {isEditMode && (
                                        <button
                                            className={styles.editIconBtn}
                                            onClick={() => setIsHeroModalOpen(true)}
                                        >
                                            <EditPencilIcon />
                                        </button>
                                    )}
                                </div>
                                <div className={styles.heroContent}>
                                    {/* Avatar */}
                                    <div className={styles.avatarContainer}>
                                        <div className={styles.avatar}>
                                            {formData.avatarUrl && (
                                                <img src={formData.avatarUrl} alt={formData.fullName} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className={styles.heroInfo}>
                                        <div className={styles.nameRow}>
                                            <h1 className={styles.tutorName}>{formData.fullName}</h1>
                                            <VerifiedIcon />
                                        </div>

                                        <p className={styles.headline}>{formData.headline}</p>

                                        <div className={styles.metaRow}>
                                            <div className={styles.metaItem}>
                                                <StarIcon />
                                                <span className={styles.metaValue}>
                                                    {formData.averageRating} ({formData.totalReviews} đánh giá)
                                                </span>
                                            </div>
                                            <div className={styles.metaItem}>
                                                <LocationIcon />
                                                <span className={styles.metaValue}>{getLocationDisplay()}</span>
                                            </div>
                                            <div className={styles.metaItem}>
                                                <DesktopIcon />
                                                <span className={styles.metaValue}>
                                                    {TEACHING_MODE_LABELS[formData.teachingMode] || formData.teachingMode}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Subject Tags */}
                                        <div className={styles.subjectTags}>
                                            <div className={styles.tagsRow}>
                                                {formData.subjects
                                                    .filter(subject => subject.subjectName && subject.subjectName.trim())
                                                    .map((subject) => (
                                                        <span key={subject.subjectId} className={styles.subjectTag}>
                                                            {subject.subjectName}
                                                        </span>
                                                    ))}
                                                {/* Display subject-specific tags */}
                                                {formData.subjects.flatMap(subject =>
                                                    subject.tags.map((tag: string) => (
                                                        <span key={`${subject.subjectId}-${tag}`} className={styles.customTag}>
                                                            {tag}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* About Me Section */}
                            <div className={styles.sectionCard} data-tour="profile-about">
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>Giới thiệu</h2>
                                    {isEditMode && (
                                        <button
                                            className={styles.editIconBtn}
                                            onClick={() => setIsAboutModalOpen(true)}
                                        >
                                            <EditPencilIcon />
                                        </button>
                                    )}
                                </div>
                                <div className={styles.aboutContent}>
                                    <p className={styles.bioText}>{formData.bio}</p>

                                    <div className={styles.aboutDetails}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Học vấn</span>
                                            <span className={styles.detailValue}>{formData.education}</span>
                                        </div>
                                        {formData.gpa && formData.gpaScale && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>GPA</span>
                                                <span className={styles.detailValue}>
                                                    {formData.gpa}/{formData.gpaScale}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.experienceSection}>
                                        <h3 className={styles.subTitle}>Kinh nghiệm</h3>
                                        <p className={styles.experienceText}>{formData.experience}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Credentials Section */}
                            <div className={styles.sectionCard} data-tour="profile-credentials">
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>Bằng cấp & Chứng chỉ</h2>
                                    {isEditMode && (
                                        <button
                                            className={styles.addBtn}
                                            onClick={() => {
                                                setEditingCredential(null);
                                                setIsCredentialModalOpen(true);
                                            }}
                                        >
                                            <PlusIcon />
                                            <span>Thêm mới</span>
                                        </button>
                                    )}
                                </div>

                                {/* Credentials List */}
                                <div className={styles.credentialsList}>
                                    {formData.credentials.length === 0 ? (
                                        <div className={styles.emptyCredentials}>
                                            <p>Chưa có chứng chỉ nào. Thêm chứng chỉ để tăng độ tin cậy của bạn.</p>
                                        </div>
                                    ) : (
                                        formData.credentials.map((credential) => (
                                            <div key={credential.id} className={styles.credentialItem}>
                                                <div className={styles.credentialIcon}>
                                                    <CertificateIcon />
                                                </div>
                                                <div className={styles.credentialInfo}>
                                                    <h4 className={styles.credentialTitle}>{credential.name}</h4>
                                                    <p className={styles.credentialInstitution}>{credential.institution}</p>
                                                    <div className={styles.credentialMeta}>
                                                        {credential.certificateType && (
                                                            <span className={styles.credentialType}>
                                                                {credential.certificateType.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {credential.issueYear && (
                                                            <span className={styles.credentialDate}>
                                                                Năm {credential.issueYear}
                                                            </span>
                                                        )}
                                                        <span className={`${styles.verificationBadge} ${styles[credential.verificationStatus]}`}>
                                                            {credential.verificationStatus === 'verified' ? 'Đã xác minh' :
                                                                credential.verificationStatus === 'pending' ? 'Đang chờ duyệt' : 'Bị từ chối'}
                                                        </span>
                                                    </div>
                                                    {/* Show verification note if exists */}
                                                    {credential.verificationNote && (
                                                        <p className={styles.credentialNote}>
                                                            <strong>Ghi chú:</strong> {credential.verificationNote}
                                                        </p>
                                                    )}
                                                    {/* Show certificate file link */}
                                                    {credential.certificateUrl && (
                                                        <a
                                                            href={credential.certificateUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.credentialLink}
                                                        >
                                                            Xem chứng chỉ
                                                        </a>
                                                    )}
                                                </div>
                                                {isEditMode && (
                                                    <div className={styles.credentialActions}>
                                                        <button
                                                            className={styles.editCredentialBtn}
                                                            onClick={() => handleEditCredential(credential)}
                                                        >
                                                            <EditPencilIcon />
                                                        </button>
                                                        <Popconfirm
                                                            title="Xóa chứng chỉ"
                                                            description={`Bạn có chắc muốn xóa chứng chỉ "${credential.name}"?`}
                                                            onConfirm={() => handleDeleteCredential(credential.id)}
                                                            okText="Xóa"
                                                            cancelText="Hủy"
                                                            okButtonProps={{
                                                                danger: true,
                                                                loading: deletingCredentialId === credential.id
                                                            }}
                                                            placement="left"
                                                        >
                                                            <button
                                                                className={styles.deleteCredentialBtn}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </Popconfirm>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Identity Verification Section */}
                            <div className={styles.sectionCard} data-tour="profile-identity">
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>Xác minh danh tính</h2>
                                    {/* Only show header button when already submitted (not for 'not_submitted' status) */}
                                    {isEditMode && formData.identityVerification.verificationStatus !== 'not_submitted' && (
                                        <button
                                            className={styles.editBtnSmall}
                                            onClick={() => setIsIdentityModalOpen(true)}
                                        >
                                            <EditPencilIcon />
                                            <span>Xem chi tiết</span>
                                        </button>
                                    )}
                                </div>
                                <div className={styles.identityContent}>
                                    <div className={styles.identityStatus}>
                                        {formData.identityVerification.verificationStatus === 'verified' && (
                                            <div className={styles.identityVerified}>
                                                <div className={`${styles.identityBadge} ${styles.verified}`}>
                                                    <CheckCircleIcon />
                                                    <span>Đã xác minh</span>
                                                </div>
                                                <p className={styles.identityVerifiedText}>
                                                    Danh tính của bạn đã được xác minh thành công.
                                                </p>
                                            </div>
                                        )}
                                        {formData.identityVerification.verificationStatus === 'pending' && (
                                            <div className={styles.identityPending}>
                                                <div className={`${styles.identityBadge} ${styles.pending}`}>
                                                    <span>Đang chờ duyệt</span>
                                                </div>
                                                <p className={styles.identityPendingText}>
                                                    Hồ sơ xác minh của bạn đang được xem xét. Vui lòng chờ trong 24-48 giờ.
                                                </p>
                                            </div>
                                        )}
                                        {formData.identityVerification.verificationStatus === 'rejected' && (
                                            <div className={styles.identityRejected}>
                                                <div className={`${styles.identityBadge} ${styles.rejected}`}>
                                                    <span>Bị từ chối</span>
                                                </div>
                                                <p className={styles.identityRejectedText}>
                                                    Hồ sơ xác minh của bạn đã bị từ chối. Vui lòng kiểm tra lại và gửi lại.
                                                </p>
                                                <button
                                                    className={styles.resubmitBtn}
                                                    onClick={() => setIsIdentityModalOpen(true)}
                                                >
                                                    Gửi lại hồ sơ
                                                </button>
                                            </div>
                                        )}
                                        {formData.identityVerification.verificationStatus === 'not_submitted' && (
                                            <div className={styles.identityNotSubmitted}>
                                                <p>Xác minh danh tính để tăng độ tin cậy với học sinh và phụ huynh.</p>
                                                <button
                                                    className={styles.verifyNowBtn}
                                                    onClick={() => setIsIdentityModalOpen(true)}
                                                >
                                                    Xác minh ngay
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className={styles.rightColumn}>
                            {/* Card phải chỉ render khi có nội dung: preview (nút đặt/nhắn) hoặc
                                edit chưa có lịch (nhắc cập nhật lịch). Tránh hộp trắng rỗng. */}
                            {(!isEditMode || formData.availability.length === 0) && (
                                <div className={styles.pricingCard} data-tour="profile-pricing">
                                    {/* Show no schedule message on card only in edit mode */}
                                    {isEditMode && formData.availability.length === 0 && (
                                        <div className={styles.noScheduleSection}>
                                            <p className={styles.noScheduleMessage}>Chưa cập nhật lịch</p>
                                            <button
                                                className={styles.updateScheduleLink}
                                                onClick={() => navigate('/tutor-portal/schedule')}
                                            >
                                                Cập nhật lịch ngay
                                            </button>
                                        </div>
                                    )}

                                    {/* Show booking and message buttons only in preview mode */}
                                    {!isEditMode && (
                                        <>
                                            <button
                                                className={styles.bookTrialBtn}
                                                onClick={() => setIsBookingModalOpen(true)}
                                            >
                                                Đặt buổi học thử
                                            </button>
                                            <button className={styles.sendMessageBtn}>
                                                <MessageIcon />
                                                <span>Gửi tin nhắn</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Profile Completeness Card */}
                            {isEditMode && (
                                <ProfileCompleteness
                                    profileData={formData}
                                    hasPricing={pricingItems.length > 0}
                                    onSectionClick={handleCompletenessClick}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Bar - Sticky Bottom */}
            <div className={styles.editBar} data-tour="profile-editbar">
                <div className={styles.editBarLeft}>
                    {/* Preview/Edit Toggle */}
                    <div className={styles.toggleGroup}>
                        <button
                            className={`${styles.toggleBtn} ${!isEditMode ? styles.active : ''}`}
                            onClick={() => setIsEditMode(false)}
                        >
                            Xem trước
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${isEditMode ? styles.active : ''}`}
                            onClick={() => setIsEditMode(true)}
                        >
                            Chỉnh sửa
                        </button>
                    </div>
                </div>

                <div className={styles.editBarRight}>
                    {/* Saved Status */}
                    <div className={styles.savedStatus}>
                        {isDirty ? (
                            <>
                                <span className={styles.unsavedDot}></span>
                                <span className={styles.savedText}>Chưa lưu</span>
                            </>
                        ) : lastSaved ? (
                            <>
                                <span className={styles.savedDot}></span>
                                <span className={styles.savedText}>Đã lưu</span>
                            </>
                        ) : null}
                    </div>

                    {/* Share Button */}
                    <button className={styles.shareBtn}>
                        <ShareIcon />
                    </button>

                </div>
            </div>

            {/* Modals */}
            <ProfileHeroModal
                isOpen={isHeroModalOpen}
                onClose={() => setIsHeroModalOpen(false)}
                onSave={async (data) => {
                    // Call API to save basic info
                    const success = await saveBasicInfo({
                        avatarFile: data.avatarFile,
                        headline: data.headline,
                        teachingAreaCity: data.teachingAreaCity,
                        teachingAreaDistrict: data.teachingAreaDistrict,
                        teachingMode: data.teachingMode,
                    });

                    if (success) {
                        setIsHeroModalOpen(false);
                    }
                }}
                initialData={{
                    avatarUrl: formData.avatarUrl,
                    avatarFile: formData.avatarFile,
                    headline: formData.headline,
                    teachingAreaCity: formData.teachingAreaCity,
                    teachingAreaDistrict: formData.teachingAreaDistrict,
                    teachingMode: formData.teachingMode,
                }}
            />

            <AboutMeModal
                isOpen={isAboutModalOpen}
                onClose={() => setIsAboutModalOpen(false)}
                onSave={async (data) => {
                    const success = await updateAbout(data);
                    if (success) {
                        setIsAboutModalOpen(false);
                    }
                    return success;
                }}
                initialData={{
                    bio: formData.bio,
                    education: formData.education,
                    gpaScale: formData.gpaScale,
                    gpa: formData.gpa,
                    experience: formData.experience
                }}
            />

            <CredentialModal
                isOpen={isCredentialModalOpen}
                onClose={() => {
                    setIsCredentialModalOpen(false);
                    setEditingCredential(null);
                }}
                onSave={handleSaveCredential}
                initialData={editingCredential || undefined}
                isEditing={!!editingCredential}
            />

            <IdentityVerificationModal
                isOpen={isIdentityModalOpen}
                onClose={() => setIsIdentityModalOpen(false)}
                onSave={(data) => {
                    updateIdentityVerification(data);
                }}
                initialData={formData.identityVerification}
            />

            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                availability={formData.availability}
                trialLessonPrice={formData.trialLessonPrice}
                onNavigateToSchedule={() => {
                    setIsBookingModalOpen(false);
                    navigate('/tutor-portal/schedule');
                }}
            />
        </div>
    );
};

export default TutorPortalProfile;
