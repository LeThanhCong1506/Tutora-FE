// Certificate Types Data for Tutor Verification
// Contains all accepted certificate types for tutors

export interface CertificateType {
    value: string;
    label: string;
    category: 'education' | 'language' | 'teaching' | 'professional' | 'other';
}

// Education & Academic Certificates
const EDUCATION_CERTIFICATES: CertificateType[] = [
    { value: 'bachelor_degree', label: 'Bằng Cử nhân', category: 'education' },
    { value: 'master_degree', label: 'Bằng Thạc sĩ', category: 'education' },
    { value: 'doctoral_degree', label: 'Bằng Tiến sĩ', category: 'education' },
    { value: 'associate_degree', label: 'Bằng Cao đẳng', category: 'education' },
    { value: 'high_school_diploma', label: 'Bằng Tốt nghiệp THPT', category: 'education' },
    { value: 'university_transcript', label: 'Bảng điểm Đại học', category: 'education' },
    { value: 'graduation_certificate', label: 'Giấy chứng nhận Tốt nghiệp', category: 'education' },
];

// Language Certificates
const LANGUAGE_CERTIFICATES: CertificateType[] = [
    // English
    { value: 'ielts', label: 'IELTS', category: 'language' },
    { value: 'toefl', label: 'TOEFL', category: 'language' },
    { value: 'toeic', label: 'TOEIC', category: 'language' },
    { value: 'cambridge_cpe', label: 'Cambridge CPE (C2)', category: 'language' },
    { value: 'cambridge_cae', label: 'Cambridge CAE (C1)', category: 'language' },
    { value: 'cambridge_fce', label: 'Cambridge FCE (B2)', category: 'language' },
    { value: 'cambridge_pet', label: 'Cambridge PET (B1)', category: 'language' },
    { value: 'cambridge_ket', label: 'Cambridge KET (A2)', category: 'language' },
    { value: 'aptis', label: 'APTIS', category: 'language' },
    { value: 'vstep', label: 'VSTEP', category: 'language' },
    // Chinese
    { value: 'hsk', label: 'HSK (Tiếng Trung)', category: 'language' },
    { value: 'hskk', label: 'HSKK (Nói Tiếng Trung)', category: 'language' },
    // Japanese
    { value: 'jlpt', label: 'JLPT (Tiếng Nhật)', category: 'language' },
    { value: 'nat_test', label: 'NAT-TEST (Tiếng Nhật)', category: 'language' },
    // Korean
    { value: 'topik', label: 'TOPIK (Tiếng Hàn)', category: 'language' },
    // French
    { value: 'delf', label: 'DELF (Tiếng Pháp)', category: 'language' },
    { value: 'dalf', label: 'DALF (Tiếng Pháp)', category: 'language' },
    { value: 'tcf', label: 'TCF (Tiếng Pháp)', category: 'language' },
    // German
    { value: 'goethe', label: 'Goethe-Zertifikat (Tiếng Đức)', category: 'language' },
    { value: 'testdaf', label: 'TestDaF (Tiếng Đức)', category: 'language' },
    // Spanish
    { value: 'dele', label: 'DELE (Tiếng Tây Ban Nha)', category: 'language' },
    // Other
    { value: 'other_language', label: 'Chứng chỉ Ngoại ngữ khác', category: 'language' },
];

// Teaching Certificates
const TEACHING_CERTIFICATES: CertificateType[] = [
    { value: 'tesol', label: 'TESOL', category: 'teaching' },
    { value: 'tefl', label: 'TEFL', category: 'teaching' },
    { value: 'celta', label: 'CELTA', category: 'teaching' },
    { value: 'delta', label: 'DELTA', category: 'teaching' },
    { value: 'teaching_license', label: 'Chứng chỉ Nghiệp vụ Sư phạm', category: 'teaching' },
    { value: 'teacher_certificate', label: 'Giấy phép Giảng dạy', category: 'teaching' },
    { value: 'tutoring_certificate', label: 'Chứng chỉ Gia sư', category: 'teaching' },
];

