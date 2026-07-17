import React, { useState, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/vi';
import styles from './CalendarView.module.css';

dayjs.extend(isoWeek);
dayjs.locale('vi');

export interface CalendarLessonDto {
    lessonId: number;
    scheduledStart: string;
    scheduledEnd: string;
    studentName?: string;
    tutorName?: string; // Add if returned from Parent calendar
    subjectName?: string;
    status: string;
    meetingLink?: string;
}

export interface CalendarDayDto {
    date: string;
    lessons: CalendarLessonDto[];
}

interface CalendarViewProps {
    data: CalendarDayDto[];
    isLoading?: boolean;
    onLessonClick?: (lessonId: number) => void;
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

const ChevronLeftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11 5L7 9L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M7 5L11 9L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const CalendarView: React.FC<CalendarViewProps> = ({ data, isLoading, onLessonClick }) => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

    const weekDates = useMemo(() => {
        const startOfWeek = currentDate.startOf('isoWeek');
        return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
    }, [currentDate]);

    const weekRange = useMemo(() => {
        const start = weekDates[0];
        const end = weekDates[6];

        if (start.month() === end.month()) {
            return `${start.format('DD')} - ${end.format('DD MMM, YYYY')}`;
        }
        return `${start.format('DD MMM')} - ${end.format('DD MMM, YYYY')}`;
    }, [weekDates]);

    const isCurrentWeek = useMemo(() => {
        const today = dayjs();
        const startOfCurrentWeek = today.startOf('isoWeek');
        const startOfDisplayWeek = currentDate.startOf('isoWeek');
        return startOfCurrentWeek.isSame(startOfDisplayWeek, 'day');
    }, [currentDate]);

    const isToday = (date: Dayjs) => {
        return date.isSame(dayjs(), 'day');
    };

    // Flatten data to easily get lessons per day+hour
    const flatLessons = useMemo(() => {
        return data.flatMap(day => day.lessons);
    }, [data]);

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.calendarControls}>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.viewBtn} ${viewMode === 'week' ? styles.active : ''}`}
                        onClick={() => setViewMode('week')}
                    >
                        Tuần
                    </button>
                    <button
                        className={`${styles.viewBtn} ${viewMode === 'month' ? styles.active : ''}`}
                        onClick={() => setViewMode('month')}
                    >
                        Tháng
                    </button>
                </div>

                <div className={styles.dateNav}>
                    <button className={styles.navBtn} onClick={() => setCurrentDate(currentDate.subtract(1, 'week'))}>
                        <ChevronLeftIcon />
                    </button>
                    <span className={styles.dateRange}>{weekRange}</span>
                    <button className={styles.navBtn} onClick={() => setCurrentDate(currentDate.add(1, 'week'))}>
                        <ChevronRightIcon />
                    </button>
                    <button
                        className={`${styles.nowBtn} ${isCurrentWeek ? styles.active : ''}`}
                        onClick={() => setCurrentDate(dayjs())}
                        disabled={isCurrentWeek}
                    >
                        Hôm nay
                    </button>
                </div>
            </div>

            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={styles.legendDot} />
                    <span>Buổi học</span>
                </div>
                <div className={styles.timezone}>UTC+7 • Giờ Việt Nam</div>
            </div>

            {isLoading ? (
                <div className={styles.loadingOverlay}>Đang tải...</div>
            ) : flatLessons.length === 0 ? (
                <div className={styles.emptyState}>
                    <h3 className={styles.emptyTitle}>Chưa có lịch</h3>
                    <p className={styles.emptyDescription}>Các buổi học sắp tới sẽ hiển thị tại đây.</p>
                </div>
            ) : (
                <div className={styles.calendarGrid}>
                    <div className={styles.calendarHeader}>
                        <div className={styles.timeColumn} />
                        {weekDates.map((date, index) => (
                            <div key={index} className={`${styles.dayColumn} ${isToday(date) ? styles.today : ''}`}>
                                <span className={styles.dayName}>{DAYS_OF_WEEK[index]}</span>
                                <span className={styles.dayNumber}>{date.format('DD')}</span>
                                <span className={styles.monthName}>{date.format('MMM')}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.calendarBody}>
                        {TIME_SLOTS.map((hour, index) => (
                            <div key={hour} className={styles.timeRow} style={{ zIndex: TIME_SLOTS.length - index }}>
                                <div className={styles.timeLabel}>{hour.toString().padStart(2, '0')}:00</div>
                                {weekDates.map((date, dayIndex) => {
                                    const lessonsInSlot = flatLessons.filter(lesson => {
                                        const lessonDate = dayjs(lesson.scheduledStart);
                                        return lessonDate.isSame(date, 'day') && lessonDate.hour() === hour;
                                    });

                                    return (
                                        <div key={dayIndex} className={`${styles.timeCell} ${isToday(date) ? styles.todayColumn : ''}`}>
                                            {lessonsInSlot.map(lesson => {
                                                const start = dayjs(lesson.scheduledStart);
                                                const end = dayjs(lesson.scheduledEnd);
                                                const duration = end.diff(start, 'hour', true);
                                                const heightPx = duration * 70 - 6;

                                                return (
                                                    <div
                                                        key={lesson.lessonId}
                                                        className={styles.lessonBlock}
                                                        style={{ height: `${heightPx}px` }}
                                                        onClick={() => onLessonClick && onLessonClick(lesson.lessonId)}
                                                    >
                                                        <div className={styles.lessonContent}>
                                                            <span className={styles.lessonLabel}>
                                                                {lesson.subjectName || 'N/A'}
                                                            </span>
                                                            <span className={styles.lessonTime}>
                                                                {start.format('HH:mm')} - {end.format('HH:mm')}
                                                            </span>
                                                            <span className={styles.lessonStudent}>
                                                                {lesson.studentName || lesson.tutorName || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
