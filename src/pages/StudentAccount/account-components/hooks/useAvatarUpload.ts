import { useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import type { Area, Point } from "react-easy-crop";
import { updateUserAvatar } from "../../../../services/user.service";
import { getCroppedImg, validateImageFile } from "../utils";
import type { UserProfileData } from "../types";

/**
 * Encapsulate avatar upload flow: file-input → validation → preview →
 * crop/zoom → upload. Also exposes the "view my avatar" lightbox state
 * since it's conceptually part of the avatar UX.
 */
export function useAvatarUpload(
    profile: UserProfileData | null,
    setProfile: React.Dispatch<React.SetStateAction<UserProfileData | null>>,
) {
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [viewingAvatar, setViewingAvatar] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleCancelPreview = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
        setCroppedAreaPixels(null);
    }, [previewUrl]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        if (avatarInputRef.current) avatarInputRef.current.value = "";

        const error = validateImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }

        const url = URL.createObjectURL(file);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setPendingFile(file);
        setPreviewUrl(url);
    };

    const handleConfirmUpload = async () => {
        if (!previewUrl || !croppedAreaPixels || !profile) return;
        setUploadingAvatar(true);
        try {
            const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], pendingFile?.name ?? "avatar.jpg", { type: "image/jpeg" });
            const res = await updateUserAvatar(profile.userid, croppedFile);
            const newUrl = res.content?.avatarUrl;
            if (newUrl) {
                setProfile(prev => prev ? { ...prev, avatarurl: newUrl } : null);
                window.dispatchEvent(new CustomEvent("avatar-updated", { detail: newUrl }));
            }
            toast.success("Cập nhật ảnh đại diện thành công!");
        } catch {
            toast.error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
        } finally {
            setUploadingAvatar(false);
            handleCancelPreview();
        }
    };

    return {
        avatarInputRef,
        uploadingAvatar,
        pendingFile,
        previewUrl,
        crop,
        setCrop,
        zoom,
        setZoom,
        croppedAreaPixels,
        onCropComplete,
        handleAvatarChange,
        handleConfirmUpload,
        handleCancelPreview,
        viewingAvatar,
        setViewingAvatar,
    };
}
