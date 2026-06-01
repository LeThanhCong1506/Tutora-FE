import styles from "../styles.module.css";
import {
    disabledStyle,
    eyeBtn,
    fieldGroup,
    fieldInput,
    fieldLabel,
    saveBtn,
    sectionTitle,
    toggleBtn,
} from "./styles";
import { EyeIcon, EyeOffIcon } from "./icons";
import { getPasswordStrength } from "./utils";
import type { PasswordForm } from "./types";

interface Props {
    showPasswordSection: boolean;
    toggleSection: () => void;
    passwordForm: PasswordForm;
    setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
    changingPassword: boolean;
    showOldPw: boolean;
    setShowOldPw: React.Dispatch<React.SetStateAction<boolean>>;
    showNewPw: boolean;
    setShowNewPw: React.Dispatch<React.SetStateAction<boolean>>;
    showConfirmPw: boolean;
    setShowConfirmPw: React.Dispatch<React.SetStateAction<boolean>>;
    onSubmit: () => void;
}

const ChangePasswordSection: React.FC<Props> = ({
    showPasswordSection,
    toggleSection,
    passwordForm,
    setPasswordForm,
    changingPassword,
    showOldPw,
    setShowOldPw,
    showNewPw,
    setShowNewPw,
    showConfirmPw,
    setShowConfirmPw,
    onSubmit,
}) => {
    const pwStrength = getPasswordStrength(passwordForm.newPassword);

    return (
        <div className={styles.sectionCard}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(showPasswordSection
                        ? { marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f5f5f5" }
                        : {}),
                }}
            >
                <h3 style={sectionTitle}>Đổi mật khẩu</h3>
                <button style={toggleBtn} onClick={toggleSection} type="button">
                    {showPasswordSection ? "Đóng" : "Đổi mật khẩu"}
                </button>
            </div>

            {showPasswordSection && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={fieldGroup}>
                        <label style={fieldLabel}>Mật khẩu hiện tại</label>
                        <div style={{ position: "relative" }}>
                            <input
                                style={{ ...fieldInput, paddingRight: 40 }}
                                type={showOldPw ? "text" : "password"}
                                value={passwordForm.oldPassword}
                                onChange={e => setPasswordForm(f => ({ ...f, oldPassword: e.target.value }))}
                                placeholder="Nhập mật khẩu hiện tại"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPw(v => !v)}
                                style={eyeBtn}
                                aria-label="Toggle password"
                            >
                                {showOldPw ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.fieldGrid}>
                        <div style={fieldGroup}>
                            <label style={fieldLabel}>Mật khẩu mới</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    style={{ ...fieldInput, paddingRight: 40 }}
                                    type={showNewPw ? "text" : "password"}
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                    placeholder="Ít nhất 8 ký tự"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPw(v => !v)}
                                    style={eyeBtn}
                                    aria-label="Toggle password"
                                >
                                    {showNewPw ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {passwordForm.newPassword && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: "rgba(26,34,56,0.5)" }}>Độ mạnh</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: pwStrength.color }}>{pwStrength.label}</span>
                                    </div>
                                    <div style={{ width: "100%", height: 5, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: pwStrength.width, background: pwStrength.color, borderRadius: 999, transition: "all 0.3s ease" }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={fieldGroup}>
                            <label style={fieldLabel}>Xác nhận mật khẩu mới</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    style={{ ...fieldInput, paddingRight: 40 }}
                                    type={showConfirmPw ? "text" : "password"}
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="Nhập lại mật khẩu mới"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPw(v => !v)}
                                    style={eyeBtn}
                                    aria-label="Toggle password"
                                >
                                    {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                        <button
                            style={{ ...saveBtn, ...(changingPassword ? disabledStyle : {}) }}
                            onClick={onSubmit}
                            disabled={changingPassword}
                            type="button"
                        >
                            {changingPassword ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChangePasswordSection;
