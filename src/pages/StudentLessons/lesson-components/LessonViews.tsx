import type { CSSProperties } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { CalendarDays, ChevronRight, Clapperboard, ClipboardList, Clock3, UserRound, Video } from 'lucide-react';
import { getClassSessionStatusMeta } from '../../../utils/classSessionStatus';
import styles from '../styles.module.css';
import type { LessonSummary, LessonViewProps } from './types';
import {
  formatDayHeading,
  getLessonDate,
  getLessonLiveState,
  getLessonTime,
  groupLessonsByDate,
  isAwaitingReport,
  isCancelledLesson,
} from './utils';

const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

const SYSTEM_STATUS_TONES: Record<string, { color: string; bg: string }> = {
  reserved: { color: '#687086', bg: '#f0f2f4' },
  scheduled: { color: '#2478e5', bg: '#eaf3ff' },
  in_progress: { color: '#0f8f83', bg: '#e8f5f2' },
  pending_confirmation: { color: '#a46d18', bg: '#faf3e7' },
  completed: { color: '#0b796a', bg: '#e9f6f2' },
  cancelled: { color: '#687086', bg: '#f0f2f4' },
  cancelled_noshow: { color: '#687086', bg: '#f0f2f4' },
  no_show: { color: '#b25048', bg: '#fbefee' },
  disputed: { color: '#b25048', bg: '#fbefee' },
};

const getLessonStatusMeta = (status: string) => {
  const meta = getClassSessionStatusMeta(status);
  const tone = SYSTEM_STATUS_TONES[status.toLowerCase()];
  return tone ? { ...meta, ...tone } : meta;
};

const getLessonDisplayMeta = (lesson: LessonSummary) => {
  const status = getLessonStatusMeta(lesson.status);
  // Đã check-out nhưng chưa gửi báo cáo: phòng đã đóng — không hiện "Đang diễn ra" nữa.
  if (isAwaitingReport(lesson)) {
    return { ...status, label: 'Chờ gửi báo cáo', color: '#a46d18', bg: '#faf3e7' };
  }
  const liveState = getLessonLiveState(lesson);
  if (liveState === 'due') {
    return { ...status, label: 'Tới giờ học', color: '#c96b08', bg: '#fff3dc' };
  }
  if (liveState === 'live') {
    return { ...status, color: '#087f6d', bg: '#def7ef' };
  }
  return status;
};

const getLessonStyle = (lesson: LessonSummary): CSSProperties => {
  const status = getLessonDisplayMeta(lesson);
  return {
    '--status-color': status.color,
    '--status-bg': status.bg,
  } as CSSProperties;
};

const getSubject = (lesson: LessonSummary) => lesson.subjectName || `Buổi học #${lesson.lessonId}`;

/** Nhãn + tên người đối diện: học sinh thấy gia sư (mặc định), gia sư thấy học sinh. */
const getCounterpart = (lesson: LessonSummary) => ({
  label: lesson.counterpartLabel || 'Gia sư',
  name: lesson.counterpartName || lesson.tutorName || 'Chưa cập nhật',
});

const canShowJoinButton = (lesson: LessonSummary) => {
  if (isAwaitingReport(lesson)) return false; // phòng đã đóng sau check-out
  const status = lesson.status.trim().toLowerCase();
  return ['scheduled', 'in_progress'].includes(status) && Boolean(lesson.meetingLink?.trim());
};

const getAttentionClass = (lesson: LessonSummary): string => {
  const liveState = getLessonLiveState(lesson);
  if (liveState === 'live') return `${styles.attentionLesson} ${styles.liveLesson}`;
  if (liveState === 'due') return `${styles.attentionLesson} ${styles.dueLesson}`;
  return '';
};

const StatusPill = ({ lesson }: { lesson: LessonSummary }) => {
  const status = getLessonDisplayMeta(lesson);
  return (
    <span className={styles.statusPill}>
      <i />
      <span>{status.label}</span>
    </span>
  );
};

