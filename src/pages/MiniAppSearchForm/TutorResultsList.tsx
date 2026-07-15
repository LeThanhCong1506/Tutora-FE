import type { MiniAppTutorResult } from "../../services/miniAppSearch.service";
import { tr, type Lang } from "./i18n";
import "../../styles/pages/mini-app-search-results.css";

interface TutorResultsListProps {
    tutors: MiniAppTutorResult[];
    lang: Lang;
    onFindMore: () => void;
    findMoreLoading: boolean;
    findMoreError: string | null;
    exhausted: boolean;
    onEditCriteria: () => void;
}

const TIER_LABEL: Record<MiniAppTutorResult["subscriptionType"], { vi: string; en: string }> = {
    standard: { vi: "Tiêu chuẩn", en: "Standard" },
    pro: { vi: "Pro", en: "Pro" },
    premium: { vi: "Premium", en: "Premium" },
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * Danh sách gọn 3-5 gia sư ngay trong Mini App (kiểu Preply — 1 hàng/gia sư, không phải
 * card lớn như bên chat OA, xem tutor-card-image.service.ts) + nút "Tìm gia sư khác" cuối
 * danh sách. Thay cho màn "quay lại Zalo xem" cũ (mini-app-search-form.css
 * .mini-app-form-success) — giữ PH ở lại Mini App, xem kết quả ngay sau khi bấm Tìm gia sư.
 */
const TutorResultsList = ({
    tutors,
    lang,
    onFindMore,
    findMoreLoading,
    findMoreError,
    exhausted,
    onEditCriteria,
}: TutorResultsListProps) => {
    return (
        <div className="mini-app-results">
            {/* Nút back về wizard (bước "summary") để PH đổi tiêu chí — tái dùng class
             * .mini-app-form-back của wizard cho đồng nhất, xem mini-app-search-form.css. */}
            <div className="mini-app-form-topbar">
                <button
                    type="button"
                    className="mini-app-form-back"
                    onClick={onEditCriteria}
                    aria-label={tr("Chỉnh sửa tiêu chí", lang)}
                >
                    ←
                </button>
            </div>
            <h2 className="mini-app-results__title">{tr("Gia sư phù hợp cho bé", lang)}</h2>
            <p className="mini-app-results__subtitle">
                {tr("Quay lại Zalo bất cứ lúc nào để hỏi thêm hoặc đặt lịch.", lang)}
            </p>

            <div className="mini-app-results__list">
                {tutors.map((t) => (
                    <div key={t.tutorId} className="mini-app-tutor-row">
                        <div className="mini-app-tutor-row__avatar">
                            {t.avatarUrl ? (
                                <img src={t.avatarUrl} alt={t.fullName} />
                            ) : (
                                <span>{initials(t.fullName)}</span>
                            )}
                        </div>
                        <div className="mini-app-tutor-row__body">
                            <div className="mini-app-tutor-row__head">
                                <span className="mini-app-tutor-row__name">{t.fullName}</span>
                                <span className={`mini-app-tutor-row__tier mini-app-tutor-row__tier--${t.subscriptionType}`}>
                                    {TIER_LABEL[t.subscriptionType][lang]}
                                </span>
                            </div>
                            {(t.subjects?.length || t.grades?.length) && (
                                <div className="mini-app-tutor-row__tags">
                                    {t.subjects?.slice(0, 2).map((s) => (
                                        <span key={s} className="mini-app-tutor-row__tag">{s}</span>
                                    ))}
                                    {t.grades?.length ? (
                                        <span className="mini-app-tutor-row__tag mini-app-tutor-row__tag--muted">
                                            {t.grades.length > 1
                                                ? `${lang === "en" ? "Grade" : "Lớp"} ${t.grades[0]}–${t.grades[t.grades.length - 1]}`
                                                : `${lang === "en" ? "Grade" : "Lớp"} ${t.grades[0]}`}
                                        </span>
                                    ) : null}
                                </div>
                            )}
                            <div className="mini-app-tutor-row__meta">
                                <span className="mini-app-tutor-row__rating">
                                    ★ {t.averageRating.toFixed(1)}
                                    <span className="mini-app-tutor-row__reviews">
                                        &nbsp;({t.totalReviews} {tr("đánh giá", lang)})
                                    </span>
                                </span>
                                <span className="mini-app-tutor-row__price">
                                    {t.hourlyRate.toLocaleString("vi-VN")}đ{lang === "en" ? "/hr" : "/giờ"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {findMoreError && <p className="mini-app-results__error">{findMoreError}</p>}
            {exhausted ? (
                <p className="mini-app-results__exhausted">
                    {tr("Hiện chưa có thêm gia sư khác phù hợp — anh/chị nhắn Zalo để em hỗ trợ thêm nhé.", lang)}
                </p>
            ) : (
                <button
                    type="button"
                    className="mini-app-results__find-more"
                    onClick={onFindMore}
                    disabled={findMoreLoading}
                >
                    {findMoreLoading ? tr("Đang tìm...", lang) : tr("Tìm gia sư khác", lang)}
                </button>
            )}
        </div>
    );
};

export default TutorResultsList;
