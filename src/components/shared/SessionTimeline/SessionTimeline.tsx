import React from 'react';
import { formatLocalDateTime } from '../../../utils/datetime';
import type { SessionTimelineEvent } from './buildSessionTimeline';
import styles from './SessionTimeline.module.css';

export interface SessionTimelineProps {
    events: SessionTimelineEvent[];
    className?: string;
}

/** Dòng thời gian dọc, mỗi mốc một dòng — trạng thái thể hiện bằng màu chấm. */
const SessionTimeline: React.FC<SessionTimelineProps> = ({ events, className }) => {
    if (events.length === 0) return null;

    return (
        <ol className={`${styles.timeline} ${className || ''}`}>
            {events.map((event) => (
                <li key={event.key} className={`${styles.item} ${styles[event.tone || 'done']}`}>
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={styles.time}>{formatLocalDateTime(event.at)}</span>
                    <span className={styles.label}>
                        {event.label}
                        {event.detail && <small>{event.detail}</small>}
                    </span>
                </li>
            ))}
        </ol>
    );
};

export default SessionTimeline;
