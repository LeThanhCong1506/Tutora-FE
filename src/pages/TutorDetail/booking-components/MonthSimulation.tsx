import { CalendarRange } from "lucide-react";
import styles from "./bookingModal.module.css";
import { toDateKey } from "./utils";
import type { BookingSlot } from "./types";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

interface Props {
    slots: BookingSlot[];
    windowStart: Date;
    windowEnd: Date;
    variant?: "side" | "confirm";
}

// Lịch tháng mô phỏng: vẽ các tháng mà cửa sổ booking chạm tới, tô đậm ngày có buổi học.
const MonthSimulation: React.FC<Props> = ({ slots, windowStart, windowEnd, variant = "side" }) => {
    const countByDate = new Map<string, number>();
    slots.forEach((slot) => countByDate.set(slot.date, (countByDate.get(slot.date) ?? 0) + 1));

    const months: { year: number; month: number }[] = [];
    let cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
    const lastMonth = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), 1);
    while (cursor <= lastMonth) {
        months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const inWindow = (date: Date) => date >= windowStart && date <= windowEnd;

    return (
        <aside className={`${styles.monthSim} ${variant === "confirm" ? styles.monthSimConfirm : ""}`}>
            <div className={styles.monthSimHead}>
                <CalendarRange size={15} />
                <span>Lịch học theo tháng</span>
            </div>

            {slots.length > 0 && (
                <div className={styles.monthSimMonths}>
                    {months.map(({ year, month }) => {
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // canh Thứ 2 đầu tuần
                        return (
                            <div key={`${year}-${month}`} className={styles.monthSimGrid}>
                                <div className={styles.monthSimTitle}>
                                    Tháng {month + 1}/{year}
                                </div>
                                <div className={styles.monthSimWeekdays}>
                                    {WEEKDAY_LABELS.map((label) => (
                                        <span key={label}>{label}</span>
                                    ))}
                                </div>
                                <div className={styles.monthSimDays}>
                                    {Array.from({ length: leadingBlanks }, (_, index) => (
                                        <span key={`blank-${index}`} className={styles.monthSimBlank} />
                                    ))}
                                    {Array.from({ length: daysInMonth }, (_, index) => {
                                        const day = index + 1;
                                        const date = new Date(year, month, day);
                                        const count = countByDate.get(toDateKey(date)) ?? 0;
                                        const muted = !inWindow(date);
                                        return (
                                            <span
                                                key={day}
                                                className={`${styles.monthSimDay} ${count > 0 ? styles.monthSimDayActive : ""} ${
                                                    muted ? styles.monthSimDayMuted : ""
                                                }`}
                                                title={count > 0 ? `${day}/${month + 1}: ${count} buổi` : undefined}
                                            >
                                                {day}
                                                {count > 0 && (
                                                    <span className={styles.monthSimDots} aria-hidden="true">
                                                        {Array.from({ length: count }, (_, dotIndex) => (
                                                            <i key={dotIndex} className={styles.monthSimDot} />
                                                        ))}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </aside>
    );
};

export default MonthSimulation;
