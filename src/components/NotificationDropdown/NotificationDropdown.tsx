import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../../services/notification.service';
import {
    getMyNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
} from '../../services/notification.service';
import { getPortalPrefix, getNotificationTargetPath } from '../../utils/notificationNavigation';
import NotificationItem from '../NotificationItem/NotificationItem';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onCountUpdate?: () => void | Promise<unknown>;
}

type Tab = 'unread' | 'all';

// BE trả toàn bộ lịch sử trong 1 lần (không phân trang) — số này chỉ quyết định UI hiện dần
// bao nhiêu item mỗi lượt, không phải kích thước trang gọi API.
const PAGE_SIZE = 10;
const SKELETON_ROWS = 5;
// Giữ skeleton hiển thị tối thiểu ngần này dù API trả về nhanh hơn — tránh chớp nháy
// (loading xong gần như ngay lập tức trông giật, không giống đang "tải" gì cả).
const MIN_LOADING_MS = 600;

/** Placeholder loading — cùng kích thước icon/dòng chữ với NotificationItem thật để tránh giật layout. */
const NotificationSkeletonRow = () => (
    <div className={styles.skeletonRow}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} />
        <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMessage}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMessageShort}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonTime}`} />
        </div>
    </div>
);

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onCountUpdate }) => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('unread');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loadingMore, setLoadingMore] = useState(false);
    const [justRevealedIds, setJustRevealedIds] = useState<Set<number>>(new Set());
    // Lần "Xem thêm thông báo" đầu tiên (bấm nút) bật cờ này — từ đó trở đi, cuộn gần chạm đáy
    // danh sách sẽ tự động load tiếp mà không cần bấm nút nữa (infinite scroll).
    const [autoLoadEnabled, setAutoLoadEnabled] = useState(false);
    const loadMoreTimeoutRef = useRef<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Mỗi lần mở lại phải quay về tab "Chưa đọc". PortalLayout mount sẵn dropdown và chỉ
    // ẩn/hiện bằng `isOpen` chứ không unmount, nên nếu không reset thì tab người dùng chọn
    // lần trước sẽ dính lại suốt phiên — mở ra thấy "Tất cả" dù chưa bấm gì.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) setActiveTab('unread');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Fetch khi dropdown mở hoặc đổi tab
    useEffect(() => {
        if (!isOpen) return;
        const fetcher = activeTab === 'unread' ? getUnreadNotifications : getMyNotifications;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const startedAt = Date.now();
            try {
                const data = await fetcher();
                if (!cancelled) setNotifications(data);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
                if (!cancelled) setNotifications([]);
            } finally {
                const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
                if (remaining > 0) {
                    await new Promise((resolve) => window.setTimeout(resolve, remaining));
                }
                if (!cancelled) {
                    setLoading(false);
                    // Mỗi lần fetch mới (mở lại / đổi tab) phải quay về trang đầu, không giữ
                    // visibleCount của lượt trước.
                    setVisibleCount(PAGE_SIZE);
                    setJustRevealedIds(new Set());
                    setAutoLoadEnabled(false);
                    awaitingScrollAwayRef.current = false;
                }
            }
        })();
        return () => {
            cancelled = true;
            if (loadMoreTimeoutRef.current !== null) {
                window.clearTimeout(loadMoreTimeoutRef.current);
                loadMoreTimeoutRef.current = null;
            }
        };
    }, [isOpen, activeTab]);

    const handleLoadMore = () => {
        if (loadingMore) return;
        setAutoLoadEnabled(true);
        setLoadingMore(true);
        // Data đã có sẵn ở client (BE không phân trang) — delay ngắn chỉ để tạo cảm giác tải
        // (skeleton) thay vì "giật" hiện ngay lập tức, giống UX load-more của Facebook.
        loadMoreTimeoutRef.current = window.setTimeout(() => {
            setVisibleCount((prevCount) => {
                const nextCount = Math.min(prevCount + PAGE_SIZE, notifications.length);
                setJustRevealedIds(new Set(notifications.slice(prevCount, nextCount).map((n) => n.notificationid)));
                return nextCount;
            });
            setLoadingMore(false);
            loadMoreTimeoutRef.current = null;
        }, 450);
    };

    // Từ sau lần bấm "Xem thêm thông báo" đầu tiên, cuộn gần chạm đáy sẽ tự gọi handleLoadMore
    // thay cho việc phải bấm lại nút mỗi lần. `awaitingScrollAwayRef` bắt buộc người dùng phải
    // cuộn RỜI khỏi vùng đáy rồi cuộn TRỞ LẠI mới cho tải batch kế — nếu không, một lượt cuộn
    // liên tục (momentum scroll trên trackpad) sẽ dồn dập kích hoạt handleLoadMore hết lần này
    // đến lần khác trong lúc vẫn còn nằm trong vùng 80px đáy, khiến toàn bộ 429 tin bị "xổ" ra
    // gần như cùng lúc thay vì dừng lại đúng 10 tin mỗi lượt.
    const awaitingScrollAwayRef = useRef(false);
    const handleContentScroll = () => {
        const el = contentRef.current;
        if (!el) return;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;

        if (!nearBottom) {
            awaitingScrollAwayRef.current = false;
            return;
        }
        if (!autoLoadEnabled || loadingMore || awaitingScrollAwayRef.current) return;
        if (visibleCount >= notifications.length) return;

        awaitingScrollAwayRef.current = true;
        handleLoadMore();
    };

    // Close khi click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Đếm số chưa đọc trong list hiện tại (tab 'unread' = length; tab 'all' = filter).
    const unreadCount = useMemo(
        () => (activeTab === 'unread' ? notifications.length : notifications.filter((n) => !n.isread).length),
        [activeTab, notifications],
    );

    const handleNotificationClick = async (notification: NotificationDTO) => {
        try {
            if (!notification.isread) {
                await markAsRead(notification.notificationid);
                // Cập nhật local list:
                //   - Tab 'all': flip isread sang true (giữ item)
                //   - Tab 'unread': bỏ khỏi list
                setNotifications((prev) =>
                    activeTab === 'all'
                        ? prev.map((n) =>
                              n.notificationid === notification.notificationid ? { ...n, isread: true } : n,
                          )
                        : prev.filter((n) => n.notificationid !== notification.notificationid),
                );
                await onCountUpdate?.();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
        onClose();
        navigate(getNotificationTargetPath(notification));
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            // Tab 'all': flip mọi item về isread=true. Tab 'unread': rỗng list.
            setActiveTab('all');
            setNotifications((previous) => previous.map((notification) => ({ ...notification, isread: true })));
            // Đồng bộ lại badge từ server, tránh UI local khác trạng thái đã lưu.
            await onCountUpdate?.();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleViewAll = () => {
        onClose();
        navigate(`${getPortalPrefix()}/notifications`);
    };

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className={styles.dropdown}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h3 className={styles.title}>Thông báo</h3>
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                </div>
                <div className={styles.headerActions}>
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                            Đọc tất cả
                        </button>
                    )}
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M6 6l12 12M6 18L18 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tabs: Chưa đọc / Tất cả */}
            <div className={styles.tabs} role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'unread'}
                    className={`${styles.tab} ${activeTab === 'unread' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('unread')}
                >
                    <span>Chưa đọc</span>
                    {activeTab === 'unread' && notifications.length > 0 && (
                        <span className={styles.tabBadge}>{notifications.length}</span>
                    )}
                    {activeTab !== 'unread' && unreadCount > 0 && (
                        <span className={styles.tabBadge}>{unreadCount}</span>
                    )}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'all'}
                    className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>Tất cả</span>
                    {activeTab === 'all' && notifications.length > 0 && (
                        <span className={styles.tabBadge}>{notifications.length}</span>
                    )}
                </button>
            </div>

            <div className={styles.content} ref={contentRef} onScroll={handleContentScroll}>
                {loading ? (
                    <div className={styles.notificationList}>
                        {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                            <NotificationSkeletonRow key={index} />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <span className="material-symbols-outlined">notifications_off</span>
                        </div>
                        <p className={styles.emptyTitle}>
                            {activeTab === 'unread' ? 'Không có thông báo mới' : 'Bạn chưa có thông báo nào'}
                        </p>
                        <p className={styles.emptySubtitle}>
                            {activeTab === 'unread'
                                ? 'Bạn đã xem hết tất cả thông báo rồi!'
                                : 'Thông báo sẽ xuất hiện ở đây khi có hoạt động mới.'}
                        </p>
                    </div>
                ) : (
                    <div className={styles.notificationList}>
                        {notifications.slice(0, visibleCount).map((notification) => (
                            <div
                                key={notification.notificationid}
                                className={
                                    justRevealedIds.has(notification.notificationid) ? styles.revealItem : undefined
                                }
                            >
                                <NotificationItem notification={notification} onClick={handleNotificationClick} />
                            </div>
                        ))}
                        {loadingMore &&
                            Array.from({ length: Math.min(PAGE_SIZE, notifications.length - visibleCount) }).map(
                                (_, index) => <NotificationSkeletonRow key={`skeleton-${index}`} />,
                            )}
                        {!loadingMore && !autoLoadEnabled && visibleCount < notifications.length && (
                            <button type="button" className={styles.loadMoreBtn} onClick={handleLoadMore}>
                                Xem thêm thông báo
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <button className={styles.viewAllBtn} onClick={handleViewAll}>
                    <span>Xem tất cả thông báo</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M5 12h14M13 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;
