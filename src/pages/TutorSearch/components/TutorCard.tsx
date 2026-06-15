import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { Tutor } from "./types";
import { VerifiedIcon, UniversityIcon, ArrowIcon } from "./icons";
import { formatGradeLevelRanges } from "./utils";
import { createChannel } from "../../../services/chat.service";
import { getCurrentUser, getCurrentUserRole } from "../../../services/auth.service";

// Giới hạn độ dài phần giới thiệu trên thẻ — cắt theo ranh giới từ rồi thêm "…".
const MAX_BIO_CHARS = 150;

const truncateBio = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const sliced = text.slice(0, max);
    const lastSpace = sliced.lastIndexOf(" ");
    // Tránh cắt giữa một từ dài: nếu khoảng trắng cuối quá gần đầu thì cắt thẳng.
    const cut = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
    return cut.trimEnd() + "…";
};

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

    // Nhắn tin: tạo/lấy kênh chat với gia sư rồi mở thẳng cuộc trò chuyện ở trang Tin nhắn.
    const handleMessageClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const role = (getCurrentUserRole() || "").toLowerCase();
        if (!getCurrentUser() || !role) {
            toast.info("Vui lòng đăng nhập để nhắn tin với gia sư.");
            navigate("/login");
            return;
        }

        try {
            const res = await createChannel(tutor.id);
            const channelId = res.content?.channelId;
            if (!channelId) throw new Error("Thiếu channelId");

            const messagesPath =
                role === "student" ? "/student-portal/messages"
                    : role === "tutor" ? "/tutor-portal/messages"
                        : "/parent-portal/messages";

            // Truyền sẵn thông tin kênh để trang Tin nhắn mở đúng cuộc trò chuyện ngay.
            navigate(messagesPath, {
                state: {
                    openChannel: {
                        channelId,
                        bookingId: 0,
                        otherUserId: tutor.id,
                        otherUserName: tutor.name,
                        otherUserAvatarUrl: tutor.avatar,
                        status: "active",
                        lastMessageAt: "",
                        lastMessagePreview: "",
                    },
                },
            });
        } catch {
            toast.error("Không mở được cuộc trò chuyện. Vui lòng thử lại.");
        }
    };

    const bio = truncateBio(tutor.bio.trim(), MAX_BIO_CHARS);
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
                        </div>
                    </div>
                </div>

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

                {bio && (
                    <p className="tutor-bio">{bio}</p>
                )}
            </div>

            <div className="tutor-card-footer">
                <div className="tutor-actions">
                    <button className="btn-details" onClick={handleMessageClick}>Nhắn tin</button>
                    <button className="btn-start-plan" onClick={handleButtonClick}>
                        <span className="btn-start-plan-text">BẮT ĐẦU</span>
                        <span className="btn-start-plan-icon"><ArrowIcon /></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorCard;