// meetingLink là ID channel Agora (= classSessionId), không phải URL. Theo nghiệp vụ
// của trang danh sách, mọi buổi scheduled đã có channel đều cho phép đi tới phòng học nội bộ.
const MeetLink = ({ lesson, compact = false }: { lesson: LessonSummary; compact?: boolean }) => {
  // Buổi đã check-out chờ báo cáo: gia sư (trang có set reportPath) thấy nút "Gửi báo cáo"
  // thay cho "Vào lớp"; học sinh/phụ huynh chỉ thấy badge, không còn nút vào phòng đã đóng.
  if (isAwaitingReport(lesson)) {
    if (!lesson.reportPath) return null;
    return (
      <Link
        className={styles.meetLink}
        to={lesson.reportPath}
        aria-label={`Gửi báo cáo buổi học ${getSubject(lesson)}`}
      >
        <ClipboardList size={compact ? 12 : 14} strokeWidth={2.1} aria-hidden="true" />
        <span>Gửi báo cáo</span>
      </Link>
    );
  }

  if (!canShowJoinButton(lesson)) return null;
  const isAttentionNeeded = Boolean(getLessonLiveState(lesson));

  return (
    <Link
      className={styles.meetLink}
      to={`/session-lobby/${lesson.lessonId}`}
      aria-label={`Vào lớp học ${getSubject(lesson)}`}
    >
      <Video size={compact ? 12 : 14} strokeWidth={2.1} aria-hidden="true" />
      <span>{isAttentionNeeded ? (compact ? 'Vào ngay' : 'Vào lớp ngay') : 'Vào lớp'}</span>
    </Link>
  );
};

/** Badge nhỏ báo buổi học đã có video xem lại — chỉ hiện khi thật sự đã có (không nêu trạng thái "chưa có"). */
const RecordingBadge = ({ compact = false }: { compact?: boolean }) => (
  <span className={styles.recordingBadge}>
    <Clapperboard size={compact ? 11 : 12} strokeWidth={2.3} aria-hidden="true" />
    <span>Có bản ghi</span>
  </span>
);

const LessonHoverDetails = ({ lesson }: { lesson: LessonSummary }) => {
  const status = getLessonDisplayMeta(lesson);
  const canJoin = canShowJoinButton(lesson);
  return (
    <div
      className={styles.lessonTooltip}
      style={{ '--status-color': status.color, '--status-bg': status.bg } as CSSProperties}
    >
      <strong>{getSubject(lesson)}</strong>
      <div className={styles.tooltipMeta}>
        <span>
          <CalendarDays size={14} aria-hidden="true" />
          {formatDayHeading(getLessonDate(lesson))} · {getLessonTime(lesson)}
        </span>
        <span className={styles.tooltipTutor}>
          <UserRound size={14} aria-hidden="true" />
          {getCounterpart(lesson).label}: <b>{getCounterpart(lesson).name}</b>
        </span>
      </div>
      <div className={styles.tooltipFooter}>
        <span className={styles.tooltipStatus}>
          <i className={styles.tooltipStatusDot} />
          {status.label}
        </span>
        <span className={`${styles.tooltipMeetState} ${canJoin ? styles.tooltipMeetReady : ''}`}>
          <Video size={12} aria-hidden="true" />
          {canJoin ? 'Có thể vào lớp' : 'Không thể vào lớp'}
        </span>
        {lesson.hasRecording && <RecordingBadge />}
      </div>
    </div>
  );
};

const LessonTooltip = ({ lesson, children }: { lesson: LessonSummary; children: React.ReactElement }) => (
  <Tooltip
    title={<LessonHoverDetails lesson={lesson} />}
    placement="top"
    trigger={['hover', 'focus']}
    mouseEnterDelay={0.22}
    color="#fffefa"
    classNames={{ root: styles.lessonTooltipRoot, container: styles.lessonTooltipContainer }}
    arrow={{ pointAtCenter: true }}
  >
    {children}
  </Tooltip>
);

