import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTotalUnreadMessageCount } from '../services/chat.service';
import { signalRService } from '../services/signalr.service';

/**
 * Sidebar nav badge cho mục "Tin nhắn" — dùng bởi 3 portal layouts (Tutor /
 * Parent / Student). Admin không chat nên không cần.
 *
 * Behavior:
 *  1. Fetch tổng số tin chưa đọc khi mount qua endpoint BE.
 *  2. Lắng nghe SignalR `messageReceived` (qua multi-subscriber API để không
 *     ghi đè handler của ChatArea page) — tăng count khi user KHÔNG ở trang
 *     messages.
 *  3. Tự reset count = 0 khi user navigate đến trang messages (giả định mở
 *     trang đồng nghĩa với "đã xem" — back-end side cũng sẽ mark-as-read khi
 *     user mở từng conversation).
 *
 * Trả về số count để layout inject vào `NavItem.badge`.
 */
export function useUnreadMessageBadge(messagesPath: string): number {
    const [count, setCount] = useState(0);
    const location = useLocation();
    const isOnMessagesPage = location.pathname.startsWith(messagesPath);

    // 1. Initial fetch — chỉ chạy 1 lần
    useEffect(() => {
        let cancelled = false;
        getTotalUnreadMessageCount().then((n) => {
            if (!cancelled) setCount(n);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // 2. SignalR subscribe — tăng count khi nhận message ngoài trang messages.
    // Dùng `subscribeToChatMessages` (multi-subscriber) chứ KHÔNG dùng
    // `onMessageReceived` (single-slot) để co-exist với ChatArea page.
    useEffect(() => {
        const unsubscribe = signalRService.subscribeToChatMessages(() => {
            // Nếu đang ở trang messages, không tăng — user đã ở đó rồi, mở
            // conversation sẽ tự mark-as-read.
            if (isOnMessagesPage) return;
            setCount((c) => c + 1);
        });
        return unsubscribe;
    }, [isOnMessagesPage]);

    // 3. Auto-clear khi user vào trang messages
    useEffect(() => {
        if (isOnMessagesPage && count > 0) {
            setCount(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnMessagesPage]);

    return count;
}
