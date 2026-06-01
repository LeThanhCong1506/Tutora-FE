import styles from "../styles.module.css";
import {
    avatarImg,
    avatarInitials,
    editBtn,
    memberSince,
    profileMeta,
    profileName,
    roleBadge,
} from "./styles";
import { SpinnerIcon } from "./icons";
import type { UserProfileData } from "./types";
import { formatDateTime } from "../../../utils/formatters";

interface Props {
    profile: UserProfileData | null;
    displayName: string;
    initials: string;
    uploadingAvatar: boolean;
    editing: boolean;
    avatarInputRef: React.RefObject<HTMLInputElement | null>;
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEditClick: () => void;
    onViewAvatar: () => void;
}

const ProfileHeaderCard: React.FC<Props> = ({
    profile,
    displayName,
    initials,
    uploadingAvatar,
    editing,
    avatarInputRef,
    onAvatarChange,
    onEditClick,
    onViewAvatar,
}) => (
    <div className={styles.profileCard}>
        <div className={styles.avatarGroup}>
            <div
                className={styles.avatarWrapper}
                onClick={() => profile?.avatarurl && onViewAvatar()}
                title={profile?.avatarurl ? "Nhấn để xem ảnh" : undefined}
            >
                {profile?.avatarurl ? (
                    <img src={profile.avatarurl} alt={displayName} style={avatarImg} />
                ) : (
                    <span style={avatarInitials}>{initials}</span>
                )}
                {profile?.avatarurl && (
                    <div className={styles.avatarViewOverlay}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                )}
            </div>
            <button
                className={styles.avatarChangeBtn}
                onClick={() => avatarInputRef.current?.click()}
                title="Đổi ảnh đại diện"
                type="button"
            >
                {uploadingAvatar ? (
                    <SpinnerIcon size={13} stroke="white" />
                ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                )}
            </button>
        </div>
        <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={onAvatarChange}
        />
        <div style={profileMeta}>
            <h2 style={profileName}>{displayName}</h2>
            <span style={roleBadge}>STUDENT</span>
            {profile?.createdat && (
                <p style={memberSince}>
                    Thành viên từ {new Date(profile.createdat).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                </p>
            )}
            {(profile?.lastloginat || (profile as any)?.lastLoginAt) && (
                <p style={{ ...memberSince, marginTop: 4 }}>
                    Đăng nhập lần cuối: {formatDateTime(profile?.lastloginat || (profile as any)?.lastLoginAt)}
                </p>
            )}
        </div>
        {!editing && (
            <button style={editBtn} onClick={onEditClick} type="button">
                Chỉnh sửa
            </button>
        )}
    </div>
);

export default ProfileHeaderCard;
