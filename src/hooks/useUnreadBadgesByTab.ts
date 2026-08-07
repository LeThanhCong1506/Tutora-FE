import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    getUnreadCountByType,
    markAsReadByType,
    type NotificationDTO,
} from '../services/notification.service';
import { signalRService } from '../services/signalr.service';

export type BadgesByPath = Record<string, number>;

/**
 * Sidebar badge per-tab — đếm số notification chưa đọc theo `type` rồi map
 * sang path tab tương ứng. Dùng song song với `useUnreadMessageBadge` (chat
 * unread đếm riêng, không qua hệ thống notification).
 *
 * Behavior:
 *  1. Mount: fetch `/notifications/mine/unread-count` → lấy `byType` dict.
 *  2. Realtime: `subscribeToNotifications` (multi-subscriber) — KHÔNG dùng
 *     `onNotificationReceived` để không clobber handler bell ở PortalLayout.
 *  3. Auto-clear: khi user vào path matching → `markAsReadByType` cho từng
 *     type thuộc tab đó (1 request/type) + reset local count = 0.
 *
 * @param typesByPath  Map sidebar path → list notification type thuộc tab đó.
 *                     **Phải stable** (module-scope const hoặc useMemo) —
 *                     ref-change sẽ trigger re-subscribe SignalR.
 */
export function useUnreadBadgesByTab(
    typesByPath: Record<string, string[]>,
): BadgesByPath {
    const [countsByType, setCountsByType] = useState<Record<string, number>>({});
    const location = useLocation();

    // 1. Initial fetch — dict { type → count }
    useEffect(() => {
        let cancelled = false;
        getUnreadCountByType()
            .then((dict) => {
                if (!cancelled) setCountsByType(dict);
            })
            .catch(() => {
                /* keep empty dict */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // 2. SignalR realtime — luôn bump badge.
    //
    // Trước đây nếu user đang đứng sẵn trên tab tương ứng thì thông báo bị mark-read ngay lập
    // tức. Kết quả: chuông nhấp nháy số rồi về 0, và tab "Chưa đọc" hiện item xong biến mất —
    // vì `markAsReadByType` xoá TOÀN BỘ thông báo cùng type chứ không riêng cái vừa tới, rồi
    // BE push NotificationCountUpdated kéo chuông về 0. Giờ để badge lên, dọn khi điều hướng.
    useEffect(() => {
        const unsubscribe = signalRService.subscribeToNotifications((noti: NotificationDTO) => {
            // Noti chưa có `type` (legacy BE) → bỏ qua, vẫn được đếm ở bell global.
            if (!noti.type) return;

            const matched = Object.values(typesByPath).some((types) =>
                types.includes(noti.type as string),
            );
            if (!matched) return;

            setCountsByType((prev) => ({
                ...prev,
                [noti.type as string]: (prev[noti.type as string] || 0) + 1,
            }));
        });
        return unsubscribe;
    }, [typesByPath]);

    // Đọc count mới nhất trong effect dọn badge mà không phải đưa vào deps — nếu đưa vào thì
    // mỗi lần badge tăng lúc đang đứng trên tab sẽ tự dọn ngay, đúng cái lỗi ở trên.
    const countsRef = useRef(countsByType);
    useEffect(() => {
        countsRef.current = countsByType;
    });

    // 3. Auto-clear khi ĐIỀU HƯỚNG vào tab matching (không phải mỗi lần count đổi).
    useEffect(() => {
        const matchedPath = Object.keys(typesByPath).find((p) =>
            location.pathname.startsWith(p),
        );
        if (!matchedPath) return;

        const dirtyTypes = typesByPath[matchedPath].filter(
            (t) => (countsRef.current[t] || 0) > 0,
        );
        if (dirtyTypes.length === 0) return;

        // Optimistic local clear
        setCountsByType((prev) => {
            const next = { ...prev };
            for (const t of dirtyTypes) next[t] = 0;
            return next;
        });

        // BE: 1 request / type. BE sẽ push NotificationCountUpdated → chuông tự sync.
        dirtyTypes.forEach((t) => {
            markAsReadByType(t).catch(() => {});
        });
    }, [location.pathname, typesByPath]);

    // 4. Tính badge map (sum của các type thuộc cùng 1 tab)
    return useMemo(() => {
        const result: BadgesByPath = {};
        for (const [path, types] of Object.entries(typesByPath)) {
            let sum = 0;
            for (const t of types) sum += countsByType[t] || 0;
            result[path] = sum;
        }
        return result;
    }, [countsByType, typesByPath]);
}
