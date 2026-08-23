import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid2X2,
  List,
  Users,
} from 'lucide-react';
import { ConfigProvider, DatePicker, type ThemeConfig } from 'antd';
import viVN from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useStudentContext } from '../../contexts/StudentContext';
import { useLessonStartedListener } from '../../hooks/useLessonStartedListener';
import {
  getParentCalendar,
  getParentClassSessions,
  getParentPendingClassSessions,
  type ClassSessionResponse,
  type PendingClassSessionResponse,
} from '../../services/classSession.service';
import { formatLocalDateTime, localDateTimeToUtcIso, parseUtc } from '../../utils/datetime';
import {
  CalendarLessonView,
  EmptyState,
  ErrorState,
  GridLessonView,
  ListLessonView,
  LoadingState,
  filterLessonsKeepingChains,
  getLessonDate,
  getMonday,
  type LessonSummary,
  type LessonViewMode,
  type StatusFilter,
} from '../StudentLessons/lesson-components';
import styles from '../StudentLessons/styles.module.css';
import parentStyles from './styles.module.css';

dayjs.locale('vi');

/**
 * Lịch học của con — dùng chung bộ giao diện với trang lịch của học sinh
 * (/student-portal/calendar): Lịch tuần / Dạng lưới / Danh sách, cùng cách đọc trạng thái
 * và badge. Ba khác biệt của phía phụ huynh:
 *   1. CHỈ THEO DÕI — mọi card đặt `canJoin: false` nên không bao giờ hiện nút vào lớp.
 *   2. Lọc theo từng con (phụ huynh có thể có nhiều học sinh); khi xem chung, card hiển thị
 *      tên con làm tên chính và tên gia sư làm dòng phụ.
 *   3. Dải nhắc việc phía trên: buổi chờ phụ huynh xác nhận + yêu cầu đổi lịch. Hai loại này
 *      có hạn chót và có thể nằm NGOÀI tuần đang xem, nên lấy từ endpoint riêng (không giới hạn
 *      khoảng thời gian) thay vì suy từ dữ liệu lịch.
 */

const LESSON_DATE_PICKER_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#1a2238',
    colorPrimaryHover: '#303a54',
    colorPrimaryActive: '#11182a',
    colorPrimaryBg: '#eef0f4',
    colorPrimaryBgHover: '#e5e8ed',
    colorPrimaryBorder: '#c8cdd6',
    colorPrimaryText: '#1a2238',
    colorText: '#1a2238',
    colorTextHeading: '#1a2238',
    colorTextDisabled: '#adb2bd',
    colorIcon: '#687086',
    colorIconHover: '#1a2238',
    colorBorderSecondary: '#e3e7ec',
    controlItemBgHover: '#f1f3f6',
    controlItemBgActive: '#e6e9ee',
    borderRadius: 9,
    borderRadiusLG: 14,
  },
  components: {
    DatePicker: {
      cellHoverBg: '#f1f3f6',
      cellActiveWithRangeBg: '#e6e9ee',
      cellHoverWithRangeBg: '#dde1e8',
      cellRangeBorderColor: '#1a2238',
    },
  },
};

/** "reschedule" là bộ lọc riêng của phụ huynh (không phải trạng thái buổi học của BE). */
type ParentStatusFilter = StatusFilter | 'reschedule';

const STATUS_FILTERS: Array<{ key: ParentStatusFilter; label: string }> = [
  { key: 'scheduled', label: 'Sắp học' },
  { key: 'pending_confirmation', label: 'Chờ bạn xác nhận' },
  { key: 'reschedule', label: 'Chờ đổi lịch' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: '', label: 'Tất cả' },
];

const VIEW_OPTIONS = [
  { key: 'calendar' as const, label: 'Lịch tuần', icon: CalendarDays },
  { key: 'grid' as const, label: 'Dạng lưới', icon: Grid2X2 },
  { key: 'list' as const, label: 'Danh sách', icon: List },
];

