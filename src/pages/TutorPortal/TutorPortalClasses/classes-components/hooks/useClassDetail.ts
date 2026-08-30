import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../../../../utils/apiError';
import {
    getTutorClassSessions,
    type ClassSessionResponse,
} from '../../../../../services/classSession.service';
import {
    deleteMaterial,
    getMaterials,
    uploadMaterial,
    type LearningMaterialResponse,
} from '../../../../../services/materials.service';

/**
 * Dữ liệu cho modal chi tiết lớp: các buổi học của booking (tab Tổng quan) và
 * tài liệu/giáo án đã gửi cho lớp (tab Tài liệu).
 */
export function useClassDetail(bookingId: number | null) {
    const [sessions, setSessions] = useState<ClassSessionResponse[]>([]);
    const [materials, setMaterials] = useState<LearningMaterialResponse[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [uploading, setUploading] = useState(false);
    // Tải lại riêng danh sách tài liệu sau khi upload/xoá, không đụng tới buổi học.
    const [materialsToken, setMaterialsToken] = useState(0);

    useEffect(() => {
        // Modal đóng → trang đổi `key` nên hook unmount, không cần dọn state thủ công.
        if (bookingId == null) return;

        let cancelled = false;
        void (async () => {
            setLoadingSessions(true);
            try {
                const res = await getTutorClassSessions(1, 100, undefined, undefined, bookingId);
                if (!cancelled) setSessions(res.content ?? []);
            } catch (error) {
                if (cancelled) return;
                toast.error(getApiErrorMessage(error, 'Không tải được danh sách buổi học.'));
                setSessions([]);
            } finally {
                if (!cancelled) setLoadingSessions(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    useEffect(() => {
        if (bookingId == null) return;

        let cancelled = false;
        void (async () => {
            setLoadingMaterials(true);
            try {
                const res = await getMaterials(bookingId);
                if (!cancelled) setMaterials(res.content ?? []);
            } catch (error) {
                if (cancelled) return;
                toast.error(getApiErrorMessage(error, 'Không tải được tài liệu của lớp.'));
                setMaterials([]);
            } finally {
                if (!cancelled) setLoadingMaterials(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bookingId, materialsToken]);

    const upload = useCallback(
        async (file: File, title: string, description?: string) => {
            if (bookingId == null) return;
            setUploading(true);
            try {
                await uploadMaterial(bookingId, file, title, description, false);
                toast.success('Đã tải tài liệu lên lớp học.');
                setMaterialsToken((n) => n + 1);
            } catch (error) {
                toast.error(getApiErrorMessage(error, 'Tải tài liệu thất bại.'));
            } finally {
                setUploading(false);
            }
        },
        [bookingId],
    );

    const remove = useCallback(
        async (materialId: number) => {
            if (bookingId == null) return;
            try {
                await deleteMaterial(bookingId, materialId);
                toast.success('Đã gỡ tài liệu khỏi lớp học.');
                setMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
            } catch (error) {
                toast.error(getApiErrorMessage(error, 'Gỡ tài liệu thất bại.'));
            }
        },
        [bookingId],
    );

    return { sessions, materials, loadingSessions, loadingMaterials, uploading, upload, remove };
}