const CalendarEvent = ({ lesson, onOpen }: { lesson: LessonSummary; onOpen: () => void }) => (
  <LessonTooltip lesson={lesson}>
    <article
      className={`${styles.calendarEvent} ${getAttentionClass(lesson)} ${isCancelledLesson(lesson) ? styles.cancelled : ''}`}
      style={getLessonStyle(lesson)}
    >
      <button
        type="button"
        className={styles.calendarEventMain}
        onClick={onOpen}
        aria-label={`Xem ${getSubject(lesson)}, ${getLessonTime(lesson)}`}
      >
        <span className={styles.eventTime}>{getLessonTime(lesson)}</span>
        <strong>{getSubject(lesson)}</strong>
        {lesson.counterpartName && <span className={styles.lessonPerson}>{lesson.counterpartName}</span>}
      </button>
      <div className={styles.calendarEventFooter}>
        <StatusPill lesson={lesson} />
        {lesson.hasRecording && <RecordingBadge compact />}
        <MeetLink lesson={lesson} compact />
      </div>
    </article>
  </LessonTooltip>
);

const ListLessonRow = ({ lesson, onOpen }: { lesson: LessonSummary; onOpen: () => void }) => (
  <LessonTooltip lesson={lesson}>
    <article
      className={`${styles.listRow} ${getAttentionClass(lesson)} ${isCancelledLesson(lesson) ? styles.cancelled : ''}`}
      style={getLessonStyle(lesson)}
    >
      <button
        type="button"
        className={styles.listRowMain}
        onClick={onOpen}
        aria-label={`Xem chi tiết ${getSubject(lesson)}, ${getLessonTime(lesson)}`}
      >
        <span className={styles.listTime}>
          <strong>{getLessonTime(lesson).split('–')[0]}</strong>
          <span>{getLessonTime(lesson).split('–')[1] || ''}</span>
        </span>
        <span className={styles.listInfo}>
          <strong>{getSubject(lesson)}</strong>
          {lesson.counterpartName && <span className={styles.lessonPerson}>{lesson.counterpartName}</span>}
        </span>
      </button>
      <div className={styles.listActions}>
        <MeetLink lesson={lesson} />
        {lesson.hasRecording && <RecordingBadge compact />}
        <StatusPill lesson={lesson} />
        <button type="button" className={styles.detailIconButton} onClick={onOpen} aria-label="Xem chi tiết buổi học">
          <ChevronRight size={18} className={styles.rowChevron} aria-hidden="true" />
        </button>
      </div>
    </article>
  </LessonTooltip>
);

interface CalendarLessonViewProps extends LessonViewProps {
  weekDates: Dayjs[];
  selectedDate: Dayjs;
  onSelectDate: (date: Dayjs) => void;
}

