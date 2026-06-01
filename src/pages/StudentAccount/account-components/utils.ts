import type { Area } from "react-easy-crop";
import { ALLOWED_TYPES, MAX_FILE_SIZE } from "./constants";

export const validateImageFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return "Chỉ hỗ trợ ảnh định dạng JPEG, PNG hoặc WebP";
    }
    if (file.size > MAX_FILE_SIZE) {
        return `Kích thước ảnh không được vượt quá 5MB (hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    return null;
};

export const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => {
            const canvas = document.createElement("canvas");
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("No canvas context")); return; }
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
            canvas.toBlob(blob => {
                if (!blob) { reject(new Error("Canvas is empty")); return; }
                resolve(blob);
            }, "image/jpeg", 0.92);
        });
        image.addEventListener("error", reject);
        image.src = imageSrc;
    });

export const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const formatDate = (date: string | undefined) => {
    if (!date) return "—";
    try {
        return new Date(date + "T00:00:00").toLocaleDateString("vi-VN");
    } catch {
        return date;
    }
};

export const genderDisplay = (g: string | undefined) => {
    if (g === "Male") return "Nam";
    if (g === "Female") return "Nữ";
    if (g === "Other") return "Khác";
    return "—";
};

export const getPasswordStrength = (pw: string) => {
    if (!pw) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Yếu", color: "#631b1b", width: "25%" };
    if (score <= 3) return { label: "Trung bình", color: "#d4b483", width: "60%" };
    return { label: "Mạnh", color: "#3d4a3e", width: "100%" };
};
