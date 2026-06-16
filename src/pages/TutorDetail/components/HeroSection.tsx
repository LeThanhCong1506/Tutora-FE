import { useState } from 'react';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { PlayIcon, StarIcon, HeartIcon } from './icons';

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

const HeroSection = ({ profile }: { profile: TutorFullProfile }) => {
    const [showVideoModal, setShowVideoModal] = useState(false);

    const subjectGroups = buildSubjectGroups(profile);

    return (
        <>
            <section className="tutor-hero-section">
                <div className="component-2">
                    {(() => {
                        if (!profile.videoIntroUrl) {
                            return (
                                <img
                                    className="interview-thumbnail"
                                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800"
                                    alt={profile.fullName || "Tutor Interview"}
                                />
                            );
                        }
                        const ytMatch = profile.videoIntroUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                        if (ytMatch?.[1]) {
                            return (
                                <img
                                    className="interview-thumbnail"
                                    src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`}
                                    alt={profile.fullName || "Tutor Interview"}
                                />
                            );
                        }
                        return (
                            <video
                                className="interview-thumbnail"
                                src={profile.videoIntroUrl}
                                muted
                                style={{ objectFit: 'cover', width: '100%', height: '351.4px' }}
                            />
                        );
                    })()}
                    <div className="gradient-overlay"></div>

                    {profile.videoIntroUrl && (
                        <div className="play-button-container" onClick={() => setShowVideoModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="play-button">
                                <PlayIcon />
                            </div>
                            <b className="click-to-view">Click để xem phỏng vấn học thuật</b>
                        </div>
                    )}

                    <div className="TUTORA-badge-container">
                        <div className="TUTORA-badge">
                            <div className="TUTORA-badge-dot"></div>
                            <b className="TUTORA-badge-text">TUTORA Original Interview</b>
                        </div>
                    </div>

                    <div className="tutor-info-card">
                        <div className="tutor-info-content">
                            <div className="tutor-mini-avatar">
                                <img src={profile.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg"} alt={profile.fullName || ""} />
                                <div className="mini-avatar-gradient"></div>
                            </div>
                            <div className="tutor-info-text">
                                <div className="university-badge">
                                    <b>{profile.education?.split(',')[0] || "University"}</b>
                                </div>
                                <h1 className="tutor-name">{profile.fullName}</h1>
                                <p className="tutor-credential">{profile.headline}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rating-card-container">
                        <div className="rating-card">
                            <div className="rating-stars">
                                <div className="stars-row">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <StarIcon key={i} filled={i <= Math.round(profile.averageRating || 0)} />
                                    ))}
                                </div>
                                <b className="rating-text">{(profile.averageRating || 0).toFixed(1)} ({profile.totalFeedbacks || 0} ĐÁNH GIÁ)</b>
                            </div>
                            <div className="rating-divider"></div>
                            <div className="favorite-button">
                                <HeartIcon />
                            </div>
                        </div>
                    </div>
                </div>

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
                <div className="mobile-rating-bar">
                    <div className="rating-stars">
                        <div className="stars-row">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <StarIcon key={i} filled={i <= Math.round(profile.averageRating || 0)} />
                            ))}
                        </div>
                        <b className="rating-text">{(profile.averageRating || 0).toFixed(1)} ({profile.totalFeedbacks || 0} đánh giá)</b>
                    </div>
                    <div className="favorite-button">
                        <HeartIcon />
                    </div>
                </div>
            </section>

            {showVideoModal && profile.videoIntroUrl && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setShowVideoModal(false)}
                >
                    <button
                        onClick={() => setShowVideoModal(false)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '24px',
                            transition: 'background 0.3s'
                        }}
                    >
                        ✕
                    </button>
                    <video
                        src={profile.videoIntroUrl!}
                        controls
                        autoPlay
                        style={{
                            maxWidth: '90%',
                            maxHeight: '80vh',
                            borderRadius: '12px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default HeroSection;
