import styles from './styles.module.css';
import type { BookingResponseDTO } from '../../services/booking.service';

const timeIcon = 'https://www.figma.com/api/mcp/asset/55b52807-db8b-490b-9245-43136c704fc7';
const homeworkIcon = 'https://www.figma.com/api/mcp/asset/c7e1d56c-5edc-4f71-8f22-da65659f2a68';

interface SessionContextCardProps {
    booking: BookingResponseDTO;
}

const SessionContextCard = ({ booking }: SessionContextCardProps) => {
    const safeDateString = booking.createdAt.includes('Z') || booking.createdAt.includes('+') ? booking.createdAt : `${booking.createdAt}Z`;
    const formattedDate = new Date(safeDateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className={styles.sessionContextCard}>
            <span className={styles.sessionContextCaption}>Booking #{booking.bookingId} • {formattedDate}</span>
            <span className={styles.sessionContextTitle}>
                {booking.subject?.subjectName || 'N/A'} • {booking.student?.fullName || 'N/A'}
            </span>
            <div className={styles.sessionContextMeta}>
                <span className={styles.sessionContextItem}>
                    <img alt="" src={timeIcon} />
                    {booking.sessionCount} Sessions
                </span>
                <span className={styles.sessionContextItem}>
                    <img alt="" src={homeworkIcon} />
                    Status: {booking.status}
                </span>
                <span className={styles.sessionContextItem}>
                    Mode: {booking.teachingMode || booking.packageType || 'N/A'}
                </span>
            </div>
            {booking.status === 'pending_tutor' && (
                <div className={styles.bookingActionPrompt}>
                    <p>Wait for the tutor to accept your request.</p>
                </div>
            )}
        </div>
    );
};

export default SessionContextCard;
