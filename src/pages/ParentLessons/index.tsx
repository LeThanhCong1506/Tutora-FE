import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { FilterTabs } from '../../components/shared';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { getParentClassSessions, type ClassSessionResponse } from '../../services/classSession.service';
import styles from './styles.module.css';

const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'scheduled', label: 'Đã lên lịch' },
    { key: 'pending_confirmation', label: 'Chờ xác nhận' },
    { key: 'completed', label: 'Hoàn thành' },
];

const ParentLessons: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('');
    const [sessions, setSessions] = useState<ClassSessionResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await getParentClassSessions(1, 100, undefined, activeTab || undefined);
            setSessions(Array.isArray(response.content) ? response.content : []);
        } catch (error: unknown) {
            const e = error as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Không thể tải danh sách buổi học.');
        } finally {
            setLoading(false);
        }
    };

    const sorted = useMemo(
        () => [...sessions].sort((a, b) => dayjs(b.scheduledStart).diff(dayjs(a.scheduledStart))),
        [sessions],
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

            {!loading && sorted.length === 0 ? (
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
                                            {session.subject?.subjectName ?? 'N/A'} <span>· {session.tutor?.fullName ?? 'N/A'}</span>
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
