import { useEffect, useState } from 'react';
import { getMaterials, type LearningMaterialResponse } from '../../../services/materials.service';

export interface UseCourseMaterialsResult {
  materials: LearningMaterialResponse[];
  loading: boolean;
  /** Không tải được — panel hiện dòng báo lỗi thay vì "chưa có tài liệu nào". */
  failed: boolean;
}

/**
 * Kết quả tải KÈM khoá mà nó thuộc về. Gói chung một state thay vì ba state rời để không bao giờ
 * có nhịp render nào mà tài liệu của khoá này đứng cạnh cờ loading của khoá kia.
 */
interface MaterialsState {
  bookingId: number | null;
  materials: LearningMaterialResponse[];
  loading: boolean;
  failed: boolean;
}

const EMPTY: MaterialsState = { bookingId: null, materials: [], loading: false, failed: false };

/**
 * Tài liệu gia sư đã gửi cho một lớp, đọc bằng chính endpoint của portal gia sư
 * (`GET /api/bookings/{bookingId}/materials`).
 *
 * BE cho phép cả gia sư, phụ huynh và học sinh của booking đọc (`IsPartyToBooking` ở
 * `LearningMaterialService`), nhưng upload/xoá thì chỉ gia sư — nên bên người học tab này
 * CHỈ XEM VÀ TẢI VỀ, không có nút tải lên hay gỡ.
 *
 * `bookingId === null` (modal đang đóng) thì không gọi gì cả, và cũng KHÔNG dọn state trong thân
 * effect: state cũ được lọc ở bước trả về theo `bookingId`, nên mở khoá khác không bao giờ thấy
 * tài liệu của khoá vừa xem nhấp nháy một nhịp.
 */
export function useCourseMaterials(bookingId: number | null): UseCourseMaterialsResult {
  const [state, setState] = useState<MaterialsState>(EMPTY);

  useEffect(() => {
    if (bookingId == null) return;

    let cancelled = false;

    void (async () => {
      setState({ bookingId, materials: [], loading: true, failed: false });
      try {
        const response = await getMaterials(bookingId);
        if (cancelled) return;
        setState({ bookingId, materials: response.content ?? [], loading: false, failed: false });
      } catch (error) {
        if (cancelled) return;
        // Không dùng toast: modal có thể mở/đóng liên tục, một dòng ngay trong tab đủ rõ và
        // không rải thông báo ra ngoài trang.
        console.error('CourseDetailModal: không lấy được tài liệu của lớp', error);
        setState({ bookingId, materials: [], loading: false, failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // State chưa khớp khoá đang mở (vừa đổi khoá, lượt tải chưa kịp bắt đầu) → coi như đang tải.
  const matches = bookingId !== null && state.bookingId === bookingId;

  return {
    materials: matches ? state.materials : [],
    loading: bookingId !== null && (!matches || state.loading),
    failed: matches && state.failed,
  };
}
