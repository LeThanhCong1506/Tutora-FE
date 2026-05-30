import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../../services/notification.service';
import { getUnreadNotifications, markAsRead, markAllAsRead } from '../../services/notification.service';
import { getPortalPrefix, getNotificationTargetPath } from '../../utils/notificationNavigation';
import NotificationItem from '../NotificationItem/NotificationItem';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onCountUpdate?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onCountUpdate }) => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
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

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getUnreadNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification: NotificationDTO) => {
        try {
            if (!notification.isread) {
                await markAsRead(notification.notificationid);
                onCountUpdate?.();
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
            setNotifications([]);
            onCountUpdate?.();
            onClose();
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
                    {notifications.length > 0 && (
                        <span className={styles.badge}>{notifications.length}</span>
                    )}
                </div>
                <div className={styles.headerActions}>
                    {notifications.length > 0 && (
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

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải thông báo...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <span className="material-symbols-outlined">notifications_off</span>
                        </div>
                        <p className={styles.emptyTitle}>Không có thông báo mới</p>
                        <p className={styles.emptySubtitle}>Bạn đã xem hết tất cả thông báo rồi!</p>
                    </div>
                ) : (
                    <div className={styles.notificationList}>
                        {notifications.map(notification => (
                            <NotificationItem
                                key={notification.notificationid}
                                notification={notification}
                                onClick={handleNotificationClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <button className={styles.viewAllBtn} onClick={handleViewAll}>
                    Xem tất cả thông báo
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;
