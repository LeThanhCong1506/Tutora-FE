import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';
import { getUserInfoFromToken } from '../../services/auth.service';
import { getStudents } from '../../services/student.service';
import { getParentBookings } from '../../services/booking.service';
import { getParentCalendar, type CalendarLessonDto } from '../../services/parent-lesson.service';
import type { BookingResponseDTO } from '../../services/booking.service';
import { StatCard } from '../../components/shared';
import MonthlySchedule from './MonthlySchedule';
import styles from './styles.module.css';

// ===== SVG Icons =====
const BookingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <rect x="3" y="4" width="14" height="14" rx="2" />
    <path d="M3 8h14" />
    <path d="M7 2v4M13 2v4" strokeLinecap="round" />
  </svg>
);

const ChildrenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" strokeLinecap="round" />
  </svg>
);

const SessionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 6v4l3 2" strokeLinecap="round" />
  </svg>
);

const PendingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" />
    <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
  </svg>
);

const FindTutorIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="8.75" cy="8.75" r="5.75" />
    <path d="M13 13l4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FamilyLearningIllustration = () => (
  <svg className={styles.familyLearningIllustration} viewBox="0 0 240 220" fill="none" aria-hidden="true">
    <circle cx="120" cy="54" r="20" />
    <path d="M84 139c2-39 17-62 36-62s34 23 36 62" />

    <circle cx="56" cy="99" r="15" />
    <path d="M31 157c1-27 11-43 25-43 12 0 22 13 24 35" />

    <circle cx="184" cy="99" r="15" />
    <path d="M160 149c2-22 12-35 24-35 14 0 24 16 25 43" />

    <path
      className={styles.familyLearningBook}
      d="M28 151c34-8 65-3 92 14 27-17 58-22 92-14l-5 48c-31-5-60 1-87 17-27-16-56-22-87-17l-5-48z"
    />
    <path d="M120 165v51" />
    <path d="M44 169c25-3 46 1 63 12M196 169c-25-3-46 1-63 12" />
  </svg>
);

// ===== Component =====
const inMiniApp = isZaloMiniApp();

