import type { AvailabilitySlot } from '../../../services/tutorDetail.service';

interface BookingSidebarProps {
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
    7: "Chủ Nhật",
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0, 7];

const timeToMinutes = (time: string) => {
    const [hour = "0", minute = "0"] = time.split(":");
    return Number(hour) * 60 + Number(minute);
};

const BookingSidebar = ({ availabilities, onBooking }: BookingSidebarProps) => {
    const availabilityGroups = DAY_ORDER
        .map((day) => {
            const slots = (availabilities || [])
                .filter((slot) => slot.dayofweek === day)
                .sort((a, b) => timeToMinutes(a.starttime) - timeToMinutes(b.starttime));

            return {
                day,
                dayName: DAY_LABELS[day],
                slots,
            };
        })
        .filter((group) => group.slots.length > 0);

    const totalSlots = availabilityGroups.reduce((sum, group) => sum + group.slots.length, 0);
    const hasAvailability = availabilityGroups.length > 0;

    return (
        <aside className="booking-sidebar">
            <div className="booking-card">
                <div className="booking-header">
                    <span className="booking-label">Bắt đầu lộ trình học thuật</span>
                </div>

                <div className="booking-card-body">
                    {hasAvailability ? (
                        <div className="availability-schedule-container">
                            <div className="schedule-heading">
                                <div>
                                    <div className="schedule-label">Lịch dạy</div>
                                    <div className="schedule-count">
                                        {availabilityGroups.length} ngày · {totalSlots} khung giờ
                                    </div>
                                </div>
                            </div>
                            <div className="schedule-list">
                                {availabilityGroups.map(({ day, dayName, slots }) => (
                                    <div key={day} className="schedule-day-row">
                                        <div className="schedule-day-summary">
                                            <div className="schedule-day-name">{dayName}</div>
                                            <div className="schedule-day-count">
                                                {slots.length} khung giờ
                                            </div>
                                        </div>
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
        </aside>
    );
};

export default BookingSidebar;
