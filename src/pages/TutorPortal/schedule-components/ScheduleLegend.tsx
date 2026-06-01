import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { ZoomInIcon, ZoomOutIcon } from "./icons";
import { DEFAULT_ROW_HEIGHT, MAX_ROW_HEIGHT, MIN_ROW_HEIGHT } from "./constants";
import type { ActiveTab, ViewMode } from "./types";

interface Props {
    activeTab: ActiveTab;
    viewMode: ViewMode;
    rowHeight: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

const ScheduleLegend: React.FC<Props> = ({
    activeTab,
    viewMode,
    rowHeight,
    onZoomIn,
    onZoomOut,
    onZoomReset,
}) => {
    const isSettings = activeTab === "settings";
    const showZoom = viewMode !== "month";

    return (
        <div className={styles.legend}>
            <div className={styles.legendItem}>
                <div
                    className={styles.legendDot}
                    style={isSettings ? undefined : { backgroundColor: "#3d4a3e" }}
                />
                <span>{isSettings ? "Rảnh" : "Buổi học"}</span>
            </div>
            {isSettings && showZoom && (
                <div className={styles.legendItem}>
                    <span className={styles.dragHintDesktop} style={{ color: "rgba(79, 140, 255, 0.6)", fontSize: "9px", fontStyle: "italic", letterSpacing: "0" }}>
                        ✦ Kéo trên lưới để tạo lịch rảnh
                    </span>
                    <span className={styles.dragHintMobile} style={{ color: "rgba(79, 140, 255, 0.6)", fontSize: "9px", fontStyle: "italic", letterSpacing: "0" }}>
                        ✦ Nhấn giữ trên lưới hoặc nút (+) góc dưới để tạo lịch rảnh
                    </span>
                </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                <div className={styles.timezone} style={isSettings ? undefined : { marginRight: "12px" }}>
                    UTC+7 • Giờ Việt Nam
                </div>
                {showZoom && (
                    isSettings ? (
                        <div className={styles.zoomControls}>
                            <button onClick={onZoomOut} disabled={rowHeight <= MIN_ROW_HEIGHT} className={styles.zoomBtn} title="Thu nhỏ">
                                <ZoomOutIcon />
                            </button>
                            <button onClick={onZoomReset} className={styles.zoomLabel} title="Mặc định">
                                {Math.round((rowHeight / DEFAULT_ROW_HEIGHT) * 100)}%
                            </button>
                            <button onClick={onZoomIn} disabled={rowHeight >= MAX_ROW_HEIGHT} className={styles.zoomBtn} title="Phóng to">
                                <ZoomInIcon />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "#f5f5f5", borderRadius: "6px", padding: "2px" }}>
                            <button onClick={onZoomOut} disabled={rowHeight <= MIN_ROW_HEIGHT} style={{ background: "none", border: "none", cursor: rowHeight <= MIN_ROW_HEIGHT ? "not-allowed" : "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center", opacity: rowHeight <= MIN_ROW_HEIGHT ? 0.3 : 1, color: "#555" }} title="Thu nhỏ">
                                <ZoomOutIcon />
                            </button>
                            <button onClick={onZoomReset} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", fontSize: "11px", fontWeight: 600, color: "#555", borderRadius: "4px" }} title="Mặc định">
                                {Math.round((rowHeight / DEFAULT_ROW_HEIGHT) * 100)}%
                            </button>
                            <button onClick={onZoomIn} disabled={rowHeight >= MAX_ROW_HEIGHT} style={{ background: "none", border: "none", cursor: rowHeight >= MAX_ROW_HEIGHT ? "not-allowed" : "pointer", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center", opacity: rowHeight >= MAX_ROW_HEIGHT ? 0.3 : 1, color: "#555" }} title="Phóng to">
                                <ZoomInIcon />
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default ScheduleLegend;
