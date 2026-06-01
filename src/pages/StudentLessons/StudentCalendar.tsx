/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { CalendarView, type CalendarDayDto } from '../../components/CalendarView/CalendarView';
import { getStudentCalendar } from '../../services/student-lesson.service';
import { isZaloMiniApp } from '../../services/zalo-env';
import s from '../StudentPages.module.css';

const inMiniApp = isZaloMiniApp();

const StudentCalendar: React.FC = () => {
    const [calendarData, setCalendarData] = useState<CalendarDayDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const fetchCalendar = async () => {
        setIsLoading(true);
        try {
            const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
            const endDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
            const response = await getStudentCalendar(startDate, endDate);
            setCalendarData(response.content || []);
        } catch (error) {
            toast.error('Không thể tải dữ liệu thời khóa biểu');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendar();
    }, []);

    const handleLessonClick = (lessonId: number) => {
        navigate(`/student-portal/lessons/${lessonId}`);
    };

    return (
        <div className={s.page}>
            {/* Top Bar */}
            <div className={s.topBar}>
                <div className={s.topBarLeft}>
                    <h1 className={s.pageTitle}>Thời khóa biểu</h1>
                    {!inMiniApp && <p className={s.pageSubtitle}>Xem lịch học của bạn theo tuần</p>}
                </div>
            </div>

            {/* Main Content */}
            <div className={s.mainContent}>
                <div className={s.calendarWrapper}>
                    <CalendarView
                        data={calendarData}
                        isLoading={isLoading}
                        onLessonClick={handleLessonClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default StudentCalendar;
