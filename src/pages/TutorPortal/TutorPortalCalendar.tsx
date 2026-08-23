import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Grid2X2, List } from 'lucide-react';
import { ConfigProvider, DatePicker, type ThemeConfig } from 'antd';
import viVN from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { getTutorCalendar } from '../../services/classSession.service';
import { localDateTimeToUtcIso } from '../../utils/datetime';
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
  isAwaitingReport,
  type LessonSummary,
  type LessonViewMode,
  type StatusFilter,
} from '../StudentLessons/lesson-components';
import styles from '../StudentLessons/styles.module.css';

dayjs.locale('vi');

/**
 * Lịch dạy của gia sư — đồng bộ 100% giao diện với trang lịch học của học sinh
 * (/student-portal/calendar): cùng bộ view Lịch tuần / Lưới / Danh sách, cùng
 * highlight "Tới giờ học" (15 phút trước giờ bắt đầu) và nút "Vào lớp" đi qua
 * phòng chờ. Khác biệt duy nhất: dữ liệu lấy theo gia sư, card hiển thị tên
 * HỌC SINH, và bấm vào buổi học sẽ mở trang chi tiết của chính buổi học đó.
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

// Cùng nhóm tab với trang học sinh: "Lên lịch" gồm scheduled + in_progress để
// buổi đang dạy không biến mất khỏi tab mặc định.
const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'scheduled', label: 'Lên lịch' },
  { key: 'pending_confirmation', label: 'Chờ xác nhận' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: '', label: 'Tất cả' },
];

const VIEW_OPTIONS = [
  { key: 'calendar' as const, label: 'Lịch tuần', icon: CalendarDays },
  { key: 'grid' as const, label: 'Dạng lưới', icon: Grid2X2 },
  { key: 'list' as const, label: 'Danh sách', icon: List },
];

const VALID_VIEWS = new Set<LessonViewMode>(VIEW_OPTIONS.map((option) => option.key));
const VALID_STATUSES = new Set<StatusFilter>(STATUS_FILTERS.map((filter) => filter.key));
const matchesStatusFilter = (lesson: LessonSummary, status: StatusFilter): boolean => {
  const lessonStatus = lesson.status.trim().toLowerCase();
  // Tab "Tất cả" ẩn buổi đã hủy — vẫn xem được qua chi tiết đặt lịch, không cần lộn xộn
  // trong lịch nữa.
  if (!status) return lessonStatus !== 'cancelled';

  const awaitingReport = isAwaitingReport(lesson);

  if (status === 'scheduled') {
    return lessonStatus === 'scheduled' || (lessonStatus === 'in_progress' && !awaitingReport);
  }
  if (status === 'pending_confirmation') {
    return lessonStatus === 'pending_confirmation' || awaitingReport;
  }
  return lessonStatus === status;
};

const TutorPortalCalendar = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [, refreshClock] = useState(0);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  const viewParam = searchParams.get('view') as LessonViewMode | null;
  const rawStatusParam = searchParams.get('status');
  const statusParam = (rawStatusParam === 'all' ? '' : (rawStatusParam ?? 'scheduled')) as StatusFilter;
  const dateParam = searchParams.get('date');
  const viewMode: LessonViewMode = viewParam && VALID_VIEWS.has(viewParam) ? viewParam : 'calendar';
  const activeStatus: StatusFilter = VALID_STATUSES.has(statusParam) ? statusParam : 'scheduled';
  const anchorDate = useMemo(() => (dateParam && dayjs(dateParam).isValid() ? dayjs(dateParam) : dayjs()), [dateParam]);

  const updateQuery = useCallback(
    (updates: Partial<Record<'view' | 'status' | 'date', string | null>>) => {
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

  // Cập nhật highlight "tới giờ dạy" ngay cả khi gia sư giữ trang mở.
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
        const response = await getTutorCalendar(startDate, endDate);
        if (!active) return;

        const nextLessons: LessonSummary[] = (response.content || [])
          .flatMap((day) => day.classSessions || [])
          .map((session) => ({
            lessonId: session.classSessionId,
            bookingId: session.bookingId,
            scheduledStart: session.scheduledStart,
            scheduledEnd: session.scheduledEnd,
            tutorName: session.tutorName,
            subjectName: session.subjectName,
            status: session.status ?? '',
            meetingLink: session.meetingLink,
            checkOutTime: session.checkOutTime,
            hasRecording: session.hasRecording,
            hasPendingReschedule: session.hasPendingReschedule,
            isContinuation: session.isContinuation,
            isDisputeRelearn: session.isDisputeRelearn,
            originalClassSessionId: session.originalClassSessionId,
            skipConfirmedByBothSides: session.skipConfirmedByBothSides,
            // Buổi đã check-out chờ báo cáo: mở đúng trang chi tiết buổi học.
            reportPath: `/tutor-portal/class-sessions/${session.classSessionId}`,
            // Gia sư nhìn lịch theo học sinh — card/tooltip hiển thị tên học sinh.
            counterpartLabel: 'Học sinh',
            counterpartName: session.studentName,
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

  const filteredLessons = useMemo(
    () => filterLessonsKeepingChains(lessons, (lesson) => matchesStatusFilter(lesson, activeStatus)),
    [activeStatus, lessons],
  );

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_FILTERS.map((filter) => [
          filter.key,
          lessons.filter((lesson) => matchesStatusFilter(lesson, filter.key)).length,
        ]),
      ) as Record<StatusFilter, number>,
    [lessons],
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

  // Mỗi card mở đúng chi tiết một buổi học, dùng classSessionId thay vì bookingId.
  const openLesson = (lessonId: number) => {
    navigate(`/tutor-portal/class-sessions/${lessonId}`);
  };

  const isFilteredEmpty = activeStatus !== '' && lessons.length > 0;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.workspace} aria-labelledby="lesson-workspace-title">
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => updateQuery({ date: dayjs().format('YYYY-MM-DD') })}
            >
              Hôm nay
            </button>

            <div className={styles.periodNavigation} data-tour="calendar-nav">
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
                    <strong id="lesson-workspace-title" className={styles.periodTitle}>
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

            <div className={styles.viewSwitcher} role="group" aria-label="Chế độ hiển thị buổi dạy" data-tour="calendar-view-switch">
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
            <div className={styles.statusFilters} role="group" aria-label="Lọc theo trạng thái" data-tour="calendar-filters">
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
              {!loading && !hasError ? `Đã tải ${filteredLessons.length} buổi dạy.` : ''}
            </span>

            {loading ? (
              <LoadingState mode={viewMode} />
            ) : hasError ? (
              <ErrorState onRetry={refreshLessons} />
            ) : filteredLessons.length === 0 ? (
              <EmptyState
                filtered={isFilteredEmpty}
                period={viewMode === 'calendar' ? 'tuần này' : 'tháng này'}
                description="Lớp học sẽ xuất hiện khi học viên đặt lịch với bạn. Hãy thiết lập lịch rảnh để nhận booking."
                ctaLabel="Thiết lập lịch rảnh"
                onBooking={() => navigate('/tutor-portal/onboarding')}
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

export default TutorPortalCalendar;
