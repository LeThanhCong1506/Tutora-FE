interface Props {
    message: string;
    onClose: () => void;
}

const BookingErrorToast: React.FC<Props> = ({ message, onClose }) => (
    <div className="bm-toast-error">
        <div className="bm-toast-error-icon">✕</div>
        <div className="bm-toast-error-content">
            <div className="bm-toast-error-title">Đặt lịch thất bại</div>
            <div className="bm-toast-error-msg">{message}</div>
        </div>
        <button className="bm-toast-error-close" onClick={onClose} type="button">✕</button>
    </div>
);

export default BookingErrorToast;