const ParentDashboard = () => {
  const navigate = useNavigate();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalBookings, setTotalBookings] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);

  const [pendingBookings, setPendingBookings] = useState<BookingResponseDTO[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1) User name from JWT
      try {
        const userInfo = getUserInfoFromToken();
        if (userInfo) {
          setUserName(userInfo.fullname || userInfo.firstName || userInfo.email?.split('@')[0] || 'Phụ huynh');
        }
      } catch {
        /* ignore */
      }

      // 2) Bookings
      try {
        const bookingsRes = await getParentBookings({ page: 1, pageSize: 100 });
        const items: BookingResponseDTO[] = bookingsRes?.content?.items || [];
        setTotalBookings(bookingsRes?.content?.totalCount || items.length);
        const active = items.filter((b: BookingResponseDTO) => !['Cancelled', 'Completed'].includes(b.status || ''));
        setActiveBookings(active.length);
        // Bookings needing action (Pending, TutorAccepted)
        const pending = items.filter((b: BookingResponseDTO) => ['Pending', 'TutorAccepted'].includes(b.status || ''));
        setPendingBookings(pending.slice(0, 3));
      } catch (err) {
        console.error('Dashboard: failed to fetch bookings:', err);
      }

      // 3) Students (children)
      try {
        const studentsRes = await getStudents();
        const students = studentsRes?.content || [];
        setChildrenCount(Array.isArray(students) ? students.length : 0);
      } catch (err) {
        console.error('Dashboard: failed to fetch students:', err);
      }

      // 4) Lessons (upcoming this week) — dùng getParentCalendar vì getParentLessons không tồn tại ở BE
      try {
        const now = new Date();
        // Fetch range: hôm nay → 14 ngày tới (đủ cho dashboard + week count)
        const startDate = now.toISOString().split('T')[0];
        const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const calendarRes = await getParentCalendar(startDate, endDate);
        const calendarDays = calendarRes?.content || [];

        // Flatten + sort tăng dần theo scheduledStart
        const flatLessons: CalendarLessonDto[] = calendarDays
          .flatMap((d) => d.lessons || [])
          .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

        // Count lessons this week (Mon → Sun)
        const dayOfWeek = now.getDay();
        const mondayDate = new Date(now);
        mondayDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        mondayDate.setHours(0, 0, 0, 0);
        const sundayDate = new Date(mondayDate);
        sundayDate.setDate(mondayDate.getDate() + 7);

        const thisWeekLessons = flatLessons.filter((l) => {
          const d = new Date(l.scheduledStart);
          return d >= mondayDate && d < sundayDate;
        });
        setWeekLessonCount(thisWeekLessons.length);
      } catch (err) {
        console.error('Dashboard: failed to fetch lessons:', err);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Skeleton loading
  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.welcomeBanner} style={{ opacity: 0.6 }}>
            <div className={styles.welcomeContent}>
              <h1 className={styles.welcomeTitle}>Đang tải...</h1>
            </div>
          </div>
          <div className={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.statCardSkeleton} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        {/* Welcome Banner */}
        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeLayout}>
            <div className={styles.welcomeContent}>
              <span className={styles.welcomeGreeting}>Cổng phụ huynh</span>
              <h1 className={styles.welcomeTitle}>Xin chào, {userName}!</h1>

              {!inMiniApp && (
                <div className={styles.welcomeActions} data-tour="parent-dashboard-actions">
                  <button
                    type="button"
                    className={styles.welcomePrimaryAction}
                    onClick={() => navigate('/tutor-search')}
                  >
                    <FindTutorIcon />
                    <span>Tìm gia sư</span>
                  </button>
                  <button
                    type="button"
                    className={styles.welcomeSecondaryAction}
                    onClick={() => navigate('/parent-portal/booking')}
                  >
                    Quản lý lịch hẹn
                  </button>
                  <button
                    type="button"
                    className={styles.welcomeTutorAction}
                    onClick={() => scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Xem lịch học
                  </button>
                </div>
              )}
            </div>

            {!inMiniApp && (
              <div className={styles.welcomeIllustration}>
                <div className={styles.welcomeIllustrationHalo} />
                <FamilyLearningIllustration />
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid} data-tour="parent-dashboard-stats">
          <StatCard
            icon={<BookingIcon />}
            value={totalBookings}
            label="Tổng lịch hẹn"
            subLabel="Xem chi tiết lịch hẹn"
            badge={`${activeBookings} đang hoạt động`}
            badgeVariant="green"
            variant="quiet"
            infoTooltip="Tổng số lịch hẹn bạn đã đặt với gia sư, gồm cả đang hoạt động và đã hoàn tất."
            onClick={() => navigate('/parent-portal/booking')}
          />
          <StatCard
            icon={<ChildrenIcon />}
            value={childrenCount}
            label="Học sinh"
            subLabel="Đã liên kết"
            badge="Đã liên kết"
            badgeVariant="blue"
            variant="quiet"
            infoTooltip="Số học sinh (con) đã được liên kết với tài khoản của bạn."
            onClick={() => navigate('/parent-portal/student')}
          />
          <StatCard
            icon={<SessionsIcon />}
            value={weekLessonCount}
            label="Buổi học"
            subLabel="Đã lên lịch tuần này"
            badge="Tuần này"
            badgeVariant="green"
            variant="quiet"
            infoTooltip="Số buổi học đã lên lịch trong tuần này (Thứ Hai - Chủ Nhật)."
            onClick={() => scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <StatCard
            icon={<PendingIcon />}
            value={pendingBookings.length}
            label="Chờ xử lý"
            subLabel="Yêu cầu đang chờ phản hồi"
            badge={pendingBookings.length > 0 ? 'Cần xử lý' : 'Đã cập nhật'}
            badgeVariant={pendingBookings.length > 0 ? 'green' : 'blue'}
            variant="quiet"
            infoTooltip="Số lịch hẹn đang xử lý: chờ gia sư phản hồi hoặc chờ hoàn tất xác nhận đặt lịch."
          />
        </div>

        <div ref={scheduleRef}>
          <MonthlySchedule />
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
