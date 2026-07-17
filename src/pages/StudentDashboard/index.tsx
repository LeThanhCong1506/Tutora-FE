/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { BookOpen, Clock, CircleAlert, CheckCircle2, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import {
  getStudentPendingLessons,
  getStudentCalendar,
  getStudentBookings,
  getStudentLessons,
} from '../../services/student-lesson.service';
import { getUserInfoFromToken } from '../../services/auth.service';
import { canJoinLiveSession } from '../../utils/liveSession';
import { isZaloMiniApp } from '../../services/zalo-env';
import { StatCard } from '../../components/shared';
import styles from './styles.module.css';

const inMiniApp = isZaloMiniApp();

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]); // all lessons
  const [pendingLessons, setPendingLessons] = useState<any[]>([]); // pending only
  const [bookings, setBookings] = useState<any[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());

  const userInfo = getUserInfoFromToken();
  const userName = userInfo?.fullname || userInfo?.email?.split('@')[0] || 'bạn';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const start = calendarMonth.startOf('month').format('YYYY-MM-DD');
        const end = calendarMonth.add(1, 'month').endOf('month').format('YYYY-MM-DD');
        const res = await getStudentCalendar(start, end);
        setCalendarDays(Array.isArray(res.content) ? res.content : []);
      } catch {
        // Calendar is supplementary; keep the rest of the dashboard available.
      }
    };

    fetchCalendar();
  }, [calendarMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [allLessonsRes, pendingLessonsRes, bookingsRes] = await Promise.allSettled([
        getStudentLessons({ page: 1, pageSize: 50 }),
        getStudentPendingLessons(),
        getStudentBookings({ page: 1, pageSize: 10 }),
      ]);

      if (allLessonsRes.status === 'fulfilled') {
        const data = allLessonsRes.value.content;
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        setLessons(items);
      }
      if (pendingLessonsRes.status === 'fulfilled') {
        setPendingLessons(Array.isArray(pendingLessonsRes.value.content) ? pendingLessonsRes.value.content : []);
      }
      if (bookingsRes.status === 'fulfilled') {
        const b = bookingsRes.value.content;
        const allBookings = Array.isArray(b) ? b : (b as any)?.items || [];
        const activeBookings = allBookings.filter(
          (bk: any) => !['cancelled', 'rejected', 'expired'].includes(bk.status?.toLowerCase()),
        );
        setBookings(activeBookings);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived stats
  // Đếm cả lessons pending + bookings cần hành động (chờ thanh toán, đã cọc)
  const pendingCount =
    pendingLessons.length +
    bookings.filter((bk: any) =>
      ['pending_payment', 'deposit_paid', 'pending_confirmation'].includes(bk.status?.toLowerCase()),
    ).length;
  const completedCount = lessons.filter((l: any) => l.status === 'completed').length;

  // Upcoming lessons (≤ 14 ngày tới, loại completed/cancelled/no_show)
  // Sort tăng dần theo scheduledStart, lấy top 5
  const now = dayjs();
  const upcomingCutoff = now.add(14, 'day');
  const upcomingLessons = lessons
    .filter((l: any) => {
      const d = l.scheduledStartTime || l.scheduledStart;
      if (!d) return false;
      const start = dayjs(d);
      const s = (l.status || '').toLowerCase();
      if (start.isBefore(now) && s !== 'in_progress') return false;
      if (!start.isBefore(upcomingCutoff)) return false;
      return s !== 'completed' && s !== 'cancelled' && s !== 'cancelled_noshow' && s !== 'no_show';
    })
    .sort((a: any, b: any) => {
      const da = a.scheduledStartTime || a.scheduledStart;
      const db = b.scheduledStartTime || b.scheduledStart;
      return dayjs(da).valueOf() - dayjs(db).valueOf();
    })
    .slice(0, 4);

  // Calendar helpers
  const calendarLessonDates = new Set<string>();
  calendarDays.forEach((day: any) => {
    if (!day.hasLesson && (!day.lessons || day.lessons.length === 0)) return;
    const date = dayjs(day.date);
    if (date.isValid()) calendarLessonDates.add(date.format('YYYY-MM-DD'));
  });
  lessons.forEach((lesson: any) => {
    const status = (lesson.status || '').toLowerCase();
    if (['cancelled', 'cancelled_noshow', 'no_show'].includes(status)) return;
    const startTime = lesson.scheduledStartTime || lesson.scheduledStart;
    if (!startTime) return;
    const date = dayjs(startTime);
    if (date.isValid()) calendarLessonDates.add(date.format('YYYY-MM-DD'));
  });
  const sortedLessonDates = Array.from(calendarLessonDates).sort();
  const firstLessonDate = sortedLessonDates[0];
  const lastLessonDate = sortedLessonDates.at(-1);
  const calendarMonths = [calendarMonth.startOf('month'), calendarMonth.add(1, 'month').startOf('month')];

  const renderCalendar = (month: Dayjs) => {
    const startOfMonth = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const leadingBlanks = (startOfMonth.day() + 6) % 7;

    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push(<span key={`blank-${i}`} className={styles.calendarBlank} aria-hidden="true" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = month.date(d).format('YYYY-MM-DD');
      const hasLesson = calendarLessonDates.has(dateStr);
      const isInRange =
        !firstLessonDate || !lastLessonDate || (dateStr >= firstLessonDate && dateStr <= lastLessonDate);

      cells.push(
        <span
          key={d}
          className={`${styles.calendarDay} ${isInRange ? '' : styles.calendarDayMuted} ${hasLesson ? styles.calendarDayActive : ''}`}
          title={hasLesson ? `${d}/${month.month() + 1}: Có buổi học` : undefined}
          aria-label={hasLesson ? `${d}/${month.month() + 1}, có buổi học` : undefined}
        >
          {d}
          {hasLesson && <i className={styles.calendarDot} aria-hidden="true" />}
        </span>,
      );
    }
    return cells;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.welcomeBanner}>
          <div className={styles.welcomeLayout}>
            <div className={styles.greeting}>
              <span className={styles.welcomeGreeting}>Cổng học sinh</span>
              <h1 className={styles.greetingTitle}>Xin chào, {userName}!</h1>
              <div className={styles.quickActions}>
                <Link to="/student-portal/booking" className={styles.quickActionBtn}>
                  <div className={styles.quickActionIcon}>
                    <BookOpen size={18} />
                  </div>
                  Đặt lịch học
                </Link>
                <Link to="/student-portal/lessons" className={styles.quickActionBtn}>
                  Buổi học
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.metricsRow}>
          <StatCard
            icon={<Clock size={20} />}
            value={upcomingLessons.length}
            label="Buổi sắp tới"
            subLabel="Trong 14 ngày tới"
            variant="default"
            onClick={() => navigate('/student-portal/lessons')}
          />
          <StatCard
            icon={<CircleAlert size={20} />}
            value={pendingCount}
            label="Chờ xác nhận"
            subLabel={pendingCount > 0 ? 'Cần bạn kiểm tra' : 'Không có yêu cầu mới'}
            variant="default"
            onClick={() => navigate('/student-portal/lessons')}
          />
          <StatCard
            icon={<CheckCircle2 size={20} />}
            value={completedCount}
            label="Hoàn thành"
            subLabel="Tổng số buổi học"
            variant="default"
            onClick={() => navigate('/student-portal/lessons')}
          />
        </div>

        {!inMiniApp && (
          <section className={styles.calendarWidget} aria-label="Lịch học trong hai tháng">
            <div className={styles.calendarToolbar}>
              <div>
                <span className={styles.calendarEyebrow}>Thời khóa biểu</span>
                <h2>Lịch học trong 2 tháng</h2>
                <span className={styles.calendarLegend}>
                  <i aria-hidden="true" /> Có buổi học
                </span>
              </div>
              <div className={styles.calendarNav}>
                <button
                  type="button"
                  className={styles.calendarNavBtn}
                  onClick={() => setCalendarMonth(calendarMonth.subtract(2, 'month'))}
                  aria-label="Hai tháng trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className={styles.calendarNavBtn}
                  onClick={() => setCalendarMonth(calendarMonth.add(2, 'month'))}
                  aria-label="Hai tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className={styles.calendarMonths}>
              {calendarMonths.map((month) => (
                <div key={month.format('YYYY-MM')} className={styles.calendarMonthView}>
                  <strong className={styles.calendarMonthTitle}>
                    Tháng {month.month() + 1}/{month.year()}
                  </strong>
                  <div className={styles.calendarWeekdays} aria-hidden="true">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className={styles.calendarGrid}>{renderCalendar(month)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={styles.dashboardGrid}>
          <div className={styles.rightSidebar}>
            {/* Upcoming Lessons (next 14 days) */}
            <div className={styles.scheduleWidget}>
              <div className={`${styles.scheduleTitle} ${styles.scheduleHeader}`}>
                <span>Buổi học sắp tới</span>
                <Link to="/student-portal/lessons" className={styles.scheduleLink}>
                  Xem tất cả →
                </Link>
              </div>
              <div className={styles.scheduleList}>
                {upcomingLessons.length === 0 ? (
                  <div className={styles.emptyState}>Chưa có buổi học sắp tới trong 14 ngày</div>
                ) : (
                  upcomingLessons.map((lesson: any, idx: number) => {
                    const startTime = lesson.scheduledStartTime || lesson.scheduledStart;
                    const endTime = lesson.scheduledEndTime || lesson.scheduledEnd;
                    const isInProgress = lesson.status === 'in_progress';
                    const isWithinTimeWindow =
                      startTime && endTime && dayjs().isAfter(dayjs(startTime)) && dayjs().isBefore(dayjs(endTime));
                    const isActive = isInProgress || isWithinTimeWindow;
                    // Phòng mở từ 30ph trước giờ học, không cần gia sư vào trước (khớp BE AgoraController)
                    const canJoin =
                      lesson.lessonId &&
                      canJoinLiveSession({
                        status: lesson.status,
                        meetingLink: lesson.meetingLink,
                        scheduledStart: startTime,
                        scheduledEnd: endTime,
                      });
                    return (
                      <div
                        key={lesson.lessonId || idx}
                        className={`${styles.scheduleItem} ${isActive ? styles.active : ''}`}
                        onClick={() => lesson.lessonId && navigate(`/student-portal/lessons/${lesson.lessonId}`)}
                        style={{ cursor: lesson.lessonId ? 'pointer' : 'default' }}
                      >
                        <div className={styles.scheduleItemHeader}>
                          <span className={styles.scheduleItemName}>
                            {lesson.subjectName || `Buổi #${lesson.lessonId}`}
                          </span>
                          <span className={styles.scheduleItemTime}>
                            {isActive ? 'Đang diễn ra' : startTime ? dayjs(startTime).format('DD/MM HH:mm') : ''}
                          </span>
                        </div>
                        <div className={styles.scheduleItemTutor}>{lesson.tutorName || 'Gia sư'}</div>
                        <div className={styles.scheduleItemTimeRange}>
                          <Clock size={12} />
                          {startTime ? dayjs(startTime).format('HH:mm') : ''} -{' '}
                          {endTime ? dayjs(endTime).format('HH:mm') : ''}
                        </div>
                        {canJoin && (
                          <Link
                            to={`/live-session/${lesson.lessonId}`}
                            className={styles.joinBtn}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Video size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Tham gia ngay
                          </Link>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
