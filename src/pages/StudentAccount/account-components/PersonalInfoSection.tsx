import styles from "../styles.module.css";
import {
    actionRow,
    cancelBtn,
    disabledStyle,
    fieldGroup,
    fieldInput,
    fieldLabel,
    fieldValue,
    readOnlyHint,
    saveBtn,
    sectionHeader,
    sectionTitle,
} from "./styles";
import { formatDate, genderDisplay } from "./utils";
import type { EditForm, UserProfileData } from "./types";

interface Props {
    profile: UserProfileData | null;
    form: EditForm;
    setForm: React.Dispatch<React.SetStateAction<EditForm>>;
    editing: boolean;
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
}

const PersonalInfoSection: React.FC<Props> = ({
    profile,
    form,
    setForm,
    editing,
    saving,
    onSave,
    onCancel,
}) => (
    <div className={styles.sectionCard}>
        <div style={sectionHeader}>
            <h3 style={sectionTitle}>Thông tin cá nhân</h3>
        </div>

        <div className={styles.fieldGrid}>
            <div style={fieldGroup}>
                <label style={fieldLabel}>Số điện thoại</label>
                <p style={{ ...fieldValue, color: profile?.phone ? "#1a2238" : "#9ca3af" }}>
                    {profile?.phone || "Chưa cập nhật"}
                </p>
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>Email</label>
                <p style={{ ...fieldValue, color: "#525252" }}>{profile?.email || "—"}</p>
                <span style={readOnlyHint}>Không thể thay đổi</span>
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>Họ và tên</label>
                {editing ? (
                    <input
                        style={fieldInput}
                        value={form.fullname}
                        onChange={e => setForm(f => ({ ...f, fullname: e.target.value }))}
                        maxLength={100}
                        placeholder="Nhập họ và tên"
                    />
                ) : (
                    <p style={fieldValue}>{profile?.fullname || "—"}</p>
                )}
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>Ngày sinh</label>
                {editing ? (
                    <input
                        style={fieldInput}
                        type="date"
                        value={form.birthdate}
                        onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
                    />
                ) : (
                    <p style={fieldValue}>{formatDate(profile?.birthdate)}</p>
                )}
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>Giới tính</label>
                {editing ? (
                    <select
                        style={fieldInput}
                        value={form.gender}
                        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    >
                        <option value="">Chọn giới tính</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                    </select>
                ) : (
                    <p style={fieldValue}>{genderDisplay(profile?.gender)}</p>
                )}
            </div>

            <div style={{ ...fieldGroup, gridColumn: "1 / -1" }}>
                <label style={fieldLabel}>Địa chỉ</label>
                {editing ? (
                    <input
                        style={fieldInput}
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        maxLength={255}
                        placeholder="Nhập địa chỉ"
                    />
                ) : (
                    <p style={fieldValue}>{profile?.address || "—"}</p>
                )}
            </div>
        </div>

        {editing && (
            <div style={actionRow}>
                <button style={cancelBtn} onClick={onCancel} type="button">Hủy</button>
                <button
                    style={{ ...saveBtn, ...(saving ? disabledStyle : {}) }}
                    onClick={onSave}
                    disabled={saving}
                    type="button"
                >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
            </div>
        )}
    </div>
);

export default PersonalInfoSection;
