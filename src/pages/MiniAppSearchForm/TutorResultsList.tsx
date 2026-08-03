import { useNavigate } from 'react-router-dom';
import type { MiniAppTutorResult } from '../../services/miniAppSearch.service';
import { BookOpenCheck, MapPin, Monitor, Users } from 'lucide-react';
import { tr, type Lang } from './i18n';
import '../../styles/pages/mini-app-search-results.css';

interface TutorResultsListProps {
  tutors: MiniAppTutorResult[];
  lang: Lang;
  onFindMore: () => void;
  findMoreLoading: boolean;
  findMoreError: string | null;
  exhausted: boolean;
  onEditCriteria: () => void;
}

const TIER_LABEL: Record<MiniAppTutorResult['subscriptionType'], { vi: string; en: string }> = {
  standard: { vi: 'Tiêu chuẩn', en: 'Standard' },
  pro: { vi: 'Pro', en: 'Pro' },
  premium: { vi: 'Premium', en: 'Premium' },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function teachingModeLabel(mode: MiniAppTutorResult['teachingMode'], lang: Lang): string {
  if (mode === 'online') return lang === 'en' ? 'Online' : 'Trực tuyến';
  if (mode === 'offline') return lang === 'en' ? 'In person' : 'Tại nhà';
  return lang === 'en' ? 'Online & in person' : 'Online & tại nhà';
}

function locationLabel(tutor: MiniAppTutorResult): string | null {
  return [tutor.teachingAreaDistrict, tutor.teachingAreaCity].filter(Boolean).join(', ') || null;
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
  const navigate = useNavigate();

  // Điều hướng sang trang chi tiết gia sư (route /tutor-detail/:id có sẵn, public,
  // hoạt động trong Mini App — chỉ đòi đăng nhập Zalo khi PH bấm đặt lịch, xem
  // requireLogin trong TutorDetailPage.tsx).
  const goToDetail = (tutorId: string) => navigate(`/tutor-detail/${tutorId}`);

  return (
    <div className="mini-app-results">
      {/* Nút back về wizard (bước "summary") để PH đổi tiêu chí — tái dùng class
       * .mini-app-form-back của wizard cho đồng nhất, xem mini-app-search-form.css. */}
      <div className="mini-app-form-topbar">
        <button
          type="button"
          className="mini-app-form-back"
          onClick={onEditCriteria}
          aria-label={tr('Chỉnh sửa tiêu chí', lang)}
        >
          ←
        </button>
      </div>
      <h2 className="mini-app-results__title">{tr('Gia sư phù hợp cho bé', lang)}</h2>
      <p className="mini-app-results__subtitle">
        {tr('Quay lại Zalo bất cứ lúc nào để hỏi thêm hoặc đặt lịch.', lang)}
      </p>

      <div className="mini-app-results__list">
        {tutors.map((t) => (
          <article
            key={t.tutorId}
            className="mini-app-tutor-card"
            onClick={() => goToDetail(t.tutorId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToDetail(t.tutorId);
              }
            }}
          >
            <div className="mini-app-tutor-card__top">
              <div className="mini-app-tutor-card__avatar">
                {t.avatarUrl ? <img src={t.avatarUrl} alt={t.fullName} /> : <span>{initials(t.fullName)}</span>}
              </div>
              <div className="mini-app-tutor-card__summary">
                <div className="mini-app-tutor-card__head">
                  <h3 className="mini-app-tutor-card__name">{t.fullName}</h3>
                  <span className={`mini-app-tutor-card__tier mini-app-tutor-card__tier--${t.subscriptionType}`}>
                    {TIER_LABEL[t.subscriptionType][lang]}
                  </span>
                </div>
                <div className="mini-app-tutor-card__numbers">
                  <div>
                    <strong className="mini-app-tutor-card__price">{t.hourlyRate.toLocaleString('vi-VN')}đ</strong>
                    <span className="mini-app-tutor-card__unit">{lang === 'en' ? 'per hour' : 'mỗi giờ'}</span>
                  </div>
                  <div className="mini-app-tutor-card__rating-block">
                    <strong className="mini-app-tutor-card__rating">★ {t.averageRating.toFixed(1)}</strong>
                    <span className="mini-app-tutor-card__reviews">
                      {t.totalReviews} {tr('đánh giá', lang)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {t.bio && <p className="mini-app-tutor-card__headline">{t.bio}</p>}

            {(t.subjects?.length || t.grades?.length) && (
              <div className="mini-app-tutor-card__tags">
                {t.subjects?.slice(0, 3).map((subject) => (
                  <span key={subject} className="mini-app-tutor-card__tag">
                    {subject}
                  </span>
                ))}
                {t.grades?.length ? (
                  <span className="mini-app-tutor-card__tag mini-app-tutor-card__tag--muted">
                    {t.grades.length > 1
                      ? `${lang === 'en' ? 'Grade' : 'Lớp'} ${t.grades[0]}–${t.grades[t.grades.length - 1]}`
                      : `${lang === 'en' ? 'Grade' : 'Lớp'} ${t.grades[0]}`}
                  </span>
                ) : null}
              </div>
            )}

            <div className="mini-app-tutor-card__facts">
              <span>
                <BookOpenCheck aria-hidden="true" />
                {t.totalCompletedLessons.toLocaleString('vi-VN')} {lang === 'en' ? 'lessons' : 'buổi đã dạy'}
              </span>
              <span>
                <Users aria-hidden="true" />
                {t.totalStudentsTaught.toLocaleString('vi-VN')} {lang === 'en' ? 'students' : 'học sinh'}
              </span>
              <span>
                <Monitor aria-hidden="true" />
                {teachingModeLabel(t.teachingMode, lang)}
              </span>
              {locationLabel(t) && (
                <span>
                  <MapPin aria-hidden="true" />
                  {locationLabel(t)}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      {findMoreError && <p className="mini-app-results__error">{findMoreError}</p>}
      {exhausted ? (
        <p className="mini-app-results__exhausted">
          {tr('Hiện chưa có thêm gia sư khác phù hợp — anh/chị nhắn Zalo để em hỗ trợ thêm nhé.', lang)}
        </p>
      ) : (
        <button type="button" className="mini-app-results__find-more" onClick={onFindMore} disabled={findMoreLoading}>
          {findMoreLoading ? tr('Đang tìm...', lang) : tr('Tìm gia sư khác', lang)}
        </button>
      )}
    </div>
  );
};

export default TutorResultsList;
