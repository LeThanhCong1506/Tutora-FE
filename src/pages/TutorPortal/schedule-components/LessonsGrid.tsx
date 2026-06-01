import React from "react";
import dayjs, { Dayjs } from "dayjs";
import styles from "../../../styles/pages/tutor-portal-schedule.module.css";
import { DAYS_OF_WEEK, TIME_SLOTS } from "./constants";
import { isToday } from "./utils";
import type { ViewMode } from "./types";
import type { CalendarLesson } from "../../../services/lesson.service";

interface Props {
    viewMode: ViewMode;
    displayDates: Dayjs[];
    rowHeight: number;
    lessons: CalendarLesson[];
    onLessonClick: (e: React.MouseEvent, lesson: CalendarLesson) => void;
}

const LessonsGrid: React.FC<Props> = ({
    viewMode,
    displayDates,
    rowHeight,
    lessons,
    onLessonClick,
}) => {
    const isDayView = viewMode === "day";

    return (
        <div
            className={`${styles.calendarGrid} ${isDayView ? styles.dayView : ""}`}
            style={isDayView ? ({ "--col-count": "1" } as React.CSSProperties) : undefined}
        >
            <div className={styles.calendarHeader}>
                <div className={styles.timeColumn} />
                {displayDates.map((date, index) => (
                    <div
                        key={index}
                        className={`${styles.dayColumn} ${isToday(date) ? styles.today : ""}`}
                    >
                        <span className={styles.dayName}>
                            {isDayView ? date.format("dddd") : DAYS_OF_WEEK[index]}
                        </span>
                        <span className={styles.dayNumber}>{date.format("DD")}</span>
                        <span className={styles.monthName}>{date.format("MMM")}</span>
                    </div>
                ))}
            </div>

            <div className={styles.calendarBody}>
                {TIME_SLOTS.map((hour, index) => (
                    <div
                        key={hour}
                        className={styles.timeRow}
                        style={{
                            minHeight: `${rowHeight}px`,
                            zIndex: TIME_SLOTS.length - index,
                            position: "relative",
                        }}
                    >
                        <div className={styles.timeLabel}>{hour.toString().padStart(2, "0")}:00</div>
                        {displayDates.map((date, dayIndex) => {
                            const lessonsInSlot = lessons.filter(lesson => {
                                const lessonDate = dayjs(lesson.scheduledStart);
                                return lessonDate.isSame(date, "day") && lessonDate.hour() === hour;
                            });

                            return (
                                <div
                                    key={dayIndex}
                                    className={`${styles.timeCell} ${isToday(date) ? styles.todayColumn : ""}`}
                                >
                                    {lessonsInSlot.map(lesson => {
                                        const start = dayjs(lesson.scheduledStart);
                                        const end = dayjs(lesson.scheduledEnd);
                                        const duration = end.diff(start, "hour", true);
                                        const heightPx = duration * rowHeight - 6;

                                        return (
                                            <div
                                                key={lesson.lessonId}
                                                className={styles.lessonBlock}
                                                style={{ height: `${heightPx}px`, cursor: "pointer" }}
                                                onClick={(e) => onLessonClick(e, lesson)}
                                            >
                                                <div className={styles.lessonContent}>
                                                    <span className={styles.lessonLabel}>
                                                        {lesson.subjectName || "N/A"}
                                                    </span>
                                                    <span className={styles.lessonTime}>
                                                        {start.format("HH:mm")} - {end.format("HH:mm")}
                                                    </span>
                                                    <span className={styles.lessonStudent}>
                                                        {lesson.studentName || "Unknown"}
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
    );
};

export default LessonsGrid;
