import type { AvailabilitySlot } from '../../../services/tutorDetail.service';
import { VerifyIcon } from './icons';
import { formatCurrency } from './utils';

interface BookingSidebarProps {
    hourlyRate: number | null;
    trialLessonPrice: number | null;
    availabilities: AvailabilitySlot[] | null;
    onBooking: () => void;
}

const DAY_LABELS: Record<number, string> = {
    0: "Chủ Nhật",
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
};

const BookingSidebar = ({ hourlyRate, trialLessonPrice, availabilities, onBooking }: BookingSidebarProps) => {
    const availabilityByDay = (availabilities || []).reduce((acc, slot) => {
        const key = slot.dayName || DAY_LABELS[slot.dayofweek] || `Thứ ${slot.dayofweek + 1}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
    }, {} as Record<string, AvailabilitySlot[]>);

    const hasAvailability = Object.keys(availabilityByDay).length > 0;

    return (
        <aside className="booking-sidebar">
            <div className="booking-card">
                <div className="booking-header">
                    <span className="booking-label">Bắt đầu lộ trình học thuật</span>
                    <div className="price-display">
                        <b className="price-amount">{formatCurrency(hourlyRate ? Math.round(hourlyRate * 1.05) : null)}</b>
                        <b className="price-unit">/ GIỜ HỌC</b>
                    </div>
                    {trialLessonPrice != null && trialLessonPrice > 0 && (
                        <div className="trial-price-label" title="Học phí ưu đãi cho buổi học đầu tiên">
                            ✨ Buổi học thử: {formatCurrency(trialLessonPrice)}
                        </div>
                    )}
                </div>

                <div className="booking-card-body">
                    {hasAvailability ? (
                        <div className="availability-schedule-container">
                            <div className="schedule-label">LỊCH DẠY</div>
                            <div className="schedule-list">
                                {Object.entries(availabilityByDay).map(([dayName, slots]) => (
                                    <div key={dayName} className="schedule-day-row">
                                        <div className="schedule-day-name">{dayName}</div>
                                        <div className="schedule-slots">
                                            {slots.map((s, idx) => (
                                                <span key={idx} className="schedule-time-chip">
                                                    {s.starttime} - {s.endtime}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-availability">
                            Chưa cập nhật lịch dạy
                        </div>
                    )}
                </div>

                <div className="booking-actions">
                    <button className="btn-start" onClick={onBooking}>
                        <b>ĐẶT LỊCH NGAY</b>
                    </button>
                </div>
            </div>

            <div className="verification-note">
                <div className="note-header">
                    <VerifyIcon />
                    <b>Đã xác minh bởi TUTORA Council</b>
                </div>
                <i className="note-text">Hoàn học phí nếu không hài lòng sau buổi học đầu tiên.</i>
            </div>
        </aside>
    );
};

export default BookingSidebar;
