import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { PlusIcon } from "./icons";
import type { ActiveTab } from "./types";

interface Props {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    onAddAvailability: () => void;
}

const DesktopHeader: React.FC<Props> = ({ activeTab, onTabChange, onAddAvailability }) => {
    return (
        <div className={styles.headerSection}>
            <div className={styles.headerTop}>
                <h1 className={styles.pageTitle}>Lịch dạy</h1>
                <div className={styles.headerActions}>
                    <button className={styles.addBtn} onClick={onAddAvailability}>
                        <PlusIcon />
                        <span>Thêm lịch rảnh</span>
                    </button>
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
                    onClick={() => onTabChange("settings")}
                >
                    Cài đặt lịch
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "lessons" ? styles.active : ""}`}
                    onClick={() => onTabChange("lessons")}
                >
                    Lịch dạy
                </button>
            </div>
        </div>
    );
};

export default DesktopHeader;
