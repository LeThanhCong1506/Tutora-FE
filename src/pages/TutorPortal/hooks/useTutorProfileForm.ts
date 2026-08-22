import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
    getVerificationProgress,
    getProfileCompletion,
    getPricing,
    updateVideo,
    updateAvatar,
    updateBasicInfo,
    updateIntroduction,
    type VerificationSections,
    type BasicInfoUpdateData,
    type IntroductionUpdateData,
    type SubjectGradePriceItem,
    type TutorProfileStatus
} from '../../../services/tutorProfile.service';
import { getUserIdFromToken } from '../../../services/auth.service';
import { getMyAvailability, DAY_OF_WEEK_MAP } from '../../../services/availability.service';
import { getUserKYCData } from '../../../services/verification.service';
import type { AvailabilitySlot as ApiAvailabilitySlot } from '../../../services/availability.service';
import type { IdentityVerificationData } from '../components/IdentityVerificationModal';
import { matchProvinceFromCccdAddress } from '../utils/cccdAddress';

// Re-export for convenience
export type { IdentityVerificationData };

// Types
export interface SubjectSelection {
    subjectId: number;
    subjectName: string;
    gradeLevels: string[];  // Tên lớp thật từ BE, vd ['Lớp 10', 'Lớp 11', ...] — dùng để hiển thị.
    tags: string[];  // Tags for this subject (max 5, required)
}

export interface CredentialData {
    id: string;  // certificateId from API
    name: string;  // certificateName
    certificateType: string;  // certificateType (e.g., 'coursera', 'ielts', etc.)
    institution: string;  // issuingOrganization
    issueYear: number | null;  // yearIssued
    credentialId?: string | null;  // credentialId (optional)
    credentialUrl?: string | null;  // credentialUrl (optional)
    certificateUrl?: string;  // certificateFileUrl
    thumbnailUrl?: string | null;  // ảnh trang 1 (JPG) khi certificateUrl là PDF
    createdAt?: string;  // createdAt
    verificationStatus: 'pending' | 'verified' | 'rejected';  // mapped from API status
    verificationNote?: string | null;  // verificationNote (reason for rejection/pending)
}

export interface AvailabilitySlot {
    id: number;
    dayOfWeek: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday (same as API format)
    apiDayOfWeek: number;  // 0-6 (API format: 0=Sunday, 6=Saturday)
    startTime: string;
    endTime: string;
    dayName: string;  // "Chủ nhật", "Thứ 2", "Thứ 3", etc.
}

// Section status from API
export type SectionStatus = 'in_progress' | 'updated';

export interface SectionStatuses {
    video: SectionStatus;
    basicInfo: SectionStatus;
    introduction: SectionStatus;
    certificates: SectionStatus;
    identityCard: SectionStatus;
    pricing: SectionStatus;
}

export interface TutorProfileFormData {
    // Hero section (basicInfo)
    avatarUrl: string;
    avatarFile: File | null;
    fullName: string;
    headline: string;
    teachingAreaCity: string;
    teachingAreaDistrict: string;
    teachingMode: 'online' | 'offline' | 'both' | '';
    subjects: SubjectSelection[];  // Now includes tags per subject

    // Display only (not editable)
    averageRating: number;
    totalReviews: number;

    // Pricing
    hourlyRate: number;
    trialLessonPrice: number | null;
    allowPriceNegotiation: boolean;

    // About (introduction)
    bio: string;
    degree: string;
    education: string;
    gpaScale: 4 | 10 | null;
    gpa: number | null;
    experience: string;

    // Video
    videoIntroUrl: string | null;

    // Credentials (certificates)
    credentials: CredentialData[];

    // Schedule
    availability: AvailabilitySlot[];

    // Identity Verification (identityCard)
    identityVerification: IdentityVerificationData;
}

// Initial empty data
const initialFormData: TutorProfileFormData = {
    avatarUrl: '',
    avatarFile: null,
    fullName: '',
    headline: '',
    teachingAreaCity: '',
    teachingAreaDistrict: '',
    teachingMode: '',
    subjects: [],

    averageRating: 0,
    totalReviews: 0,

    hourlyRate: 0,
    trialLessonPrice: null,
    allowPriceNegotiation: false,

    bio: '',
    degree: '',
    education: '',
    gpaScale: null,
    gpa: null,
    experience: '',

    videoIntroUrl: null,

    credentials: [],

    availability: [],

    identityVerification: {
        idNumber: '',
        fullNameOnId: '',
        dateOfBirth: '',
        idFrontImage: null,
        idBackImage: null,
        verificationStatus: 'not_submitted'
    }
};

