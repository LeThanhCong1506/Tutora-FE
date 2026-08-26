import { useSyncExternalStore } from 'react';
import { getCurrentUserRole, getUserIdFromToken } from '../services/auth.service';
import { getFavoriteTutorIds, toggleFavoriteTutor } from '../services/tutorFavorite.service';

/**
 * Danh sách gia sư yêu thích của tài khoản đang đăng nhập.
 *
 * Trước đây danh sách nằm trong localStorage dưới MỘT key chung, nên hai người đăng nhập
 * cùng máy dùng chung wishlist của nhau và đổi máy là mất sạch. Nay nguồn sự thật là DB
 * (`GET/POST /api/favorites/tutors`); store này chỉ là bản cache trong bộ nhớ để các thẻ
 * gia sư trên cùng một trang cùng cập nhật ngay khi bấm.
 *
 * Store nằm ở cấp module (không phải context) vì cả trang tìm kiếm, trang chi tiết và trang
 * Danh sách yêu thích đều đọc chung một tập id — ba nơi này không cùng cây component.
 */
let ids = new Set<string>();
let snapshot: ReadonlySet<string> = ids;
let loadedForUserId: string | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  snapshot = new Set(ids);
  listeners.forEach((listener) => listener());
};

/**
 * Chỉ phụ huynh và học sinh mới có danh sách yêu thích: họ là bên đi chọn gia sư, và cũng chỉ
 * hai portal này mới có trang `/favorites` để mở ra xem lại (xem App.tsx). Gia sư/admin/staff
 * mà lưu được thì dòng dữ liệu đó nằm chết — không có màn hình nào của họ đọc tới.
 *
 * BE đã chặn thật bằng `[Authorize(Roles = ParentOrStudent)]` trên TutorFavoriteController;
 * chặn thêm ở đây để không bắn những request cầm chắc 403 và để ẩn nút cho gọn.
 */
const FAVORITE_ROLES = new Set(['parent', 'student']);

const isFavoriteRole = (): boolean => FAVORITE_ROLES.has((getCurrentUserRole() ?? '').toLowerCase());

// getCurrentUser() trả về object thô trong storage (accessToken...), không có userId —
// id nằm trong claim của JWT.
const signedInUserId = (): string | null => getUserIdFromToken();

/** Chủ sở hữu wishlist: null nếu chưa đăng nhập HOẶC đăng nhập bằng role không được lưu. */
const wishlistOwnerId = (): string | null => (isFavoriteRole() ? signedInUserId() : null);

/** Tải wishlist khi vào trang, và tải lại nếu tài khoản đăng nhập đã đổi. */
const load = async () => {
  const userId = wishlistOwnerId();

  // Khách chưa đăng nhập, hoặc đang đăng nhập bằng role không có wishlist (gia sư/admin/staff):
  // không có gì để tải, và phải xoá cache của người đăng nhập trước.
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
    // Chặn cả chưa đăng nhập lẫn sai role ngay tại đây, để component nào quên kiểm tra thì
    // cũng không bắn được request hỏng lên server.
    if (!wishlistOwnerId()) return { ok: false, saved: ids.has(id) };

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

/** Hook cho 1 gia sư: trả về trạng thái đã lưu + hàm toggle + ai được phép dùng. */
export const useWishlist = (tutorId: string) => {
  const saved = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot);
  const isGuest = signedInUserId() === null;
  const canFavorite = wishlistOwnerId() !== null;

  return {
    saved: saved.has(tutorId),
    toggle: () => wishlistStore.toggle(tutorId),
    /** Đã đăng nhập bằng tài khoản phụ huynh/học sinh — bấm là lưu được thật. */
    canFavorite,
    /** Chưa đăng nhập. Vẫn cho thấy trái tim, bấm vào thì mời đăng nhập. */
    isGuest,
    /**
     * Có hiện nút hay không. Gia sư/admin/staff bị ẩn hẳn thay vì hiện một nút bấm vào chỉ
     * để báo lỗi — với họ chức năng này không bao giờ dùng được.
     */
    visible: isGuest || canFavorite,
  };
};
