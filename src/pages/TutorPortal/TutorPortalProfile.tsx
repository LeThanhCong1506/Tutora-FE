import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Popconfirm, Switch } from 'antd';
import { ArrowRight, Award, BookOpenText, Clock, IdCard, ShieldCheck, UserRoundPen } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTutorProfileForm, type CredentialData } from './hooks/useTutorProfileForm';
import ProfileHeroModal from './components/ProfileHeroModal';
import AvatarModal from './components/AvatarModal';
import AboutMeModal from './components/AboutMeModal';
import CredentialModal from './components/CredentialModal';
import type { CredentialData as ModalCredentialData } from './components/CredentialModal';
import IdentityVerificationModal from './components/IdentityVerificationModal';
import CccdConfirmModal from './components/CccdConfirmModal';
// @ts-ignore - IdentityVerificationData may be used later
import type { IdentityVerificationData as _IdentityVerificationData } from './components/IdentityVerificationModal';
import IntroVideoSection from './components/IntroVideoSection';
import ProfileCompleteness from './components/ProfileCompleteness';
import BookingModal from './components/BookingModal';
import TutorProfilePreview from './components/TutorProfilePreview';
import { deleteCertificate } from '../../services/certificate.service';
import { getUserIdFromToken } from '../../services/auth.service';
import {
  getAcceptingBookings,
  setAcceptingBookings,
  getMyCccdUrls,
  confirmCccdProfile,
  type MyCccdUrls,
} from '../../services/tutorProfile.service';
import { validateAvatar } from './utils/validation';
import { getCertificateImageUrl, isPdfUrl } from '../../utils/certificateImage';
import { fetchProtectedImage, releaseProtectedImage } from '../../utils/protectedImage';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatGradeLevelRanges } from '../TutorSearch/components/utils';
import { PageContainer } from '../../components/shared';
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
    <path
      d="M7 7.58333C8.01252 7.58333 8.83333 6.76252 8.83333 5.75C8.83333 4.73748 8.01252 3.91667 7 3.91667C5.98748 3.91667 5.16667 4.73748 5.16667 5.75C5.16667 6.76252 5.98748 7.58333 7 7.58333Z"
      stroke="rgba(62, 47, 40, 0.6)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 12.8333C9.33333 10.5 11.6667 8.41421 11.6667 5.75C11.6667 3.17267 9.57733 1.08333 7 1.08333C4.42267 1.08333 2.33333 3.17267 2.33333 5.75C2.33333 8.41421 4.66667 10.5 7 12.8333Z"
      stroke="rgba(62, 47, 40, 0.6)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DesktopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect
      x="1.16667"
      y="1.75"
      width="11.6667"
      height="8.16667"
      rx="1.16667"
      stroke="rgba(62, 47, 40, 0.6)"
      strokeWidth="1.2"
    />
    <path d="M4.08333 12.25H9.91667" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M7 9.91667V12.25" stroke="rgba(62, 47, 40, 0.6)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const EditPencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M11.5 2.5L13.5 4.5M9 5L2.5 11.5V13.5H4.5L11 7M9 5L11.5 2.5L13.5 4.5L11 7M9 5L11 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CameraIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 8C3 6.9 3.9 6 5 6H6.5L7.7 4.2C7.9 3.8 8.3 3.5 8.8 3.5H15.2C15.7 3.5 16.1 3.8 16.3 4.2L17.5 6H19C20.1 6 21 6.9 21 8V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V8Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
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
    <path
      d="M5.25 3.5V2.33333C5.25 1.86667 5.61667 1.5 6.08333 1.5H7.91667C8.38333 1.5 8.75 1.86667 8.75 2.33333V3.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.5 3.5V11.6667C10.5 12.1333 10.1333 12.5 9.66667 12.5H4.33333C3.86667 12.5 3.5 12.1333 3.5 11.6667V3.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect
      x="1.16667"
      y="2.33333"
      width="11.6667"
      height="9.33333"
      rx="1.16667"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M1.16667 4.08333L7 7.58333L12.8333 4.08333"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.83333" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M4.66667 7L6.41667 8.75L9.33333 5.25"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VerifiedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1L9.5 3L12 2.5L11.5 5L14 6.5L12 8L14 9.5L11.5 11L12 13.5L9.5 13L8 15L6.5 13L4 13.5L4.5 11L2 9.5L4 8L2 6.5L4.5 5L4 2.5L6.5 3L8 1Z"
      fill="#3d4a3e"
    />
    <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// City/District label mapping
const CITY_LABELS: Record<string, string> = {
  hanoi: 'Ha Noi',
  hcm: 'TP. Ho Chi Minh',
  danang: 'Da Nang',
  haiphong: 'Hai Phong',
  cantho: 'Can Tho',
};

