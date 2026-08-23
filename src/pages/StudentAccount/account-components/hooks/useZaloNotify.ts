import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { updateZaloNotifyEnabled } from "../../../../services/user.service";
import type { UserProfileData } from "../types";
import { getApiErrorMessage } from '../../../../utils/apiError';

/**
 * Track the Zalo-notify toggle state and sync it with the server. Uses an
 * optimistic update and reverts on failure.
 */
export function useZaloNotify(profile: UserProfileData | null) {
    const [zaloNotifyEnabled, setZaloNotifyEnabled] = useState(true);

    useEffect(() => {
        if (profile) {
            setZaloNotifyEnabled(profile.zabornotifyenabled !== false);
        }
    }, [profile]);

    const handleToggleZaloNotify = async () => {
        if (!profile) return;
        const newValue = !zaloNotifyEnabled;
        setZaloNotifyEnabled(newValue);
        try {
            await updateZaloNotifyEnabled(profile.userid, newValue);
            toast.success(newValue ? "Đã bật thông báo Zalo" : "Đã tắt thông báo Zalo");
        } catch (error) {
            setZaloNotifyEnabled(!newValue);
            toast.error(getApiErrorMessage(error, "Không thể cập nhật cài đặt"));
        }
    };

    return { zaloNotifyEnabled, handleToggleZaloNotify };
}
