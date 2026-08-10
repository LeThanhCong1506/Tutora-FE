/**
 * Lưu tạm "đang thanh toán booking nào, của gia sư nào" khi popup đặt lịch
 * (BookingModal, không có URL riêng) phải điều hướng thật sang trang hồ sơ
 * để nhập SĐT phụ huynh. Sau khi lưu SĐT xong, StudentProfile đọc lại giá trị
 * này để quay về đúng popup đang thanh toán dở, thay vì về trang chủ.
 *
 * sessionStorage (không phải localStorage): chỉ cần sống sót qua đúng 1 lần
 * điều hướng đi-về trong cùng tab, không cần tồn tại lâu dài như phiên đăng nhập.
 */
const RESUME_KEY = 'TUTORA_booking_otp_resume';

export interface BookingOtpResumePayload {
    bookingId: number;
    tutorId: string;
}

export const setBookingOtpResume = (payload: BookingOtpResumePayload): void => {
    try {
        sessionStorage.setItem(RESUME_KEY, JSON.stringify(payload));
    } catch {
        // sessionStorage không khả dụng (chế độ ẩn danh nghiêm ngặt, v.v.) — bỏ qua,
        // người dùng sẽ chỉ không được tự động quay lại popup, không phải lỗi nghiêm trọng.
    }
};

/** Đọc rồi xoá luôn — đích chỉ dùng đúng một lần, tránh resume nhầm ở lượt thanh toán sau. */
export const takeBookingOtpResume = (): BookingOtpResumePayload | null => {
    try {
        const raw = sessionStorage.getItem(RESUME_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(RESUME_KEY);
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.bookingId === 'number' && typeof parsed.tutorId === 'string') {
            return parsed as BookingOtpResumePayload;
        }
        return null;
    } catch {
        return null;
    }
};
