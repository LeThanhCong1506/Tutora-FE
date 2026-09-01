// Từ vựng dùng chung cho trạng thái booking, để cả ba portal (gia sư / phụ huynh / học sinh)
// nói cùng một câu về cùng một tình trạng khoá học.
//
// ─── Vì sao cần đến những hàm này ─────────────────────────────────────────────
// Buổi 2..N của một khoá được tạo sẵn ngay lúc đặt lịch với trạng thái `reserved` và CỐ Ý ẩn
// khỏi mọi danh sách/lịch/thống kê cho tới khi phụ huynh trả nốt tiền (xem
// PaymentService.ActivateRemainingSessionsAsync ở BE). Hệ quả: "hết buổi đã mở" KHÔNG đồng
// nghĩa với "khoá học đã xong" — và nếu UI suy trạng thái chỉ từ số buổi đã mở thì một khoá
// vừa dạy xong buổi đầu sẽ bị báo là "hoàn thành".
//
// Nguồn duy nhất để nói một khoá đã hoàn thành là trạng thái của chính booking.
// Xem MV.DomainLayer/Constants/BookingStatus.cs.

const normalize = (status?: string | null): string => (status ?? '').trim().toLowerCase();

/** Khoá học đã kết thúc trọn vẹn — nguồn duy nhất để hiện nhãn "Hoàn thành". */
export const isBookingCompleted = (status?: string | null): boolean => normalize(status) === 'completed';

/**
 * Booking đã bị huỷ dưới mọi hình thức (phụ huynh huỷ, hết hạn thanh toán, staff huỷ vì phụ
 * huynh nghỉ ngang, huỷ theo kết quả tranh chấp). Các buổi chưa dạy của những booking này
 * không còn là lịch tương lai nữa.
 */
export const isBookingCancelled = (status?: string | null): boolean => {
  const value = normalize(status);
  return value.startsWith('cancelled') || value === 'payment_timeout';
};

/**
 * Vì sao khoá học còn buổi giữ chỗ mà chưa mở — nói theo VIỆC CẦN LÀM, không phải theo tên
 * trạng thái, vì người đọc (gia sư/phụ huynh/học sinh) không biết `pending_remaining_payment`
 * nghĩa là gì. Trả null khi trạng thái không tự giải thích được, để nơi gọi bỏ hẳn phần lý do
 * thay vì in ra một câu vô nghĩa.
 */
export const reservedSessionsReason = (status?: string | null): string | null => {
  switch (normalize(status)) {
    case 'deposit_paid':
    case 'pending_remaining_payment':
      return 'chờ thanh toán phần còn lại';
    case 'pending_tutor':
      return 'chờ gia sư xác nhận';
    case 'pending_payment':
      return 'chờ thanh toán';
    case 'accepted':
      return 'chờ thanh toán';
    default:
      return null;
  }
};
