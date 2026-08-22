import type { NotificationDTO } from '../../services/notification.service';
import styles from './NotificationItem.module.css';
import {
    ReadOutlined,
    MessageOutlined,
    CreditCardOutlined,
    CalendarOutlined,
    DisconnectOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';

interface NotificationItemProps {
    notification: NotificationDTO;
    onClick?: (notification: NotificationDTO) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const getNotificationIcon = () => {
        const title = notification.title.toLowerCase();
        if (notification.type === 'lesson_continuation_created') {
            return <DisconnectOutlined className={styles.icon} />;
        }
        if (notification.type === 'lesson_interruption_auto_closed') {
            return <CheckCircleOutlined className={styles.icon} />;
        }
        if (notification.type === 'dispute_relearn_scheduled') {
            return <CalendarOutlined className={styles.icon} />;
        }
        if (title.includes('booking') || title.includes('request')) {
            return <ReadOutlined className={styles.icon} />;
        }
        if (title.includes('message')) {
            return <MessageOutlined className={styles.icon} />;
        }
        if (title.includes('payment') || title.includes('paid')) {
            return <CreditCardOutlined className={styles.icon} />;
        }
        if (title.includes('schedule') || title.includes('session')) {
            return <CalendarOutlined className={styles.icon} />;
        }
        return <MessageOutlined className={styles.icon} />;
    };

    const getTimeAgo = () => {
        if (!notification.createdat) return '';
        // notification.createdat là UTC từ BE — parse thẳng bằng Date rồi so với "bây giờ" (cũng
        // là mốc UTC tuyệt đối), KHÔNG được tự cộng offset thủ công (Date đã tự quy đổi khi hiển
        // thị qua toLocaleDateString, cộng thêm +7 ở đây làm lệch kép cho người dùng không ở UTC+7
        // và làm sai cả phép trừ diffMs).
        const created = new Date(notification.createdat).getTime();
        if (Number.isNaN(created)) return '';
        const diffMs = Date.now() - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return new Date(created).toLocaleDateString('vi-VN');
    };

    return (
        <div
            className={`${styles.notificationItem} ${!notification.isread ? styles.unread : ''}`}
            onClick={() => onClick?.(notification)}
        >
            <div className={styles.iconWrapper}>
                {getNotificationIcon()}
            </div>
            <div className={styles.content}>
                <h4 className={styles.title}>{notification.title}</h4>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.time}>{getTimeAgo()}</span>
            </div>
        </div>
    );
};

export default NotificationItem;
