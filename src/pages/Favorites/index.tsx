import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getFavoriteTutors, toggleFavoriteTutor, type FavoriteTutor } from '../../services/tutorFavorite.service';
import { wishlistStore } from '../../hooks/useWishlist';
import styles from './styles.module.css';

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

/**
 * Danh sách gia sư đã lưu của tài khoản đang đăng nhập.
 *
 * Dùng chung cho cả portal phụ huynh và học sinh — nội dung hoàn toàn giống nhau, chỉ khác
 * đường dẫn, nên không tách thành hai trang.
 */
const FavoritesPage = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Không bật spinner ở đây: `loading` đã khởi tạo true cho lần tải đầu, còn nút "Thử lại"
  // tự bật trước khi gọi. Gọi setState ngay trong thân effect sẽ tạo render dây chuyền.
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
    // Luật này bắt mọi setState "với tới được" từ thân effect. Ở đây setState chỉ chạy
    // SAU await (hoặc trong finally), không phải render dây chuyền — cùng dạng đã disable
    // ở Header và NotificationDropdown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleRemove = async (tutor: FavoriteTutor) => {
    try {
      setRemovingId(tutor.tutorId);
      await toggleFavoriteTutor(tutor.tutorId);
      setFavorites((current) => current.filter((item) => item.tutorId !== tutor.tutorId));
      // Trang tìm kiếm dùng cache riêng trong bộ nhớ — báo cho nó biết để trái tim
      // không còn sáng khi quay lại.
      wishlistStore.refresh();
      toast.success(`Đã bỏ ${tutor.fullName ?? 'gia sư'} khỏi danh sách yêu thích`);
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast.error('Không bỏ lưu được. Vui lòng thử lại.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Danh sách yêu thích</h1>
        <p className={styles.muted}>Đang tải…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Danh sách yêu thích</h1>
        <p className={styles.error}>{error}</p>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Danh sách yêu thích</h1>
        <span className={styles.count}>{favorites.length} gia sư</span>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined">favorite_border</span>
          <p>Bạn chưa lưu gia sư nào.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate('/tutor-search')}>
            Tìm gia sư
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {favorites.map((tutor) => (
            <li key={tutor.tutorId} className={styles.card}>
              <button
                type="button"
                className={styles.cardMain}
                onClick={() => navigate(`/tutor-detail/${tutor.tutorId}`)}
              >
                <span className={styles.identity}>
                  <span
                    className={styles.avatar}
                    style={tutor.avatarUrl ? { backgroundImage: `url('${tutor.avatarUrl}')` } : undefined}
                  />
                  <span className={styles.info}>
                    <span className={styles.name}>{tutor.fullName ?? 'Gia sư'}</span>
                    {(tutor.degree || tutor.education) && (
                      <span className={styles.sub}>{[tutor.degree, tutor.education].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                </span>

                {/* Gia sư bị tạm ngưng vẫn nằm trong danh sách — biến mất không lời giải
                    thích còn khó hiểu hơn là nói rõ vì sao không đặt lịch được. */}
                {!tutor.isAvailable && <span className={styles.badge}>Tạm không nhận lịch</span>}

                {tutor.subjects.length > 0 && (
                  <span className={styles.subjects}>
                    {tutor.subjects.map((subject) => (
                      <span key={subject} className={styles.subjectChip}>
                        {subject}
                      </span>
                    ))}
                  </span>
                )}

                <span className={styles.footer}>
                  <span className={styles.stats}>
                    ★ {(tutor.averageRating ?? 0).toFixed(1)} · {tutor.totalClassSessions} buổi
                  </span>
                  {tutor.minPricePerHour != null && (
                    <span className={styles.price}>Từ {formatVnd(tutor.minPricePerHour)}/giờ</span>
                  )}
                </span>
              </button>

              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => void handleRemove(tutor)}
                disabled={removingId === tutor.tutorId}
                aria-label={`Bỏ ${tutor.fullName ?? 'gia sư'} khỏi danh sách yêu thích`}
                title="Bỏ khỏi danh sách yêu thích"
              >
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FavoritesPage;
