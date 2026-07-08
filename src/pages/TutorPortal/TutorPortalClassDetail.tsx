import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type LessonResponse, type SubmitReportRequest } from '../../services/lesson.service';
import { toast } from 'react-toastify';
import { ChevronDown, MapPin, Video } from 'lucide-react';
import { StatusBadge } from '../../components/shared';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { MOCK_LESSONS } from './mockClassSessions';
import styles from '../../styles/pages/tutor-portal-class-detail.module.css';
import sessionStyles from '../../styles/pages/tutor-portal-session-cards.module.css';
import LessonReportForm from './components/LessonReportForm';
import AttachmentUploader from './components/AttachmentUploader';
import HomeworkTab from './components/HomeworkTab';
import MaterialsTab from './components/MaterialsTab';

// Icons
const BackIcon = () => (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 5L3 10.5L8 16M3 10.5H18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M9.5 9.5L13 13" strokeLinecap="round" />
    </svg>
);

const MessageIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 3.5L7 7.5L13 3.5M1 10.5V3.5C1 2.94772 1.44772 2.5 2 2.5H12C12.5523 2.5 13 2.94772 13 3.5V10.5C13 11.0523 12.5523 11.5 12 11.5H2C1.44772 11.5 1 11.0523 1 10.5Z" strokeLinecap="round" />
    </svg>
);

const ExportIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 10V2M7 2L4 5M7 2L10 5M2 12H12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const NoteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1.5H3.5C2.94772 1.5 2.5 1.94772 2.5 2.5V11.5C2.5 12.0523 2.94772 12.5 3.5 12.5H10.5C11.0523 12.5 11.5 12.0523 11.5 11.5V5M8 1.5L11.5 5M8 1.5V5H11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const BookIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 2V12M7 2C7 2 6 3 4 3C2 3 1 2 1 2V10C1 10 2 11 4 11C6 11 7 10 7 10M7 2C7 2 8 3 10 3C12 3 13 2 13 2V10C13 10 12 11 10 11C8 11 7 10 7 10M7 12C7 12 8 11 10 11C12 11 13 12 13 12M7 12C7 12 6 11 4 11C2 11 1 12 1 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const MoreIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="6" cy="1.5" r="1.5" />
        <circle cx="6" cy="6" r="1.5" />
    </svg>
);

// Sample data for reference (commented out - not used)
// const classData = {
//     id: '1',
//     name: 'Toán học',
//     subject: 'Toán',
//     grade: 'Lớp 11',
//     nextLesson: 'Thứ Hai, 20/01 lúc 14:00'
// };

// Type for student data
interface StudentData {
    id: number;
    name: string;
    email: string;
    avatar: string;
    status: string;
    lastLesson: string;
    homeworkStatus: {
        count?: number;
        label: string;
        type: 'overdue' | 'ontrack' | 'pending';
    };
    avgScore: string;
    grade: string;
}