const initialSectionStatuses: SectionStatuses = {
    video: 'in_progress',
    basicInfo: 'in_progress',
    introduction: 'in_progress',
    certificates: 'in_progress',
    identityCard: 'in_progress',
    pricing: 'in_progress'
};

/**
 * Helper: Map teaching mode from API format to frontend format
 */
function mapTeachingModeFromApi(mode: string | null): 'online' | 'offline' | 'both' | '' {
    if (!mode) return '';
    const modeMap: Record<string, 'online' | 'offline' | 'both'> = {
        'online': 'online',
        'Online': 'online',
        'offline': 'offline',
        'Offline': 'offline',
        'both': 'both',
        'Both': 'both',
        'hybrid': 'both',
        'Hybrid': 'both'
    };
    return modeMap[mode] || '';
}

/**
 * Helper: Map teaching mode from frontend format to API format (PascalCase)
 */
function mapTeachingModeToApi(mode: 'online' | 'offline' | 'both' | ''): string {
    const modeMap: Record<string, string> = {
        'online': 'Online',
        'offline': 'Offline',
        'both': 'Both'
    };
    return modeMap[mode] || '';
}

/**
 * Map API response sections to form data
 */
function mapSectionsToFormData(sections: VerificationSections): Partial<TutorProfileFormData> {
    return {
        // Video section
        videoIntroUrl: sections.video.videoUrl,

        // Basic info section
        avatarUrl: sections.basicInfo.avatarUrl || '',
        headline: sections.basicInfo.headline || '',
        teachingAreaCity: sections.basicInfo.teachingAreaCity || '',
        teachingAreaDistrict: sections.basicInfo.teachingAreaDistrict || '',
        // Map teaching mode from API to frontend format
        teachingMode: mapTeachingModeFromApi(sections.basicInfo.teachingMode),
        // NOTE: subjects KHÔNG còn lấy từ basic-info nữa — môn & giá được suy từ
        // getPricing (xem mapPricingToForm + loadAll). Trang profile chỉ hiển thị read-only.

        // Introduction section
        bio: sections.introduction.bio || '',
        degree: sections.introduction.degree || '',
        education: sections.introduction.education || '',
        gpa: sections.introduction.gpa,
        gpaScale: sections.introduction.gpaScale as 4 | 10 | null,
        experience: sections.introduction.experience || '',

        // Certificates section - map from API response to local format
        credentials: sections.certificates.certificates.map(cert => {
            // Map API verificationStatus to local format
            let mappedStatus: 'pending' | 'verified' | 'rejected' = 'pending';
            if (cert.verificationStatus === 'verified') {
                mappedStatus = 'verified';
            } else if (cert.verificationStatus === 'rejected') {
                mappedStatus = 'rejected';
            } else if (cert.verificationStatus === 'pending_review') {
                mappedStatus = 'pending';
            }

            return {
                id: cert.certificateId,
                name: cert.certificateName,
                certificateType: cert.certificateType,
                institution: cert.issuingOrganization,
                issueYear: cert.yearIssued,
                credentialId: cert.credentialId,
                credentialUrl: cert.credentialUrl,
                certificateUrl: cert.certificateFileUrl,
                thumbnailUrl: cert.thumbnailUrl,
                createdAt: cert.createdAt,
                verificationStatus: mappedStatus,
                verificationNote: cert.verificationNote
            };
        }),

        // Identity card section is INTENTIONALLY OMITTED here.
        // identityVerification được xây ở mount useEffect (bước 3) bằng cách KẾT HỢP
        // progress.identityCard (trạng thái xác minh + URL ảnh — đáng tin) với eKYC
        // details từ /api/users/profile (số CCCD, tên, DOB…). Tách khỏi mapper này để
        // các lần refetch progress sau khi lưu (basic info / pricing…) KHÔNG vô tình
        // reset identity về rỗng.
        //
        // Pricing: model mới theo môn × lớp — lấy riêng qua getPricing (mapPricingToForm).
    };
}

/**
 * Suy `subjects` (read-only, gom theo môn) + danh sách giá chi tiết từ bảng pricing BE.
 * Đây là nguồn duy nhất cho phần Môn học & Giá hiển thị ở trang profile.
 */
