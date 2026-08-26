import type { CSSProperties, ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  ClipboardList,
  Clock3,
  Link2,
  UserRound,
  Video,
} from 'lucide-react';
import { getClassSessionStatusMeta } from '../../../utils/classSessionStatus';
import { canJoinLiveSession } from '../../../utils/liveSession';
import styles from '../styles.module.css';
import type { LessonSummary, LessonViewProps } from './types';
import {
  formatDayHeading,
  getLessonBucketDate,
  getLessonLiveState,
  getLessonTime,
  groupLessonsByChain,
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

/** Dòng người liên quan thứ hai (nếu trang có set) — vd phụ huynh xem lịch chung nhiều con. */
const SecondaryPerson = ({ lesson }: { lesson: LessonSummary }) =>
  lesson.secondaryName ? (
    <span className={`${styles.lessonPerson} ${styles.secondaryPerson}`}>
      {lesson.secondaryLabel ? `${lesson.secondaryLabel}: ` : ''}
      {lesson.secondaryName}
    </span>
  ) : null;

// Vào lớp được bất kỳ lúc nào (BE không chặn theo giờ, EarlyJoinToleranceMinutes chỉ quyết có cần
// hỏi xác nhận thêm khi vào sớm/muộn chứ không chặn cứng) — nên hàm này giờ chỉ còn xét đúng những lý
// do "thật sự không vào được": không phải người có quyền vào (phụ huynh theo dõi), phòng đã đóng sau
// check-out, hoặc buổi không ở trạng thái có thể vào (đã huỷ/kết thúc/chưa có phòng/2 bên đã đồng ý
// bỏ buổi phụ). Phần status/meetingLink/skip dùng chung canJoinLiveSession — tránh lệch định nghĩa
// với các nơi khác (LiveSession/SessionLobby) từng thiếu điều kiện skipConfirmedByBothSides.
const canShowJoinButton = (lesson: LessonSummary) => {
  if (lesson.canJoin === false) return false; // người xem chỉ theo dõi (phụ huynh)
  if (isAwaitingReport(lesson)) return false; // phòng đã đóng sau check-out
  return canJoinLiveSession(lesson);
};

const getAttentionClass = (lesson: LessonSummary): string => {
  const liveState = getLessonLiveState(lesson);
  if (liveState === 'live') return `${styles.attentionLesson} ${styles.liveLesson}`;
  if (liveState === 'due') return `${styles.attentionLesson} ${styles.dueLesson}`;
  return '';
};

const StatusPill = ({ lesson }: { lesson: LessonSummary }) => {
  const status = getLessonDisplayMeta(lesson);
  const isAlert = status.variant === 'warning' || status.variant === 'error';
  return (
    <span className={`${styles.statusPill} ${isAlert ? styles.statusPillAlert : ''}`}>
      <i />
      <span title={status.label}>{status.label}</span>
    </span>
  );
};

// meetingLink là ID channel Agora (= classSessionId), không phải URL. Theo nghiệp vụ
// của trang danh sách, mọi buổi scheduled đã có channel đều cho phép đi tới phòng học nội bộ.
const MeetLink = ({ lesson, compact = false }: { lesson: LessonSummary; compact?: boolean }) => {
  // Người xem chỉ theo dõi (phụ huynh): không có nút vào lớp lẫn nút gửi báo cáo.
  if (lesson.canJoin === false) return null;

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

  // Chỉ hiện khi đã gần giờ học/đang diễn ra (xem canShowJoinButton) nên nhãn cố định "vào nhanh".
  if (!canShowJoinButton(lesson)) return null;

  return (
    <Link
      className={styles.meetLink}
      to={`/session-lobby/${lesson.lessonId}`}
      aria-label={`Vào lớp học ${getSubject(lesson)}`}
    >
      <Video size={compact ? 12 : 14} strokeWidth={2.1} aria-hidden="true" />
      <span>{compact ? 'Vào nhanh' : 'Vào học nhanh'}</span>
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

/**
 * Badge riêng cho yêu cầu dời lịch (đổi giờ ngoài lịch đã đặt) đang chờ/đã xác nhận — KHÔNG phải
 * trạng thái "Chờ xác nhận" báo cáo buổi học (status pending_confirmation), 2 khái niệm khác nhau.
 */
const ScheduleChangeBadge = ({ lesson, compact = false }: { lesson: LessonSummary; compact?: boolean }) => {
  if (!lesson.scheduleChangeStatus) return null;
  const isApproved = lesson.scheduleChangeStatus === 'approved';
  return (
    <span className={`${styles.scheduleChangeBadge} ${isApproved ? styles.scheduleChangeBadgeApproved : ''}`}>
      <CalendarClock size={compact ? 11 : 12} strokeWidth={2.3} aria-hidden="true" />
      <span>{isApproved ? 'Đã xác nhận dời lịch' : 'Chờ xác nhận dời lịch'}</span>
    </span>
  );
};

/**
 * Badge cho đề xuất đổi lịch (tính năng chủ động chọn giờ mới trên trang chi tiết) đang chờ phản
 * hồi — KHÁC hoàn toàn ScheduleChangeBadge (đổi giờ ngoài lịch đã đặt qua RTC).
 */
const ReschedulePendingBadge = ({ compact = false }: { compact?: boolean }) => (
  <span className={styles.scheduleChangeBadge}>
    <CalendarClock size={compact ? 11 : 12} strokeWidth={2.3} aria-hidden="true" />
    <span>Có đề xuất đổi lịch</span>
  </span>
);

/**
 * Buổi phụ (Link 2, sinh ra khi buổi gốc bị báo ngắt giữa chừng) hoặc buổi học lại (Link 3, sinh
 * ra khi hoà giải dispute) — đánh dấu để không bị hiểu nhầm là một buổi học độc lập, không liên quan.
 * Buổi gốc thường KHÁC ngày (có khi cách vài tuần với buổi học lại do hoà giải) nên không thể gộp
 * chung 1 khối ChainGroup như buổi cùng ngày — bấm được để nhảy thẳng tới buổi gốc thay vì chỉ đọc
 * cái tên suông.
 */
const ContinuationBadge = ({
  lesson,
  compact = false,
  onOpenLesson,
}: {
  lesson: LessonSummary;
  compact?: boolean;
  onOpenLesson?: (id: number) => void;
}) => {
  if (!lesson.isContinuation && !lesson.isDisputeRelearn) return null;
  const label = lesson.isContinuation ? 'Buổi phụ' : 'Buổi học lại';
  const text = `${label}${lesson.originalClassSessionId ? ` của #${lesson.originalClassSessionId}` : ''}`;

  if (lesson.originalClassSessionId && onOpenLesson) {
    const originalId = lesson.originalClassSessionId;
    return (
      <button
        type="button"
        className={`${styles.scheduleChangeBadge} ${styles.linkBadge}`}
        title={`Xem buổi gốc #${originalId}`}
        aria-label={`${text} — xem buổi gốc`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenLesson(originalId);
        }}
      >
        <Link2 size={compact ? 11 : 12} strokeWidth={2.3} aria-hidden="true" />
        <span>{text}</span>
      </button>
    );
  }

  return (
    <span className={styles.scheduleChangeBadge}>
      <Link2 size={compact ? 11 : 12} strokeWidth={2.3} aria-hidden="true" />
      <span title={text}>{text}</span>
    </span>
  );
};

/**
 * Nhóm các badge THÔNG TIN PHỤ (bản ghi/dời lịch/buổi phụ-học lại) vào chung 1 khối, tách
 * khỏi trạng thái chính (StatusPill) và nút hành động (MeetLink) — trước đây cả 4-5 loại badge
 * này nằm phẳng chung 1 hàng với status/nút bấm nên rất dễ đọc nhầm badge phụ thành trạng thái
 * buổi học. Gộp lại còn giúp chúng cùng xuống dòng như 1 nhóm khi màn hẹp, thay vì mỗi badge
 * rơi xuống 1 dòng riêng lẻ.
 */
const MetaBadges = ({
  lesson,
  compact = false,
  onOpenLesson,
}: {
  lesson: LessonSummary;
  compact?: boolean;
  onOpenLesson?: (id: number) => void;
}) => (
  <span className={styles.metaBadges}>
    {lesson.hasRecording && <RecordingBadge compact={compact} />}
    <ScheduleChangeBadge lesson={lesson} compact={compact} />
    {lesson.hasPendingReschedule && <ReschedulePendingBadge compact={compact} />}
    <ContinuationBadge lesson={lesson} compact={compact} onOpenLesson={onOpenLesson} />
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
          {formatDayHeading(getLessonBucketDate(lesson))} · {getLessonTime(lesson)}
        </span>
        <span className={styles.tooltipTutor}>
          <UserRound size={14} aria-hidden="true" />
          {getCounterpart(lesson).label}: <b>{getCounterpart(lesson).name}</b>
        </span>
        {lesson.secondaryName && (
          <span className={styles.tooltipTutor}>
            <UserRound size={14} aria-hidden="true" />
            {lesson.secondaryLabel || 'Liên quan'}: <b>{lesson.secondaryName}</b>
          </span>
        )}
      </div>
      <div className={styles.tooltipFooter}>
        <span className={styles.tooltipStatus}>
          <i className={styles.tooltipStatusDot} />
          {status.label}
        </span>
        {/* Chỉ hiện khi thật sự vào được (xem canShowJoinButton) — buổi chưa tới lúc vào được (đã
            huỷ/kết thúc/phòng đóng) hoặc người xem chỉ theo dõi (phụ huynh) thì ẩn hẳn, không còn
            badge "Không thể vào lớp" nữa vì giờ vào lớp được bất kỳ lúc nào. */}
        {canJoin && (
          <span className={`${styles.tooltipMeetState} ${styles.tooltipMeetReady}`}>
            <Video size={12} aria-hidden="true" />
            Có thể vào lớp
          </span>
        )}
        {lesson.hasRecording && <RecordingBadge />}
        <ScheduleChangeBadge lesson={lesson} />
        {lesson.hasPendingReschedule && <ReschedulePendingBadge />}
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

interface LessonCardProps {
  lesson: LessonSummary;
  onOpen: () => void;
  onOpenLesson: (id: number) => void;
}

const CalendarEvent = ({ lesson, onOpen, onOpenLesson }: LessonCardProps) => (
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
        <MetaBadges lesson={lesson} compact onOpenLesson={onOpenLesson} />
        <MeetLink lesson={lesson} compact />
      </div>
    </article>
  </LessonTooltip>
);

const ListLessonRow = ({ lesson, onOpen, onOpenLesson }: LessonCardProps) => (
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
          <SecondaryPerson lesson={lesson} />
        </span>
      </button>
      <div className={styles.listActions}>
        <StatusPill lesson={lesson} />
        <MeetLink lesson={lesson} />
        <MetaBadges lesson={lesson} compact onOpenLesson={onOpenLesson} />
        <button type="button" className={styles.detailIconButton} onClick={onOpen} aria-label="Xem chi tiết buổi học">
          <ChevronRight size={18} className={styles.rowChevron} aria-hidden="true" />
        </button>
      </div>
    </article>
  </LessonTooltip>
);

/**
 * Buổi gốc bị ngắt/dispute và buổi phụ/học lại của nó trỏ về CÙNG 1 trang chi tiết (buổi phụ tự
 * redirect về buổi gốc — xem TutorPortalClassSessionDetail.tsx/StudentLessonDetail.tsx), nên hiện
 * 2 thẻ bấm vào đâu cũng ra 1 chỗ là thừa và gây nhầm là 2 buổi độc lập. Chỉ hiện DUY NHẤT thẻ của
 * buổi gốc (root theo originalClassSessionId), các buổi còn lại trong chuỗi chỉ còn 1 dòng ghi chú
 * giờ hẹn — không phải link riêng vì bấm vào cũng chỉ quay lại đúng thẻ gốc đang hiện.
 */
const ChainGroup = ({
  lessons,
  render,
}: {
  lessons: LessonSummary[];
  render: (lesson: LessonSummary) => ReactNode;
}) => {
  const root = lessons.find((lesson) => !lesson.originalClassSessionId) ?? lessons[0];
  const linked = lessons.filter((lesson) => lesson.lessonId !== root.lessonId);

  return (
    <div className={styles.chainGroup}>
      {render(root)}
      {linked.length > 0 && (
        <div className={styles.chainGroupHeader}>
          <Link2 size={11} strokeWidth={2.3} aria-hidden="true" />
          <span>
            {linked
              .map((lesson) => `${lesson.isContinuation ? 'Buổi phụ' : 'Buổi học lại'} ${getLessonTime(lesson)}`)
              .join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
};

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
  const lessonsForDate = (date: Dayjs) => lessons.filter((lesson) => getLessonBucketDate(lesson).isSame(date, 'day'));
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
                  groupLessonsByChain(dayLessons).map((item) =>
                    item.kind === 'single' ? (
                      <CalendarEvent
                        key={item.lesson.lessonId}
                        lesson={item.lesson}
                        onOpen={() => onOpenLesson(item.lesson.lessonId)}
                        onOpenLesson={onOpenLesson}
                      />
                    ) : (
                      <ChainGroup
                        key={`chain-${item.lessons[0].lessonId}`}
                        lessons={item.lessons}
                        render={(lesson) => (
                          <CalendarEvent
                            lesson={lesson}
                            onOpen={() => onOpenLesson(lesson.lessonId)}
                            onOpenLesson={onOpenLesson}
                          />
                        )}
                      />
                    ),
                  )
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
              {groupLessonsByChain(selectedLessons).map((item) =>
                item.kind === 'single' ? (
                  <ListLessonRow
                    key={item.lesson.lessonId}
                    lesson={item.lesson}
                    onOpen={() => onOpenLesson(item.lesson.lessonId)}
                    onOpenLesson={onOpenLesson}
                  />
                ) : (
                  <ChainGroup
                    key={`chain-${item.lessons[0].lessonId}`}
                    lessons={item.lessons}
                    render={(lesson) => (
                      <ListLessonRow
                        lesson={lesson}
                        onOpen={() => onOpenLesson(lesson.lessonId)}
                        onOpenLesson={onOpenLesson}
                      />
                    )}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const GridCard = ({ lesson, onOpen, onOpenLesson }: LessonCardProps) => {
  const status = getLessonStatusMeta(lesson.status);
  return (
    <LessonTooltip lesson={lesson}>
      <article
        className={`${styles.gridCard} ${getAttentionClass(lesson)} ${isCancelledLesson(lesson) ? styles.cancelled : ''}`}
        style={getLessonStyle(lesson)}
      >
        <button
          type="button"
          className={styles.gridCardMain}
          onClick={onOpen}
          aria-label={`Xem chi tiết ${getSubject(lesson)}, ${getLessonTime(lesson)}`}
        >
          <span className={styles.gridCardTop}>
            <span className={styles.gridDate}>
              <CalendarDays size={14} />
              {getLessonBucketDate(lesson).format('dddd, DD/MM')}
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
              <SecondaryPerson lesson={lesson} />
              <span className={styles.gridTime}>
                <Clock3 size={14} /> {getLessonTime(lesson)}
              </span>
            </span>
          </span>
        </button>
        <div className={styles.gridCardFooter}>
          <MeetLink lesson={lesson} />
          <MetaBadges lesson={lesson} compact onOpenLesson={onOpenLesson} />
          <button type="button" className={styles.openCard} style={{ color: status.color }} onClick={onOpen}>
            Chi tiết <ChevronRight size={16} />
          </button>
        </div>
      </article>
    </LessonTooltip>
  );
};

export const GridLessonView = ({ lessons, onOpenLesson }: LessonViewProps) => (
  <div className={styles.lessonGrid}>
    {groupLessonsByChain(lessons).map((item) =>
      item.kind === 'single' ? (
        <GridCard
          key={item.lesson.lessonId}
          lesson={item.lesson}
          onOpen={() => onOpenLesson(item.lesson.lessonId)}
          onOpenLesson={onOpenLesson}
        />
      ) : (
        <ChainGroup
          key={`chain-${item.lessons[0].lessonId}`}
          lessons={item.lessons}
          render={(lesson) => (
            <GridCard lesson={lesson} onOpen={() => onOpenLesson(lesson.lessonId)} onOpenLesson={onOpenLesson} />
          )}
        />
      ),
    )}
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
            {groupLessonsByChain(group.lessons).map((item) =>
              item.kind === 'single' ? (
                <ListLessonRow
                  key={item.lesson.lessonId}
                  lesson={item.lesson}
                  onOpen={() => onOpenLesson(item.lesson.lessonId)}
                  onOpenLesson={onOpenLesson}
                />
              ) : (
                <ChainGroup
                  key={`chain-${item.lessons[0].lessonId}`}
                  lessons={item.lessons}
                  render={(lesson) => (
                    <ListLessonRow
                      lesson={lesson}
                      onOpen={() => onOpenLesson(lesson.lessonId)}
                      onOpenLesson={onOpenLesson}
                    />
                  )}
                />
              ),
            )}
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