const TutorPortalClassDetail: React.FC = () => {
    const navigate = useNavigate();
    const { classId } = useParams();
    const bookingId = classId ? parseInt(classId) : undefined;

    const [activeTab, setActiveTab] = useState<'students' | 'homework' | 'materials' | 'lessons'>('lessons');
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Lesson management state
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [showReportForm, setShowReportForm] = useState(false);
    const [checkingInLessonId, setCheckingInLessonId] = useState<number | null>(null);
    const [checkingOutLessonId, setCheckingOutLessonId] = useState<number | null>(null);

    // Real data from API
    const [lessons, setLessons] = useState<LessonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [classInfo, setClassInfo] = useState<{
        name: string;
        subject: string;
        grade: string;
        nextLesson: string;
        studentName: string;
        studentEmail: string;
    } | null>(null);

    useEffect(() => {
        if (bookingId) {
            fetchClassData();
        }
    }, [bookingId]);

    // TODO: Backend hiện không còn endpoint `/tutor/lessons*` (đã đổi sang
    // `/api/tutor/class-sessions`). Dùng mock tạm thời — thay lại getTutorLessons()
    // (hoặc service class-session mới) khi lesson.service.ts được viết lại.
    const fetchClassData = async () => {
        setLoading(true);
        const classLessons = MOCK_LESSONS.filter(l => l.bookingId === bookingId);
        setLessons(classLessons);

        if (classLessons.length > 0) {
            const firstLesson = classLessons[0];
            const sortedLessons = [...classLessons].sort((a, b) =>
                new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
            );
            const nextLesson = sortedLessons.find(l => new Date(l.scheduledStart) > new Date());

            setClassInfo({
                name: firstLesson.subject?.subjectName || 'N/A',
                subject: firstLesson.subject?.subjectName || 'N/A',
                grade: firstLesson.student?.gradeLevel || 'N/A',
                nextLesson: nextLesson
                    ? new Date(nextLesson.scheduledStart).toLocaleString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'Không có',
                studentName: firstLesson.student?.fullName || 'Unknown',
                studentEmail: '' // TODO: Add email if available in API
            });
        } else {
            setClassInfo(null);
        }
        setLoading(false);
    };

    const handleBack = () => {
        navigate('/tutor-portal/classes');
    };

    const toggleStudentSelection = (studentId: number) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === studentsDataComputed.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(studentsDataComputed.map(s => s.id));
        }
    };

    const handleOpenStudentDetails = (student: typeof studentsDataComputed[0]) => {
        setSelectedStudent(student);
        setIsSidebarOpen(true);
    };

    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
    };

    const handleViewProfile = () => {
        if (selectedStudent) {
            navigate(`/tutor-portal/students/${selectedStudent.id}?classId=${classId}`);
        }
    };

    // === Lesson Management Functions ===

    /**
     * Tutor được phép check-in trong cửa sổ ±15 phút quanh giờ bắt đầu.
     * BE enforce cùng rule (LessonService.CheckInAsync). FE check trước để
     * disable UI sớm, tránh round-trip nếu rõ ràng ngoài range.
     */
    const canCheckIn = (lesson: LessonResponse): boolean => {
        if (lesson.status !== 'scheduled') return false;
        const now = Date.now();
        const start = new Date(lesson.scheduledStart).getTime();
        const diffMinutes = Math.abs(now - start) / (1000 * 60);
        return diffMinutes <= 15;
    };

    /**
     * Click "Vào lớp": mock check-in (cập nhật state cục bộ) → mở tab Meet.
     * Nếu lesson đã in_progress mà có meetingLink (vd tutor lỡ đóng tab) → re-open thẳng.
     * TODO: thay bằng checkInLesson() thật khi lesson.service.ts trỏ đúng `/tutor/class-sessions`.
     */
    const handleEnterLesson = async (lesson: LessonResponse) => {
        // Case re-join: lesson đang chạy, đã có link → mở thẳng, không cần check-in lại
        if (lesson.status === 'in_progress' && lesson.meetingLink) {
            window.open(lesson.meetingLink, '_blank', 'noopener,noreferrer');
            return;
        }

        setCheckingInLessonId(lesson.lessonId);
        await new Promise((r) => setTimeout(r, 350)); // giả lập độ trễ mạng

        const meetingLink = lesson.meetingLink || `https://meet.example.com/mock-room-${lesson.lessonId}`;
        setLessons((prev) => prev.map((l) => (
            l.lessonId === lesson.lessonId
                ? { ...l, status: 'in_progress', checkInTime: new Date().toISOString(), meetingLink }
                : l
        )));

        window.open(meetingLink, '_blank', 'noopener,noreferrer');
        toast.success('Check-in thành công! Đang mở lớp học…');
        setCheckingInLessonId(null);
    };

    const handleCheckOut = async (lessonId: number) => {
        setCheckingOutLessonId(lessonId);
        await new Promise((r) => setTimeout(r, 350));

        setLessons((prev) => prev.map((l) => (
            l.lessonId === lessonId ? { ...l, checkOutTime: new Date().toISOString() } : l
        )));

        toast.success('Check-out thành công!');
        setCheckingOutLessonId(null);
    };

    const handleReportSubmit = (lessonId: number, request: SubmitReportRequest) => {
        setLessons((prev) => prev.map((l) => (
            l.lessonId === lessonId
                ? {
                    ...l,
                    status: 'pending_confirmation',
                    lessonContent: request.contentCovered,
                    homework: request.homeworkAssigned,
                    tutorNotes: request.tutorNotes,
                    isStudentPresent: request.isStudentPresent,
                    attendanceNote: request.attendanceNote,
                    submittedAt: new Date().toISOString(),
                    confirmDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }
                : l
        )));
    };

    const handleReportSuccess = () => {
        setShowReportForm(false);
        setActiveLessonId(null);
        toast.success('Báo cáo đã được nộp thành công!');
    };

    const sortedLessons = React.useMemo(() => {
        return [...lessons].sort((a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        );
    }, [lessons]);

    // Create student data from classInfo and lessons
    const studentsDataComputed = React.useMemo(() => {
        console.log('📊 Computing students:', { hasClassInfo: !!classInfo, lessonsCount: lessons.length });
        if (!classInfo || lessons.length === 0) {
            console.log('⚠️ No students - returning empty array');
            return [];
        }

        const sortedLessons = [...lessons].sort((a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        );

        const lastCompletedLesson = sortedLessons
            .filter(l => l.status === 'completed' || l.status === 'pending_parent_confirmation')
            .slice(-1)[0];

        const completedCount = lessons.filter(l => l.status === 'completed' || l.status === 'pending_parent_confirmation').length;
        const totalCount = lessons.length;

        const result: StudentData[] = [{
            id: 1,
            name: classInfo.studentName,
            email: classInfo.studentEmail || 'email@example.com',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(classInfo.studentName)}&background=3d4a3e&color=f2f0e4&size=128`,
            status: 'Đang học',
            lastLesson: lastCompletedLesson
                ? new Date(lastCompletedLesson.scheduledStart).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit'
                })
                : 'Chưa có',
            homeworkStatus: {
                label: 'Đúng tiến độ',
                type: 'ontrack' as const
            },
            avgScore: `${Math.round((completedCount / totalCount) * 100)}%`,
            grade: classInfo.grade
        }];
        console.log('✅ Computed students:', result);
        return result;
    }, [classInfo, lessons]);

    return (
        <div className={styles.classDetail}>
            <div className={`${styles.mainContent} ${isSidebarOpen ? styles.withSidebar : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <div className={styles.headerLeft}>
                            <button className={styles.backBtn} onClick={handleBack}>
                                <BackIcon />
                            </button>
                            <div className={styles.classInfo}>
                                {loading ? (
                                    <div>Đang tải...</div>
                                ) : classInfo ? (
                                    <>
                                        <div className={styles.classHeader}>
                                            <h1 className={styles.className}>{classInfo.name}</h1>
                                            <span className={styles.subjectTag}>{classInfo.subject}</span>
                                        </div>
                                        <p className={styles.nextLesson}>Buổi học tiếp theo: {classInfo.nextLesson}</p>
                                    </>
                                ) : (
                                    <div>Không tìm thấy dữ liệu</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'lessons' ? styles.active : ''}`}
                            onClick={() => setActiveTab('lessons')}
                        >
                            Buổi học ({lessons.length})
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
                            onClick={() => setActiveTab('students')}
                        >
                            Học sinh
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'homework' ? styles.active : ''}`}
                            onClick={() => setActiveTab('homework')}
                        >
                            Bài tập về nhà
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'materials' ? styles.active : ''}`}
                            onClick={() => setActiveTab('materials')}
                        >
                            Tài liệu
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <div className={styles.contentContainer}>
                        {/* === LESSONS TAB === */}
                        {activeTab === 'lessons' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                        Đang tải buổi học...
                                    </div>
                                ) : sortedLessons.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                        Chưa có buổi học nào
                                    </div>
                                ) : (
                                    sortedLessons.map((lesson) => {
                                        const meta = getClassSessionStatusMeta(lesson.status);
                                        const isExpanded = activeLessonId === lesson.lessonId;
                                        const startTime = new Date(lesson.scheduledStart);
                                        const endTime = new Date(lesson.scheduledEnd);
                                        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

                                        return (
                                            <div key={lesson.lessonId}>
                                            <div
                                                className={sessionStyles.sessionCard}
                                                style={{
                                                    cursor: 'pointer',
                                                    border: isExpanded ? '1.5px solid #1a2238' : undefined,
                                                    borderRadius: isExpanded ? '14px 14px 0 0' : undefined,
                                                }}
                                                onClick={() => setActiveLessonId(isExpanded ? null : lesson.lessonId)}
                                            >
                                                <div className={sessionStyles.timeBlock}>
                                                    <div className={sessionStyles.timeValue}>
                                                        {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className={sessionStyles.durationValue}>{durationMinutes} phút</div>
                                                </div>

                                                <div className={sessionStyles.sessionInfo}>
                                                    <div className={sessionStyles.sessionTitleRow}>
                                                        <span className={sessionStyles.className}>
                                                            Buổi {sortedLessons.indexOf(lesson) + 1}
                                                            {lesson.subject?.subjectName && ` · ${lesson.subject.subjectName}`}
                                                        </span>
                                                    </div>
                                                    <div className={sessionStyles.metaRow}>
                                                        <span className={sessionStyles.metaItem}>
                                                            {startTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                        <span className={sessionStyles.metaItem}>
                                                            {lesson.meetingLink ? <Video size={12} /> : <MapPin size={12} />}
                                                            {lesson.meetingLink ? 'Online' : 'Tại nhà'}
                                                        </span>
                                                        <StatusBadge variant={meta.variant} shape="tag">{meta.label}</StatusBadge>
                                                    </div>
                                                </div>

                                                <div className={sessionStyles.actionGroup} onClick={(e) => e.stopPropagation()}>
                                                    {/* "Vào lớp" — gọi check-in + auto mở Meet link */}
                                                    {lesson.status === 'scheduled' && canCheckIn(lesson) && (
                                                        <button
                                                            className={sessionStyles.joinActionBtn}
                                                            onClick={() => handleEnterLesson(lesson)}
                                                            disabled={checkingInLessonId === lesson.lessonId}
                                                        >
                                                            {checkingInLessonId === lesson.lessonId ? 'Đang xử lý...' : 'Vào lớp'}
                                                        </button>
                                                    )}

                                                    {/* Re-join cho lesson đang in_progress mà chưa check-out */}
                                                    {lesson.status === 'in_progress' && lesson.meetingLink && !lesson.checkOutTime && (
                                                        <button className={sessionStyles.joinActionBtn} onClick={() => handleEnterLesson(lesson)}>
                                                            Vào lại lớp
                                                        </button>
                                                    )}

                                                    {/* Check-out */}
                                                    {lesson.status === 'in_progress' && !lesson.checkOutTime && (
                                                        <button
                                                            className={sessionStyles.defaultActionBtn}
                                                            onClick={() => handleCheckOut(lesson.lessonId)}
                                                            disabled={checkingOutLessonId === lesson.lessonId}
                                                        >
                                                            {checkingOutLessonId === lesson.lessonId ? 'Đang xử lý...' : 'Check-out'}
                                                        </button>
                                                    )}

                                                    {/* MVP Phase 2: Cho phép nộp báo cáo mà không cần Check-in/Check-out */}
                                                    {(lesson.status === 'in_progress' || lesson.status === 'scheduled') && (
                                                        <button
                                                            className={sessionStyles.primaryActionBtn}
                                                            onClick={() => {
                                                                setActiveLessonId(lesson.lessonId);
                                                                setShowReportForm(true);
                                                            }}
                                                        >
                                                            Nộp báo cáo
                                                        </button>
                                                    )}

                                                    <ChevronDown
                                                        size={16}
                                                        className={`${sessionStyles.expandChevron} ${isExpanded ? sessionStyles.expandChevronOpen : ''}`}
                                                        onClick={() => setActiveLessonId(isExpanded ? null : lesson.lessonId)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>

                                                {/* Expanded Detail */}
                                                {isExpanded && (
                                                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(26,34,56,0.06)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                                                            <div>
                                                                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Học sinh</div>
                                                                <div style={{ fontSize: '14px', color: '#1a2238' }}>
                                                                    {lesson.student?.fullName || classInfo?.studentName || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Giá buổi học</div>
                                                                <div style={{ fontSize: '14px', color: '#1a2238', fontWeight: 600 }}>
                                                                    {lesson.lessonPrice ? `${lesson.lessonPrice.toLocaleString('vi-VN')}đ` : 'N/A'}
                                                                </div>
                                                            </div>
                                                            {lesson.checkInTime && (
                                                                <div>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Check-in lúc</div>
                                                                    <div style={{ fontSize: '14px', color: '#52c41a' }}>
                                                                        {new Date(lesson.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {lesson.checkOutTime && (
                                                                <div>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Check-out lúc</div>
                                                                    <div style={{ fontSize: '14px', color: '#faad14' }}>
                                                                        {new Date(lesson.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {lesson.meetingLink && (
                                                                <div style={{ gridColumn: '1 / -1' }}>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <span>Link học online</span>
                                                                    </div>
                                                                    <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer"
                                                                        style={{ fontSize: '14px', color: '#1890ff', wordBreak: 'break-all' }}>
                                                                        {lesson.meetingLink}
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {lesson.lessonContent && (
                                                                <div style={{ gridColumn: '1 / -1' }}>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Nội dung đã dạy</div>
                                                                    <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap' }}>
                                                                        {lesson.lessonContent}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {lesson.homework && (
                                                                <div style={{ gridColumn: '1 / -1' }}>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Bài tập về nhà</div>
                                                                    <div style={{ fontSize: '14px', color: '#1a2238', whiteSpace: 'pre-wrap' }}>
                                                                        {lesson.homework}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {lesson.confirmDeadline && (
                                                                <div style={{ gridColumn: '1 / -1' }}>
                                                                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Hạn xác nhận</div>
                                                                    <div style={{ fontSize: '14px', color: '#722ed1' }}>
                                                                        {new Date(lesson.confirmDeadline).toLocaleString('vi-VN')}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Report Form */}
                                                        {/* MVP Phase 2: Bỏ điều kiện checkOutTime */}
                                                        {showReportForm && activeLessonId === lesson.lessonId && (lesson.status === 'in_progress' || lesson.status === 'scheduled') && (
                                                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                <LessonReportForm
                                                                    lessonId={lesson.lessonId}
                                                                    onSubmitMock={(request) => handleReportSubmit(lesson.lessonId, request)}
                                                                    onSubmitSuccess={handleReportSuccess}
                                                                    onCancel={() => setShowReportForm(false)}
                                                                />
                                                                <AttachmentUploader lessonId={lesson.lessonId} />
                                                            </div>
                                                        )}

                                                        {/* Check-in hint for scheduled lessons ngoài cửa sổ 15ph */}
                                                        {lesson.status === 'scheduled' && !canCheckIn(lesson) && (
                                                            <div style={{
                                                                marginTop: '16px', padding: '12px 16px',
                                                                background: '#f2f0e4', borderRadius: '8px',
                                                                fontSize: '13px', color: '#666',
                                                            }}>
                                                                Check-in chỉ khả dụng trong vòng 15 phút trước và sau giờ bắt đầu buổi học.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* === STUDENTS TAB === */}
                        {activeTab === 'students' && (
                            <>
                                {/* Toolbar */}
                                <div className={styles.toolbar}>
                                    <div className={styles.searchWrapper}>
                                        <SearchIcon />
                                        <input
                                            type="text"
                                            className={styles.searchInput}
                                            placeholder="Tìm kiếm học sinh..."
                                        />
                                    </div>
                                    <div className={styles.toolbarActions}>
                                        <button className={styles.toolbarBtn} onClick={() => toast.info('Tính năng đang phát triển')}>
                                            <MessageIcon />
                                            <span>Nhắn tin đã chọn</span>
                                        </button>
                                        <button className={styles.toolbarBtn} onClick={() => toast.info('Tính năng đang phát triển')}>
                                            <ExportIcon />
                                            <span>Xuất danh sách</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Students Table */}
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.length === studentsDataComputed.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th>HỌC SINH</th>
                                                <th>TRẠNG THÁI</th>
                                                <th>BUỔI HỌC<br />CUỐI</th>
                                                <th>TRẠNG THÁI<br />BÀI TẬP</th>
                                                <th>ĐIỂM TB</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentsDataComputed.map((student) => (
                                                <tr
                                                    key={student.id}
                                                    className={selectedStudent?.id === student.id ? styles.selected : ''}
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStudents.includes(student.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                toggleStudentSelection(student.id);
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className={styles.studentCell}>
                                                            <img src={student.avatar} alt={student.name} className={styles.avatar} />
                                                            <div className={styles.studentInfo}>
                                                                <div className={styles.studentName}>{student.name}</div>
                                                                <div className={styles.studentEmail}>{student.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[student.status.toLowerCase()]}`}>
                                                            {student.status}
                                                        </span>
                                                    </td>
                                                    <td className={styles.lessonDate}>
                                                        {student.lastLesson.split('\n').map((line, i) => (
                                                            <div key={i}>{line}</div>
                                                        ))}
                                                    </td>
                                                    <td>
                                                        {student.homeworkStatus.count ? (
                                                            <span className={`${styles.hwStatusBadge} ${styles[student.homeworkStatus.type]}`}>
                                                                <span className={styles.hwCount}>{student.homeworkStatus.count}</span>
                                                                <span className={styles.hwLabel}>{student.homeworkStatus.label}</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`${styles.statusBadge} ${styles[student.homeworkStatus.type]}`}>
                                                                {student.homeworkStatus.label}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={styles.avgScore}>{student.avgScore}</td>
                                                    <td>
                                                        <div className={styles.rowActions}>
                                                            <button
                                                                className={styles.iconBtn}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenStudentDetails(student);
                                                                }}
                                                            >
                                                                <MoreIcon />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* === HOMEWORK TAB === */}
                        {activeTab === 'homework' && <HomeworkTab lessons={lessons} />}

                        {/* === MATERIALS TAB === */}
                        {activeTab === 'materials' && <MaterialsTab bookingId={bookingId} />}
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Student Details */}
            {selectedStudent && (
                <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                    <div className={styles.sidebarHeader}>
                        <img src={selectedStudent.avatar} alt={selectedStudent.name} className={styles.sidebarAvatar} />
                        <div className={styles.sidebarStudentInfo}>
                            <h3 className={styles.sidebarStudentName}>{selectedStudent.name}</h3>
                            <div className={styles.sidebarStudentTags}>
                                <span className={styles.sidebarTag}>{selectedStudent.grade}</span>
                                <span className={`${styles.sidebarTag} ${styles.statusTag}`}>{selectedStudent.status}</span>
                            </div>
                        </div>
                        <button className={styles.sidebarCloseBtn} onClick={handleCloseSidebar}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.sidebarContent}>
                        {/* Quick Actions */}
                        <div className={styles.quickActions}>
                            <button className={styles.quickActionBtn} onClick={() => toast.info('Tính năng đang phát triển')}>
                                <MessageIcon />
                                <span>Nhắn tin</span>
                            </button>
                            <button className={styles.quickActionBtn} onClick={() => toast.info('Tính năng đang phát triển')}>
                                <NoteIcon />
                                <span>Thêm ghi chú</span>
                            </button>
                            <button className={styles.quickActionBtn} onClick={() => toast.info('Tính năng đang phát triển')}>
                                <BookIcon />
                                <span>Giao BTVN</span>
                            </button>
                        </div>

                        {/* Overview */}
                        <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>Tổng quan</h4>
                            <div className={styles.overviewCard}>
                                <div className={styles.overviewRow}>
                                    <span className={styles.overviewLabel}>Email</span>
                                    <span className={styles.overviewValue}>{selectedStudent.email}</span>
                                </div>
                                <div className={styles.overviewRow}>
                                    <span className={styles.overviewLabel}>Buổi học cuối</span>
                                    <span className={styles.overviewValue}>T4, 15/01</span>
                                </div>
                                <div className={styles.overviewRow}>
                                    <span className={styles.overviewLabel}>Buổi học tiếp theo</span>
                                    <span className={styles.overviewValue}>T2, 20/01 lúc 14:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Attendance */}
                        <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>Điểm danh (4 buổi gần nhất)</h4>
                            <div className={styles.attendanceGrid}>
                                <div className={styles.attendanceItem}>
                                    <div className={styles.attendanceDate}>T4 15</div>
                                    <div className={`${styles.attendanceStatus} ${styles.present}`}>Có mặt</div>
                                </div>
                                <div className={styles.attendanceItem}>
                                    <div className={styles.attendanceDate}>T2 13</div>
                                    <div className={`${styles.attendanceStatus} ${styles.present}`}>Có mặt</div>
                                </div>
                                <div className={styles.attendanceItem}>
                                    <div className={styles.attendanceDate}>T4 8</div>
                                    <div className={`${styles.attendanceStatus} ${styles.absent}`}>Vắng mặt</div>
                                </div>
                                <div className={styles.attendanceItem}>
                                    <div className={styles.attendanceDate}>T2 6</div>
                                    <div className={`${styles.attendanceStatus} ${styles.present}`}>Có mặt</div>
                                </div>
                            </div>
                        </div>

                        {/* Homework Status */}
                        <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>Trạng thái bài tập</h4>
                            <div className={styles.homeworkList}>
                                <div className={styles.homeworkItem}>
                                    <div className={styles.homeworkInfo}>
                                        <div className={styles.homeworkTitle}>Bài tập Chương 5</div>
                                        <div className={styles.homeworkDue}>Hạn nộp: 16/01</div>
                                    </div>
                                    <span className={`${styles.homeworkBadge} ${styles.overdueBadge}`}>Quá hạn</span>
                                </div>
                                <div className={styles.homeworkItem}>
                                    <div className={styles.homeworkInfo}>
                                        <div className={styles.homeworkTitle}>Kiểm tra thực hành 3</div>
                                        <div className={styles.homeworkDue}>Hạn nộp: 18/01</div>
                                    </div>
                                    <span className={`${styles.homeworkBadge} ${styles.inProgressBadge}`}>Đang làm</span>
                                </div>
                            </div>
                        </div>

                        {/* View Profile Button */}
                        <button className={styles.viewProfileBtn} onClick={handleViewProfile}>XEM HỒ SƠ</button>
                    </div>
                </aside>
            )}

            {/* Overlay - only show when sidebar is open on smaller screens */}
            {isSidebarOpen && selectedStudent && (
                <div className={styles.sidebarOverlay} onClick={handleCloseSidebar} />
            )}
        </div>
    );
};

export default TutorPortalClassDetail;
