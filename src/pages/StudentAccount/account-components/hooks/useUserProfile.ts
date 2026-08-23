import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getUserIdFromToken } from "../../../../services/auth.service";
import { getUserProfile, updateUserProfile } from "../../../../services/user.service";
import {
    validateUserProfileForm,
    mapApiFieldErrors,
    toDateInputValue,
    type UserProfileFieldErrors,
} from "../../../../utils/userProfileForm";
import type { EditForm, UserProfileData } from "../types";
import { getApiErrorMessage } from '../../../../utils/apiError';

/**
 * Load the current user's profile, manage the edit form state, and
 * handle save/cancel. The orchestrator and section components consume
 * this hook instead of duplicating fetch/save logic.
 */
export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<EditForm>({
        fullname: "",
        birthdate: "",
        address: "",
        gender: "",
        email: "",
    });
    const [errors, setErrors] = useState<UserProfileFieldErrors>({});

    useEffect(() => {
        const loadProfile = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setLoading(false);
                return;
            }
            try {
                const res = await getUserProfile();
                const data = res.content ?? res;
                if (!data || !data.userid) {
                    throw new Error('Dữ liệu người dùng không hợp lệ');
                }
                setProfile(data);
                setForm({
                    fullname: data.fullname || "",
                    birthdate: toDateInputValue(data.birthdate),
                    address: data.address || "",
                    gender: data.gender || "",
                    email: data.email || "",
                });
            } catch (error) {
                toast.error(getApiErrorMessage(error, "Không thể tải thông tin tài khoản"));
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        if (!profile) return;

        // BE yêu cầu đủ tất cả các trường — validate trước để báo rõ field thiếu/sai.
        const fieldErrors = validateUserProfileForm(form);
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.warning("Vui lòng điền đầy đủ và đúng các thông tin bắt buộc.");
            return;
        }
        setErrors({});

        setSaving(true);
        try {
            await updateUserProfile(profile.userid, {
                fullname: form.fullname.trim(),
                birthdate: form.birthdate,
                address: form.address.trim(),
                gender: form.gender,
                email: form.email.trim() || undefined,
                avatarurl: profile.avatarurl,
            });
            setProfile(prev => prev ? { ...prev, ...form } : null);
            window.dispatchEvent(new CustomEvent('profile-name-updated', { detail: form.fullname.trim() }));
            setEditing(false);
            toast.success("Cập nhật thông tin thành công!");
        } catch (err: unknown) {
            // Dịch lỗi field từ BE (nếu có) sang tiếng Việt theo từng ô.
            const apiError = (err as { response?: { data?: { error?: unknown; message?: string } } })?.response?.data;
            const mapped = mapApiFieldErrors(apiError?.error);
            if (/email.*already exist/i.test(apiError?.message || '')) {
                setErrors(e => ({ ...e, email: 'Email này đã được sử dụng bởi tài khoản khác.' }));
                toast.error('Email này đã được sử dụng bởi tài khoản khác.');
            } else if (Object.keys(mapped).length > 0) {
                setErrors(mapped);
                toast.error("Vui lòng kiểm tra lại các thông tin được đánh dấu.");
            } else {
                toast.error(apiError?.message || "Cập nhật thất bại. Vui lòng thử lại.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setForm({
                fullname: profile.fullname || "",
                birthdate: toDateInputValue(profile.birthdate),
                address: profile.address || "",
                gender: profile.gender || "",
                email: profile.email || "",
            });
        }
        setErrors({});
        setEditing(false);
    };

    return {
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
    };
}
