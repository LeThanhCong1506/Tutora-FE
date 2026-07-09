import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTutorClassSessions, type ClassSessionResponse } from '../../services/classSession.service';
import { DataTable, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import styles from '../../styles/pages/tutor-portal-classes.module.css';

// Icons
const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M9.5 9.5L13 13" strokeLinecap="round" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
    </svg>
);

// Helper function to format date
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const day = weekdays[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}, Thg ${month}\n${dateNum} ${hours}:${minutes}`;
};


// Interface for grouped class data
interface ClassData {
    bookingId: number;
    subjectName: string;
    studentName: string;
    totalSessions: number;
    completedSessions: number;
    nextSession?: ClassSessionResponse;
    schedule: string; // e.g., "T2, T4 10:00"
    status: string;
}

// Helper to compute class status from sessions
const getClassStatus = (sessions: ClassSessionResponse[]): string => {
    if (sessions.length === 0) return 'unknown';
    const allCompleted = sessions.every(s => s.status === 'completed');
    if (allCompleted) return 'completed';
    const hasCancelled = sessions.some(s => s.status === 'cancelled' || s.status === 'cancelled_noshow');
    if (hasCancelled && sessions.every(s => s.status === 'cancelled' || s.status === 'cancelled_noshow' || s.status === 'completed')) return 'cancelled';
    const hasInProgress = sessions.some(s => s.status === 'in_progress');
    if (hasInProgress) return 'in_progress';
    const hasPending = sessions.some(s => s.status === 'pending_confirmation');
    if (hasPending) return 'pending';
    return 'scheduled';
};

const getStatusDisplay = (status: string): { label: string; variant: 'success' | 'error' | 'info' | 'warning' | 'neutral' } => {
    switch (status) {
        case 'completed': return { label: 'Hoàn thành', variant: 'success' };
        case 'cancelled': return { label: 'Đã hủy', variant: 'error' };
        case 'in_progress': return { label: 'Đang học', variant: 'info' };
        case 'pending': return { label: 'Chờ xử lý', variant: 'warning' };
        case 'scheduled': return { label: 'Đã lên lịch', variant: 'neutral' };
        default: return { label: 'Không rõ', variant: 'neutral' };
    }
};

const TutorPortalClasses: React.FC = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<ClassSessionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<string>('nextSession');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        fetchClassSessions();
    }, [statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sortBy]);

    const fetchClassSessions = async () => {
        try {
            setLoading(true);
            // `GET /tutor/class-sessions` trả về PagedList<ClassSessionResponse> — serialize thành mảng trần.
            const response = await getTutorClassSessions(1, 100, undefined, statusFilter || undefined);
            setSessions(Array.isArray(response.content) ? response.content : []);
        } catch (error: unknown) {
            const e = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error('Không thể tải danh sách lớp học: ' + (e.response?.data?.message || e.message || 'Lỗi không xác định'));
        } finally {
            setLoading(false);
        }
    };

    // Group sessions by bookingId to create classes
    const classes: ClassData[] = React.useMemo(() => {
        const grouped = new Map<number, ClassSessionResponse[]>();

        sessions.forEach(session => {
            if (!grouped.has(session.bookingId)) {
                grouped.set(session.bookingId, []);
            }
            grouped.get(session.bookingId)!.push(session);
        });

        return Array.from(grouped.entries()).map(([bookingId, classSessions]) => {
            const sortedSessions = [...classSessions].sort((a, b) =>
                new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
            );

            const now = new Date();
            const nextSession = sortedSessions.find(s => new Date(s.scheduledStart) > now);

            const completedSessions = sortedSessions.filter(s => s.status === 'completed').length;

            const scheduleSet = new Set<string>();
            sortedSessions.forEach(session => {
                const date = new Date(session.scheduledStart);
                const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const day = weekdays[date.getDay()];
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                scheduleSet.add(`${day} ${hours}:${minutes}`);
            });
            const schedule = Array.from(scheduleSet).slice(0, 3).join(', ');

            const firstSession = sortedSessions[0];

            return {
                bookingId,
                subjectName: firstSession.subject?.subjectName || 'N/A',
                studentName: firstSession.student?.fullName || 'Unknown',
                totalSessions: sortedSessions.length,
                completedSessions,
                nextSession,
                schedule,
                status: getClassStatus(sortedSessions)
            };
        });
    }, [sessions]);

    const handleOpenClass = (bookingId: number) => {
        navigate(`/tutor-portal/classes/${bookingId}`);
    };

    // Filter classes by search term
    const filteredClasses = classes.filter(classData => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const studentMatch = classData.studentName.toLowerCase().includes(searchLower);
        const subjectMatch = classData.subjectName.toLowerCase().includes(searchLower);

        return studentMatch || subjectMatch;
    });

    // Sort classes
    const sortedClasses = [...filteredClasses].sort((a, b) => {
        switch (sortBy) {
            case 'subjectName':
                return a.subjectName.localeCompare(b.subjectName);
            case 'completedSessions':
                return (b.completedSessions / b.totalSessions) - (a.completedSessions / a.totalSessions);
            case 'nextSession':
            default: {
                const aTime = a.nextSession ? new Date(a.nextSession.scheduledStart).getTime() : Infinity;
                const bTime = b.nextSession ? new Date(b.nextSession.scheduledStart).getTime() : Infinity;
                return aTime - bTime;
            }
        }
    });

    // Column definitions for DataTable
    const classColumns: DataTableColumn<ClassData>[] = [
        {
            key: 'class',
            title: 'Lớp học',
            render: (row) => (
                <div className={styles.classInfo}>
                    <div className={styles.className}>{row.subjectName}</div>
                    <div className={styles.classTags}>
                        <span className={styles.tag}>{row.totalSessions} buổi</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'schedule',
            title: 'Lịch học',
            render: (row) => <div className={styles.scheduleText}>{row.schedule}</div>,
            hideOnMobile: true,
        },
        {
            key: 'student',
            title: 'Học sinh',
            render: (row) => (
                <div className={styles.studentsList}>
                    <div className={styles.studentAvatar}>
                        {row.studentName.substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ marginLeft: '8px', fontSize: '13px' }}>{row.studentName}</span>
                </div>
            ),
        },
        {
            key: 'nextSession',
            title: 'Buổi tiếp theo',
            render: (row) => (
                <div className={styles.nextLessonText}>
                    {row.nextSession
                        ? formatDate(row.nextSession.scheduledStart).split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))
                        : 'Không có'}
                </div>
            ),
            hideOnMobile: true,
        },
        {
            key: 'progress',
            title: 'Tiến độ',
            render: (row) => (
                <div className={styles.healthBadges}>
                    <span className={styles.hwBadge}>
                        {row.completedSessions}/{row.totalSessions}<br />Hoàn thành
                    </span>
                </div>
            ),
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (row) => {
                const { label, variant } = getStatusDisplay(row.status);
                return <StatusBadge variant={variant}>{label}</StatusBadge>;
            },
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (row) => (
                <div className={styles.actions}>
                    <button
                        className={styles.openBtn}
                        onClick={(e) => { e.stopPropagation(); handleOpenClass(row.bookingId); }}
                    >
                        Mở
                    </button>
                </div>
            ),
            width: 80,
        },
    ];

    return (
        <div className={styles.classManagement}>
                <div className={styles.mainContent}>
                    {/* Header */}
                    <div className={styles.header}>
                        <h1 className={styles.title}>Quản lý lớp học</h1>
                    </div>

                    {/* Filters */}
                    <div className={styles.filters}>
                        <div className={styles.searchWrapper}>
                            <SearchIcon />
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Tìm kiếm lớp học hoặc học sinh..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className={styles.filterBtn}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Trạng thái: Tất cả</option>
                            <option value="scheduled">Đã lên lịch</option>
                            <option value="in_progress">Đang học</option>
                            <option value="pending_confirmation">Chờ xác nhận</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                        <select
                            className={styles.sortBtn}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="nextSession">Sắp xếp: Buổi học tiếp theo</option>
                            <option value="subjectName">Sắp xếp: Tên môn học</option>
                            <option value="completedSessions">Sắp xếp: Tiến độ</option>
                        </select>
                    </div>

                    {/* Table or Empty State */}
                    {!loading && sortedClasses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📚</div>
                            <h3 className={styles.emptyTitle}>Chưa có lớp học nào</h3>
                            <p className={styles.emptyDesc}>
                                Lớp học sẽ tự động xuất hiện khi học viên đặt lịch với bạn.
                                Hãy thiết lập lịch rảnh để bắt đầu nhận booking.
                            </p>
                            <button
                                className={styles.emptyAction}
                                onClick={() => navigate('/tutor-portal/onboarding')}
                            >
                                <CalendarIcon />
                                <span>Thiết lập lịch rảnh</span>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <DataTable<ClassData>
                                columns={classColumns}
                                data={sortedClasses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
                                rowKey="bookingId"
                                loading={loading}
                                loadingText="Đang tải dữ liệu..."
                                emptyText="Chưa có lớp học nào"
                                onRowClick={(row) => handleOpenClass(row.bookingId)}
                                pagination={sortedClasses.length > PAGE_SIZE ? {
                                    current: currentPage,
                                    pageSize: PAGE_SIZE,
                                    total: sortedClasses.length,
                                    onChange: setCurrentPage,
                                } : undefined}
                                minWidth={700}
                            />
                        </div>
                    )}
                </div>

        </div>
    );
};

export default TutorPortalClasses;
