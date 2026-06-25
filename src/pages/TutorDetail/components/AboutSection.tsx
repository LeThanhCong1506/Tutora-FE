import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { formatTeachingMode, formatCity } from './utils';

const parseTags = (rawTags: unknown): string[] => {
    if (Array.isArray(rawTags)) return rawTags;
    if (typeof rawTags === 'string') {
        const trimmed = rawTags.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return trimmed.split(',').map((tag) => tag.trim()).filter(Boolean);
        }
    }
    return [];
};

const normalizeGradeLevelName = (grade: string): string => {
    const trimmed = grade.trim();
    if (!trimmed) return '';

    const gradeNumber = trimmed.match(/\d+/)?.[0];
    if (/^grade/i.test(trimmed) && gradeNumber) {
        return `Lớp ${gradeNumber}`;
    }

    return trimmed;
};

const sortGradeLevels = (grades: string[]): string[] =>
    Array.from(new Set(grades.map(normalizeGradeLevelName).filter(Boolean))).sort((a, b) => {
        const numA = Number(a.match(/\d+/)?.[0] ?? 0);
        const numB = Number(b.match(/\d+/)?.[0] ?? 0);
        return numA - numB;
    });

const formatGradeLevelRanges = (grades: string[]): string => {
    if (grades.length === 0) return '';

    const nums = grades
        .map((grade) => {
            const match = grade.match(/\d+/);
            return match ? Number(match[0]) : 0;
        })
        .filter((num) => num > 0)
        .sort((a, b) => a - b);

    if (nums.length === 0) return grades.filter(Boolean).join(', ');

    const ranges: string[] = [];
    let start = nums[0];
    let end = nums[0];

    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === end + 1) {
            end = nums[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = nums[i];
            end = nums[i];
        }
    }

    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `Lớp ${ranges.join(', ')}`;
};

const buildSubjectGroups = (profile: TutorFullProfile) => {
    const groups = new Map<string, { name: string; gradeLevels: Set<string> }>();
    const subjectNameById = new Map<number, string>();

    const ensureGroup = (subjectId: number | null | undefined, subjectName?: string | null) => {
        const name = (subjectName || '').trim() || 'Chưa rõ';
        const key = subjectId ? String(subjectId) : name.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, { name, gradeLevels: new Set<string>() });
        }

        const group = groups.get(key)!;
        if (group.name === 'Chưa rõ' && name !== 'Chưa rõ') {
            group.name = name;
        }

        return group;
    };

    (profile.subjects || []).forEach((subject) => {
        const subjectName = subject.subjectName || undefined;
        if (subjectName) subjectNameById.set(subject.subjectId, subjectName);

        const group = ensureGroup(subject.subjectId, subjectName);
        parseTags(subject.gradeLevels).forEach((grade) => {
            const normalized = normalizeGradeLevelName(grade);
            if (normalized) group.gradeLevels.add(normalized);
        });
    });

    (profile.subjectGradePrices || [])
        .filter((price) => price.isActive !== false)
        .forEach((price) => {
            const subjectName = price.subjectName || subjectNameById.get(price.subjectId);
            const group = ensureGroup(price.subjectId, subjectName);
            parseTags(price.gradeLevelName).forEach((grade) => {
                const normalized = normalizeGradeLevelName(grade);
                if (normalized) group.gradeLevels.add(normalized);
            });
        });

    return Array.from(groups.values()).map((group) => {
        const gradeLevels = sortGradeLevels(Array.from(group.gradeLevels));

        return {
            name: group.name,
            gradeLevels,
            gradeLabel: formatGradeLevelRanges(gradeLevels) || 'Chưa cập nhật lớp',
        };
    });
};

const AboutSection = ({ profile }: { profile: TutorFullProfile }) => {
    const subjectGroups = buildSubjectGroups(profile);
    const firstName = profile.fullName?.split(' ').pop();
    const rating = profile.averageRating || 0;
    const totalReviews = profile.totalFeedbacks || 0;
    const totalLessons = profile.totalLessons || 0;
    const bioText = profile.bio?.trim() || '';
    const experienceText = profile.experience?.trim() || '';
    const shouldShowBio = !!bioText;
    const shouldShowExperience = !!experienceText;

    return (
        <section className="about-section">
            {/* Thông tin mentor — tách từ phần video sang để video chỉ còn hiển thị video. */}
            <div className="mentor-header">
                <div className="mentor-avatar">
                    <img
                        src={profile.avatarUrl || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                        alt={profile.fullName || ''}
                    />
                </div>
                <div className="mentor-identity">
                    <h1 className="mentor-name">{profile.fullName || 'Chưa cập nhật tên'}</h1>
                    {profile.headline && <p className="mentor-headline">{profile.headline}</p>}
                    <div className="mentor-rating-row">
                        <span className="mentor-rating-star" aria-hidden="true">★</span>
                        <span className="mentor-rating-value">{rating.toFixed(1)}</span>
                        <span className="mentor-rating-count">
                            ({totalReviews.toLocaleString('vi-VN')} đánh giá)
                        </span>
                        <span className="mentor-rating-dot" aria-hidden="true">•</span>
                        <span className="mentor-lessons-count">
                            {totalLessons.toLocaleString('vi-VN')} buổi học
                        </span>
                    </div>
                </div>
            </div>

            {/* Môn học & cấp lớp giảng dạy */}
            <div className="subject-grade-tags">
                {subjectGroups.length > 0 ? subjectGroups.map((group, index) => (
                    <div
                        key={`${group.name}-${index}`}
                        className="subject-grade-chip"
                        title={`${group.name}${group.gradeLabel ? ` - ${group.gradeLabel}` : ''}`}
                    >
                        <span className="subject-grade-name">{group.name}</span>
                        {group.gradeLabel && <span className="subject-grade-level">{group.gradeLabel}</span>}
                    </div>
                )) : (
                    <div className="subject-grade-chip">
                        <span className="subject-grade-name">Chưa cập nhật môn học</span>
                    </div>
                )}
            </div>

            <div className="mentor-divider" />

            {/* Giới thiệu chi tiết */}
            <h2 className="section-title">Về gia sư {firstName}</h2>
            <div className="about-content">
                <div className="about-text">
                    {shouldShowBio && <p className="about-intro">{bioText}</p>}
                    {shouldShowExperience && (
                        <div className="about-experience-block">
                            <h3 className="about-subtitle">Kinh nghiệm giảng dạy</h3>
                            <p className="about-experience">{experienceText}</p>
                        </div>
                    )}
                </div>
                <div className="credentials-card">
                    <div className="credential-item">
                        <div className="credential-icon-row">
                            <span className="credential-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                            </span>
                            <span className="credential-label">Học vấn</span>
                        </div>
                        <b className="credential-institution">{profile.education || '—'}</b>
                        <i className="credential-detail">GPA: {profile.gpa || '—'}/{profile.gpaScale || '—'}</i>
                    </div>
                    <div className="credential-divider"></div>
                    <div className="credential-item">
                        <div className="credential-icon-row">
                            <span className="credential-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </span>
                            <span className="credential-label">Hình thức & khu vực</span>
                        </div>
                        <b className="credential-institution">{formatTeachingMode(profile.teachingMode)}</b>
                        <i className="credential-detail">{formatCity(profile.teachingAreaCity)}</i>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
