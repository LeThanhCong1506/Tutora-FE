import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getUserIdFromToken } from "../../../../services/auth.service";
import { getUserProfile, updateUserProfile } from "../../../../services/user.service";
import type { EditForm, UserProfileData } from "../types";

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
    });

    useEffect(() => {
        const loadProfile = async () => {
            const userId = getUserIdFromToken();
            if (!userId) {
                setLoading(false);
                return;
            }
            try {
                const res = await getUserProfile(userId);
                const data = res.content ?? res;
                if (!data || !data.userid) {
                    throw new Error('Dữ liệu người dùng không hợp lệ');
                }
                setProfile(data);
                setForm({
                    fullname: data.fullname || "",
                    birthdate: data.birthdate || "",
                    address: data.address || "",
                    gender: data.gender || "",
                });
            } catch {
                toast.error("Không thể tải thông tin tài khoản");
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        if (!profile) return;
        if (!form.fullname.trim()) {
            toast.warning("Họ tên không được để trống");
            return;
        }
        setSaving(true);
        try {
            await updateUserProfile(profile.userid, {
                fullname: form.fullname,
                birthdate: form.birthdate || "",
                address: form.address || "",
                gender: form.gender || "",
                avatarurl: profile.avatarurl,
            });
            setProfile(prev => prev ? { ...prev, ...form } : null);
            setEditing(false);
            toast.success("Cập nhật thông tin thành công!");
        } catch {
            toast.error("Cập nhật thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setForm({
                fullname: profile.fullname || "",
                birthdate: profile.birthdate || "",
                address: profile.address || "",
                gender: profile.gender || "",
            });
        }
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
        handleSave,
        handleCancel,
    };
}
