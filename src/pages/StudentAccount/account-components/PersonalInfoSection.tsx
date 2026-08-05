import { Lock } from "lucide-react";
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
import type { UserProfileFieldErrors } from "../../../utils/userProfileForm";

interface Props {
    profile: UserProfileData | null;
    form: EditForm;
    setForm: React.Dispatch<React.SetStateAction<EditForm>>;
    editing: boolean;
    saving: boolean;
    errors: UserProfileFieldErrors;
    setErrors: React.Dispatch<React.SetStateAction<UserProfileFieldErrors>>;
    onSave: () => void;
    onCancel: () => void;
}

const required = <span style={{ color: "#dc2626" }}> *</span>;
const errorTextStyle: React.CSSProperties = { fontSize: 12, color: "#dc2626", marginTop: 2 };

const PersonalInfoSection: React.FC<Props> = ({
    profile,
    form,
    setForm,
    editing,
    saving,
    errors,
    setErrors,
    onSave,
    onCancel,
}) => {
    // Cập nhật 1 field + xóa lỗi của field đó.
    const updateField = (field: keyof EditForm, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => (e[field] ? { ...e, [field]: undefined } : e));
    };

    // BE chặn và bỏ qua thay đổi ngày sinh khi CCCD đã xác thực (UserService.UpdateUserAsync) — khóa luôn ở FE.
    const birthdateLocked = profile?.isidentityverified === true;

    return (
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
                <label style={fieldLabel}>Họ và tên{editing && required}</label>
                {editing ? (
                    <>
                        <input
                            style={{ ...fieldInput, ...(errors.fullname ? { borderColor: "#dc2626" } : {}) }}
                            value={form.fullname}
                            onChange={e => updateField("fullname", e.target.value)}
                            maxLength={100}
                            placeholder="Nhập họ và tên"
                        />
                        {errors.fullname && <span style={errorTextStyle}>{errors.fullname}</span>}
                    </>
                ) : (
                    <p style={fieldValue}>{profile?.fullname || "—"}</p>
                )}
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>
                    Ngày sinh{editing && required}
                    {editing && birthdateLocked && <Lock size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
                </label>
                {editing ? (
                    <>
                        <input
                            style={{
                                ...fieldInput,
                                ...(errors.birthdate ? { borderColor: "#dc2626" } : {}),
                                ...(birthdateLocked ? disabledStyle : {}),
                            }}
                            type="date"
                            value={form.birthdate}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={e => updateField("birthdate", e.target.value)}
                            disabled={birthdateLocked}
                        />
                        {birthdateLocked ? (
                            <span style={readOnlyHint}>Đã xác minh qua CCCD, không thể chỉnh sửa.</span>
                        ) : (
                            errors.birthdate && <span style={errorTextStyle}>{errors.birthdate}</span>
                        )}
                    </>
                ) : (
                    <p style={fieldValue}>{formatDate(profile?.birthdate)}</p>
                )}
            </div>

            <div style={fieldGroup}>
                <label style={fieldLabel}>Giới tính{editing && required}</label>
                {editing ? (
                    <>
                        <select
                            style={{ ...fieldInput, ...(errors.gender ? { borderColor: "#dc2626" } : {}) }}
                            value={form.gender}
                            onChange={e => updateField("gender", e.target.value)}
                        >
                            <option value="">Chọn giới tính</option>
                            <option value="Male">Nam</option>
                            <option value="Female">Nữ</option>
                            <option value="Other">Khác</option>
                        </select>
                        {errors.gender && <span style={errorTextStyle}>{errors.gender}</span>}
                    </>
                ) : (
                    <p style={fieldValue}>{genderDisplay(profile?.gender)}</p>
                )}
            </div>

            <div style={{ ...fieldGroup, gridColumn: "1 / -1" }}>
                <label style={fieldLabel}>Địa chỉ{editing && required}</label>
                {editing ? (
                    <>
                        <input
                            style={{ ...fieldInput, ...(errors.address ? { borderColor: "#dc2626" } : {}) }}
                            value={form.address}
                            onChange={e => updateField("address", e.target.value)}
                            maxLength={255}
                            placeholder="Nhập địa chỉ"
                        />
                        {errors.address && <span style={errorTextStyle}>{errors.address}</span>}
                    </>
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
};

export default PersonalInfoSection;
