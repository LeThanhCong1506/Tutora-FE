// Validation utilities for Tutor Profile Form
// All error messages in Vietnamese

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

// Avatar validation
export const validateAvatar = (file: File | null): ValidationResult => {
    if (!file) {
        return { isValid: false, error: 'Vui lòng tải lên ảnh đại diện' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return { isValid: false, error: 'Kích thước ảnh không được vượt quá 5MB' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'Chỉ chấp nhận định dạng JPG hoặc PNG' };
    }

    return { isValid: true };
};

// Headline validation (10-200 chars)
export const validateHeadline = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập tiêu đề giới thiệu' };
    }

    if (value.length < 10) {
        return { isValid: false, error: 'Tiêu đề phải có ít nhất 10 ký tự' };
    }

    if (value.length > 200) {
        return { isValid: false, error: 'Tiêu đề không được vượt quá 200 ký tự' };
    }

    return { isValid: true };
};

// City validation
export const validateCity = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng chọn thành phố' };
    }
    return { isValid: true };
};

// District validation
export const validateDistrict = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng chọn quận/huyện' };
    }
    return { isValid: true };
};

// Teaching mode validation
export const validateTeachingMode = (value: string): ValidationResult => {
    // Support both old format (PascalCase) and new API format (lowercase)
    const validModes = ['Online', 'Offline', 'Hybrid', 'online', 'offline', 'hybrid', 'both'];
    if (!value || !validModes.includes(value)) {
        return { isValid: false, error: 'Vui lòng chọn hình thức dạy học' };
    }
    return { isValid: true };
};

// Subjects validation (1-5 items)
export const validateSubjects = (subjects: string[] | { subjectId: number; subjectName: string }[]): ValidationResult => {
    if (!subjects || subjects.length === 0) {
        return { isValid: false, error: 'Vui lòng chọn ít nhất 1 môn học' };
    }

    if (subjects.length > 5) {
        return { isValid: false, error: 'Chỉ được chọn tối đa 5 môn học' };
    }

    return { isValid: true };
};

// Grade levels validation
export const validateGradeLevels = (levels: number[]): ValidationResult => {
    if (!levels || levels.length === 0) {
        return { isValid: false, error: 'Vui lòng chọn ít nhất 1 cấp độ' };
    }
    return { isValid: true };
};

// Hourly rate validation (50,000 - 2,000,000 VND)
export const validateHourlyRate = (value: number | string): ValidationResult => {
    const numValue = typeof value === 'string' ? parseInt(value.replace(/[^\d]/g, ''), 10) : value;

    if (isNaN(numValue) || numValue <= 0) {
        return { isValid: false, error: 'Vui lòng nhập giá tiền theo giờ' };
    }

    if (numValue < 50000) {
        return { isValid: false, error: 'Giá tối thiểu là 50,000 VND' };
    }

    if (numValue > 2000000) {
        return { isValid: false, error: 'Giá tối đa là 2,000,000 VND' };
    }

    return { isValid: true };
};

// Trial lesson price validation (optional, must be < hourly rate)
export const validateTrialPrice = (trialPrice: number | null, hourlyRate: number): ValidationResult => {
    if (trialPrice === null || trialPrice === undefined) {
        return { isValid: true }; // Optional field
    }

    if (trialPrice < 0) {
        return { isValid: false, error: 'Giá buổi học thử không được âm' };
    }

    if (trialPrice >= hourlyRate) {
        return { isValid: false, error: 'Giá buổi học thử phải thấp hơn giá theo giờ' };
    }

    return { isValid: true };
};

// Bio validation (100-2000 chars)
export const validateBio = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập giới thiệu bản thân' };
    }

    if (value.length < 100) {
        return { isValid: false, error: 'Giới thiệu phải có ít nhất 100 ký tự' };
    }

    if (value.length > 2000) {
        return { isValid: false, error: 'Giới thiệu không được vượt quá 2000 ký tự' };
    }

    return { isValid: true };
};

// Education validation (1-255 chars)
export const validateEducation = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập thông tin học vấn' };
    }

    if (value.length > 255) {
        return { isValid: false, error: 'Thông tin học vấn không được vượt quá 255 ký tự' };
    }

    return { isValid: true };
};

// GPA validation
export const validateGPA = (gpa: number | null, scale: 4 | 10 | null): ValidationResult => {
    if (gpa === null || gpa === undefined) {
        return { isValid: true }; // Optional field
    }

    if (!scale) {
        return { isValid: false, error: 'Vui lòng chọn thang điểm trước' };
    }

    if (gpa < 0) {
        return { isValid: false, error: 'Điểm GPA không được âm' };
    }

    if (scale === 4 && gpa > 4) {
        return { isValid: false, error: 'Điểm GPA theo thang 4.0 không được vượt quá 4.0' };
    }

    if (scale === 10 && gpa > 10) {
        return { isValid: false, error: 'Điểm GPA theo thang 10 không được vượt quá 10.0' };
    }

    return { isValid: true };
};

