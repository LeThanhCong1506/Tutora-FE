import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTutorLessons, type LessonResponse } from '../../services/lesson.service';
import { toast } from 'react-toastify';
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
    studentId: string;
    totalLessons: number;
    completedLessons: number;
    nextLesson?: LessonResponse;
    schedule: string; // e.g., "T2, T4 10:00"
    hasHomework: boolean;
    hasNotes: boolean;
    status: string;
}

// Helper to compute class status from lessons
const getClassStatus = (lessons: LessonResponse[]): string => {
    if (lessons.length === 0) return 'unknown';
    const allCompleted = lessons.every(l => l.status === 'completed');
    if (allCompleted) return 'completed';
    const hasCancelled = lessons.some(l => l.status === 'cancelled');
    if (hasCancelled && lessons.every(l => l.status === 'cancelled' || l.status === 'completed')) return 'cancelled';
    const hasInProgress = lessons.some(l => l.status === 'in_progress');
    if (hasInProgress) return 'in_progress';
    const hasPending = lessons.some(l => l.status === 'pending_report' || l.status === 'pending_parent_confirmation');
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
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<string>('nextLesson');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        fetchLessons();
    }, [statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sortBy]);

    const fetchLessons = async () => {
        try {
            setLoading(true);
            console.log('🔄 Fetching tutor lessons...');
            const response = await getTutorLessons(1, 100, undefined, statusFilter || undefined);

            console.log('📦 API Response:', response);
            console.log('📦 Response content:', response.content);

            // Handle both array and PagedList response
            let lessonsData: LessonResponse[] = [];

            if (Array.isArray(response.content)) {
                lessonsData = response.content;
                console.log('✅ Lessons found (array):', lessonsData.length);
            } else if (response.content && response.content.items) {
                lessonsData = response.content.items;
                console.log('✅ Lessons found (PagedList):', lessonsData.length);
            } else {
                console.log('⚠️ No items in response');
            }

            console.log('📚 Lessons data:', lessonsData);
            setLessons(lessonsData);
        } catch (error: any) {
            console.error('❌ Error fetching lessons:', error);
            console.error('❌ Error response:', error.response?.data);
            toast.error('Không thể tải danh sách lớp học: ' + (error.message || 'Lỗi không xác định'));
        } finally {
            setLoading(false);
        }
    };

    // Group lessons by bookingId to create classes
    const classes: ClassData[] = React.useMemo(() => {
        const grouped = new Map<number, LessonResponse[]>();

        // Group lessons by bookingId
        lessons.forEach(lesson => {
            if (!lesson.bookingId) return;
            if (!grouped.has(lesson.bookingId)) {
                grouped.set(lesson.bookingId, []);
            }
            grouped.get(lesson.bookingId)!.push(lesson);
        });

        // Convert to ClassData array
        return Array.from(grouped.entries()).map(([bookingId, classLessons]) => {
            // Sort lessons by date
            const sortedLessons = [...classLessons].sort((a, b) =>
                new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
            );

            // Find next upcoming lesson
            const now = new Date();
            const nextLesson = sortedLessons.find(l => new Date(l.scheduledStart) > now);

            // Count completed lessons
            const completedLessons = sortedLessons.filter(l =>
                l.status === 'completed' || l.status === 'pending_parent_confirmation'
            ).length;

            // Get schedule pattern from lessons
            const scheduleSet = new Set<string>();
            sortedLessons.forEach(lesson => {
                const date = new Date(lesson.scheduledStart);
                const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const day = weekdays[date.getDay()];
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                scheduleSet.add(`${day} ${hours}:${minutes}`);
            });
            const schedule = Array.from(scheduleSet).slice(0, 3).join(', ');

            // Check if class has homework/notes
            const hasHomework = sortedLessons.some(l => l.homework);
            const hasNotes = sortedLessons.some(l => l.tutorNotes);

            // Get first lesson for student/subject info
            const firstLesson = sortedLessons[0];

            return {
                bookingId,
                subjectName: firstLesson.subject?.subjectName || 'N/A',
                studentName: firstLesson.student?.fullName || 'Unknown',
                studentId: firstLesson.student?.studentId || '',
                totalLessons: sortedLessons.length,
                completedLessons,
                nextLesson,
                schedule,
                hasHomework,
                hasNotes,
                status: getClassStatus(sortedLessons)
            };
        });
    }, [lessons]);

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
            case 'completedLessons':
                return (b.completedLessons / b.totalLessons) - (a.completedLessons / a.totalLessons);
            case 'nextLesson':
            default: {
                const aTime = a.nextLesson ? new Date(a.nextLesson.scheduledStart).getTime() : Infinity;
                const bTime = b.nextLesson ? new Date(b.nextLesson.scheduledStart).getTime() : Infinity;
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
                        <span className={styles.tag}>{row.totalLessons} buổi</span>
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
            key: 'nextLesson',
            title: 'Buổi tiếp theo',
            render: (row) => (
                <div className={styles.nextLessonText}>
                    {row.nextLesson
                        ? formatDate(row.nextLesson.scheduledStart).split('\n').map((line, i) => (
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
                        {row.completedLessons}/{row.totalLessons}<br />Hoàn thành
                    </span>
                    <span className={styles.scoresBadge}>
                        {row.hasHomework ? '✓' : '-'}<br />BTVN
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
                            <option value="pending_report">Chờ báo cáo</option>
                            <option value="pending_parent_confirmation">Chờ xác nhận</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                        <select
                            className={styles.sortBtn}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="nextLesson">Sắp xếp: Buổi học tiếp theo</option>
                            <option value="subjectName">Sắp xếp: Tên môn học</option>
                            <option value="completedLessons">Sắp xếp: Tiến độ</option>
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
                                onClick={() => navigate('/tutor-portal/schedule')}
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
