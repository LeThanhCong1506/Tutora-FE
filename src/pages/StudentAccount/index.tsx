import { isZaloMiniApp } from "../../services/zalo-env";
import { PageContainer } from "../../components/shared";
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
        errors,
        setErrors,
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
            <PageContainer
                className={styles.page}
                title="Tài khoản"
                titleInfo="Quản lý thông tin cá nhân và bảo mật đăng nhập."
                maxWidth="standard"
            >
                <div style={{ textAlign: "center", color: "#737373", padding: 48 }}>Đang tải...</div>
            </PageContainer>
        );
    }

    const displayName = profile?.fullname || "Student";
    const initials = displayName ? getInitials(displayName) : "ST";

    return (
        <PageContainer
            className={styles.page}
            title="Tài khoản"
            titleInfo="Quản lý thông tin cá nhân và bảo mật đăng nhập."
            maxWidth="standard"
        >
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
                errors={errors}
                setErrors={setErrors}
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
        </PageContainer>
    );
};

export default StudentAccount;
