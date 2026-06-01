import { isZaloMiniApp } from "../../services/zalo-env";
import styles from "./styles.module.css";
import {
    AcademicInfoNote,
    AvatarCropModal,
    AvatarLightbox,
    ChangePasswordSection,
    PersonalInfoSection,
    ProfileHeaderCard,
    ZaloNotifyToggle,
    useAvatarUpload,
    useChangePassword,
    useUserProfile,
    useZaloNotify,
} from "./account-components";
import { getInitials } from "./account-components/utils";
import { pageHeader, pageSubtitle, pageTitle } from "./account-components/styles";

const inMiniApp = isZaloMiniApp();

const StudentAccount = () => {
    const {
        profile,
        setProfile,
        loading,
        saving,
        editing,
        setEditing,
        form,
        setForm,
        handleSave,
        handleCancel,
    } = useUserProfile();

    const {
        avatarInputRef,
        uploadingAvatar,
        previewUrl,
        crop,
        setCrop,
        zoom,
        setZoom,
        onCropComplete,
        handleAvatarChange,
        handleConfirmUpload,
        handleCancelPreview,
        viewingAvatar,
        setViewingAvatar,
    } = useAvatarUpload(profile, setProfile);

    const passwordCtrl = useChangePassword();
    const { zaloNotifyEnabled, handleToggleZaloNotify } = useZaloNotify(profile);

    if (loading) {
        return (
            <div className={styles.page}>
                <div style={{ textAlign: "center", color: "#737373", padding: 48 }}>Đang tải...</div>
            </div>
        );
    }

    const displayName = profile?.fullname || "Student";
    const initials = displayName ? getInitials(displayName) : "ST";

    return (
        <div className={styles.page}>
            {previewUrl && (
                <AvatarCropModal
                    previewUrl={previewUrl}
                    crop={crop}
                    setCrop={setCrop}
                    zoom={zoom}
                    setZoom={setZoom}
                    onCropComplete={onCropComplete}
                    uploadingAvatar={uploadingAvatar}
                    onConfirm={handleConfirmUpload}
                    onCancel={handleCancelPreview}
                />
            )}

            <div style={pageHeader}>
                <h1 style={pageTitle}>Tài khoản của tôi</h1>
                <p style={pageSubtitle}>Quản lý thông tin cá nhân và cài đặt tài khoản</p>
            </div>

            {viewingAvatar && profile?.avatarurl && (
                <AvatarLightbox
                    imageUrl={profile.avatarurl}
                    displayName={displayName}
                    onClose={() => setViewingAvatar(false)}
                />
            )}

            <ProfileHeaderCard
                profile={profile}
                displayName={displayName}
                initials={initials}
                uploadingAvatar={uploadingAvatar}
                editing={editing}
                avatarInputRef={avatarInputRef}
                onAvatarChange={handleAvatarChange}
                onEditClick={() => setEditing(true)}
                onViewAvatar={() => setViewingAvatar(true)}
            />

            <PersonalInfoSection
                profile={profile}
                form={form}
                setForm={setForm}
                editing={editing}
                saving={saving}
                onSave={handleSave}
                onCancel={handleCancel}
            />

            {inMiniApp && (
                <ZaloNotifyToggle enabled={zaloNotifyEnabled} onToggle={handleToggleZaloNotify} />
            )}

            <ChangePasswordSection
                showPasswordSection={passwordCtrl.showPasswordSection}
                toggleSection={passwordCtrl.toggleSection}
                passwordForm={passwordCtrl.passwordForm}
                setPasswordForm={passwordCtrl.setPasswordForm}
                changingPassword={passwordCtrl.changingPassword}
                showOldPw={passwordCtrl.showOldPw}
                setShowOldPw={passwordCtrl.setShowOldPw}
                showNewPw={passwordCtrl.showNewPw}
                setShowNewPw={passwordCtrl.setShowNewPw}
                showConfirmPw={passwordCtrl.showConfirmPw}
                setShowConfirmPw={passwordCtrl.setShowConfirmPw}
                onSubmit={passwordCtrl.handleChangePassword}
            />

            <AcademicInfoNote />
        </div>
    );
};

export default StudentAccount;