// Professional & IT Certificates
const PROFESSIONAL_CERTIFICATES: CertificateType[] = [
    // IT & Programming
    { value: 'aws_certified', label: 'AWS Certified', category: 'professional' },
    { value: 'google_certified', label: 'Google Certified', category: 'professional' },
    { value: 'microsoft_certified', label: 'Microsoft Certified', category: 'professional' },
    { value: 'cisco_ccna', label: 'Cisco CCNA', category: 'professional' },
    { value: 'comptia', label: 'CompTIA', category: 'professional' },
    // Online Courses
    { value: 'coursera', label: 'Coursera Certificate', category: 'professional' },
    { value: 'udemy', label: 'Udemy Certificate', category: 'professional' },
    { value: 'edx', label: 'edX Certificate', category: 'professional' },
    { value: 'linkedin_learning', label: 'LinkedIn Learning', category: 'professional' },
    // Music & Arts
    { value: 'abrsm', label: 'ABRSM (Âm nhạc)', category: 'professional' },
    { value: 'trinity_music', label: 'Trinity College (Âm nhạc)', category: 'professional' },
    // Other Professional
    { value: 'cpa', label: 'CPA (Kế toán)', category: 'professional' },
    { value: 'cfa', label: 'CFA (Tài chính)', category: 'professional' },
    { value: 'pmp', label: 'PMP (Quản lý dự án)', category: 'professional' },
    { value: 'scrum_master', label: 'Scrum Master', category: 'professional' },
];

// Other Certificates
const OTHER_CERTIFICATES: CertificateType[] = [
    { value: 'award', label: 'Giải thưởng / Bằng khen', category: 'other' },
    { value: 'competition_certificate', label: 'Chứng nhận Cuộc thi', category: 'other' },
    { value: 'training_certificate', label: 'Chứng nhận Đào tạo', category: 'other' },
    { value: 'workshop_certificate', label: 'Chứng nhận Workshop', category: 'other' },
    { value: 'other', label: 'Chứng chỉ khác', category: 'other' },
];

// Combined list of all certificate types
export const CERTIFICATE_TYPES: CertificateType[] = [
    ...EDUCATION_CERTIFICATES,
    ...LANGUAGE_CERTIFICATES,
    ...TEACHING_CERTIFICATES,
    ...PROFESSIONAL_CERTIFICATES,
    ...OTHER_CERTIFICATES,
];

// Grouped certificate types for organized display
export const CERTIFICATE_TYPES_GROUPED = {
    education: {
        label: 'Bằng cấp & Học vấn',
        items: EDUCATION_CERTIFICATES,
    },
    language: {
        label: 'Chứng chỉ Ngoại ngữ',
        items: LANGUAGE_CERTIFICATES,
    },
    teaching: {
        label: 'Chứng chỉ Giảng dạy',
        items: TEACHING_CERTIFICATES,
    },
    professional: {
        label: 'Chứng chỉ Chuyên môn',
        items: PROFESSIONAL_CERTIFICATES,
    },
    other: {
        label: 'Khác',
        items: OTHER_CERTIFICATES,
    },
};

// Helper function to search certificate types
export const searchCertificateTypes = (query: string): CertificateType[] => {
    if (!query.trim()) return CERTIFICATE_TYPES;

    const normalizedQuery = query.toLowerCase().trim();

    return CERTIFICATE_TYPES.filter(cert =>
        cert.label.toLowerCase().includes(normalizedQuery) ||
        cert.value.toLowerCase().includes(normalizedQuery)
    );
};

// Helper function to get certificate type by value
export const getCertificateTypeByValue = (value: string): CertificateType | undefined => {
    return CERTIFICATE_TYPES.find(cert => cert.value === value);
};

// Helper function to get certificate label by value
export const getCertificateLabel = (value: string): string => {
    const cert = getCertificateTypeByValue(value);
    return cert?.label || value;
};
