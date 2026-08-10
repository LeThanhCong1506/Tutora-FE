import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    { key: 'pending_reschedule', label: 'Chờ đổi lịch' },
    { key: 'completed', label: 'Hoàn thành' },
];

/**
 * "Chờ đổi lịch" không phải trạng thái buổi học (BE không hiểu key này) — nó gộp cả 2 cơ chế
 * đổi lịch: đề xuất mới (hasPendingReschedule) và xác nhận vào học ngoài giờ cũ qua RTC
 * (scheduleChangeStatus === 'pending'). Lọc phía FE trên tập buổi "Đã lên lịch" trả về từ BE,
 * vì chỉ buổi scheduled mới có thể có 1 trong 2 loại yêu cầu này.
 */
const isPendingReschedule = (session: ClassSessionResponse) =>
    Boolean(session.hasPendingReschedule) || session.scheduleChangeStatus === 'pending';

const ParentLessons: React.FC = () => {
    const navigate = useNavigate();
    // Tab sống trong URL — để "xem chi tiết buổi học" rồi back trả về đúng tab đang lọc
    // (vd "Hoàn thành"), thay vì luôn reset về "Tất cả".
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('status') || '';
    const [sessions, setSessions] = useState<ClassSessionResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const handleTabChange = (tabKey: string) => {
        const next = new URLSearchParams(searchParams);
        if (tabKey) next.set('status', tabKey);
        else next.delete('status');
        setSearchParams(next);
    };

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            // "pending_reschedule" là filter riêng của FE, BE không biết key này — gửi status=scheduled
            // (chỉ buổi scheduled mới có thể đang chờ đổi lịch) rồi lọc tiếp ở fetchSessions.
            const backendStatus = activeTab === 'pending_reschedule' ? 'scheduled' : activeTab || undefined;
            const response = await getParentClassSessions(1, 100, undefined, backendStatus);
            const items = Array.isArray(response.content) ? response.content : [];
            setSessions(activeTab === 'pending_reschedule' ? items.filter(isPendingReschedule) : items);
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
                <FilterTabs tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />
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
                                    {session.scheduleChangeStatus && (
                                        <span
                                            className={`${styles.scheduleChangeBadge} ${
                                                session.scheduleChangeStatus === 'approved' ? styles.scheduleChangeBadgeApproved : ''
                                            }`}
                                        >
                                            {session.scheduleChangeStatus === 'approved'
                                                ? 'Đã xác nhận dời lịch'
                                                : 'Chờ xác nhận dời lịch'}
                                        </span>
                                    )}
                                    {session.hasPendingReschedule && (
                                        <span className={styles.scheduleChangeBadge}>Có đề xuất đổi lịch</span>
                                    )}
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
