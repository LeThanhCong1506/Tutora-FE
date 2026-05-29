/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { signalRService } from '../services/signalr.service';

/**
 * Title của notification BE gửi khi tutor check-in.
 * Phải khớp chính xác với hardcoded string trong `LessonService.M3.Attendance.cs`:
 *   await _notificationService.CreateNotificationAsync(new NotificationRequest {
 *     Userid = ..., Title = "Buổi học đã bắt đầu", ...
 *   });
 */
const LESSON_STARTED_TITLE = 'Buổi học đã bắt đầu';

/**
 * Lắng nghe SignalR notification "Buổi học đã bắt đầu" và gọi onTrigger() khi nhận.
 *
 * Dùng trên các page lesson detail (Student/Parent) để tự refetch lesson sau khi
 * tutor check-in — không cần user F5 mới thấy nút "Tham gia ngay".
 *
 * Dùng multi-subscriber API (`subscribeToNotifications`) để không clobber single-slot
 * handler ở Layout (đang dùng cho global toast + badge).
 *
 * @param onTrigger Callback chạy khi nhận notification khớp title. Truyền `null` để tắt.
 */
export function useLessonStartedListener(onTrigger: (() => void) | null): void {
    // Stash latest callback trong ref để effect không cần re-subscribe mỗi render.
    const callbackRef = useRef(onTrigger);
    useEffect(() => {
        callbackRef.current = onTrigger;
    }, [onTrigger]);

    useEffect(() => {
        if (!callbackRef.current) return;

        const handler = (notification: any) => {
            // BE notification shape: { title, message, ... }. Match lỏng để chịu được
            // BE đổi prefix/suffix nhẹ; vẫn dùng substring để tránh false-positive.
            const title: string = notification?.title ?? notification?.Title ?? '';
            if (title.includes(LESSON_STARTED_TITLE)) {
                callbackRef.current?.();
            }
        };

        const unsubscribe = signalRService.subscribeToNotifications(handler);
        return unsubscribe;
    }, []);
}