const DISTRICT_LABELS: Record<string, Record<string, string>> = {
  hanoi: {
    'ba-dinh': 'Ba Dinh',
    'hoan-kiem': 'Hoan Kiem',
    'dong-da': 'Dong Da',
    'hai-ba-trung': 'Hai Ba Trung',
    'cau-giay': 'Cau Giay',
    'thanh-xuan': 'Thanh Xuan',
  },
  hcm: {
    'quan-1': 'Quan 1',
    'quan-2': 'Quan 2',
    'quan-3': 'Quan 3',
    'quan-7': 'Quan 7',
    'binh-thanh': 'Binh Thanh',
    'phu-nhuan': 'Phu Nhuan',
  },
};

const TEACHING_MODE_LABELS: Record<string, string> = {
  online: 'Dạy online',
  offline: 'Dạy trực tiếp',
  both: 'Online & trực tiếp',
};

interface ProfileEmptyStateProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ProfileEmptyState: React.FC<ProfileEmptyStateProps> = ({
  icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className={styles.profileEmptyState}>
    <span className={styles.emptyStateVisual}>{icon}</span>
    <div className={styles.emptyStateCopy}>
      <span className={styles.emptyStateEyebrow}>{eyebrow}</span>
      <h3 className={styles.emptyStateTitle}>{title}</h3>
      {description && <p className={styles.emptyStateDescription}>{description}</p>}
    </div>
    {actionLabel && onAction && (
      <button type="button" className={styles.emptyStateAction} onClick={onAction}>
        <span>{actionLabel}</span>
        <ArrowRight size={16} strokeWidth={2.2} />
      </button>
    )}
  </div>
);

interface CertificateThumbnailProps {
  url?: string;
  thumbnailUrl?: string | null;
  name: string;
  onPreview: (preview: CertificatePreviewData) => void;
}

interface CertificatePreviewData {
  name: string;
  imageUrl: string;
}

const CertificateThumbnail: React.FC<CertificateThumbnailProps> = ({ url, thumbnailUrl: rawThumbnailUrl, name, onPreview }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isPdf = isPdfUrl(url);
  const thumbnailUrl = getCertificateImageUrl(url, false, rawThumbnailUrl);
  const previewUrl = getCertificateImageUrl(url, true, rawThumbnailUrl);

  if (!url || !thumbnailUrl || imageFailed) {
    return (
      <div
        className={styles.credentialThumbnailFallback}
        title={isPdf ? 'Không thể tạo ảnh xem trước PDF' : 'Không có ảnh xem trước'}
      >
        <CertificateIcon />
        <span>{isPdf ? 'PDF' : 'Tệp'}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.credentialThumbnailLink}
      aria-label={`Xem đầy đủ ảnh chứng chỉ ${name}`}
      onClick={() => {
        if (previewUrl) onPreview({ name, imageUrl: previewUrl });
      }}
    >
      <img
        src={thumbnailUrl}
        alt={`Ảnh chứng chỉ ${name}`}
        className={styles.credentialThumbnail}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </button>
  );
};

const TutorPortalProfile: React.FC = () => {
  const navigate = useNavigate();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(true);

  // Modal states
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ModalCredentialData | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  // Màn hình đối chiếu "thông tin CCCD → hồ sơ". Mở sau khi quét xong, và mở lại được từ
  // thẻ Xác minh danh tính nếu gia sư bấm "Để sau".
  const [isCccdConfirmOpen, setIsCccdConfirmOpen] = useState(false);
  const [isConfirmingCccd, setIsConfirmingCccd] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [certificatePreview, setCertificatePreview] = useState<CertificatePreviewData | null>(null);
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);
  const [avatarCropImageSrc, setAvatarCropImageSrc] = useState<string | null>(null);
  const [avatarCropFileName, setAvatarCropFileName] = useState('avatar.jpg');
  const [videoGuidanceSignal, setVideoGuidanceSignal] = useState(0);

  // Trạng thái "nhận học viên mới" — tắt thì ẩn khỏi Marketplace + chặn booking mới.
  const [isAcceptingBookings, setIsAcceptingBookings] = useState<boolean | null>(null);
  const [togglingBookings, setTogglingBookings] = useState(false);

  // Ảnh CCCD đã upload — tự xem lại. Lần gọi lúc mở trang chỉ để biết CÓ ảnh hay không (hiện/ẩn nút);
  // link thật lấy lại ngay lúc bấm vì signed URL chỉ sống ~15 phút, để lâu sẽ hỏng.
  const [myCccd, setMyCccd] = useState<MyCccdUrls | null>(null);
  const [openingCccdSide, setOpeningCccdSide] = useState<'front' | 'back' | null>(null);

  useEffect(() => {
    const tutorUserId = getUserIdFromToken();
    if (!tutorUserId) return;

    getAcceptingBookings(tutorUserId)
      .then((response) => setIsAcceptingBookings(response.content.accepting))
      .catch(() => {
        /* non-blocking — toggle just stays hidden if this fails */
      });

    getMyCccdUrls(tutorUserId)
      .then((response) => setMyCccd(response.content))
      .catch(() => {
        /* non-blocking — nút xem CCCD chỉ ẩn đi nếu lỗi */
      });
  }, []);

  // Lấy signed URL mới ngay lúc bấm — link cũ lấy lúc mở trang có thể đã hết hạn.
  const handleViewCccd = async (side: 'front' | 'back') => {
    const tutorUserId = getUserIdFromToken();
    if (!tutorUserId || openingCccdSide) return;

    setOpeningCccdSide(side);
    try {
      const response = await getMyCccdUrls(tutorUserId);
      setMyCccd(response.content);
      const url = side === 'front' ? response.content?.frontImageUrl : response.content?.backImageUrl;
      if (!url) {
        toast.error('Không tìm thấy ảnh CCCD.');
        return;
      }
      // Endpoint file private đòi JWT + đúng chủ sở hữu, thẻ <img> không gửi được token
      // nên phải tải bằng JS rồi đổi sang blob URL.
      const objectUrl = await fetchProtectedImage(url);
      setCertificatePreview((prev) => {
        releaseProtectedImage(prev?.imageUrl);
        return {
          name: side === 'front' ? 'CCCD mặt trước' : 'CCCD mặt sau',
          imageUrl: objectUrl,
        };
      });
    } catch (err) {
      console.error('View CCCD error:', err);
      toast.error(getApiErrorMessage(err, 'Không mở được ảnh CCCD. Vui lòng thử lại.'));
    } finally {
      setOpeningCccdSide(null);
    }
  };

  const handleToggleAcceptingBookings = async (accepting: boolean) => {
    const tutorUserId = getUserIdFromToken();
    if (!tutorUserId || togglingBookings) return;

    setTogglingBookings(true);
    try {
      const response = await setAcceptingBookings(tutorUserId, accepting);
      setIsAcceptingBookings(response.content.accepting);
      toast.success(accepting ? 'Đã mở nhận học viên mới.' : 'Đã tạm dừng nhận booking mới.');
    } catch (err) {
      console.error('Error toggling accepting bookings:', err);
      toast.error(getApiErrorMessage(err, 'Không thể cập nhật trạng thái nhận booking. Vui lòng thử lại.'));
    } finally {
      setTogglingBookings(false);
    }
  };

  // Form hook
  const {
    formData,
    profileStatus,
    sectionStatuses: _sectionStatuses,
    isLoading: _isLoading,
    isInitialLoading: _isInitialLoading,
    isVideoSaving,
    error: _error,
    canPublish: _canPublish,
    fetchProgress,
    updateHeroSection: _updateHeroSection,
    updateAbout,
    saveVideoUrl,
    saveAvatar,
    saveBasicInfo,
    addCredential,
    removeCredential,
    updateIdentityVerification,
    applyConfirmedCccdProfile,
    saveDraft: _saveDraft,
    publishChanges: _publishChanges,
  } = useTutorProfileForm();

  // Hồ sơ đã gửi và đang chờ Admin xét duyệt → hiển thị banner thông báo.
  const isPendingApproval = profileStatus?.toLowerCase() === 'pending_approval';
  // Hồ sơ đã Active nhưng có 1 bản chỉnh sửa đang chờ Admin duyệt (khác với isPendingApproval:
  // ở đây hồ sơ VẪN đang hiển thị công khai trên marketplace với thông tin cũ).
  const isPendingUpdate = profileStatus?.toLowerCase() === 'pending_update';

  // Get display location
  const getLocationDisplay = () => {
    const city = CITY_LABELS[formData.teachingAreaCity] || formData.teachingAreaCity;
    const district =
      DISTRICT_LABELS[formData.teachingAreaCity]?.[formData.teachingAreaDistrict] || formData.teachingAreaDistrict;
    return `${district}, ${city}`;
  };

  const hasTeachingArea = Boolean(formData.teachingAreaCity && formData.teachingAreaDistrict);
  const hasSubjects = formData.subjects.some((subject) => Boolean(subject.subjectName?.trim()));
  const missingBasicFields = [
    !formData.avatarUrl && 'Ảnh đại diện',
    !formData.headline.trim() && 'Tiêu đề hồ sơ',
    !hasTeachingArea && 'Khu vực dạy',
    !formData.teachingMode && 'Hình thức dạy',
  ].filter((field): field is string => Boolean(field));
  const hasMissingBasicDetails = Boolean(
    !formData.headline.trim() || !hasTeachingArea || !formData.teachingMode,
  );
  const missingAboutFields = [
    !formData.bio.trim() && 'Giới thiệu bản thân',
    (!formData.degree.trim() || !formData.education.trim()) && 'Học vấn',
    !formData.experience.trim() && 'Kinh nghiệm',
  ].filter((field): field is string => Boolean(field));
  const isAboutEmpty = missingAboutFields.length === 3;

  // Handle completeness section click
  const handleCompletenessClick = (section: string) => {
    switch (section) {
      case 'avatar':
        openAvatarFilePicker();
        break;
      case 'basicInfo':
        setIsHeroModalOpen(true);
        break;
      case 'video':
        setVideoGuidanceSignal((signal) => signal + 1);
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
        // Lịch dạy đã gộp vào trang Thiết lập giảng dạy (Onboarding).
        window.location.href = '/tutor-portal/onboarding';
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
      certificateFile: null, // File is not available for existing credentials
      certificateUrl: credential.certificateUrl,
      verificationStatus: credential.verificationStatus,
      verificationNote: credential.verificationNote,
    };
    setEditingCredential(modalData);
    setIsCredentialModalOpen(true);
  };

  const openAvatarFilePicker = () => {
    if (!isEditMode) return;
    avatarFileInputRef.current?.click();
  };

  const closeAvatarCropper = () => {
    setIsAvatarModalOpen(false);
    if (avatarCropImageSrc) {
      URL.revokeObjectURL(avatarCropImageSrc);
    }
    setAvatarCropImageSrc(null);
    setAvatarCropFileName('avatar.jpg');
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = validateAvatar(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Ảnh đại diện không hợp lệ');
      return;
    }

    if (avatarCropImageSrc) {
      URL.revokeObjectURL(avatarCropImageSrc);
    }

    setAvatarCropImageSrc(URL.createObjectURL(file));
    setAvatarCropFileName(file.name || 'avatar.jpg');
    setIsAvatarModalOpen(true);
  };

  // Handle save credential - called when modal saves new/updated credential
  const handleSaveCredential = (data: ModalCredentialData) => {
    if (editingCredential) {
      // CredentialModal giờ xoá chứng chỉ cũ rồi tạo chứng chỉ mới thay thế (xem CredentialModal.
      // handleSave) — data.id ở đây LUÔN LÀ ID MỚI, khác hẳn editingCredential.id (bản cũ vừa bị
      // xoá). updateCredential(data.id, ...) trước đây không khớp được bản ghi nào trong state cục
      // bộ (chỉ có ID CŨ), nên chỉ có fetchProgress() bên dưới mới thực sự đồng bộ lại danh sách —
      // gỡ thẳng bản cũ + thêm bản mới ở đây để UI không bị "đứng hình" trong lúc chờ fetchProgress.
      removeCredential(editingCredential.id ?? '');
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
          thumbnailUrl: data.thumbnailUrl,
          verificationStatus: data.verificationStatus,
          verificationNote: data.verificationNote,
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
          thumbnailUrl: data.thumbnailUrl,
          verificationStatus: data.verificationStatus,
          verificationNote: data.verificationNote,
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
      toast.error(getApiErrorMessage(error, 'Có lỗi xảy ra khi xóa chứng chỉ'));
    } finally {
      setDeletingCredentialId(null);
    }
  };

  // Gia sư đồng ý đưa thông tin CCCD vào hồ sơ. BE lấy dữ liệu từ bản OCR đã lưu — request
  // không gửi kèm giá trị nào, gia sư chỉ đồng ý chứ không tự khai.
  const handleConfirmCccdProfile = async () => {
    const userId = getUserIdFromToken();
    if (!userId) {
      toast.error('Không tìm thấy thông tin người dùng');
      return;
    }

    setIsConfirmingCccd(true);
    try {
      const res = await confirmCccdProfile(userId);
      const confirmed = res.content;
      if (res.statusCode !== 200 || !confirmed) {
        toast.error(res.message || 'Không thể cập nhật hồ sơ theo CCCD. Vui lòng thử lại.');
        return;
      }

      applyConfirmedCccdProfile(confirmed);
      toast.success(confirmed.message || 'Đã cập nhật hồ sơ theo CCCD.');
      setIsCccdConfirmOpen(false);
      setIsIdentityModalOpen(false);
      // Đồng bộ lại tiến trình hồ sơ (cờ "chờ xác nhận" nằm trong section identityCard).
      fetchProgress();
    } catch (error) {
      console.error('Confirm CCCD profile error:', error);
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật hồ sơ theo CCCD. Vui lòng thử lại.'));
    } finally {
      setIsConfirmingCccd(false);
    }
  };

  const identityData = formData.identityVerification;
  const hasPendingCccdConfirm = identityData.requiresProfileConfirmation === true;

  return (
    <PageContainer
      className={styles.profilePage}
      title="Hồ sơ gia sư"
      titleInfo="Cập nhật hồ sơ công khai, chứng chỉ và trạng thái nhận học viên."
      maxWidth="wide"
    >
      {/* Banner trạng thái: hồ sơ đang chờ Admin xét duyệt. Hiển thị ở cả chế độ
          chỉnh sửa lẫn xem trước để gia sư luôn thấy hồ sơ đang được duyệt. */}
      {isPendingApproval && (
        <div className={styles.pendingReviewWrapper}>
          <div className={styles.pendingReviewBanner} role="status" aria-live="polite">
            <span className={styles.pendingReviewIcon}>
              <Clock size={22} strokeWidth={2} />
            </span>
            <div className={styles.pendingReviewText}>
              <div className={styles.pendingReviewTitleRow}>
                <h2 className={styles.pendingReviewTitle}>Hồ sơ của bạn đang được xét duyệt</h2>
                <span className={styles.pendingReviewBadge}>
                  <span className={styles.pendingReviewDot} />
                  Đang chờ duyệt
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner trạng thái: hồ sơ đã Active nhưng có thay đổi đang chờ duyệt lại — khác
          isPendingApproval ở chỗ hồ sơ vẫn hiển thị công khai với thông tin CŨ trong lúc chờ. */}
      {isPendingUpdate && (
        <div className={styles.pendingReviewWrapper}>
          <div className={styles.pendingReviewBanner} role="status" aria-live="polite">
            <span className={styles.pendingReviewIcon}>
              <Clock size={22} strokeWidth={2} />
            </span>
            <div className={styles.pendingReviewText}>
              <div className={styles.pendingReviewTitleRow}>
                <h2 className={styles.pendingReviewTitle}>Bạn có thay đổi hồ sơ đang chờ Admin duyệt</h2>
                <span className={styles.pendingReviewBadge}>
                  <span className={styles.pendingReviewDot} />
                  Đang chờ duyệt
                </span>
              </div>
              <p className={styles.pendingReviewDescription}>
                Thông tin công khai trên Marketplace vẫn giữ nguyên như trước cho đến khi Admin duyệt
                thay đổi này. Bạn vẫn có thể tiếp tục chỉnh sửa — lần nộp mới nhất sẽ thay thế bản đang chờ.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  onSave={saveVideoUrl}
                  isEditMode={isEditMode}
                  isSaving={isVideoSaving}
                  guidanceSignal={videoGuidanceSignal}
                />
              </div>

              {/* Hero Section Card */}
              <div className={styles.sectionCard} data-tour="profile-hero">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Thông tin cơ bản</h2>
                  <div className={styles.sectionHeaderActions}>
                    {isAcceptingBookings !== null && (
                      <div
                        className={`${styles.acceptingPill} ${isAcceptingBookings ? styles.acceptingPillOn : styles.acceptingPillOff}`}
                        title={
                          isAcceptingBookings
                            ? 'Hồ sơ đang hiển thị công khai trên Marketplace và có thể nhận booking mới.'
                            : 'Hồ sơ đang tạm ẩn khỏi Marketplace và không nhận booking mới.'
                        }
                      >
                        <span className={styles.acceptingDot} />
                        <span className={styles.acceptingLabel}>
                          {isAcceptingBookings ? 'Đang mở nhận học viên' : 'Tạm dừng nhận booking'}
                        </span>
                        <Switch
                          size="small"
                          checked={isAcceptingBookings}
                          loading={togglingBookings}
                          onChange={handleToggleAcceptingBookings}
                          className={styles.acceptingSwitch}
                        />
                      </div>
                    )}
                    {isEditMode && missingBasicFields.length === 0 && (
                      <button className={styles.editIconBtn} onClick={() => setIsHeroModalOpen(true)}>
                        <EditPencilIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.heroContent}>
                  {/* Avatar — click để chọn ảnh ngay, sau đó crop và gọi API riêng updateAvatar */}
                  <div
                    className={`${styles.avatarContainer} ${isEditMode ? styles.avatarEditable : ''}`}
                    onClick={isEditMode ? openAvatarFilePicker : undefined}
                    role={isEditMode ? 'button' : undefined}
                    title={isEditMode ? 'Đổi ảnh đại diện' : undefined}
                  >
                    <div className={styles.avatar}>
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt={formData.fullName} />
                      ) : (
                        <div className={styles.avatarFallback}>
                          <UserRoundPen size={25} strokeWidth={1.8} />
                          <span>Thêm ảnh</span>
                        </div>
                      )}
                    </div>
                    {isEditMode && (
                      <span className={styles.avatarCameraBadge}>
                        <CameraIcon />
                      </span>
                    )}
                    {isEditMode && (
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className={styles.avatarFileInput}
                        onClick={(event) => event.stopPropagation()}
                        onChange={handleAvatarFileChange}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className={styles.heroInfo}>
                    <div className={styles.nameRow}>
                      <h2 className={styles.tutorName}>{formData.fullName}</h2>
                      <VerifiedIcon />
                    </div>

                    {formData.headline.trim() && <p className={styles.headline}>{formData.headline}</p>}

                    <div className={styles.metaRow}>
                      <div className={styles.metaItem}>
                        <StarIcon />
                        <span className={styles.metaValue}>
                          {formData.averageRating} ({formData.totalReviews} đánh giá)
                        </span>
                      </div>
                      {hasTeachingArea && (
                        <div className={styles.metaItem}>
                          <LocationIcon />
                          <span className={styles.metaValue}>{getLocationDisplay()}</span>
                        </div>
                      )}
                      {formData.teachingMode && (
                        <div className={styles.metaItem}>
                          <DesktopIcon />
                          <span className={styles.metaValue}>{TEACHING_MODE_LABELS[formData.teachingMode]}</span>
                        </div>
                      )}
                    </div>

                    {/* Subject Tags */}
                    {hasSubjects && (
                      <div className={styles.subjectTags}>
                        <div className={styles.tagsRow}>
                          {formData.subjects
                            .filter((subject) => subject.subjectName && subject.subjectName.trim())
                            .map((subject) => (
                              <span key={subject.subjectId} className={styles.subjectTag}>
                                <span>{subject.subjectName}</span>
                                {subject.gradeLevels.length > 0 && (
                                  <span className={styles.subjectTagGrades}>
                                    {formatGradeLevelRanges(subject.gradeLevels)}
                                  </span>
                                )}
                              </span>
                            ))}
                          {/* Display subject-specific tags */}
                          {formData.subjects.flatMap((subject) =>
                            subject.tags.map((tag: string) => (
                              <span key={`${subject.subjectId}-${tag}`} className={styles.customTag}>
                                {tag}
                              </span>
                            )),
                          )}
                        </div>
                      </div>
                    )}

                    {missingBasicFields.length > 0 && (
                      <div className={styles.basicCompletionNotice}>
                        <div className={styles.basicNoticeHeader}>
                          <span className={styles.basicNoticeIcon}>
                            <UserRoundPen size={18} strokeWidth={2} />
                          </span>
                          <div>
                            <strong>Hoàn thiện thông tin hiển thị</strong>
                          </div>
                        </div>
                        <div className={styles.missingFieldList} aria-label="Thông tin cơ bản còn thiếu">
                          {missingBasicFields.map((field) => (
                            <span key={field} className={styles.missingFieldChip}>
                              {field}
                            </span>
                          ))}
                        </div>
                        {isEditMode && (
                          <div className={styles.emptyStateActions}>
                            {hasMissingBasicDetails && (
                              <button
                                type="button"
                                className={styles.emptyStateAction}
                                onClick={() => setIsHeroModalOpen(true)}
                              >
                                <span>Bổ sung thông tin</span>
                                <ArrowRight size={16} strokeWidth={2.2} />
                              </button>
                            )}
                            {!hasMissingBasicDetails && !formData.avatarUrl && (
                              <button type="button" className={styles.emptyStateAction} onClick={openAvatarFilePicker}>
                                <span>Thêm ảnh đại diện</span>
                                <ArrowRight size={16} strokeWidth={2.2} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* About Me Section */}
              <div className={styles.sectionCard} data-tour="profile-about">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Giới thiệu</h2>
                  {isEditMode && !isAboutEmpty && (
                    <button className={styles.editIconBtn} onClick={() => setIsAboutModalOpen(true)}>
                      <EditPencilIcon />
                    </button>
                  )}
                </div>
                <div className={styles.aboutContent}>
                  {isAboutEmpty ? (
                    <ProfileEmptyState
                      icon={<BookOpenText size={27} strokeWidth={1.8} />}
                      eyebrow="Chưa có nội dung"
                      title="Kể học viên nghe về bạn"
                      actionLabel={isEditMode ? 'Viết phần giới thiệu' : undefined}
                      onAction={isEditMode ? () => setIsAboutModalOpen(true) : undefined}
                    />
                  ) : (
                    <>
                      {formData.bio.trim() && <p className={styles.bioText}>{formData.bio}</p>}

                      {(formData.degree.trim() || formData.education.trim() || (formData.gpa && formData.gpaScale)) && (
                        <div className={styles.aboutDetails}>
                          {formData.degree.trim() && (
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Học vị</span>
                              <span className={styles.detailValue}>{formData.degree}</span>
                            </div>
                          )}
                          {formData.education.trim() && (
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Trường học</span>
                              <span className={styles.detailValue}>{formData.education}</span>
                            </div>
                          )}
                          {formData.gpa && formData.gpaScale && (
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>GPA</span>
                              <span className={styles.detailValue}>
                                {formData.gpa}/{formData.gpaScale}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {formData.experience.trim() && (
                        <div className={styles.experienceSection}>
                          <h3 className={styles.subTitle}>Kinh nghiệm</h3>
                          <p className={styles.experienceText}>{formData.experience}</p>
                        </div>
                      )}

                      {missingAboutFields.length > 0 && (
                        <div className={styles.partialInfoPrompt}>
                          <div>
                            <strong>Phần giới thiệu chưa hoàn chỉnh</strong>
                            <div className={styles.missingFieldList}>
                              {missingAboutFields.map((field) => (
                                <span key={field} className={styles.missingFieldChip}>
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isEditMode && (
                            <button
                              type="button"
                              className={styles.emptyStateSecondaryAction}
                              onClick={() => setIsAboutModalOpen(true)}
                            >
                              Bổ sung
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Academic Credentials Section */}
              <div className={styles.sectionCard} data-tour="profile-credentials">
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Bằng cấp & Chứng chỉ</h2>
                  {isEditMode && formData.credentials.length > 0 && (
                    <button
                      className={styles.editIconBtn}
                      onClick={() => {
                        setEditingCredential(null);
                        setIsCredentialModalOpen(true);
                      }}
                      title="Thêm mới"
                      aria-label="Thêm mới bằng cấp hoặc chứng chỉ"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>

                {/* Credentials List */}
                <div
                  className={`${styles.credentialsList} ${formData.credentials.length === 0 ? styles.credentialsListEmpty : ''}`}
                >
                  {formData.credentials.length === 0 ? (
                    <ProfileEmptyState
                      icon={<Award size={28} strokeWidth={1.8} />}
                      eyebrow="Chưa có minh chứng chuyên môn"
                      title="Xây dựng hồ sơ đáng tin cậy"
                      actionLabel={isEditMode ? 'Thêm bằng cấp, chứng chỉ' : undefined}
                      onAction={
                        isEditMode
                          ? () => {
                              setEditingCredential(null);
                              setIsCredentialModalOpen(true);
                            }
                          : undefined
                      }
                    />
                  ) : (
                    formData.credentials.map((credential) => (
                      <div key={credential.id} className={styles.credentialItem}>
                        <CertificateThumbnail
                          key={credential.certificateUrl || 'no-certificate-image'}
                          url={credential.certificateUrl}
                          thumbnailUrl={credential.thumbnailUrl}
                          name={credential.name}
                          onPreview={setCertificatePreview}
                        />
                        <div className={styles.credentialInfo}>
                          <h4 className={styles.credentialTitle}>{credential.name}</h4>
                          <p className={styles.credentialInstitution}>{credential.institution}</p>
                          <div className={styles.credentialMeta}>
                            {credential.certificateType && (
                              <span className={styles.credentialType}>{credential.certificateType.toUpperCase()}</span>
                            )}
                            {credential.issueYear && (
                              <span className={styles.credentialDate}>Năm {credential.issueYear}</span>
                            )}
                            <span className={`${styles.verificationBadge} ${styles[credential.verificationStatus]}`}>
                              {credential.verificationStatus === 'verified'
                                ? 'Đã xác minh'
                                : credential.verificationStatus === 'pending'
                                  ? 'Đang chờ duyệt'
                                  : 'Bị từ chối'}
                            </span>
                          </div>
                          {/* Show verification note if exists */}
                          {credential.verificationNote && (
                            <p className={styles.credentialNote}>
                              <strong>Ghi chú:</strong> {credential.verificationNote}
                            </p>
                          )}
                        </div>
                        {isEditMode && (
                          <div className={styles.credentialActions}>
                            <button
                              className={styles.editCredentialBtn}
                              onClick={() => handleEditCredential(credential)}
                              title="Chỉnh sửa chứng chỉ"
                              aria-label={`Chỉnh sửa ${credential.name}`}
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
                                loading: deletingCredentialId === credential.id,
                              }}
                              placement="left"
                            >
                              <button
                                className={styles.deleteCredentialBtn}
                                onClick={(e) => e.stopPropagation()}
                                title="Xóa chứng chỉ"
                                aria-label={`Xóa ${credential.name}`}
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
                    <button className={styles.editBtnSmall} onClick={() => setIsIdentityModalOpen(true)}>
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
                          <span>Đã lấy thông tin</span>
                        </div>
                        <p className={styles.identityVerifiedText}>Đã lấy thông tin CCCD của bạn thành công.</p>

                        {/* Đã quét nhưng gia sư chưa đồng ý ghi vào hồ sơ — nhắc lại lời mời
                            xác nhận, kể cả sau khi tải lại trang (cờ lấy từ verification progress). */}
                        {hasPendingCccdConfirm && (
                          <div className={styles.identityConfirmPending} role="status">
                            <p>
                              Thông tin trên CCCD <strong>chưa được lưu vào hồ sơ</strong> của bạn.
                              Xem lại và xác nhận để cập nhật họ tên, ngày sinh, giới tính và địa chỉ thường trú.
                            </p>
                            <button
                              type="button"
                              className={styles.identityConfirmBtn}
                              onClick={() => setIsCccdConfirmOpen(true)}
                            >
                              Xem &amp; xác nhận
                            </button>
                          </div>
                        )}
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
                        <button className={styles.resubmitBtn} onClick={() => setIsIdentityModalOpen(true)}>
                          Gửi lại hồ sơ
                        </button>
                      </div>
                    )}
                    {formData.identityVerification.verificationStatus === 'not_submitted' && (
                      <div className={styles.identityNotSubmitted}>
                        <span className={styles.identityEmptyVisual}>
                          <ShieldCheck size={29} strokeWidth={1.8} />
                        </span>
                        <div className={styles.identityEmptyCopy}>
                          <span className={styles.identityEmptyEyebrow}>Chưa xác minh</span>
                          <h3>Chuẩn bị CCCD để xác minh</h3>
                          <p>Bạn cần tải lên ảnh rõ nét của cả hai mặt giấy tờ.</p>
                          <div className={styles.identityRequirements}>
                            <span>
                              <IdCard size={14} strokeWidth={2} />
                              Mặt trước và mặt sau
                            </span>
                            <span>JPG/PNG, tối đa 5MB</span>
                          </div>
                        </div>
                        <button className={styles.verifyNowBtn} onClick={() => setIsIdentityModalOpen(true)}>
                          <span>Bắt đầu xác minh</span>
                          <ArrowRight size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Chỉ hiện khi BE thực sự có ảnh (verify eKYC thành công ít nhất 1 lần) —
                      không suy luận từ verificationStatus vì đó là trạng thái duyệt hồ sơ khác. */}
                  {(myCccd?.frontImageUrl || myCccd?.backImageUrl) && (
                    <div className={styles.cccdViewActions}>
                      {myCccd.frontImageUrl && (
                        <button
                          type="button"
                          className={styles.editBtnSmall}
                          disabled={openingCccdSide !== null}
                          onClick={() => void handleViewCccd('front')}
                        >
                          <span>
                            {openingCccdSide === 'front' ? 'Đang mở…' : 'Xem CCCD mặt trước'}
                          </span>
                        </button>
                      )}
                      {myCccd.backImageUrl && (
                        <button
                          type="button"
                          className={styles.editBtnSmall}
                          disabled={openingCccdSide !== null}
                          onClick={() => void handleViewCccd('back')}
                        >
                          <span>
                            {openingCccdSide === 'back' ? 'Đang mở…' : 'Xem CCCD mặt sau'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className={styles.rightColumn}>
              {/* Card phải chỉ render ở chế độ xem trước (nút đặt/nhắn). */}
              {!isEditMode && (
                <div className={styles.pricingCard} data-tour="profile-pricing">
                  <button className={styles.bookTrialBtn} onClick={() => setIsBookingModalOpen(true)}>
                    Đặt buổi học thử
                  </button>
                  <button className={styles.sendMessageBtn}>
                    <MessageIcon />
                    <span>Gửi tin nhắn</span>
                  </button>
                </div>
              )}

              {/* Profile Completeness Card */}
              {isEditMode && (
                <ProfileCompleteness
                  profileData={formData}
                  profileStatus={profileStatus}
                  onSectionClick={handleCompletenessClick}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Giữ riêng bộ chuyển Xem trước/Chỉnh sửa, không còn thanh sticky bao quanh. */}
      <div className={styles.editBarLeft} data-tour="profile-editbar">
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

      {/* Modals */}
      <Modal
        open={Boolean(certificatePreview)}
        onCancel={() =>
          setCertificatePreview((prev) => {
            // Ảnh CCCD dùng blob URL — phải giải phóng, ảnh chứng chỉ là URL thường nên bỏ qua.
            releaseProtectedImage(prev?.imageUrl);
            return null;
          })
        }
        footer={null}
        centered
        width={1000}
        title={certificatePreview?.name}
        className={styles.certificatePreviewModal}
      >
        {certificatePreview && (
          <div className={styles.certificatePreviewCanvas}>
            <img
              src={certificatePreview.imageUrl}
              alt={`Chứng chỉ ${certificatePreview.name}`}
              className={styles.certificatePreviewImage}
            />
          </div>
        )}
      </Modal>

      <ProfileHeroModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        onSave={async (data) => {
          // Chỉ lưu thông tin cơ bản (updateBasicInfo). Ảnh đại diện có modal riêng.
          const success = await saveBasicInfo({
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
          headline: formData.headline,
          teachingAreaCity: formData.teachingAreaCity,
          teachingAreaDistrict: formData.teachingAreaDistrict,
          teachingMode: formData.teachingMode,
        }}
      />

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={closeAvatarCropper}
        onSave={saveAvatar}
        imageSrc={avatarCropImageSrc}
        fileName={avatarCropFileName}
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
          degree: formData.degree,
          education: formData.education,
          gpaScale: formData.gpaScale,
          gpa: formData.gpa,
          experience: formData.experience,
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
          // Quét xong và có thông tin lệch với hồ sơ → mở ngay màn hình đối chiếu.
          // Không có gì lệch thì khỏi hỏi, đóng luôn cho gọn.
          if (data.requiresProfileConfirmation) {
            setIsCccdConfirmOpen(true);
          }
        }}
        initialData={formData.identityVerification}
        onRequestProfileConfirm={() => setIsCccdConfirmOpen(true)}
      />

      <CccdConfirmModal
        isOpen={isCccdConfirmOpen}
        onDismiss={() => setIsCccdConfirmOpen(false)}
        onConfirm={handleConfirmCccdProfile}
        isLoading={isConfirmingCccd}
        info={{
          identityNumber: identityData.idNumber,
          fullName: identityData.fullNameOnId,
          dateOfBirth: identityData.dateOfBirth,
          gender: identityData.gender,
          hometown: identityData.hometown,
          address: identityData.address,
        }}
        changes={identityData.pendingProfileChanges ?? []}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        availability={formData.availability}
        trialLessonPrice={formData.trialLessonPrice}
        onNavigateToSchedule={() => {
          setIsBookingModalOpen(false);
          navigate('/tutor-portal/onboarding');
        }}
      />
    </PageContainer>
  );
};

export default TutorPortalProfile;
