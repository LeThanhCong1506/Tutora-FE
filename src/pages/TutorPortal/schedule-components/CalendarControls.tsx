import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import type { ViewMode } from "./types";

interface Props {
    viewMode: ViewMode;
    dateRangeText: string;
    isCurrentPeriod: boolean;
    onViewModeChange: (v: ViewMode) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

const CalendarControls: React.FC<Props> = ({
    viewMode,
    dateRangeText,
    isCurrentPeriod,
    onViewModeChange,
    onPrev,
    onNext,
    onToday,
}) => {
    return (
        <div className={styles.calendarControls}>
            <div className={styles.viewToggle}>
                <button
                    className={`${styles.viewBtn} ${viewMode === "day" ? styles.active : ""}`}
                    onClick={() => onViewModeChange("day")}
                >
                    Ngày
                </button>
                <button
                    className={`${styles.viewBtn} ${viewMode === "week" ? styles.active : ""}`}
                    onClick={() => onViewModeChange("week")}
                >
                    Tuần
                </button>
                <button
                    className={`${styles.viewBtn} ${viewMode === "month" ? styles.active : ""}`}
                    onClick={() => onViewModeChange("month")}
                >
                    Tháng
                </button>
            </div>

            <div className={styles.dateNav}>
                <button className={styles.navBtn} onClick={onPrev}>
                    <ChevronLeftIcon />
                </button>
                <span className={styles.dateRange}>{dateRangeText}</span>
                <button className={styles.navBtn} onClick={onNext}>
                    <ChevronRightIcon />
                </button>
                <button
                    className={`${styles.nowBtn} ${isCurrentPeriod ? styles.active : ""}`}
                    onClick={onToday}
                    disabled={isCurrentPeriod}
                >
                    Hôm nay
                </button>
            </div>
        </div>
    );
};

export default CalendarControls;
