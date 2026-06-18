import { useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import styles from './BookingMonthCalendar.module.css';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface LessonDate {
  scheduledStart: string;
}

interface ScheduleSlot {
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
}

interface BookingMonthCalendarProps {
  lessons?: LessonDate[];
  startDate?: string;
  schedule?: ScheduleSlot[];
  sessionCount?: number;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoDayOfWeek = (date: Date) => (date.getDay() === 0 ? 7 : date.getDay());

const getLessonDates = ({ lessons = [], startDate, schedule = [], sessionCount = 0 }: BookingMonthCalendarProps) => {
  const exactDates = lessons
    .map((lesson) => parseDate(lesson.scheduledStart))
    .filter((date): date is Date => date !== null)
    .sort((first, second) => first.getTime() - second.getTime());

  if (exactDates.length > 0) return exactDates;

  const firstDate = parseDate(startDate);
  if (!firstDate) return [];

  const totalSessions = Math.max(sessionCount, 1);
  const generatedDates: Date[] = [];
  const uniqueSchedule = Array.from(
    new Map(schedule.map((slot) => [`${slot.dayOfWeek}-${slot.startTime ?? ''}-${slot.endTime ?? ''}`, slot])).values(),
  );
  const cursor = new Date(firstDate);
  const searchLimit = new Date(firstDate);
  searchLimit.setFullYear(searchLimit.getFullYear() + 1);

  while (cursor <= searchLimit && generatedDates.length < totalSessions) {
    const slotCount = uniqueSchedule.filter((slot) => slot.dayOfWeek === toIsoDayOfWeek(cursor)).length;

    for (let index = 0; index < slotCount && generatedDates.length < totalSessions; index += 1) {
      generatedDates.push(new Date(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return generatedDates.length > 0 ? generatedDates : [firstDate];
};

const BookingMonthCalendar = (props: BookingMonthCalendarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const lessonDates = getLessonDates(props);
  const countByDate = new Map<string, number>();

  lessonDates.forEach((date) => {
    const key = toDateKey(date);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  });

  const months = Array.from(
    new Map(
      lessonDates.map((date) => [
        `${date.getFullYear()}-${date.getMonth()}`,
        { year: date.getFullYear(), month: date.getMonth() },
      ]),
    ).values(),
  );
  const firstLesson = lessonDates[0];
  const lastLesson = lessonDates.at(-1);

  return (
    <div className={styles.calendar}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <CalendarRange size={16} />
        <span>{isOpen ? 'Ẩn lịch theo tháng' : 'Xem lịch theo tháng'}</span>
        <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`} aria-hidden={!isOpen}>
        <div className={styles.panelInner}>
          <div className={styles.panelContent} role="region" aria-label="Lịch học theo tháng">
            {months.length === 0 ? (
              <p className={styles.empty}>Chưa có ngày học cụ thể để hiển thị trên lịch.</p>
            ) : (
              <div className={styles.months}>
                {months.map(({ year, month }) => {
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;

                  return (
                    <div key={`${year}-${month}`} className={styles.month}>
                      <strong className={styles.monthTitle}>
                        Tháng {month + 1}/{year}
                      </strong>
                      <div className={styles.weekdays} aria-hidden="true">
                        {WEEKDAY_LABELS.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                      <div className={styles.days}>
                        {Array.from({ length: leadingBlanks }, (_, index) => (
                          <span key={`blank-${index}`} className={styles.blank} aria-hidden="true" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, index) => {
                          const day = index + 1;
                          const date = new Date(year, month, day);
                          const lessonCount = countByDate.get(toDateKey(date)) ?? 0;
                          const isInRange = firstLesson && lastLesson && date >= firstLesson && date <= lastLesson;

                          return (
                            <span
                              key={day}
                              className={`${styles.day} ${isInRange ? '' : styles.dayMuted} ${
                                lessonCount > 0 ? styles.dayActive : ''
                              }`}
                              title={lessonCount > 0 ? `${day}/${month + 1}: ${lessonCount} buổi học` : undefined}
                              aria-label={lessonCount > 0 ? `${day}/${month + 1}, ${lessonCount} buổi học` : undefined}
                            >
                              {day}
                              {lessonCount > 0 && <i className={styles.dot} aria-hidden="true" />}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingMonthCalendar;
