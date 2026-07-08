import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import { FilterTabs } from '../../components/shared';
import { getClassSessionStatusMeta, type ClassSessionStatus } from '../../utils/classSessionStatus';
import styles from './styles.module.css';

// ── Mock domain shape (mirrors BE `ClassSessionResponse`, parent-facing) ──
// TODO: replace with `getParentClassSessions()` once `/api/parent/class-sessions` is wired up.
interface MockParentSession {
    classSessionId: number;
    subjectName: string;
    tutorName: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: ClassSessionStatus;
}

const now = dayjs();

const MOCK_SESSIONS: MockParentSession[] = [
    { classSessionId: 201, subjectName: 'AP Mathematics A', tutorName: 'Alex Chen', scheduledStart: now.add(30, 'minute').toISOString(), scheduledEnd: now.add(120, 'minute').toISOString(), status: 'scheduled' },
    { classSessionId: 202, subjectName: 'Physics Grade 11', tutorName: 'Alex Chen', scheduledStart: now.hour(16).minute(0).toISOString(), scheduledEnd: now.hour(17).minute(30).toISOString(), status: 'scheduled' },
    { classSessionId: 203, subjectName: 'AP Mathematics A', tutorName: 'Alex Chen', scheduledStart: now.subtract(1, 'day').hour(14).minute(0).toISOString(), scheduledEnd: now.subtract(1, 'day').hour(15).minute(30).toISOString(), status: 'pending_confirmation' },
    { classSessionId: 204, subjectName: 'Chemistry Grade 10', tutorName: 'Minh Tran', scheduledStart: now.subtract(3, 'day').hour(18).minute(30).toISOString(), scheduledEnd: now.subtract(3, 'day').hour(19).minute(30).toISOString(), status: 'completed' },
    { classSessionId: 205, subjectName: 'Physics Grade 11', tutorName: 'Alex Chen', scheduledStart: now.add(2, 'day').hour(16).minute(0).toISOString(), scheduledEnd: now.add(2, 'day').hour(17).minute(30).toISOString(), status: 'scheduled' },
];

const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'scheduled', label: 'Đã lên lịch' },
    { key: 'pending_confirmation', label: 'Chờ xác nhận' },
    { key: 'completed', label: 'Hoàn thành' },
];

const ParentLessons: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('');

    const filtered = useMemo(
        () => (activeTab ? MOCK_SESSIONS.filter((s) => s.status === activeTab) : MOCK_SESSIONS),
        [activeTab],
    );

    const sorted = useMemo(
        () => [...filtered].sort((a, b) => dayjs(b.scheduledStart).diff(dayjs(a.scheduledStart))),
        [filtered],
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Buổi học</h1>
                    <p className={styles.subtitle}>Theo dõi các buổi học của con bạn</p>
                </div>
            </div>

            <div className={styles.filterSection}>
                <FilterTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
            </div>

            {sorted.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <BookOpen size={32} />
                    </div>
                    <h3 className={styles.emptyTitle}>Chưa có buổi học nào</h3>
                    <p className={styles.emptyText}>
                        Buổi học sẽ xuất hiện tại đây sau khi booking được xác nhận và kích hoạt.
                    </p>
                </div>
            ) : (
                <div className={styles.lessonList}>
                    {sorted.map((session) => {
                        const meta = getClassSessionStatusMeta(session.status);
                        const start = dayjs(session.scheduledStart);
                        return (
                            <div
                                key={session.classSessionId}
                                className={styles.lessonCard}
                                tabIndex={0}
                                onClick={() => navigate(`/parent-portal/lessons/${session.classSessionId}`)}
                            >
                                <div className={styles.lessonCardLeft}>
                                    <div className={styles.dateBlock}>
                                        <span className={styles.dateDay}>{start.format('DD')}</span>
                                        <span className={styles.dateMonth}>Thg {start.format('M')}</span>
                                    </div>
                                    <div className={styles.lessonInfo}>
                                        <p className={styles.lessonTitle}>
                                            {session.subjectName} <span>· {session.tutorName}</span>
                                        </p>
                                        <p className={styles.lessonTime}>
                                            <Clock size={12} />
                                            {start.format('HH:mm')} - {dayjs(session.scheduledEnd).format('HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <div className={styles.lessonCardRight}>
                                    <span className={styles.statusBadge} style={{ background: meta.bg, color: meta.color }}>
                                        <span className={styles.statusDot} />
                                        {meta.label}
                                    </span>
                                    <ChevronRight size={16} className={styles.chevron} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ParentLessons;
