import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Heart,
  LoaderCircle,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getFavoriteTutors, toggleFavoriteTutor, type FavoriteTutor } from '../../services/tutorFavorite.service';
import { wishlistStore } from '../../hooks/useWishlist';
import { formatVNDNumber } from '../../utils/formatters';
import styles from './styles.module.css';

const MAX_VISIBLE_SUBJECTS = 3;

const formatPrice = (amount: number) => `${formatVNDNumber(amount)}đ/giờ`;

const getInitials = (name: string | null) => {
  const words = (name ?? 'Gia sư').trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
};

interface TutorAvatarProps {
  name: string | null;
  src: string | null;
}

const TutorAvatar = ({ name, src }: TutorAvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span className={styles.avatar} aria-hidden="true">
      {showImage ? (
        <img src={src ?? undefined} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span className={styles.avatarFallback}>{getInitials(name)}</span>
      )}
    </span>
  );
};

interface FavoriteCardProps {
  tutor: FavoriteTutor;
  removing: boolean;
  onRemove: (tutor: FavoriteTutor) => Promise<void>;
}

const FavoriteCard = ({ tutor, removing, onRemove }: FavoriteCardProps) => {
  const tutorName = tutor.fullName?.trim() || 'Gia sư';
  const credential = [tutor.degree?.trim(), tutor.education?.trim()].filter(Boolean).join(' · ');
  const headline = tutor.headline?.trim();
  const subjects = tutor.subjects.filter((subject) => subject.trim());
  const visibleSubjects = subjects.slice(0, MAX_VISIBLE_SUBJECTS);
  const hiddenSubjectsCount = Math.max(subjects.length - visibleSubjects.length, 0);
  const rating = (tutor.averageRating ?? 0).toFixed(1);
  const reviewLabel = `${(tutor.totalReviews ?? 0).toLocaleString('vi-VN')} đánh giá`;

  return (
    <li className={`${styles.card}${!tutor.isAvailable ? ` ${styles.cardUnavailable}` : ''}`} aria-busy={removing}>
      <Link className={styles.cardLink} to={`/tutor-detail/${tutor.tutorId}`} aria-label={`Xem hồ sơ ${tutorName}`}>
        <div className={styles.cardBody}>
          <div className={styles.identity}>
            <TutorAvatar name={tutor.fullName} src={tutor.avatarUrl} />

            <div className={styles.identityText}>
              <span className={`${styles.availability}${!tutor.isAvailable ? ` ${styles.unavailable}` : ''}`}>
                <span className={styles.availabilityDot} />
                {tutor.isAvailable ? 'Đang nhận lịch' : 'Tạm không nhận lịch'}
              </span>
              <h2 className={styles.name}>{tutorName}</h2>
              {credential && (
                <span className={styles.credential} title={credential}>
                  <GraduationCap size={15} strokeWidth={1.8} />
                  <span>{credential}</span>
                </span>
              )}
            </div>
          </div>

          {headline && <p className={styles.headline}>{headline}</p>}

          {visibleSubjects.length > 0 && (
            <div className={styles.subjects} aria-label="Môn học">
              {visibleSubjects.map((subject, index) => (
                <span key={`${subject}-${index}`} className={styles.subjectChip} title={subject}>
                  {subject}
                </span>
              ))}
              {hiddenSubjectsCount > 0 && (
                <span className={`${styles.subjectChip} ${styles.moreSubjects}`}>+{hiddenSubjectsCount}</span>
              )}
            </div>
          )}

          <div className={styles.stats}>
            <span className={styles.statItem}>
              <span className={`${styles.statIcon} ${styles.starIcon}`}>
                <Star size={16} fill="currentColor" strokeWidth={1.8} />
              </span>
              <span className={styles.statText}>
                <strong>{rating}</strong>
                <small>{reviewLabel}</small>
              </span>
            </span>

            <span className={styles.statDivider} aria-hidden="true" />

            <span className={styles.statItem}>
              <span className={styles.statIcon}>
                <BookOpen size={16} strokeWidth={1.8} />
              </span>
              <span className={styles.statText}>
                <strong>{tutor.totalClassSessions.toLocaleString('vi-VN')}</strong>
                <small>Buổi học đã dạy</small>
              </span>
            </span>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <span className={styles.priceBlock}>
            <small>Học phí từ</small>
            <strong>{tutor.minPricePerHour != null ? formatPrice(tutor.minPricePerHour) : 'Đang cập nhật'}</strong>
          </span>
          <span className={styles.profileCta}>
            Xem hồ sơ
            <ArrowRight size={16} strokeWidth={2} />
          </span>
        </div>
      </Link>

      <button
        type="button"
        className={styles.removeBtn}
        onClick={() => void onRemove(tutor)}
        disabled={removing}
        aria-label={`Bỏ ${tutorName} khỏi danh sách yêu thích`}
        title="Bỏ khỏi danh sách yêu thích"
      >
        {removing ? (
          <LoaderCircle className={styles.spinner} size={20} strokeWidth={2} />
        ) : (
          <Heart size={20} fill="currentColor" strokeWidth={2} />
        )}
      </button>
    </li>
  );
};

