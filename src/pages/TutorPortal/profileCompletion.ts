export interface ProfileCompletionData {
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
        completed: profileData.credentials.length >= 1,
    },
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
