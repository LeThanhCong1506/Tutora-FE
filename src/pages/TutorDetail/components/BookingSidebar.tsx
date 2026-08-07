import type { AvailabilitySlot } from '../../../services/tutorDetail.service';
import { CalendarIcon } from './icons';

interface BookingSidebarProps {
    availabilities: AvailabilitySlot[] | null;
    onBooking: () => void;
    onMessage: () => void;
    messaging?: boolean;
}

const DAY_LABELS: Record<number, string> = {
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
    7: 'Chủ Nhật',
};

const SHORT_DAY_LABELS: Record<number, string> = {
    1: 'T2',
    2: 'T3',
    3: 'T4',
    4: 'T5',
    5: 'T6',
    6: 'T7',
    7: 'CN',
};

const pad2 = (num: number): string => String(num).padStart(2, '0');

const normalizeTimeToHHmm = (time: string): string => {
    const trimmed = (time || '').trim();
    const amPm = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (amPm) {
        let hour = Number(amPm[1]);
        const minute = Number(amPm[2]);
        const suffix = amPm[3].toUpperCase();
        if (suffix === 'AM' && hour === 12) hour = 0;
        if (suffix === 'PM' && hour !== 12) hour += 12;
        return `${pad2(hour)}:${pad2(minute)}`;
    }

    const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHour) {
        return `${pad2(Number(twentyFourHour[1]))}:${pad2(Number(twentyFourHour[2]))}`;
    }

    return '';
};

const timeToMinutes = (time: string): number => {
    const normalized = normalizeTimeToHHmm(time);
    if (!normalized) return NaN;
    const [hour, minute] = normalized.split(':').map(Number);
    return hour * 60 + minute;
};

const minutesToTime = (minutes: number): string => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

const toIsoDay = (date: Date): number => {
    const day = date.getDay();
    return day === 0 ? 7 : day;
};

const isSameAvailabilityDay = (slotDay: number, isoDay: number): boolean => {
    if (isoDay === 7) return slotDay === 0 || slotDay === 7;
    return slotDay === isoDay;
};

const expandAvailabilityTimes = (slot: AvailabilitySlot): string[] => {
    const start = timeToMinutes(slot.starttime);
    const end = timeToMinutes(slot.endtime);

    if (!Number.isFinite(start)) return [];
    if (!Number.isFinite(end) || end <= start) return [minutesToTime(start)];

    const times: string[] = [];
    for (let minute = start; minute < end; minute += 30) {
        times.push(minutesToTime(minute));
    }

    return times;
};

const buildWeekSchedule = (availabilities: AvailabilitySlot[] | null) => {
    const todayIsoDay = toIsoDay(new Date());

    // Tuần cố định: T2 (1) → Chủ Nhật (7).
    return Array.from({ length: 7 }, (_, index) => {
        const isoDay = index + 1;
        const times = (availabilities || [])
            .filter((slot) => isSameAvailabilityDay(slot.dayofweek, isoDay))
            .flatMap(expandAvailabilityTimes)
            .filter((time, idx, list) => list.indexOf(time) === idx)
            .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

        return {
            isoDay,
            shortDayName: SHORT_DAY_LABELS[isoDay],
            fullDayName: DAY_LABELS[isoDay],
            isToday: isoDay === todayIsoDay,
            times,
        };
    });
};

const BookingSidebar = ({ availabilities, onBooking, onMessage, messaging = false }: BookingSidebarProps) => {
    const weekSchedule = buildWeekSchedule(availabilities);
    const hasAvailability = weekSchedule.some((day) => day.times.length > 0);

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
                                <span className="schedule-label">
                                    <CalendarIcon />
                                    Lịch rảnh của gia sư
                                </span>
                            </div>

                            <div className="schedule-week-strip" aria-label="Lịch rảnh của gia sư theo tuần">
                                <div className="schedule-week-grid">
                                    {weekSchedule.map((day) => (
                                        <div
                                            key={day.isoDay}
                                            className={`schedule-week-day ${day.times.length > 0 ? 'has-slots' : 'is-empty'}${day.isToday ? ' is-today' : ''}`}
                                        >
                                            <div className="schedule-week-day-header" title={day.fullDayName}>
                                                <span className="schedule-weekday">{day.shortDayName}</span>
                                            </div>

                                            <div className="schedule-time-list">
                                                {day.times.length > 0 ? (
                                                    day.times.map((time) => (
                                                        <span
                                                            key={time}
                                                            className="schedule-time-chip"
                                                            aria-label={`${day.fullDayName}, ${time}`}
                                                        >
                                                            {time}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="schedule-empty-mark" aria-hidden="true" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-availability">Chưa cập nhật lịch rảnh</div>
                    )}
                </div>

                <div className="booking-actions">
                    <button className="btn-start" onClick={onBooking}>
                        <b>Đặt lịch ngay</b>
                    </button>
                    <button className="btn-chat" onClick={onMessage} disabled={messaging}>
                        {messaging ? 'Đang mở...' : 'Nhắn tin với gia sư'}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default BookingSidebar;
