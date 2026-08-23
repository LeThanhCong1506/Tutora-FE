import { useState } from "react";
import { toast } from "react-toastify";
import { changePassword } from "../../../../services/auth.service";
import type { PasswordForm } from "../types";
import { getApiErrorMessage } from '../../../../utils/apiError';

/**
 * Encapsulate the change-password flow: form state, show/hide toggles per
 * field, validation, and submission. The section component stays focused on
 * presentation.
 */
export function useChangePassword() {
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordForm, setPasswordForm] = useState<PasswordForm>({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const resetForm = () => {
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    };

    const toggleSection = () => {
        setShowPasswordSection(v => !v);
        resetForm();
    };

    const handleChangePassword = async () => {
        if (!passwordForm.oldPassword || !passwordForm.newPassword) {
            toast.warning("Vui lòng điền đầy đủ thông tin");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("Mật khẩu mới không khớp");
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            toast.warning("Mật khẩu mới phải có ít nhất 8 ký tự");
            return;
        }
        if (passwordForm.newPassword === passwordForm.oldPassword) {
            toast.error("Mật khẩu mới không được trùng với mật khẩu cũ. Vui lòng chọn mật khẩu khác.");
            return;
        }
        setChangingPassword(true);
        try {
            await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
            toast.success("Đổi mật khẩu thành công!");
            resetForm();
            setShowPasswordSection(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Đổi mật khẩu thất bại. Vui lòng thử lại."));
        } finally {
            setChangingPassword(false);
        }
    };

    return {
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
        handleChangePassword,
    };
}
