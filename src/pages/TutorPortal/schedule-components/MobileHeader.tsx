import type { Dayjs } from "dayjs";
import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import type { ActiveTab, ViewMode } from "./types";

interface Props {
    currentDate: Dayjs;
    activeTab: ActiveTab;
    viewMode: ViewMode;
    isCurrentPeriod: boolean;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onTabChange: (tab: ActiveTab) => void;
    onViewModeChange: (v: ViewMode) => void;
}

const MobileHeader: React.FC<Props> = ({
    currentDate,
    activeTab,
    viewMode,
    isCurrentPeriod,
    onPrev,
    onNext,
    onToday,
    onTabChange,
    onViewModeChange,
}) => {
    return (
        <>
            <div className={styles.mobileGcalHeader}>
                <button className={styles.mobileMonthBtn} onClick={onPrev}>
                    <ChevronLeftIcon />
                </button>
                <span className={styles.mobileMonthLabel}>{`Tháng ${currentDate.format("M")}`}</span>
                <button className={styles.mobileMonthBtn} onClick={onNext}>
                    <ChevronRightIcon />
                </button>
                <button
                    className={`${styles.mobileTodayBtn} ${isCurrentPeriod ? styles.disabled : ""}`}
                    onClick={onToday}
                    disabled={isCurrentPeriod}
                >
                    Hôm nay
                </button>
                <div className={styles.mobileTabSwitch}>
                    <button
                        className={`${styles.mobileTabBtn} ${activeTab === "settings" ? styles.active : ""}`}
                        onClick={() => onTabChange("settings")}
                    >
                        ⚙
                    </button>
                    <button
                        className={`${styles.mobileTabBtn} ${activeTab === "lessons" ? styles.active : ""}`}
                        onClick={() => onTabChange("lessons")}
                    >
                        📅
                    </button>
                </div>
            </div>
            <div className={styles.mobileViewRow}>
                <div className={styles.mobileViewToggle}>
                    <button
                        className={`${styles.mobileViewBtn} ${viewMode === "day" ? styles.active : ""}`}
                        onClick={() => onViewModeChange("day")}
                    >
                        Ngày
                    </button>
                    <button
                        className={`${styles.mobileViewBtn} ${viewMode === "week" ? styles.active : ""}`}
                        onClick={() => onViewModeChange("week")}
                    >
                        Tuần
                    </button>
                    <button
                        className={`${styles.mobileViewBtn} ${viewMode === "month" ? styles.active : ""}`}
                        onClick={() => onViewModeChange("month")}
                    >
                        Tháng
                    </button>
                </div>
            </div>
        </>
    );
};

export default MobileHeader;
