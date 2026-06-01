import dayjs, { Dayjs } from "dayjs";
import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { DAYS_OF_WEEK } from "./constants";
import { isToday, formatTotalHoursLabel } from "./utils";
import type { LocalAvailabilitySlot } from "./types";
import type { CalendarLesson } from "../../../services/lesson.service";

interface Props {
    mode: "availability" | "lessons";
    currentDate: Dayjs;
    monthDays: Dayjs[];
    onDayClick: (date: Dayjs) => void;
    getDayAvailability?: (date: Dayjs) => LocalAvailabilitySlot[];
    getDayLessons?: (date: Dayjs) => CalendarLesson[];
}

const MonthView: React.FC<Props> = ({
    mode,
    currentDate,
    monthDays,
    onDayClick,
    getDayAvailability,
    getDayLessons,
}) => {
    return (
        <div className={styles.monthGrid}>
            <div className={styles.monthHeader}>
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className={styles.monthHeaderCell}>{d}</div>
                ))}
            </div>
            <div className={styles.monthBody}>
                {monthDays.map((date, i) => {
                    const isCurrentMonth = date.month() === currentDate.month();
                    const cellClass = `${styles.monthCell} ${!isCurrentMonth ? styles.otherMonth : ""} ${isToday(date) ? styles.todayCell : ""}`;

                    if (mode === "availability" && getDayAvailability) {
                        const daySlots = getDayAvailability(date);
                        const totalMinutes = daySlots.reduce((sum, s) => sum + s.durationMinutes, 0);
                        const hoursLabel = formatTotalHoursLabel(totalMinutes);
                        return (
                            <div key={i} className={cellClass} onClick={() => onDayClick(date)}>
                                <span className={styles.monthCellDay}>{date.format("D")}</span>
                                {daySlots.length > 0 && (
                                    <div className={styles.monthCellDots}>
                                        <div
                                            className={styles.monthDotAvail}
                                            title={daySlots.map(s => `${s.startTime}-${s.endTime}`).join(", ")}
                                        />
                                        <span className={styles.monthHoursLabel}>{hoursLabel}</span>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    const dayLessons = getDayLessons ? getDayLessons(date) : [];
                    return (
                        <div key={i} className={cellClass} onClick={() => onDayClick(date)}>
                            <span className={styles.monthCellDay}>{date.format("D")}</span>
                            {dayLessons.length > 0 && (
                                <div className={styles.monthCellDots}>
                                    {dayLessons.slice(0, 3).map((l, j) => (
                                        <div
                                            key={j}
                                            className={styles.monthDotLesson}
                                            title={`${l.subjectName || ""} ${dayjs(l.scheduledStart).format("HH:mm")}`}
                                        />
                                    ))}
                                    {dayLessons.length > 3 && (
                                        <span className={styles.monthMore}>+{dayLessons.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;
