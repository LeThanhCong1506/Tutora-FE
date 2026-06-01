import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTutorLessons, type LessonResponse } from '../../services/lesson.service';
import { toast } from 'react-toastify';
import styles from '../../styles/pages/tutor-portal-student-profile.module.css';

// Icons
const MessageIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 3.5L7 7.5L13 3.5M1 10.5V3.5C1 2.94772 1.44772 2.5 2 2.5H12C12.5523 2.5 13 2.94772 13 3.5V10.5C13 11.0523 12.5523 11.5 12 11.5H2C1.44772 11.5 1 11.0523 1 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const NoteIcon = () => (
    <svg width="12.3" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1.5H3.5C2.94772 1.5 2.5 1.94772 2.5 2.5V11.5C2.5 12.0523 2.94772 12.5 3.5 12.5H10.5C11.0523 12.5 11.5 12.0523 11.5 11.5V5M8 1.5L11.5 5M8 1.5V5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const BookIcon = () => (
    <svg width="10.5" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2V12M7 2C7 2 6 3 4 3C2 3 1 2 1 2V10C1 10 2 11 4 11C6 11 7 10 7 10M7 2C7 2 8 3 10 3C12 3 13 2 13 2V10C13 10 12 11 10 11C8 11 7 10 7 10M7 12C7 12 8 11 10 11C12 11 13 12 13 12M7 12C7 12 6 11 4 11C2 11 1 12 1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg width="13.5" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2L10 5M7 2L4 5M7 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg width="13.5" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 12L10 9M7 12L4 9M7 12V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Interfaces for computed data
interface StudentData {
    id: string;
    name: string;
    email: string;
    phone: string;
    class: string;
    grade: string;
    status: string;
    nextLesson: string;
    parent: string;
    parentEmail: string;
    avgScore: number;
    avgScoreChange: number;
    attendanceRate: number;
    attendanceChange: number;
    overdueHw: number;
}

interface AttendanceRecord {
    date: string;
    time: string;
    status: string;
}

interface HomeworkRecord {
    id: number;
    title: string;
    assigned: string;
    due: string;
    status: string;
}

interface ScoreRecord {
    id: number;
    title: string;
    date: string;
    score: number;
}

interface NoteRecord {
    id: number;
    date: string;
    text: string;
}

const TutorPortalStudentProfile: React.FC = () => {
    const navigate = useNavigate();
    const { studentId: _studentId } = useParams();
    const searchParams = new URLSearchParams(window.location.search);
    const classId = searchParams.get('classId');
    const bookingId = classId ? parseInt(classId) : undefined;

    const [newNote, setNewNote] = useState('');
    const [_lessons, setLessons] = useState<LessonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [homeworkData, setHomeworkData] = useState<HomeworkRecord[]>([]);
    const [scoreData, setScoreData] = useState<ScoreRecord[]>([]);
    const [notes, setNotes] = useState<NoteRecord[]>([]);

    useEffect(() => {
        if (bookingId) {
            fetchStudentData();
        }
    }, [bookingId]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Fetching student data for bookingId:', bookingId);

            const response = await getTutorLessons(1, 100);
            const allLessons = Array.isArray(response.content)
                ? response.content
                : response.content?.items || [];

            // Filter lessons for this booking/class
            const classLessons = allLessons.filter(l => l.bookingId === bookingId);
            console.log('✅ Found', classLessons.length, 'lessons for this class');

            setLessons(classLessons);

            if (classLessons.length > 0) {
                computeStudentData(classLessons);
            }
        } catch (error: any) {
            console.error('❌ Error fetching student data:', error);
            toast.error('Không thể tải dữ liệu học sinh');
        } finally {
            setLoading(false);
        }
    };

    const computeStudentData = (classLessons: LessonResponse[]) => {
        const sortedLessons = [...classLessons].sort((a, b) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        );

        const firstLesson = sortedLessons[0];
        const now = new Date();
        const nextLesson = sortedLessons.find(l => new Date(l.scheduledStart) > now);

        // Compute stats
        const completedLessons = sortedLessons.filter(l =>
            l.status === 'completed' || l.status === 'pending_parent_confirmation'
        );
        const totalLessons = sortedLessons.length;
        const completedCount = completedLessons.length;

        // Attendance rate
        const presentCount = sortedLessons.filter(l => l.isStudentPresent === true).length;
        const attendanceRate = totalLessons > 0 ? Math.round((presentCount / totalLessons) * 100) : 0;

        // Average score (placeholder - using completion rate)
        const avgScore = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        // Set student data
        setStudentData({
            id: firstLesson.student?.studentId || '',
            name: firstLesson.student?.fullName || 'Unknown',
            email: 'email@example.com', // TODO: Add email from API
            phone: '+84 (xxx) xxx-xxxx', // TODO: Add phone from API
            class: firstLesson.subject?.subjectName || 'N/A',
            grade: firstLesson.student?.gradeLevel || 'N/A',
            status: 'Đang hoạt động',
            nextLesson: nextLesson
                ? new Date(nextLesson.scheduledStart).toLocaleString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : 'Không có',
            parent: 'Phụ huynh', // TODO: Add from API
            parentEmail: 'parent@example.com', // TODO: Add from API
            avgScore,
            avgScoreChange: 0, // TODO: Calculate trend
            attendanceRate,
            attendanceChange: 0, // TODO: Calculate trend
            overdueHw: 0 // TODO: Calculate from homework data
        });

        // Compute attendance history (last 4 lessons)
        const recentLessons = sortedLessons.slice(-4).reverse();
        setAttendanceData(recentLessons.map(lesson => ({
            date: new Date(lesson.scheduledStart).toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            time: `${new Date(lesson.scheduledStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(lesson.scheduledEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (${Math.round((new Date(lesson.scheduledEnd).getTime() - new Date(lesson.scheduledStart).getTime()) / 60000)} phút)`,
            status: lesson.isStudentPresent ? 'Có mặt' : 'Vắng mặt'
        })));

        // Compute homework data (from lessons with homework)
        const lessonsWithHomework = sortedLessons.filter(l => l.homework);
        setHomeworkData(lessonsWithHomework.map((lesson) => ({
            id: lesson.lessonId,
            title: lesson.homework || 'Bài tập',
            assigned: new Date(lesson.scheduledStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            due: new Date(new Date(lesson.scheduledStart).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            status: lesson.status === 'completed' ? 'Đã nộp' : 'Quá hạn'
        })));

        // Compute notes from tutor notes
        const lessonsWithNotes = sortedLessons.filter(l => l.tutorNotes).slice(-5).reverse();
        setNotes(lessonsWithNotes.map((lesson) => ({
            id: lesson.lessonId,
            date: new Date(lesson.scheduledStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            text: lesson.tutorNotes || ''
        })));

        // Compute score data (placeholder - using lesson completion as "score")
        const completedWithContent = completedLessons.filter(l => l.lessonContent).slice(-3).reverse();
        setScoreData(completedWithContent.map((lesson) => ({
            id: lesson.lessonId,
            title: lesson.lessonContent || 'Bài học',
            date: new Date(lesson.scheduledStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            score: 85 + Math.floor(Math.random() * 15) // Placeholder score 85-100%
        })));

        console.log('✅ Computed student data:', {
            attendance: attendanceData.length,
            homework: homeworkData.length,
            notes: notes.length,
            scores: scoreData.length
        });
    };

    const handleBack = () => {
        if (classId) {
            navigate(`/tutor-portal/classes/${classId}`);
        } else {
            navigate('/tutor-portal/classes');
        }
    };

    const handleSaveNote = () => {
        if (newNote.trim()) {
            console.log('Save note:', newNote);
            setNewNote('');
        }
    };

    if (loading) {
        return (
            <div className={styles.scrollableContentArea}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!studentData) {
        return (
            <div className={styles.scrollableContentArea}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Không tìm thấy dữ liệu học sinh</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.scrollableContentArea}>
            {/* Student Header Section */}
            <div className={styles.sectionStudentHeader}>
                <div className={styles.container13}>
                    <div className={styles.buttonmarginIcon} onClick={handleBack} style={{ cursor: 'pointer' }}>
                        {/* Back arrow */}
                    </div>
                    <div className={styles.container14}>
                        <div className={styles.container15}>
                            <div className={styles.heading1}>
                                <b className={styles.emmaJohnson}>{studentData.name}</b>
                            </div>
                            <div className={styles.overlayborder}>
                                <b className={styles.grade11}>{studentData.grade}</b>
                            </div>
                            <div className={styles.overlayborder2}>
                                <b className={styles.active}>{studentData.status}</b>
                            </div>
                        </div>
                        <div className={styles.container16}>
                            <div className={styles.text9}>
                                <span className={styles.textTxt}>
                                    <span className={styles.apMathematicsA}>{studentData.class} • </span>
                                    <span className={styles.nextLesson}>Buổi học tiếp theo:</span>
                                    <span className={styles.apMathematicsA}> {studentData.nextLesson}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.container17}>
                    <div className={styles.button}>
                        <MessageIcon />
                        <b className={styles.message}>Nhắn tin</b>
                    </div>
                    <div className={styles.button2}>
                        <NoteIcon />
                        <div className={styles.message}>Thêm ghi chú</div>
                    </div>
                    <div className={styles.button2}>
                        <BookIcon />
                        <div className={styles.assignHw}>Giao BTVN</div>
                    </div>
                    <div className={styles.buttonIcon}>{/* More icon */}</div>
                </div>
            </div>

            {/* Main Container */}
            <div className={styles.container18}>
                {/* Left Column */}
                <div className={styles.leftColumnMain}>
                    {/* Overview Stats */}
                    <div className={styles.sectionOverviewStats}>
                        <div className={styles.backgroundbordershadow}>
                            <div className={styles.heading3}>
                                <div className={styles.averageScore}>Điểm trung bình</div>
                            </div>
                            <div className={styles.container19}>
                                <b className={styles.b}>{studentData.avgScore}%</b>
                                <div className={styles.container20}>
                                    <ArrowUpIcon />
                                    <div className={styles.div}>+{studentData.avgScoreChange}%</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.backgroundbordershadow}>
                            <div className={styles.heading3}>
                                <div className={styles.attendanceRate}>Tỷ lệ điểm danh</div>
                            </div>
                            <div className={styles.container19}>
                                <b className={styles.b2}>{studentData.attendanceRate}%</b>
                                <div className={styles.container22}>
                                    <ArrowDownIcon />
                                    <div className={styles.div2}>{studentData.attendanceChange}%</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.backgroundbordershadow}>
                            <div className={styles.heading3}>
                                <div className={styles.overdueHw}>BTVN quá hạn</div>
                            </div>
                            <div className={styles.paragraph}>
                                <b className={styles.b3}>{studentData.overdueHw}</b>
                                <div className={styles.items}>mục</div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance History */}
                    <div className={styles.sectionAttendanceHistory}>
                        <div className={styles.overlayhorizontalborder}>
                            <div className={styles.container10}>
                                <b className={styles.attendanceHistory}>Lịch sử điểm danh</b>
                            </div>
                            <div className={styles.options}>
                                <div className={styles.container23}>
                                    <div className={styles.seniorTutor}>30 ngày qua</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.container24}>
                            {attendanceData.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                    Chưa có dữ liệu điểm danh
                                </div>
                            ) : (
                                attendanceData.map((attendance, index) => (
                                    <div key={index} className={styles.item1}>
                                        <div className={styles.container25}>
                                            <div className={attendance.status === 'Có mặt' ? styles.background2 : styles.overlay} />
                                            <div className={styles.container10}>
                                                <div className={styles.container27}>
                                                    <b className={styles.masterCalculusFundamentals}>{attendance.date}</b>
                                                </div>
                                                <div className={styles.container28}>
                                                    <div className={styles.min}>{attendance.time}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={attendance.status === 'Có mặt' ? styles.overlayborder3 : styles.backgroundborder}>
                                            <div className={styles.min}>{attendance.status}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Homework Section */}
                    <div className={styles.sectionHomework}>
                        <div className={styles.overlayhorizontalborder}>
                            <div className={styles.container10}>
                                <div className={styles.homeworkAssignments}>Bài tập về nhà</div>
                            </div>
                            <div className={styles.button4}>
                                <BookIcon />
                                <div className={styles.assignHomework}>Giao bài tập</div>
                            </div>
                        </div>
                        <div className={styles.container41}>
                            {homeworkData.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                    Chưa có bài tập về nhà
                                </div>
                            ) : (
                                homeworkData.map((homework, index) => (
                                    <div key={homework.id} className={index === 0 ? styles.hwItem1 : styles.hwItem2}>
                                        <div className={styles.container14}>
                                            <div className={styles.container27}>
                                                <div className={styles.chapter5Practice}>{homework.title}</div>
                                            </div>
                                            <div className={styles.container43}>
                                                <div className={styles.assignedJan10Container}>
                                                    <span className={styles.assignedJan10}>Giao ngày: {homework.assigned} • </span>
                                                    <span className={styles.dueJan16}>Hạn nộp: {homework.due}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.container44}>
                                            <div className={homework.status === 'Quá hạn' ? styles.overlayborder6 : styles.backgroundborder2}>
                                                <div className={styles.assignHomework}>{homework.status}</div>
                                            </div>
                                            <div className={styles.link}>
                                                <div className={styles.review}>{homework.status === 'Quá hạn' ? 'Xem lại' : 'Xem'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Score History */}
                    <div className={styles.sectionHomework}>
                        <div className={styles.overlayhorizontalborder3}>
                            <div className={styles.container10}>
                                <b className={styles.scoreHistory}>Lịch sử điểm số</b>
                            </div>
                        </div>
                        <div className={styles.container41}>
                            {scoreData.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                    Chưa có dữ liệu điểm số
                                </div>
                            ) : (
                                scoreData.map((score, index) => (
                                    <div key={score.id} className={index === 0 ? styles.hwItem1 : styles.hwItem2}>
                                        <div className={styles.container14}>
                                            <div className={styles.container27}>
                                                <b className={styles.midTermExam}>{score.title}</b>
                                            </div>
                                            <div className={styles.container28}>
                                                <div className={styles.text12}>{score.date}</div>
                                            </div>
                                        </div>
                                        <div className={styles.container55}>
                                            <b className={styles.b4}>{score.score}%</b>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightColumnSidebarWidgets}>
                    {/* Contact Information */}
                    <div className={styles.sectionContactInfo}>
                        <div className={styles.heading24}>
                            <b className={styles.attendanceHistory}>Thông tin liên hệ</b>
                        </div>
                        <div className={styles.container62}>
                            <div className={styles.sectionStudentHeader}>
                                <div className={styles.email}>Email:</div>
                                <div className={styles.container64}>
                                    <div className={styles.emmajohnsonemailcom}>{studentData.email}</div>
                                </div>
                            </div>
                            <div className={styles.sectionStudentHeader}>
                                <div className={styles.phone}>Điện thoại:</div>
                                <div className={styles.container64}>
                                    <div className={styles.div3}>{studentData.phone}</div>
                                </div>
                            </div>
                            <div className={styles.horizontalDivider} />
                            <div className={styles.sectionStudentHeader}>
                                <div className={styles.parent}>Phụ huynh:</div>
                                <div className={styles.container64}>
                                    <div className={styles.robertJohnson}>{studentData.parent}</div>
                                </div>
                            </div>
                            <div className={styles.sectionStudentHeader}>
                                <div className={styles.parentEmail}>Email phụ huynh:</div>
                                <div className={styles.container64}>
                                    <div className={styles.robertjemailcom}>{studentData.parentEmail}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Goals - Commented out (no API data yet) */}
                    {/* <div className={styles.sectionContactInfo}>
                        <div className={styles.heading24}>
                            <b className={styles.attendanceHistory}>Mục tiêu học tập</b>
                        </div>
                        <div className={styles.container71}>
                            <div className={styles.container72}>
                                <div className={styles.sectionStudentHeader}>
                                    <div className={styles.container27}>
                                        <b className={styles.masterCalculusFundamentals}>Chưa có dữ liệu</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div> */}

                    {/* Notes */}
                    <div className={styles.sectionNotes}>
                        <div className={styles.heading26}>
                            <b className={styles.notes}>Ghi chú</b>
                        </div>
                        <div className={styles.container84}>
                            {notes.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999', marginBottom: '20px' }}>
                                    Chưa có ghi chú
                                </div>
                            )}
                            {notes.map((note) => (
                                <div key={note.id} className={styles.overlayborder8}>
                                    <div className={styles.container85}>
                                        <div className={styles.excellentProgressOn}>
                                            {note.text.split('\n').map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {line}
                                                    {i < note.text.split('\n').length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.container86}>
                                        <div className={styles.text14}>{note.date}</div>
                                    </div>
                                </div>
                            ))}
                            <div className={styles.container89}>
                                <div className={styles.textarea}>
                                    <div className={styles.container90}>
                                        <input
                                            type="text"
                                            className={styles.addANew}
                                            placeholder="Thêm ghi chú mới..."
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className={styles.button5} onClick={handleSaveNote}>
                                    <div className={styles.saveNote}>Lưu ghi chú</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorPortalStudentProfile;