const FavoritesSkeleton = () => (
  <div className={styles.skeletonGrid} role="status" aria-label="Đang tải danh sách gia sư yêu thích">
    {[0, 1, 2].map((item) => (
      <div key={item} className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true">
        <div className={styles.skeletonBody}>
          <span className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
          <span className={styles.skeletonIdentity}>
            <span className={`${styles.skeleton} ${styles.skeletonStatus}`} />
            <span className={`${styles.skeleton} ${styles.skeletonName}`} />
            <span className={`${styles.skeleton} ${styles.skeletonCredential}`} />
          </span>
        </div>
        <span className={`${styles.skeleton} ${styles.skeletonHeadline}`} />
        <div className={styles.skeletonSubjects}>
          <span className={`${styles.skeleton} ${styles.skeletonChip}`} />
          <span className={`${styles.skeleton} ${styles.skeletonChip}`} />
        </div>
        <span className={`${styles.skeleton} ${styles.skeletonStats}`} />
        <span className={`${styles.skeleton} ${styles.skeletonFooter}`} />
      </div>
    ))}
  </div>
);

/** Danh sách gia sư đã lưu, dùng chung cho cả portal phụ huynh và học sinh. */
const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<FavoriteTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getFavoriteTutors(signal);
      setFavorites(data);
      setError(null);
    } catch (err) {
      const aborted =
        (err as { name?: string; code?: string })?.name === 'CanceledError' ||
        (err as { name?: string; code?: string })?.code === 'ERR_CANCELED';
      if (aborted) return;
      console.error('Error loading favorites:', err);
      setError('Không tải được danh sách yêu thích. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state chỉ đổi sau khi request hoàn tất
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleRemove = async (tutor: FavoriteTutor) => {
    setRemovingIds((current) => new Set(current).add(tutor.tutorId));

    try {
      await toggleFavoriteTutor(tutor.tutorId);
      setFavorites((current) => current.filter((item) => item.tutorId !== tutor.tutorId));
      wishlistStore.refresh();
      toast.success(`Đã bỏ ${tutor.fullName ?? 'gia sư'} khỏi danh sách yêu thích`);
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast.error('Không bỏ lưu được. Vui lòng thử lại.');
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(tutor.tutorId);
        return next;
      });
    }
  };

  const retry = () => {
    setLoading(true);
    void load();
  };

  return (
    <section className={styles.page} aria-labelledby="favorites-page-title">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h1 id="favorites-page-title" className={styles.title}>
            Danh sách yêu thích
          </h1>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.count} aria-live="polite">
            {loading ? 'Đang tải…' : error ? 'Chưa thể cập nhật' : `${favorites.length} gia sư đã lưu`}
          </span>
          <Link className={styles.discoverLink} to="/tutor-search">
            <Search size={16} strokeWidth={2} />
            Tìm thêm gia sư
          </Link>
        </div>
      </header>

      {loading ? (
        <FavoritesSkeleton />
      ) : error ? (
        <section className={styles.statePanel} role="alert">
          <span className={`${styles.stateIcon} ${styles.errorIcon}`}>
            <AlertCircle size={28} strokeWidth={1.8} />
          </span>
          <h2>Không thể tải danh sách</h2>
          <p>{error}</p>
          <button type="button" className={styles.primaryBtn} onClick={retry}>
            <RefreshCw size={16} strokeWidth={2} />
            Thử lại
          </button>
        </section>
      ) : favorites.length === 0 ? (
        <section className={styles.statePanel}>
          <span className={styles.stateIcon}>
            <Heart size={30} strokeWidth={1.7} />
          </span>
          <h2>Chưa có gia sư yêu thích</h2>
          <p>Lưu những hồ sơ phù hợp để bạn dễ dàng xem lại và so sánh sau này.</p>
          <Link className={styles.primaryBtn} to="/tutor-search">
            <Search size={16} strokeWidth={2} />
            Khám phá gia sư
          </Link>
        </section>
      ) : (
        <ul className={styles.list}>
          {favorites.map((tutor) => (
            <FavoriteCard
              key={tutor.tutorId}
              tutor={tutor}
              removing={removingIds.has(tutor.tutorId)}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default FavoritesPage;
