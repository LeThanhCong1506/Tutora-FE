export interface ProfileCompletionData {
    avatarUrl: string;
    headline: string;
    teachingAreaCity: string;
    teachingAreaDistrict: string;
    videoIntroUrl: string | null;
    bio: string;
    /** KHÔNG tính vào tiến trình gửi hồ sơ — Admin duyệt riêng từng chứng chỉ,
     *  chỉ chứng chỉ đã duyệt mới hiển thị trên marketplace. */
    credentials: Array<{ id: string | number; verificationStatus?: 'pending' | 'verified' | 'rejected' }>;
    availability: Array<{ dayOfWeek: number }>;
    identityVerification: {
        verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
    };
}

export interface ProfileCompletionItem {
    key: string;
    label: string;
    completed: boolean;
}

export const getProfileCompletionItems = (profileData: ProfileCompletionData): ProfileCompletionItem[] => [
    {
        key: 'avatar',
        label: 'Ảnh đại diện',
        completed: !!profileData.avatarUrl,
    },
    {
        key: 'basicInfo',
        label: 'Thông tin cơ bản',
        completed:
            !!profileData.headline &&
            profileData.headline.length >= 10 &&
            !!profileData.teachingAreaCity &&
            !!profileData.teachingAreaDistrict,
    },
    // 'video' không còn nằm trong checklist bắt buộc: backend không chặn gửi hồ sơ
    // hay hiển thị marketplace nếu thiếu video (xem TutorService.GetProfileCompletionAsync).
    // Hiển thị riêng trong ProfileCompleteness dưới dạng mục "Khuyến khích".
    {
        key: 'about',
        label: 'Giới thiệu bản thân',
        completed: !!(profileData.bio && profileData.bio.length >= 100),
    },
    // 'credentials' không còn nằm trong checklist: chứng chỉ được Admin duyệt riêng
    // (xem khối riêng trong ProfileCompleteness), không chặn việc gửi hồ sơ.
    {
        key: 'identity',
        label: 'Xác minh danh tính',
        completed: profileData.identityVerification.verificationStatus === 'verified',
    },
    {
        key: 'schedule',
        label: 'Lịch dạy (3+ khung giờ)',
        completed: profileData.availability.length >= 3,
    },
];
