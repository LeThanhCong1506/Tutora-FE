interface Props {
    tutorName: string;
    bookingId: number | null;
    onClose: () => void;
}

/**
 * Booking success overlay — đồng bộ với Next.js version (web-next/.../BookingModal.tsx).
 * Cùng class names + structure để CSS share design tokens. Step 1 active vì user
 * vừa tạo booking → flow tiếp theo là "Gia sư xem xét yêu cầu".
 */
const BookingSuccessOverlay: React.FC<Props> = ({ tutorName, bookingId, onClose }) => (
    <div className="bm-success-overlay">
        <div className="bm-success-content">
            <div className="bm-success-icon-wrap">
                <div className="bm-success-icon">
                    <svg className="bm-success-checkmark" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                </div>
            </div>
            <h3 className="bm-success-title">Đặt lịch thành công!</h3>
            <p className="bm-success-desc">
                Yêu cầu booking của bạn đã được gửi đến <strong>{tutorName}</strong>. Gia sư sẽ xác nhận
                trong thời gian sớm nhất.
            </p>
            {bookingId && (
                <div className="bm-success-booking-id">
                    <span>Mã booking</span>
                    <strong>#{bookingId}</strong>
                </div>
            )}
            <div className="bm-success-steps">
                <div className="bm-success-step is-active">
                    <strong>1</strong>
                    <span>Gia sư xem xét yêu cầu</span>
                </div>
                <div className="bm-success-step">
                    <strong>2</strong>
                    <span>Xác nhận &amp; thanh toán</span>
                </div>
                <div className="bm-success-step">
                    <strong>3</strong>
                    <span>Bắt đầu học</span>
                </div>
            </div>
            <button className="bm-success-close-btn" onClick={onClose} type="button">
                Đóng
            </button>
        </div>
    </div>
);

export default BookingSuccessOverlay;
