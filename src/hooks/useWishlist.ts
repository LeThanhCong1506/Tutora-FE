import { useSyncExternalStore } from 'react';
import { getUserIdFromToken } from '../../../services/auth.service';
import { getFavoriteTutorIds, toggleFavoriteTutor } from '../../../services/tutorFavorite.service';

/**
 * Danh sách gia sư yêu thích của tài khoản đang đăng nhập.
 *
 * Trước đây danh sách nằm trong localStorage dưới MỘT key chung, nên hai người đăng nhập
 * cùng máy dùng chung wishlist của nhau và đổi máy là mất sạch. Nay nguồn sự thật là DB
 * (`GET/POST /api/favorites/tutors`); store này chỉ là bản cache trong bộ nhớ để các thẻ
 * gia sư trên cùng một trang cùng cập nhật ngay khi bấm.
 */
let ids = new Set<string>();
let snapshot: ReadonlySet<string> = ids;
let loadedForUserId: string | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  snapshot = new Set(ids);
  listeners.forEach((listener) => listener());
};

// getCurrentUser() trả về object thô trong storage (accessToken...), không có userId —
// id nằm trong claim của JWT.
const currentUserId = (): string | null => getUserIdFromToken();

/** Tải wishlist khi vào trang, và tải lại nếu tài khoản đăng nhập đã đổi. */
const load = async () => {
  const userId = currentUserId();

  // Khách chưa đăng nhập: không có wishlist, và phải xoá cache của người đăng nhập trước.
  if (!userId) {
    loadedForUserId = null;
    if (ids.size > 0) {
      ids = new Set();
      emit();
    }
    return;
  }

  if (loadedForUserId === userId) return;
  loadedForUserId = userId;

  try {
    ids = new Set(await getFavoriteTutorIds());
    emit();
  } catch {
    // Wishlist hỏng không được làm hỏng trang tìm kiếm — để trống và thử lại lần sau.
    loadedForUserId = null;
  }
};

export const wishlistStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    void load();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ReadonlySet<string> {
    return snapshot;
  },
  /**
   * Đảo trạng thái. Trả về `ok` (có lưu được không) và `saved` (trạng thái SAU khi đổi)
   * để phía gọi hiện đúng thông báo "đã lưu" hay "đã bỏ lưu".
   */
  async toggle(id: string): Promise<{ ok: boolean; saved: boolean }> {
    if (!currentUserId()) return { ok: false, saved: ids.has(id) };

    // Cập nhật trước cho trái tim đổi màu ngay, rồi chốt lại theo kết quả server.
    const wasSaved = ids.has(id);
    if (wasSaved) ids.delete(id);
    else ids.add(id);
    emit();

    try {
      const saved = await toggleFavoriteTutor(id);
      if (saved) ids.add(id);
      else ids.delete(id);
      emit();
      return { ok: true, saved };
    } catch {
      // Trả về đúng trạng thái cũ thay vì để trái tim nói dối.
      if (wasSaved) ids.add(id);
      else ids.delete(id);
      emit();
      return { ok: false, saved: wasSaved };
    }
  },
  /** Cho trang Danh sách yêu thích đồng bộ lại cache sau khi bỏ lưu. */
  refresh() {
    loadedForUserId = null;
    void load();
  },
};

/** Hook cho 1 gia sư: trả về trạng thái đã lưu + hàm toggle. */
export const useWishlist = (tutorId: string) => {
  const saved = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot);
  return {
    saved: saved.has(tutorId),
    toggle: () => wishlistStore.toggle(tutorId),
    isSignedIn: currentUserId() !== null,
  };
};
