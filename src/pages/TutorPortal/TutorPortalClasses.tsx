import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTutorClasses, type TutorClassSummary, type TutorClassStatus } from '../../services/classSession.service';
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

const getStatusDisplay = (status: TutorClassStatus | string): { label: string; variant: 'success' | 'error' | 'info' | 'warning' | 'neutral' } => {
    switch (status) {
        case 'completed': return { label: 'Hoàn thành', variant: 'success' };
        case 'cancelled': return { label: 'Đã hủy', variant: 'error' };
        case 'in_progress': return { label: 'Đang học', variant: 'info' };
        case 'pending_confirmation': return { label: 'Chờ xử lý', variant: 'warning' };
        case 'scheduled': return { label: 'Đã lên lịch', variant: 'neutral' };
        default: return { label: 'Không rõ', variant: 'neutral' };
    }
};

const PAGE_SIZE = 10;

const TutorPortalClasses: React.FC = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<TutorClassSummary[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 whenever the filters change.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                const response = await getTutorClasses(
                    currentPage,
                    PAGE_SIZE,
                    statusFilter || undefined,
                    searchTerm.trim() || undefined,
                );
                const data = response.content;
                setClasses(data?.items ?? []);
                setTotalCount(data?.totalCount ?? 0);
            } catch (error: unknown) {
                const e = error as { response?: { data?: { message?: string } }; message?: string };
                toast.error('Không thể tải danh sách lớp học: ' + (e.response?.data?.message || e.message || 'Lỗi không xác định'));
            } finally {
                setLoading(false);
            }
        }, searchTerm ? 350 : 0);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [currentPage, statusFilter, searchTerm]);

    const handleOpenClass = (bookingId: number) => {
        navigate(`/tutor-portal/classes/${bookingId}`);
    };

    // Column definitions for DataTable
    const classColumns: DataTableColumn<TutorClassSummary>[] = [
        {
            key: 'class',
            title: 'Lớp học',
            render: (row) => (
                <div className={styles.classInfo}>
                    <div className={styles.className}>{row.subjectName || 'N/A'}</div>
                    <div className={styles.classTags}>
                        <span className={styles.tag}>{row.totalSessions} buổi</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'schedule',
            title: 'Lịch học',
            render: (row) => <div className={styles.scheduleText}>{row.schedule || '—'}</div>,
            hideOnMobile: true,
        },
        {
            key: 'student',
            title: 'Học sinh',
            render: (row) => {
                const name = row.studentName || 'Unknown';
                return (
                    <div className={styles.studentsList}>
                        <div className={styles.studentAvatar}>
                            {name.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ marginLeft: '8px', fontSize: '13px' }}>{name}</span>
                    </div>
                );
            },
        },
        {
            key: 'nextSession',
            title: 'Buổi tiếp theo',
            render: (row) => (
                <div className={styles.nextLessonText}>
                    {row.nextSessionStart
                        ? formatDate(row.nextSessionStart).split('\n').map((line, i) => (
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
                        </select>
                    </div>

                    {/* Table or Empty State */}
                    {!loading && classes.length === 0 ? (
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
                            <DataTable<TutorClassSummary>
                                columns={classColumns}
                                data={classes}
                                rowKey="bookingId"
                                loading={loading}
                                loadingText="Đang tải dữ liệu..."
                                emptyText="Chưa có lớp học nào"
                                onRowClick={(row) => handleOpenClass(row.bookingId)}
                                pagination={totalCount > PAGE_SIZE ? {
                                    current: currentPage,
                                    pageSize: PAGE_SIZE,
                                    total: totalCount,
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
