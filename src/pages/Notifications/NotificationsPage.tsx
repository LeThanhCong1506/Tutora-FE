import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../../services/notification.service';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notification.service';
import { getNotificationTargetPath } from '../../utils/notificationNavigation';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import { PageContainer } from '../../components/shared';
import styles from './styles.module.css';

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getMyNotifications();
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
                setNotifications(prev =>
                    prev.map(n =>
                        n.notificationid === notification.notificationid ? { ...n, isread: true } : n
                    )
                );
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
        navigate(getNotificationTargetPath(notification));
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isread: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isread).length;

    return (
        <PageContainer
            className={styles.page}
            eyebrow="Cập nhật"
            eyebrowInfo="Theo dõi các cập nhật về lịch học, thanh toán, khiếu nại và tài khoản."
            title="Thông báo"
            subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Bạn đã xem tất cả thông báo'}
            headerAction={
                unreadCount > 0 ? (
                    <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                        Đánh dấu tất cả đã đọc
                    </button>
                ) : undefined
            }
        >
            <div className={styles.container}>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải thông báo...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.empty}>
                        <span className="material-symbols-outlined">notifications_off</span>
                        <p>Bạn chưa có thông báo nào</p>
                    </div>
                ) : (
                    <div className={styles.list}>
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
        </PageContainer>
    );
};

export default NotificationsPage;
