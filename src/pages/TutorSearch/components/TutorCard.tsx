import { useNavigate } from "react-router-dom";
import type { Tutor } from "./types";
import { typeLabels, statsLabels } from "./constants";
import { VerifiedIcon, UniversityIcon, CheckIcon, MinusIcon, ArrowIcon } from "./icons";
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

    const hasTrial = tutor.trialLessonPrice != null && tutor.trialLessonPrice > 0;

    return (
        <div className="tutor-card" onClick={handleCardClick} style={{ cursor: "pointer" }}>
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
                            <h3 className="tutor-name">{tutor.name}</h3>
                            <div className="tutor-badges">
                                <span className={`tutor-type-badge ${tutor.type}`}>
                                    {typeLabels[tutor.type]}
                                </span>
                                <span className="tutor-credential">{tutor.credential}</span>
                            </div>
                        </div>
                    </div>
                    <div className="tutor-rating">
                        <span className="rating-star">★</span>
                        <span className="rating-value">{tutor.rating.toFixed(1)}</span>
                    </div>
                </div>

                <div className="tutor-university-row">
                    <span className="university-icon"><UniversityIcon /></span>
                    <span className="university-name">{tutor.university}</span>
                    <div className="class-type-badge">
                        <span className="class-type-label">Loại lớp:</span>
                        <span className={`class-type-value ${tutor.type}`}>
                            {tutor.type.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="tutor-subjects">
                    {tutor.subjects.map((subject, index) => (
                        <span key={index} className="subject-tag">{subject}</span>
                    ))}
                </div>

                {tutor.gradeLevels.length > 0 && (
                    <div className="tutor-grade-levels">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#2563eb" }}>
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        <span className="grade-level-range">
                            {formatGradeLevelRanges(tutor.gradeLevels)}
                        </span>
                    </div>
                )}

                <div className="tutor-stats">
                    <div className="stat-item">
                        <span className="stat-label">{statsLabels[tutor.type].experience}</span>
                        <span className="stat-value">{tutor.experience}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">{statsLabels[tutor.type].result}</span>
                        <span className={`stat-value ${tutor.resultType}`}>{tutor.result}</span>
                    </div>
                </div>

                <div className="tutor-highlights">
                    <div className={`highlight-item ${hasTrial ? "" : "is-disabled"}`}>
                        <span className="highlight-icon">
                            {hasTrial ? <CheckIcon /> : <MinusIcon />}
                        </span>
                        <span className="highlight-text">
                            {hasTrial ? "Dạy thử đánh giá năng lực 30'" : "Chưa có buổi học thử"}
                        </span>
                    </div>
                    <div className={`highlight-item ${tutor.allowPriceNegotiation ? "" : "is-disabled"}`}>
                        <span className="highlight-icon">
                            {tutor.allowPriceNegotiation ? <CheckIcon /> : <MinusIcon />}
                        </span>
                        <span className="highlight-text">
                            {tutor.allowPriceNegotiation ? "Hỗ trợ thương lượng giá" : "Giá cố định"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="tutor-card-footer">
                <div className="tutor-pricing">
                    <span className="pricing-label">HỌC PHÍ CHUẨN</span>
                    <div className="pricing-value">
                        <span className="price-amount">{tutor.price.toLocaleString("vi-VN")}đ</span>
                        <span className="price-unit">/h</span>
                    </div>
                    {hasTrial ? (
                        <div className="trial-price-badge" title="Học phí ưu đãi cho buổi học đầu tiên">
                            ✨ Học thử: {tutor.trialLessonPrice!.toLocaleString("vi-VN")}đ
                        </div>
                    ) : (
                        <div className="trial-price-badge is-placeholder" title="Gia sư này chưa có buổi học thử">
                            — Không có học thử
                        </div>
                    )}
                </div>
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