const VALID_VIEWS = new Set<LessonViewMode>(VIEW_OPTIONS.map((option) => option.key));
const VALID_STATUSES = new Set<ParentStatusFilter>(STATUS_FILTERS.map((filter) => filter.key));
const SCHEDULED_TAB_STATUSES = new Set(['scheduled', 'in_progress']);

/** Buổi học kèm tên con — cần cho bộ lọc theo từng học sinh, `LessonSummary` không có field này. */
type ParentLesson = LessonSummary & { studentName?: string };

/**
 * Hai cơ chế đổi lịch khác nhau đều cần phụ huynh phản hồi: đề xuất giờ mới
 * (`hasPendingReschedule`) và xác nhận vào học ngoài giờ đã đặt (`scheduleChangeStatus`).
 */
const isPendingReschedule = (lesson: { hasPendingReschedule?: boolean; scheduleChangeStatus?: string | null }) =>
  Boolean(lesson.hasPendingReschedule) || lesson.scheduleChangeStatus === 'pending';

const matchesStatusFilter = (lesson: ParentLesson, status: ParentStatusFilter): boolean => {
  const lessonStatus = lesson.status.trim().toLowerCase();
  // Tab "Tất cả" ẩn buổi đã hủy — vẫn xem được qua chi tiết đặt lịch, không cần lộn xộn
  // trong lịch nữa.
  if (!status) return lessonStatus !== 'cancelled';
  if (status === 'reschedule') return isPendingReschedule(lesson);
  return status === 'scheduled' ? SCHEDULED_TAB_STATUSES.has(lessonStatus) : lessonStatus === status;
};

const normalizeName = (name?: string) => (name ?? '').trim().toLowerCase();