// Experience validation (50-2000 chars)
export const validateExperience = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập kinh nghiệm giảng dạy' };
    }

    if (value.length < 50) {
        return { isValid: false, error: 'Kinh nghiệm phải có ít nhất 50 ký tự' };
    }

    if (value.length > 2000) {
        return { isValid: false, error: 'Kinh nghiệm không được vượt quá 2000 ký tự' };
    }

    return { isValid: true };
};

// Credential name validation (1-200 chars)
export const validateCredentialName = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập tên chứng chỉ' };
    }

    if (value.length > 200) {
        return { isValid: false, error: 'Tên chứng chỉ không được vượt quá 200 ký tự' };
    }

    return { isValid: true };
};

// Institution validation (1-200 chars)
export const validateInstitution = (value: string): ValidationResult => {
    if (!value || value.trim().length === 0) {
        return { isValid: false, error: 'Vui lòng nhập tên tổ chức cấp' };
    }

    if (value.length > 200) {
        return { isValid: false, error: 'Tên tổ chức không được vượt quá 200 ký tự' };
    }

    return { isValid: true };
};

// Issue year validation (1990-current)
export const validateIssueYear = (year: number | null): ValidationResult => {
    if (year === null || year === undefined) {
        return { isValid: true }; // Optional field
    }

    const currentYear = new Date().getFullYear();
    if (year < 1990 || year > currentYear) {
        return { isValid: false, error: `Năm cấp phải từ 1990 đến ${currentYear}` };
    }

    return { isValid: true };
};

// Certificate file validation (10MB, JPG/PNG/PDF)
export const validateCertificateFile = (file: File | null): ValidationResult => {
    if (!file) {
        return { isValid: false, error: 'Vui lòng tải lên file chứng chỉ' };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return { isValid: false, error: 'Kích thước file không được vượt quá 10MB' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'Chỉ chấp nhận định dạng JPG, PNG hoặc PDF' };
    }

    return { isValid: true };
};

// Video URL validation (YouTube/Vimeo)
export const validateVideoUrl = (url: string | null): ValidationResult => {
    if (!url || url.trim().length === 0) {
        return { isValid: true }; // Optional field
    }

    // YouTube patterns
    const youtubePatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/
    ];

    // Vimeo patterns
    const vimeoPatterns = [
        /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
        /^https?:\/\/player\.vimeo\.com\/video\/\d+/
    ];

    const isYouTube = youtubePatterns.some(pattern => pattern.test(url));
    const isVimeo = vimeoPatterns.some(pattern => pattern.test(url));

    if (!isYouTube && !isVimeo) {
        return { isValid: false, error: 'Vui lòng nhập URL YouTube hoặc Vimeo hợp lệ' };
    }

    return { isValid: true };
};

// Availability slots validation (3-50 slots)
export const validateAvailability = (slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): ValidationResult => {
    if (!slots || slots.length < 3) {
        return { isValid: false, error: 'Vui lòng thêm ít nhất 3 khung giờ dạy' };
    }

    if (slots.length > 50) {
        return { isValid: false, error: 'Chỉ được phép tối đa 50 khung giờ' };
    }

    return { isValid: true };
};

// Custom tags validation
export const validateCustomTags = (tags: string[]): ValidationResult => {
    if (!tags) {
        return { isValid: true }; // Optional field
    }

    if (tags.length > 10) {
        return { isValid: false, error: 'Chỉ được thêm tối đa 10 thẻ tùy chỉnh' };
    }

    for (const tag of tags) {
        if (tag.length > 50) {
            return { isValid: false, error: 'Mỗi thẻ không được vượt quá 50 ký tự' };
        }
    }

    return { isValid: true };
};

// Helper: Extract YouTube video ID
export const extractYouTubeId = (url: string): string | null => {
    const patterns = [
        /youtube\.com\/watch\?v=([\w-]+)/,
        /youtube\.com\/embed\/([\w-]+)/,
        /youtu\.be\/([\w-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
};

// Helper: Extract Vimeo video ID
export const extractVimeoId = (url: string): string | null => {
    const patterns = [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
};

// Helper: Format currency (VND)
export const formatVND = (value: number): string => {
    return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
};

// Helper: Parse VND string to number
export const parseVND = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
};