function mapPricingToForm(items: SubjectGradePriceItem[]): {
    subjects: SubjectSelection[];
    pricingItems: SubjectGradePriceItem[];
} {
    const bySubject = new Map<number, SubjectSelection>();
    for (const it of items) {
        const cur =
            bySubject.get(it.subjectId) ??
            { subjectId: it.subjectId, subjectName: it.subjectName || '', gradeLevels: [], tags: [] };
        // Dùng tên lớp thật từ BE (vd "Lớp 9") để hiển thị — KHÔNG dùng gradeLevelId (khoá DB nội
        // bộ, không phải số lớp thật) như trước, gây hiển thị sai kiểu "Lớp 57".
        const gradeLabel = it.gradeLevelName;
        if (gradeLabel && !cur.gradeLevels.includes(gradeLabel)) cur.gradeLevels.push(gradeLabel);
        bySubject.set(it.subjectId, cur);
    }
    return { subjects: Array.from(bySubject.values()), pricingItems: items };
}

/**
 * Extract section statuses from API response
 */
function mapSectionStatuses(sections: VerificationSections): SectionStatuses {
    // LƯU Ý: BE đã BỎ `pricing` khỏi response verification/progress (giá giờ theo
    // môn×lớp, lấy riêng qua getPricing). Truy cập trực tiếp `sections.pricing.status`
    // sẽ ném TypeError (pricing === undefined) và làm crash cả loadAll TRƯỚC khi
    // setFormData → toàn bộ hồ sơ (kể cả avatar) hiển thị rỗng / 0 bước hoàn thành.
    // Dùng optional chaining + fallback để an toàn với mọi section có thể vắng mặt.
    return {
        video: sections.video?.status ?? 'in_progress',
        basicInfo: sections.basicInfo?.status ?? 'in_progress',
        introduction: sections.introduction?.status ?? 'in_progress',
        certificates: sections.certificates?.status ?? 'in_progress',
        identityCard: sections.identityCard?.status ?? 'in_progress',
        pricing: sections.pricing?.status ?? 'in_progress'
    };
}