export const CalendarLessonView = ({
  lessons,
  weekDates,
  selectedDate,
  onSelectDate,
  onOpenLesson,
}: CalendarLessonViewProps) => {
  const lessonsForDate = (date: Dayjs) => lessons.filter((lesson) => getLessonDate(lesson).isSame(date, 'day'));
  const selectedLessons = lessonsForDate(selectedDate);

  return (
    <>
      <div className={styles.weekCalendar}>
        {weekDates.map((date, index) => {
          const dayLessons = lessonsForDate(date);
          const isToday = date.isSame(dayjs(), 'day');
          return (
            <section
              className={`${styles.dayColumn} ${isToday ? styles.todayColumn : ''}`}
              key={date.format('YYYY-MM-DD')}
            >
              <header className={styles.dayHeader}>
                <span>{WEEK_DAYS[index]}</span>
                <strong className={isToday ? styles.todayNumber : ''}>{date.format('DD')}</strong>
                {dayLessons.length > 0 && <small>{dayLessons.length} buổi</small>}
              </header>
              <div className={styles.dayBody}>
                {dayLessons.length === 0 ? (
                  <span className={styles.emptyDay}>Ngày trống</span>
                ) : (
                  dayLessons.map((lesson) => (
                    <CalendarEvent key={lesson.lessonId} lesson={lesson} onOpen={() => onOpenLesson(lesson.lessonId)} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.mobileCalendar}>
        <div className={styles.mobileDayStrip} role="tablist" aria-label="Chọn ngày trong tuần">
          {weekDates.map((date, index) => {
            const selected = date.isSame(selectedDate, 'day');
            const lessonCount = lessonsForDate(date).length;
            return (
              <button
                key={date.format('YYYY-MM-DD')}
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? styles.selectedMobileDay : ''}
                onClick={() => onSelectDate(date)}
              >
                <span>{WEEK_DAYS[index].replace('Thứ ', 'T')}</span>
                <strong>{date.format('DD')}</strong>
                <i className={lessonCount > 0 ? styles.hasLesson : ''} />
              </button>
            );
          })}
        </div>
        <div className={styles.mobileAgenda}>
          <div className={styles.mobileAgendaHeader}>
            <div>
              <span>Lịch trong ngày</span>
              <strong>{formatDayHeading(selectedDate)}</strong>
            </div>
            <small>{selectedLessons.length} buổi</small>
          </div>
          {selectedLessons.length === 0 ? (
            <div className={styles.mobileEmptyDay}>
              <CalendarDays size={20} />
              Không có buổi học trong ngày này
            </div>
          ) : (
            <div className={styles.mobileAgendaList}>
              {selectedLessons.map((lesson) => (
                <ListLessonRow key={lesson.lessonId} lesson={lesson} onOpen={() => onOpenLesson(lesson.lessonId)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const GridLessonView = ({ lessons, onOpenLesson }: LessonViewProps) => (
  <div className={styles.lessonGrid}>
    {lessons.map((lesson) => {
      const status = getLessonStatusMeta(lesson.status);
      const openLesson = () => onOpenLesson(lesson.lessonId);
      return (
        <LessonTooltip lesson={lesson} key={lesson.lessonId}>
          <article
            className={`${styles.gridCard} ${getAttentionClass(lesson)} ${isCancelledLesson(lesson) ? styles.cancelled : ''}`}
            style={getLessonStyle(lesson)}
          >
            <button
              type="button"
              className={styles.gridCardMain}
              onClick={openLesson}
              aria-label={`Xem chi tiết ${getSubject(lesson)}, ${getLessonTime(lesson)}`}
            >
              <span className={styles.gridCardTop}>
                <span className={styles.gridDate}>
                  <CalendarDays size={14} />
                  {getLessonDate(lesson).format('dddd, DD/MM')}
                </span>
                <StatusPill lesson={lesson} />
              </span>
              <span className={styles.gridCardBody}>
                <span className={styles.subjectMark} aria-hidden="true">
                  <BookMarkIcon />
                </span>
                <span>
                  <strong>{getSubject(lesson)}</strong>
                  {lesson.counterpartName && (
                    <span className={styles.lessonPerson}>
                      <UserRound size={13} aria-hidden="true" /> {lesson.counterpartName}
                    </span>
                  )}
                  <span className={styles.gridTime}>
                    <Clock3 size={14} /> {getLessonTime(lesson)}
                  </span>
                </span>
              </span>
            </button>
            <div className={styles.gridCardFooter}>
              <MeetLink lesson={lesson} />
              {lesson.hasRecording && <RecordingBadge compact />}
              <button type="button" className={styles.openCard} style={{ color: status.color }} onClick={openLesson}>
                Chi tiết <ChevronRight size={16} />
              </button>
            </div>
          </article>
        </LessonTooltip>
      );
    })}
  </div>
);

export const ListLessonView = ({ lessons, onOpenLesson }: LessonViewProps) => {
  const groups = groupLessonsByDate(lessons);
  return (
    <div className={styles.listGroups}>
      {groups.map((group) => (
        <section className={styles.listGroup} key={group.dateKey}>
          <header className={styles.listDateHeader}>
            <span className={styles.listDateIcon} aria-hidden="true">
              <CalendarDays size={15} />
            </span>
            <h3>{formatDayHeading(group.date)}</h3>
            <i />
            <small>{group.lessons.length} buổi</small>
          </header>
          <div className={styles.listRows}>
            {group.lessons.map((lesson) => (
              <ListLessonRow key={lesson.lessonId} lesson={lesson} onOpen={() => onOpenLesson(lesson.lessonId)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const BookMarkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7" />
  </svg>
);