const ParentLessons = () => {
  const navigate = useNavigate();
  const { students } = useStudentContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lessons, setLessons] = useState<ParentLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [, refreshClock] = useState(0);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  // Việc cần phụ huynh xử lý — lấy toàn cục, không phụ thuộc tuần/tháng đang xem.
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingClassSessionResponse[]>([]);
  const [rescheduleSessions, setRescheduleSessions] = useState<ClassSessionResponse[]>([]);

  const viewParam = searchParams.get('view') as LessonViewMode | null;
  const rawStatusParam = searchParams.get('status');
  const statusParam = (rawStatusParam === 'all' ? '' : (rawStatusParam ?? 'scheduled')) as ParentStatusFilter;
  const dateParam = searchParams.get('date');
  const childParam = searchParams.get('child') ?? '';
  const viewMode: LessonViewMode = viewParam && VALID_VIEWS.has(viewParam) ? viewParam : 'calendar';
  const activeStatus: ParentStatusFilter = VALID_STATUSES.has(statusParam) ? statusParam : 'scheduled';
  const anchorDate = useMemo(() => (dateParam && dayjs(dateParam).isValid() ? dayjs(dateParam) : dayjs()), [dateParam]);

  const selectedChild = useMemo(
    () => students.find((student) => student.studentId === childParam) ?? null,
    [childParam, students],
  );
  const showChildFilter = students.length > 1;

  const updateQuery = useCallback(
    (updates: Partial<Record<'view' | 'status' | 'date' | 'child', string | null>>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const range = useMemo(() => {
    if (viewMode === 'calendar') {
      const start = getMonday(anchorDate);
      return { start, end: start.add(6, 'day') };
    }
    return { start: anchorDate.startOf('month'), end: anchorDate.endOf('month') };
  }, [anchorDate, viewMode]);

  const rangeStartKey = range.start.format('YYYY-MM-DD');
  const rangeEndKey = range.end.format('YYYY-MM-DD');

  const refreshLessons = useCallback(() => setRetryKey((current) => current + 1), []);
  useLessonStartedListener(refreshLessons);

  // Cập nhật highlight "tới giờ học"/"đang diễn ra" ngay cả khi phụ huynh giữ trang mở.
  useEffect(() => {
    const timer = window.setInterval(() => refreshClock((current) => current + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchLessons = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const rangeStart = dayjs(rangeStartKey);
        const rangeEnd = dayjs(rangeEndKey);
        const startDate = localDateTimeToUtcIso(rangeStartKey, '00:00');
        const endDate = localDateTimeToUtcIso(rangeEnd.add(1, 'day').format('YYYY-MM-DD'), '00:00');
        const response = await getParentCalendar(startDate, endDate);
        if (!active) return;

        const nextLessons: ParentLesson[] = (response.content || [])
          .flatMap((day) => day.classSessions || [])
          .map((session) => ({
            lessonId: session.classSessionId,
            bookingId: session.bookingId,
            scheduledStart: session.scheduledStart,
            scheduledEnd: session.scheduledEnd,
            tutorName: session.tutorName,
            studentName: session.studentName,
            subjectName: session.subjectName,
            status: session.status ?? '',
            meetingLink: session.meetingLink,
            checkOutTime: session.checkOutTime,
            hasRecording: session.hasRecording,
            hasPendingReschedule: session.hasPendingReschedule,
            isContinuation: session.isContinuation,
            isDisputeRelearn: session.isDisputeRelearn,
            originalClassSessionId: session.originalClassSessionId,
            // Phụ huynh chỉ theo dõi: không có nút vào lớp trên mọi khung nhìn.
            canJoin: false,
          }))
          .filter((lesson) => {
            const lessonDay = getLessonDate(lesson).startOf('day');
            return !lessonDay.isBefore(rangeStart, 'day') && !lessonDay.isAfter(rangeEnd, 'day');
          })
          .sort((first, second) => getLessonDate(first).valueOf() - getLessonDate(second).valueOf());

        setLessons(nextLessons);
      } catch {
        if (!active) return;
        setLessons([]);
        setHasError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchLessons();
    return () => {
      active = false;
    };
  }, [rangeEndKey, rangeStartKey, retryKey]);

  /**
   * Nhắc việc + badge dời lịch. Endpoint lịch KHÔNG trả `scheduleChangeStatus`, còn danh sách
   * buổi học thì có — nên lấy thêm tập buổi "scheduled" (không giới hạn tuần) để vừa dựng dải
   * nhắc việc, vừa bù badge "Chờ xác nhận dời lịch" cho các card trong tuần đang xem.
   * Lỗi ở đây chỉ làm mất phần nhắc việc, không được đánh sập cả trang lịch.
   */
  useEffect(() => {
    let active = true;

    const fetchActionItems = async () => {
      const [pending, scheduled] = await Promise.allSettled([
        getParentPendingClassSessions(),
        getParentClassSessions(1, 100, undefined, 'scheduled'),
      ]);
      if (!active) return;

      setPendingConfirmations(
        pending.status === 'fulfilled' && Array.isArray(pending.value.content) ? pending.value.content : [],
      );
      setRescheduleSessions(
        scheduled.status === 'fulfilled' && Array.isArray(scheduled.value.content)
          ? scheduled.value.content.filter(isPendingReschedule)
          : [],
      );
    };

    void fetchActionItems();
    return () => {
      active = false;
    };
  }, [retryKey]);

  /** Map bù `scheduleChangeStatus` (endpoint lịch không có) theo classSessionId. */
  const scheduleChangeById = useMemo(() => {
    const map = new Map<number, 'pending' | 'approved'>();
    rescheduleSessions.forEach((session) => {
      if (session.scheduleChangeStatus) map.set(session.classSessionId, session.scheduleChangeStatus);
    });
    return map;
  }, [rescheduleSessions]);

  /** Đề xuất đổi giờ đang chờ — chỉ lấy đúng loại này, `scheduleChangeStatus` là badge khác. */
  const pendingRescheduleIds = useMemo(
    () =>
      new Set(
        rescheduleSessions.filter((session) => session.hasPendingReschedule).map((session) => session.classSessionId),
      ),
    [rescheduleSessions],
  );

  const decoratedLessons = useMemo<ParentLesson[]>(() => {
    const viewingAllChildren = showChildFilter && !selectedChild;
    return lessons.map((lesson) => ({
      ...lesson,
      scheduleChangeStatus: scheduleChangeById.get(lesson.lessonId) ?? null,
      hasPendingReschedule: lesson.hasPendingReschedule || pendingRescheduleIds.has(lesson.lessonId),
      // Xem chung nhiều con: tên con là thông tin phân biệt quan trọng nhất → làm tên chính.
      ...(viewingAllChildren
        ? {
            counterpartLabel: 'Học sinh',
            counterpartName: lesson.studentName,
            secondaryLabel: 'Gia sư',
            secondaryName: lesson.tutorName,
          }
        : { counterpartLabel: 'Gia sư', counterpartName: lesson.tutorName }),
    }));
  }, [lessons, pendingRescheduleIds, scheduleChangeById, selectedChild, showChildFilter]);

  const childLessons = useMemo(
    () =>
      selectedChild
        ? decoratedLessons.filter(
            (lesson) => normalizeName(lesson.studentName) === normalizeName(selectedChild.fullName),
          )
        : decoratedLessons,
    [decoratedLessons, selectedChild],
  );

  const filteredLessons = useMemo(
    () => filterLessonsKeepingChains(childLessons, (lesson) => matchesStatusFilter(lesson, activeStatus)),
    [activeStatus, childLessons],
  );

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_FILTERS.map((filter) => [
          filter.key,
          childLessons.filter((lesson) => matchesStatusFilter(lesson, filter.key)).length,
        ]),
      ) as Record<ParentStatusFilter, number>,
    [childLessons],
  );

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => dayjs(rangeStartKey).add(index, 'day')),
    [rangeStartKey],
  );

  const periodTitle =
    viewMode === 'calendar'
      ? range.start.month() === range.end.month()
        ? `${range.start.format('DD')}–${range.end.format('DD/MM/YYYY')}`
        : `${range.start.format('DD/MM')}–${range.end.format('DD/MM/YYYY')}`
      : `Tháng ${anchorDate.month() + 1} năm ${anchorDate.year()}`;
  const periodCaption =
    viewMode === 'calendar'
      ? `Tuần · Tháng ${anchorDate.month() + 1} năm ${anchorDate.year()}`
      : 'Tổng quan theo tháng';

  const movePeriod = (direction: -1 | 1) => {
    const nextDate =
      viewMode === 'calendar' ? anchorDate.add(direction * 7, 'day') : anchorDate.add(direction, 'month');
    updateQuery({ date: nextDate.format('YYYY-MM-DD') });
  };

  const openLesson = (lessonId: number) => navigate(`/parent-portal/lessons/${lessonId}`);

  /** Nhắc việc: nhảy tới đúng buổi cần xử lý nếu chỉ có 1, nhiều thì mở tuần chứa buổi sớm nhất. */
  const goToActionItems = (sessions: Array<{ classSessionId: number; scheduledStart: string }>, status: string) => {
    if (sessions.length === 1) {
      openLesson(sessions[0].classSessionId);
      return;
    }
    const earliest = [...sessions].sort(
      (first, second) =>
        (parseUtc(first.scheduledStart)?.getTime() ?? 0) - (parseUtc(second.scheduledStart)?.getTime() ?? 0),
    )[0];
    const earliestStart = parseUtc(earliest.scheduledStart);
    updateQuery({ status, date: earliestStart ? dayjs(earliestStart).format('YYYY-MM-DD') : null });
  };

  // Nhắc việc bám theo con đang chọn — nếu không, phụ huynh lọc con A lại thấy nhắc việc của con B.
  const pendingAlerts = useMemo(
    () =>
      selectedChild
        ? pendingConfirmations.filter(
            (session) => normalizeName(session.studentName) === normalizeName(selectedChild.fullName),
          )
        : pendingConfirmations,
    [pendingConfirmations, selectedChild],
  );

  const rescheduleAlerts = useMemo(
    () =>
      selectedChild
        ? rescheduleSessions.filter(
            (session) =>
              session.studentId === selectedChild.studentId || session.student?.studentId === selectedChild.studentId,
          )
        : rescheduleSessions,
    [rescheduleSessions, selectedChild],
  );

  const nearestDeadline = useMemo(() => {
    const deadlines = pendingAlerts
      .map((session) => parseUtc(session.confirmDeadline)?.getTime())
      .filter((time): time is number => Boolean(time));
    return deadlines.length ? Math.min(...deadlines) : null;
  }, [pendingAlerts]);

  const isFilteredEmpty = (activeStatus !== '' || Boolean(selectedChild)) && lessons.length > 0;
  const childLabel = selectedChild ? selectedChild.fullName : students.length === 1 ? students[0].fullName : 'các con';

  return (
    <div className={styles.page}>
      <div className={parentStyles.header}>
        <div className={parentStyles.headerCopy}>
          <h1 className={parentStyles.title}>Lịch học của {childLabel}</h1>
          <p className={parentStyles.subtitle}>
            <Eye size={13} aria-hidden="true" />
            Chế độ theo dõi — bạn xem lịch, trạng thái và bản ghi buổi học; việc vào lớp do con thực hiện.
          </p>
        </div>

        {showChildFilter && (
          <div className={parentStyles.childFilter} role="group" aria-label="Lọc theo học sinh" data-tour="lessons-child-filter">
            <span className={parentStyles.childFilterLabel}>
              <Users size={14} aria-hidden="true" />
              Học sinh
            </span>
            <button
              type="button"
              aria-pressed={!selectedChild}
              className={!selectedChild ? parentStyles.childChipActive : ''}
              onClick={() => updateQuery({ child: null })}
            >
              Tất cả
            </button>
            {students.map((student) => (
              <button
                key={student.studentId}
                type="button"
                aria-pressed={selectedChild?.studentId === student.studentId}
                className={selectedChild?.studentId === student.studentId ? parentStyles.childChipActive : ''}
                onClick={() => updateQuery({ child: student.studentId })}
              >
                {student.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {(pendingAlerts.length > 0 || rescheduleAlerts.length > 0) && (
        <div className={parentStyles.alerts}>
          {pendingAlerts.length > 0 && (
            <div className={`${parentStyles.alertCard} ${parentStyles.alertUrgent}`}>
              <span className={parentStyles.alertIcon} aria-hidden="true">
                <BellRing size={16} />
              </span>
              <div className={parentStyles.alertCopy}>
                <strong>{pendingAlerts.length} buổi học chờ bạn xác nhận</strong>
                <span>
                  {nearestDeadline
                    ? `Hạn gần nhất: ${formatLocalDateTime(new Date(nearestDeadline).toISOString())}. Quá hạn hệ thống sẽ tự xác nhận.`
                    : 'Xác nhận sau khi xem báo cáo buổi học của gia sư.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  goToActionItems(
                    pendingAlerts.map((session) => ({
                      classSessionId: session.classSessionId,
                      scheduledStart: session.scheduledStart,
                    })),
                    'pending_confirmation',
                  )
                }
              >
                Xem ngay <ChevronRight size={15} />
              </button>
            </div>
          )}

          {rescheduleAlerts.length > 0 && (
            <div className={parentStyles.alertCard}>
              <span className={parentStyles.alertIcon} aria-hidden="true">
                <CalendarClock size={16} />
              </span>
              <div className={parentStyles.alertCopy}>
                <strong>{rescheduleAlerts.length} yêu cầu đổi lịch chờ phản hồi</strong>
                <span>Gia sư đề nghị đổi giờ học. Buổi học chỉ diễn ra theo giờ mới khi bạn đồng ý.</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  goToActionItems(
                    rescheduleAlerts.map((session) => ({
                      classSessionId: session.classSessionId,
                      scheduledStart: session.scheduledStart,
                    })),
                    'reschedule',
                  )
                }
              >
                Xem ngay <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      <main className={styles.main}>
        <section className={styles.workspace} aria-labelledby="parent-lesson-workspace-title">
          <div className={styles.toolbar} data-tour="lessons-toolbar">
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => updateQuery({ date: dayjs().format('YYYY-MM-DD') })}
            >
              Hôm nay
            </button>

            <div className={styles.periodNavigation}>
              <button type="button" onClick={() => movePeriod(-1)} aria-label="Khoảng thời gian trước">
                <ChevronLeft size={19} />
              </button>
              <div className={styles.periodHeading}>
                <button
                  type="button"
                  className={`${styles.periodPickerTrigger} ${periodPickerOpen ? styles.periodPickerOpen : ''}`}
                  onClick={() => setPeriodPickerOpen((current) => !current)}
                  title={viewMode === 'calendar' ? 'Chọn tuần muốn xem' : 'Chọn tháng muốn xem'}
                  aria-haspopup="dialog"
                  aria-expanded={periodPickerOpen}
                  aria-label={`${viewMode === 'calendar' ? 'Chọn tuần hiển thị' : 'Chọn tháng hiển thị'}. Hiện tại: ${periodTitle}`}
                >
                  <span className={styles.periodPickerIcon} aria-hidden="true">
                    <CalendarDays size={17} strokeWidth={2} />
                  </span>
                  <span className={styles.periodPickerCopy}>
                    <span className={styles.periodPickerMeta}>
                      <span>{periodCaption}</span>
                    </span>
                    <strong id="parent-lesson-workspace-title" className={styles.periodTitle}>
                      {periodTitle}
                    </strong>
                  </span>
                  <span className={styles.periodPickerChevron} aria-hidden="true">
                    <ChevronDown size={15} strokeWidth={2.2} />
                  </span>
                </button>
                {/* Input ẩn — chỉ làm anchor cho popup chọn tuần/tháng. */}
                <ConfigProvider theme={LESSON_DATE_PICKER_THEME}>
                  <DatePicker
                    open={periodPickerOpen}
                    onOpenChange={setPeriodPickerOpen}
                    value={anchorDate}
                    onChange={(value) => {
                      if (value) updateQuery({ date: value.format('YYYY-MM-DD') });
                    }}
                    picker={viewMode === 'calendar' ? 'week' : 'month'}
                    locale={viVN}
                    allowClear={false}
                    inputReadOnly
                    className={styles.periodPickerInput}
                    classNames={{ popup: { root: styles.periodPickerPopup } }}
                  />
                </ConfigProvider>
              </div>
              <button type="button" onClick={() => movePeriod(1)} aria-label="Khoảng thời gian tiếp theo">
                <ChevronRight size={19} />
              </button>
            </div>

            <div className={styles.viewSwitcher} role="group" aria-label="Chế độ hiển thị buổi học">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = viewMode === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    className={selected ? styles.activeView : ''}
                    onClick={() => updateQuery({ view: option.key })}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.statusFilters} role="group" aria-label="Lọc theo trạng thái" data-tour="lessons-filters">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={activeStatus === filter.key}
                  className={activeStatus === filter.key ? styles.activeFilter : ''}
                  onClick={() => updateQuery({ status: filter.key || 'all' })}
                >
                  {filter.label}
                  {!loading && statusCounts[filter.key] > 0 && <span>{statusCounts[filter.key]}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.results} aria-busy={loading}>
            <span className={styles.srOnly} aria-live="polite">
              {!loading && !hasError ? `Đã tải ${filteredLessons.length} buổi học.` : ''}
            </span>

            {loading ? (
              <LoadingState mode={viewMode} />
            ) : hasError ? (
              <ErrorState onRetry={refreshLessons} />
            ) : filteredLessons.length === 0 ? (
              <EmptyState
                filtered={isFilteredEmpty}
                period={viewMode === 'calendar' ? 'tuần này' : 'tháng này'}
                description="Buổi học sẽ xuất hiện tại đây sau khi booking được xác nhận và thanh toán."
                ctaLabel="Đặt lịch cho con"
                onBooking={() => navigate('/parent-portal/booking')}
              />
            ) : viewMode === 'calendar' ? (
              <CalendarLessonView
                lessons={filteredLessons}
                weekDates={weekDates}
                selectedDate={anchorDate}
                onSelectDate={(date) => updateQuery({ date: date.format('YYYY-MM-DD') })}
                onOpenLesson={openLesson}
              />
            ) : viewMode === 'grid' ? (
              <GridLessonView lessons={filteredLessons} onOpenLesson={openLesson} />
            ) : (
              <ListLessonView lessons={filteredLessons} onOpenLesson={openLesson} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ParentLessons;