export function useTutorProfileForm() {
    const [formData, setFormData] = useState<TutorProfileFormData>(initialFormData);
    const [savedData, setSavedData] = useState<TutorProfileFormData>(initialFormData);
    // Ảnh chụp formData mới nhất cho các luồng ASYNC (gợi ý khu vực dạy sau khi quét
    // CCCD) đọc được giá trị hiện tại mà không phải đưa formData vào deps của useCallback.
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);
    const [sectionStatuses, setSectionStatuses] = useState<SectionStatuses>(initialSectionStatuses);
    // Bảng giá theo môn × lớp (read-only) — hiển thị ở Pricing card, chỉnh sửa ở Onboarding.
    const [pricingItems, setPricingItems] = useState<SubjectGradePriceItem[]>([]);
    // Trạng thái tổng thể của hồ sơ (draft / pending_approval / active / rejected).
    // null khi chưa tải xong — dùng để hiển thị banner "đang chờ Admin duyệt".
    const [profileStatus, setProfileStatus] = useState<TutorProfileStatus | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isVideoSaving, setIsVideoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get user ID
    const userId = getUserIdFromToken();

    // Fetch initial data from API
    const fetchProgress = useCallback(async () => {
        if (!userId) {
            console.error('❌ Cannot fetch progress: userId not found');
            setError('User not authenticated');
            setIsInitialLoading(false);
            return;
        }

        try {
            setError(null);
            const response = await getVerificationProgress(userId);

            if (response.statusCode === 200 && response.content?.sections) {
                const mappedData = mapSectionsToFormData(response.content.sections);
                const statuses = mapSectionStatuses(response.content.sections);

                setFormData(prev => ({ ...prev, ...mappedData }));
                setSavedData(prev => ({ ...prev, ...mappedData }));
                setSectionStatuses(statuses);

                console.log('✅ Profile data loaded from API');
            }
        } catch (err: any) {
            console.error('❌ Failed to fetch progress:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load profile data';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsInitialLoading(false);
        }
    }, [userId]);

    // Fetch availability from API
    const fetchAvailabilityData = useCallback(async () => {
        try {
            const response = await getMyAvailability();

            if (response.content && Array.isArray(response.content)) {
                // Map API response to local format
                // API dayofweek: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
                const mappedAvailability: AvailabilitySlot[] = response.content.map((slot: ApiAvailabilitySlot) => {
                    return {
                        id: slot.availabilityid,
                        dayOfWeek: slot.dayofweek,  // Now same format: 0-6
                        apiDayOfWeek: slot.dayofweek,
                        startTime: slot.starttime,
                        endTime: slot.endtime,
                        dayName: DAY_OF_WEEK_MAP[slot.dayofweek] || ''
                    };
                });

                setFormData(prev => ({ ...prev, availability: mappedAvailability }));
                setSavedData(prev => ({ ...prev, availability: mappedAvailability }));
            }
        } catch (err: unknown) {
            // Don't show error if 404 (no availability yet)
            const axiosError = err as { response?: { status?: number } };
            if (axiosError.response?.status !== 404) {
                console.error('Failed to fetch availability:', err);
            }
        }
    }, []);

    // (Previously: a separate fetchUserKYCStatus useCallback fired its own
    // setState on resolve. Removed because it raced with fetchProgress over
    // the identityVerification field and contributed to the multi-step
    // animation of the profile-completeness bar. KYC is now fetched and
    // merged in the unified mount useEffect below.)

    // Load data on mount
    // Initial load — fetch all three sources in parallel but commit state
    // ONCE so the ProfileCompleteness progress bar animates a single time
    // from 0% to its final value, instead of stair-stepping up as each
    // request resolves. Also eliminates the identityVerification race
    // condition between getVerificationProgress and getUserKYCData.
    //
    // fetchProgress and fetchAvailabilityData (the useCallback fetchers
    // above) remain for ad-hoc refetches by consumers — fetchProgress is
    // exposed on the hook return so the page can refresh after certain
    // actions. They're just not used on mount anymore.
    useEffect(() => {
        if (!userId) {
            setError('User not authenticated');
            setIsInitialLoading(false);
            return;
        }

        let cancelled = false;

        const loadAll = async () => {
            try {
                setError(null);

                const [progressR, availR, kycR, pricingR, completionR] = await Promise.allSettled([
                    getVerificationProgress(userId),
                    getMyAvailability(),
                    getUserKYCData(),
                    getPricing(userId),
                    getProfileCompletion(userId),
                ]);

                if (cancelled) return;

                // Build the merged update incrementally.
                let mergedForm: Partial<TutorProfileFormData> = {};
                let mergedStatuses: SectionStatuses | null = null;
                // identityCard từ progress là nguồn ĐÁNG TIN cho trạng thái xác minh +
                // URL ảnh CCCD. (Endpoint /users/profile hiện trả UserResponse KHÔNG có
                // các trường KYC — isidentityverified / idcardfronturl / idcardbackurl —
                // nên KHÔNG dùng riêng KYC để quyết định đã xác minh hay chưa.)
                let identitySection: VerificationSections['identityCard'] | null = null;

                // 1) Verification progress — basicInfo / video / introduction /
                //    credentials / pricing. mapSectionsToFormData no longer
                //    returns identityVerification (xây riêng ở bước 3).
                if (progressR.status === 'fulfilled' &&
                    progressR.value.statusCode === 200 &&
                    progressR.value.content?.sections) {
                    const sections = progressR.value.content.sections;
                    mergedForm = { ...mergedForm, ...mapSectionsToFormData(sections) };
                    mergedStatuses = mapSectionStatuses(sections);
                    identitySection = sections.identityCard;
                }

                // 2) Availability slots
                if (availR.status === 'fulfilled' &&
                    availR.value.content &&
                    Array.isArray(availR.value.content)) {
                    mergedForm.availability = availR.value.content.map((slot: ApiAvailabilitySlot) => ({
                        id: slot.availabilityid,
                        dayOfWeek: slot.dayofweek,
                        apiDayOfWeek: slot.dayofweek,
                        startTime: slot.starttime,
                        endTime: slot.endtime,
                        dayName: DAY_OF_WEEK_MAP[slot.dayofweek] || ''
                    }));
                }

                // 3) Identity — kết hợp 2 nguồn:
                //    • progress.identityCard: trạng thái xác minh (isVerified) + URL ảnh — ĐÁNG TIN.
                //    • KYC (/users/profile): chi tiết eKYC (số CCCD, tên, ngày sinh…) + fullName — DÙNG NẾU CÓ.
                //    Quyết định "đã xác minh" ưu tiên progress, fallback KYC, để FE không bắt
                //    xác minh lại khi gia sư đã verified nhưng KYC trả thiếu trường.
                {
                    const kycData = kycR.status === 'fulfilled' ? kycR.value : null;
                    if (kycData?.fullName) {
                        mergedForm.fullName = kycData.fullName;
                    }

                    if (identitySection || kycData) {
                        const ekyc = kycData?.ekycData ?? null;
                        const frontUrl = identitySection?.frontImageUrl ?? kycData?.idCardFrontUrl ?? null;
                        const backUrl = identitySection?.backImageUrl ?? kycData?.idCardBackUrl ?? null;
                        const isVerified = (identitySection?.isVerified ?? false) || (kycData?.isIdentityVerified ?? false);

                        mergedForm.identityVerification = {
                            idNumber: ekyc?.id || '',
                            fullNameOnId: ekyc?.name || '',
                            dateOfBirth: ekyc?.dob || '',
                            address: ekyc?.address || '',
                            hometown: ekyc?.home || '',
                            gender: ekyc?.sex || '',
                            idFrontImage: null,
                            idFrontImageUrl: frontUrl || undefined,
                            idBackImage: null,
                            idBackImageUrl: backUrl || undefined,
                            verificationStatus: isVerified
                                ? 'verified'
                                : (frontUrl && backUrl) ? 'pending' : 'not_submitted',
                        };
                        if (isVerified && mergedStatuses) {
                            mergedStatuses = { ...mergedStatuses, identityCard: 'updated' };
                        }
                    }
                }

                // 4) Pricing — môn (read-only) + bảng giá chi tiết theo môn × lớp.
                if (pricingR.status === 'fulfilled') {
                    const { subjects, pricingItems: items } = mapPricingToForm(
                        pricingR.value.content?.subjectGradePrices ?? [],
                    );
                    mergedForm.subjects = subjects;
                    setPricingItems(items);
                } else {
                    // 404 = chưa thiết lập giá (gia sư mới) — bỏ qua im lặng.
                    const reason = pricingR.reason as { response?: { status?: number } };
                    if (reason?.response?.status !== 404) {
                        console.error('Failed to fetch pricing:', pricingR.reason);
                    }
                }

                // 5) Trạng thái tổng thể hồ sơ — quyết định banner "đang chờ Admin duyệt".
                //    Lỗi (kể cả 404 hồ sơ mới) → giữ null, không hiển thị banner.
                if (completionR.status === 'fulfilled' && completionR.value.content) {
                    setProfileStatus(completionR.value.content.profileStatus ?? null);
                } else if (completionR.status === 'rejected') {
                    console.error('Failed to fetch profile completion:', completionR.reason);
                }

                if (cancelled) return;

                // Single commit — one re-render, one progress-bar animation.
                setFormData(prev => ({ ...prev, ...mergedForm }));
                setSavedData(prev => ({ ...prev, ...mergedForm }));
                if (mergedStatuses) {
                    setSectionStatuses(mergedStatuses);
                }

                // Surface a non-blocking warning if progress (the most important
                // source) failed — the page is still partially usable.
                if (progressR.status === 'rejected') {
                    console.error('Failed to fetch verification progress:', progressR.reason);
                    const reason = progressR.reason as { response?: { data?: { message?: string } }; message?: string };
                    const message = reason?.response?.data?.message || reason?.message || 'Failed to load profile data';
                    setError(message);
                    toast.error(message);
                }
                if (availR.status === 'rejected') {
                    // 404 = "no availability yet" is normal for new tutors; ignore.
                    const reason = availR.reason as { response?: { status?: number } };
                    if (reason?.response?.status !== 404) {
                        console.error('Failed to fetch availability:', availR.reason);
                    }
                }
                if (kycR.status === 'rejected') {
                    console.error('Failed to fetch KYC status:', kycR.reason);
                }
            } finally {
                if (!cancelled) {
                    setIsInitialLoading(false);
                }
            }
        };

        loadAll();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Check if form has unsaved changes
    const isDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(savedData);
    }, [formData, savedData]);

    // Update hero section
    const updateHeroSection = useCallback((data: Partial<TutorProfileFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    }, []);

    // Giá theo môn × lớp đã chuyển sang trang Onboarding (model SubjectGradePrices).
    // Profile chỉ hiển thị read-only — không còn updatePricing tại đây.

    // Update about section (calls API)
    const updateAbout = useCallback(async (data: {
        bio: string;
        degree: string;
        education: string;
        gpaScale: 4 | 10 | null;
        gpa: number | null;
        experience: string;
    }): Promise<boolean> => {
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('📝 Saving introduction...');

            const apiData: IntroductionUpdateData = {
                bio: data.bio,
                degree: data.degree,
                education: data.education,
                gpa: data.gpa,
                gpaScale: data.gpaScale,
                experience: data.experience
            };

            const response = await updateIntroduction(userId, apiData);

            if (response.statusCode === 200) {
                toast.success(response.message || 'Cập nhật giới thiệu thành công!');

                // Hồ sơ đã active → BE chỉ lưu tạm chờ Admin duyệt, CHƯA áp dụng vào DB thật.
                // Không refetch progress ở đây: dữ liệu trên server vẫn là bản CŨ, refetch sẽ
                // ghi đè form về giá trị cũ ngay sau khi vừa "lưu" — trông như vừa nhập bị mất.
                const pendingApproval = (response.content as { pendingApproval?: boolean } | null)?.pendingApproval === true;
                if (pendingApproval) {
                    setLastSaved(new Date());
                    return true;
                }

                // Refetch progress to get updated data
                const progressResponse = await getVerificationProgress(userId);

                if (progressResponse.statusCode === 200 && progressResponse.content?.sections) {
                    const mappedData = mapSectionsToFormData(progressResponse.content.sections);
                    const statuses = mapSectionStatuses(progressResponse.content.sections);

                    setFormData(prev => ({ ...prev, ...mappedData }));
                    setSavedData(prev => ({ ...prev, ...mappedData }));
                    setSectionStatuses(statuses);
                    setLastSaved(new Date());
                }

                return true;
            } else {
                toast.error(response.message || 'Không thể cập nhật giới thiệu');
                return false;
            }
        } catch (err: any) {
            console.error('❌ Error saving introduction:', err);
            const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật giới thiệu';
            setError(errorMessage);
            toast.error(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Lưu link YouTube video giới thiệu qua API (BE: { videoUrl }).
    // Trả về URL đã lưu nếu thành công, null nếu thất bại.
    const saveVideoUrl = useCallback(async (videoUrl: string): Promise<string | null> => {
        if (!userId) {
            console.error('❌ Cannot save video: userId not found');
            return null;
        }

        setIsVideoSaving(true);
        setError(null);

        try {
            const response = await updateVideo(userId, videoUrl);

            if (response.statusCode === 200) {
                console.log('✅ Video URL saved successfully');
                toast.success(response.message || 'Cập nhật video giới thiệu thành công!');

                // Refetch progress để lấy URL + trạng thái section mới nhất từ BE.
                const progressResponse = await getVerificationProgress(userId);

                if (progressResponse.statusCode === 200 && progressResponse.content?.sections) {
                    const newUrl = progressResponse.content.sections.video.videoUrl;
                    const statuses = mapSectionStatuses(progressResponse.content.sections);

                    setFormData(prev => ({ ...prev, videoIntroUrl: newUrl }));
                    setSavedData(prev => ({ ...prev, videoIntroUrl: newUrl }));
                    setSectionStatuses(statuses);
                    setLastSaved(new Date());

                    return newUrl ?? videoUrl;
                }

                // BE trả 200 nhưng progress không có sections → vẫn coi như đã lưu URL vừa nhập.
                setFormData(prev => ({ ...prev, videoIntroUrl: videoUrl }));
                setSavedData(prev => ({ ...prev, videoIntroUrl: videoUrl }));
                setLastSaved(new Date());
                return videoUrl;
            }

            toast.error(response.message || 'Không thể cập nhật video');
            return null;
        } catch (err: any) {
            console.error('❌ Error saving video:', err);
            const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật video';
            setError(errorMessage);
            toast.error(errorMessage);
            return null;
        } finally {
            setIsVideoSaving(false);
        }
    }, [userId]);

    // Update avatar only — gọi đúng 1 API (updateAvatar). Tách khỏi saveBasicInfo
    // để AvatarModal có trách nhiệm/endpoint riêng.
    const saveAvatar = useCallback(async (file: File): Promise<boolean> => {
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const avatarResponse = await updateAvatar(userId, file);
            if (avatarResponse.statusCode !== 200) {
                toast.error(avatarResponse.message || 'Không thể tải lên ảnh đại diện');
                return false;
            }
            toast.success(avatarResponse.message || 'Cập nhật ảnh đại diện thành công!');

            // Cập nhật avatarUrl NGAY, KHÔNG phụ thuộc refetch progress (vốn có thể
            // lỗi/chậm). Endpoint upload avatar của tutor hiện chỉ trả message — nếu
            // sau này BE trả về URL thì ưu tiên dùng; nếu chưa, dùng ảnh vừa upload
            // (object URL) để hiển thị tạm. Nhờ vậy thanh tiến trình + ô "Thông tin
            // cơ bản" + header đều phản ánh ảnh mới ngay lập tức.
            const serverAvatarUrl = (avatarResponse.content as { avatarUrl?: string } | null)?.avatarUrl;
            const immediateAvatarUrl = serverAvatarUrl || URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, avatarUrl: immediateAvatarUrl }));
            setSavedData(prev => ({ ...prev, avatarUrl: immediateAvatarUrl }));
            setLastSaved(new Date());
            window.dispatchEvent(new CustomEvent('avatar-updated', { detail: immediateAvatarUrl }));

            // Best-effort: lấy URL chuẩn từ server để thay ảnh tạm. Bọc try/catch
            // RIÊNG: refetch lỗi cũng KHÔNG báo "cập nhật thất bại" (ảnh đã lưu) —
            // tránh hiện đồng thời cả toast success lẫn error cho cùng một thao tác.
            try {
                const progressResponse = await getVerificationProgress(userId);
                if (progressResponse.statusCode === 200 && progressResponse.content?.sections) {
                    const mappedData = mapSectionsToFormData(progressResponse.content.sections);
                    const statuses = mapSectionStatuses(progressResponse.content.sections);
                    setFormData(prev => ({ ...prev, ...mappedData }));
                    setSavedData(prev => ({ ...prev, ...mappedData }));
                    setSectionStatuses(statuses);

                    // Đồng bộ avatar lên header (PortalLayout lắng nghe sự kiện này).
                    if (mappedData.avatarUrl) {
                        window.dispatchEvent(new CustomEvent('avatar-updated', { detail: mappedData.avatarUrl }));
                    }
                }
            } catch (refetchErr) {
                console.error('⚠️ Avatar đã upload nhưng refetch progress lỗi:', refetchErr);
            }
            return true;
        } catch (err: any) {
            console.error('❌ Error saving avatar:', err);
            const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện';
            setError(errorMessage);
            toast.error(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Save basic info to API (chỉ gọi updateBasicInfo — avatar đã tách sang saveAvatar)
    const saveBasicInfo = useCallback(async (data: {
        headline: string;
        teachingAreaCity: string;
        teachingAreaDistrict: string;
        teachingMode: 'online' | 'offline' | 'both' | '';
    }): Promise<boolean> => {
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return false;
        }

        if (!data.teachingMode) {
            toast.error('Vui lòng chọn hình thức dạy học');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('📝 Saving basic info...');

            const apiData: BasicInfoUpdateData = {
                headline: data.headline,
                teachingAreaCity: data.teachingAreaCity,
                teachingAreaDistrict: data.teachingAreaDistrict,
                teachingMode: mapTeachingModeToApi(data.teachingMode),
            };

            const response = await updateBasicInfo(userId, apiData);

            if (response.statusCode === 200) {
                toast.success(response.message || 'Cập nhật thông tin thành công!');

                // Hồ sơ đã active → BE chỉ lưu tạm chờ Admin duyệt, CHƯA áp dụng vào DB thật.
                // Không refetch progress ở đây: dữ liệu trên server vẫn là bản CŨ, refetch sẽ
                // ghi đè form về giá trị cũ ngay sau khi vừa "lưu" — trông như vừa nhập bị mất.
                const pendingApproval = (response.content as { pendingApproval?: boolean } | null)?.pendingApproval === true;
                if (pendingApproval) {
                    setLastSaved(new Date());
                    return true;
                }

                // Refetch progress to get updated data
                const progressResponse = await getVerificationProgress(userId);

                if (progressResponse.statusCode === 200 && progressResponse.content?.sections) {
                    const mappedData = mapSectionsToFormData(progressResponse.content.sections);
                    const statuses = mapSectionStatuses(progressResponse.content.sections);

                    setFormData(prev => ({ ...prev, ...mappedData }));
                    setSavedData(prev => ({ ...prev, ...mappedData }));
                    setSectionStatuses(statuses);
                    setLastSaved(new Date());
                }

                return true;
            } else {
                toast.error(response.message || 'Không thể cập nhật thông tin');
                return false;
            }
        } catch (err: any) {
            console.error('❌ Error saving basic info:', err);
            const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin';
            setError(errorMessage);
            toast.error(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Add credential (id is now string from API)
    const addCredential = useCallback((credential: CredentialData) => {
        setFormData(prev => ({
            ...prev,
            credentials: [...prev.credentials, credential]
        }));
    }, []);

    // Update credential
    const updateCredential = useCallback((id: string, data: Partial<CredentialData>) => {
        setFormData(prev => ({
            ...prev,
            credentials: prev.credentials.map(c =>
                c.id === id ? { ...c, ...data } : c
            )
        }));
    }, []);

    // Remove credential
    const removeCredential = useCallback((id: string) => {
        setFormData(prev => ({
            ...prev,
            credentials: prev.credentials.filter(c => c.id !== id)
        }));
    }, []);

    // Add availability slot
    const addAvailabilitySlot = useCallback((slot: Omit<AvailabilitySlot, 'id'>) => {
        const newId = Math.max(0, ...formData.availability.map(s => s.id)) + 1;
        setFormData(prev => ({
            ...prev,
            availability: [...prev.availability, { ...slot, id: newId }]
        }));
    }, [formData.availability]);

    // Remove availability slot
    const removeAvailabilitySlot = useCallback((id: number) => {
        setFormData(prev => ({
            ...prev,
            availability: prev.availability.filter(s => s.id !== id)
        }));
    }, []);

    // Update identity verification
    const updateIdentityVerification = useCallback((data: IdentityVerificationData) => {
        const fullName = data.fullNameOnId || null;

        // Upload CCCD đã cập nhật user.Fullname ở BE. Cập nhật luôn state của hero để
        // người dùng thấy tên mới ngay, không phải tải lại trang hay chờ SignalR.
        setFormData(prev => ({
            ...prev,
            ...(fullName ? { fullName } : {}),
            identityVerification: data
        }));
        setSavedData(prev => ({
            ...prev,
            ...(fullName ? { fullName } : {}),
            identityVerification: data
        }));

        if (fullName) {
            window.dispatchEvent(new CustomEvent('profile-name-updated', { detail: fullName }));
        }

        // Gợi ý KHU VỰC DẠY từ tỉnh/thành trên CCCD — chỉ khi gia sư CHƯA chọn.
        // Thường trú và nơi dạy là 2 việc khác nhau (có thể ở Hà Nội mà dạy ở TP.HCM),
        // nên không bao giờ ghi đè lựa chọn sẵn có, và cũng không tự lưu lên BE:
        // giá trị chỉ được điền sẵn vào form để gia sư xác nhận ở "Thông tin cơ bản".
        void (async () => {
            if (formDataRef.current.teachingAreaCity) return;

            const province = await matchProvinceFromCccdAddress(data.address);
            if (!province || formDataRef.current.teachingAreaCity) return;

            setFormData(prev =>
                prev.teachingAreaCity ? prev : { ...prev, teachingAreaCity: province.name },
            );
            toast.info(
                `Đã gợi ý khu vực dạy "${province.name}" theo địa chỉ trên CCCD. ` +
                    'Mở "Thông tin cơ bản" để chọn phường/xã và lưu lại.',
            );
        })();
    }, []);

    // Save draft (TODO: implement with API when available)
    const saveDraft = useCallback(async () => {
        setIsLoading(true);
        // TODO: Call save draft API
        await new Promise(resolve => setTimeout(resolve, 500));
        setSavedData(formData);
        setLastSaved(new Date());
        setIsLoading(false);
    }, [formData]);

    // Publish changes (TODO: implement with API when available)
    const publishChanges = useCallback(async () => {
        setIsLoading(true);
        // TODO: Call publish API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSavedData(formData);
        setLastSaved(new Date());
        setIsLoading(false);
    }, [formData]);

    // Reset to saved state
    const resetChanges = useCallback(() => {
        setFormData(savedData);
    }, [savedData]);

    // Check if profile is complete enough to publish
    const canPublish = useMemo(() => {
        // All sections must be "updated"
        return Object.values(sectionStatuses).every(status => status === 'updated');
    }, [sectionStatuses]);

    return {
        formData,
        pricingItems,
        profileStatus,
        sectionStatuses,
        isDirty,
        isLoading,
        isInitialLoading,
        isVideoSaving,
        lastSaved,
        error,
        canPublish,
        fetchProgress,
        fetchAvailability: fetchAvailabilityData,
        updateHeroSection,
        updateAbout,
        saveVideoUrl,
        saveAvatar,
        saveBasicInfo,
        addCredential,
        updateCredential,
        removeCredential,
        addAvailabilitySlot,
        removeAvailabilitySlot,
        updateIdentityVerification,
        saveDraft,
        publishChanges,
        resetChanges
    };
}
