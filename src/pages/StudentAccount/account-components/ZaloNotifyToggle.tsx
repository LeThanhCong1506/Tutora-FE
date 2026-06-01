import styles from "../styles.module.css";

interface Props {
    enabled: boolean;
    onToggle: () => void;
}

const ZaloNotifyToggle: React.FC<Props> = ({ enabled, onToggle }) => (
    <div className={styles.sectionCard}>
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f5f5f5" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a2238", margin: 0 }}>Thông báo Zalo</h3>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <p style={{ fontSize: 14, color: "#1a2238", margin: 0, fontWeight: 500 }}>Nhận thông báo qua Zalo</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Nhắc lịch học, báo cáo buổi học</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                aria-label="Toggle Zalo notifications"
                style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    flexShrink: 0,
                    background: enabled ? "#1a2238" : "#e5e5e5",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                }}
            >
                <span
                    style={{
                        position: "absolute",
                        top: 3,
                        left: enabled ? 21 : 3,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                        display: "block",
                    }}
                />
            </button>
        </div>
    </div>
);

export default ZaloNotifyToggle;
