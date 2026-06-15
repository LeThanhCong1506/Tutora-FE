import { useNavigate } from "react-router-dom";
import type { Tutor } from "./types";
import { typeLabels } from "./constants";
import { VerifiedIcon, UniversityIcon, ArrowIcon } from "./icons";
import { formatGradeLevelRanges } from "./utils";

interface TutorCardProps {
    tutor: Tutor;
}

const TutorCard = ({ tutor }: TutorCardProps) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/tutor-detail/${tutor.id}`);
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/tutor-detail/${tutor.id}`);
    };

    const bio = tutor.bio.trim();
    const university = tutor.university.trim();
    const gradeLevelRange = formatGradeLevelRanges(tutor.gradeLevels);
    const visibleSubjects = tutor.subjects.slice(0, 3);
    const hiddenSubjectsCount = Math.max(tutor.subjects.length - visibleSubjects.length, 0);

    return (
        <div className="tutor-card" onClick={handleCardClick}>
            <div className="tutor-card-body">
                <div className="tutor-card-header">
                    <div className="tutor-profile">
                        <div className="tutor-avatar-container">
                            <img src={tutor.avatar} alt={tutor.name} className="tutor-avatar" />
                            <div className="tutor-verified-badge">
                                <VerifiedIcon />
                            </div>
                        </div>
                        <div className="tutor-info">
                            <div className="tutor-title-row">
                                <h3 className="tutor-name">{tutor.name}</h3>
                                <div className="tutor-rating">
                                    <span className="rating-star">&#9733;</span>
                                    <span className="rating-value">{tutor.rating.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="tutor-badges">
                                <span className={`tutor-type-badge ${tutor.type}`}>
                                    {typeLabels[tutor.type]}
                                </span>
                                <span className="tutor-credential">{tutor.credential}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {bio && (
                    <p className="tutor-bio">{bio}</p>
                )}

                {(university || gradeLevelRange) && (
                    <div className="tutor-card-meta">
                        {university && (
                            <div className="tutor-university-row">
                                <span className="university-icon"><UniversityIcon /></span>
                                <span className="university-name">{university}</span>
                            </div>
                        )}

                        {gradeLevelRange && (
                            <div className="tutor-grade-levels">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                                <span className="grade-level-range">{gradeLevelRange}</span>
                            </div>
                        )}
                    </div>
                )}

                {visibleSubjects.length > 0 && (
                    <div className="tutor-subjects">
                        {visibleSubjects.map((subject, index) => (
                            <span key={index} className="subject-tag">{subject}</span>
                        ))}
                        {hiddenSubjectsCount > 0 && (
                            <span className="subject-tag subject-tag-more">+{hiddenSubjectsCount}</span>
                        )}
                    </div>
                )}
            </div>

            <div className="tutor-card-footer">
                <div className="tutor-actions">
                    <button className="btn-details" onClick={handleButtonClick}>Chi tiết</button>
                    <button className="btn-start-plan" onClick={handleButtonClick}>
                        <span className="btn-start-plan-text">BẮT ĐẦU KẾ HOẠCH</span>
                        <span className="btn-start-plan-icon"><ArrowIcon /></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorCard;
