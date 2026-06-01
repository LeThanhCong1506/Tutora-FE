import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';
import { getUserInfoFromToken } from '../../services/auth.service';
import { getStudents } from '../../services/student.service';
import { getParentBookings } from '../../services/booking.service';
import { getParentCalendar, type CalendarLessonDto } from '../../services/parent-lesson.service';
import type { LessonResponse } from '../../services/lesson.service';
import type { BookingResponseDTO } from '../../services/booking.service';

/**
 * Adapt flat CalendarLessonDto → nested LessonResponse shape mà UI dashboard đang dùng.
 * `getParentLessons` endpoint không tồn tại ở BE — phải dùng `getParentCalendar` (đã có).
 */
const adaptCalendarLesson = (cl: CalendarLessonDto): LessonResponse => ({
  lessonId: cl.lessonId,
  scheduledStart: cl.scheduledStart,
  scheduledEnd: cl.scheduledEnd,
  status: cl.status,
  meetingLink: cl.meetingLink,
  subject: cl.subjectName ? { subjectId: 0, subjectName: cl.subjectName } : undefined,
  tutor: cl.tutorName ? { tutorId: '', fullName: cl.tutorName } : undefined,
  student: cl.studentName ? { studentId: '', fullName: cl.studentName } : undefined,
});
import { StatCard } from '../../components/shared';
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

// Quick action icons
const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <path d="M2 5l8 5 8-5M2 15V5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" strokeLinecap="round" />
  </svg>
);

const ChildrenActionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" strokeLinecap="round" />
  </svg>
);

const FindTutorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <circle cx="9" cy="9" r="6" />
    <path d="M16 16l-3.5-3.5" strokeLinecap="round" />
  </svg>
);

// Lesson icon used in list
const LessonListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#1a2238" strokeWidth="1.5">
    <rect x="2" y="3" width="14" height="13" rx="2" />
    <path d="M2 7h14" />
    <path d="M6 1v4M12 1v4" strokeLinecap="round" />
  </svg>
);

// Warning icon
const WarningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 1L1 16h16L9 1z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" />
    <path d="M9 7v4M9 13v1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ===== Helpers =====
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hôm nay, ${time}`;
  if (isTomorrow) return `Ngày mai, ${time}`;
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}, ${time}`;
};

const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(monday)} - ${fmt(sunday)}`;
};

const getLessonStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'Scheduled': 'Đã lên lịch',
    'Confirmed': 'Đã xác nhận',
    'InProgress': 'Đang diễn ra',
    'Completed': 'Hoàn thành',
    'Cancelled': 'Đã hủy',
    'Pending': 'Chờ xử lý',
  };
  return map[status] || status;
};

const getLessonStatusType = (status: string): 'confirmed' | 'scheduled' => {
  if (['Confirmed', 'InProgress', 'Completed'].includes(status)) return 'confirmed';
  return 'scheduled';
};

const getBookingStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'Pending': 'Chờ gia sư xác nhận',
    'TutorAccepted': 'Chờ thanh toán cọc',
    'DepositPaid': 'Đã cọc — Chờ bắt đầu',
    'DepositEscrowed': 'Đã cọc (50%)',
    'Escrowed': 'Đã thanh toán nốt',
    'InProgress': 'Đang học',
    'Completed': 'Hoàn thành',
    'Cancelled': 'Đã hủy',
  };
  return map[status] || status;
};

// ===== Component =====
const inMiniApp = isZaloMiniApp();

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalBookings, setTotalBookings] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);

  // Data
  const [upcomingLessons, setUpcomingLessons] = useState<LessonResponse[]>([]);
  const [pendingBookings, setPendingBookings] = useState<BookingResponseDTO[]>([]);
  const [nextLesson, setNextLesson] = useState<LessonResponse | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1) User name from JWT
      try {
        const userInfo = getUserInfoFromToken();
        if (userInfo) {
          setUserName(userInfo.fullname || userInfo.firstName || userInfo.email?.split('@')[0] || 'Phụ huynh');
        }
      } catch { /* ignore */ }

      // 2) Bookings
      try {
        const bookingsRes = await getParentBookings({ page: 1, pageSize: 100 });
        const items: BookingResponseDTO[] = bookingsRes?.content?.items || [];
        setTotalBookings(bookingsRes?.content?.totalCount || items.length);
        const active = items.filter((b: BookingResponseDTO) =>
          !['Cancelled', 'Completed'].includes(b.status || '')
        );
        setActiveBookings(active.length);
        // Bookings needing action (Pending, TutorAccepted)
        const pending = items.filter((b: BookingResponseDTO) =>
          ['Pending', 'TutorAccepted'].includes(b.status || '')
        );
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
          .flatMap(d => d.lessons || [])
          .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

        // Count lessons this week (Mon → Sun)
        const dayOfWeek = now.getDay();
        const mondayDate = new Date(now);
        mondayDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        mondayDate.setHours(0, 0, 0, 0);
        const sundayDate = new Date(mondayDate);
        sundayDate.setDate(mondayDate.getDate() + 7);

        const thisWeekLessons = flatLessons.filter(l => {
          const d = new Date(l.scheduledStart);
          return d >= mondayDate && d < sundayDate;
        });
        setWeekLessonCount(thisWeekLessons.length);

        // Upcoming lessons (loại completed/cancelled) — match cả lowercase từ BE
        const upcomingRaw = flatLessons.filter(l => {
          const s = (l.status || '').toLowerCase();
          return s !== 'completed' && s !== 'cancelled' && s !== 'cancelled_noshow' && s !== 'no_show';
        });

        const upcoming = upcomingRaw.map(adaptCalendarLesson);
        setUpcomingLessons(upcoming.slice(0, 5));

        // Next lesson = upcoming đầu tiên có scheduledStart >= now (sort đã đảm bảo thứ tự)
        const nextLessonRaw = upcomingRaw.find(l => new Date(l.scheduledStart).getTime() >= now.getTime())
          ?? upcomingRaw[0]; // fallback: lesson đang chạy (status=in_progress)
        if (nextLessonRaw) {
          setNextLesson(adaptCalendarLesson(nextLessonRaw));
        }
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
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.statCard} style={{ opacity: 0.4, minHeight: 120 }} />
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
          {!inMiniApp && <div className={styles.bannerDecorStrip} />}
          {!inMiniApp && <div className={styles.bannerOrbSmall} />}
          <div className={styles.welcomeContent}>
            <span className={styles.welcomeGreeting}>Dashboard — Phụ huynh</span>
            <h1 className={styles.welcomeTitle}>Xin chào, {userName}!</h1>
            {!inMiniApp && (
              <p className={styles.welcomeSubtitle}>
                Tổng quan hoạt động học tập tuần này
              </p>
            )}
            {!inMiniApp && (
              <div className={styles.welcomeDatePill}>
                <span className={styles.welcomeDateIcon}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                    <path d="M1.5 5.5h11" />
                    <path d="M4.5 1v2.5M9.5 1v2.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span className={styles.welcomeDate}>{getWeekRange()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <StatCard
            icon={<BookingIcon />}
            value={totalBookings}
            label="Tổng Booking"
            subLabel="Click để xem chi tiết"
            badge={`${activeBookings} đang hoạt động`}
            badgeVariant="green"
            onClick={() => navigate('/parent-portal/booking')}
            className={styles.statCard}
          />
          <StatCard
            icon={<ChildrenIcon />}
            value={childrenCount}
            label="Học sinh"
            subLabel="Đã liên kết"
            badge="Đã liên kết"
            badgeVariant="blue"
            onClick={() => navigate('/parent-portal/student')}
            className={styles.statCard}
          />
          <StatCard
            icon={<SessionsIcon />}
            value={weekLessonCount}
            label="Buổi học"
            subLabel="Đã lên lịch tuần này"
            badge="Tuần này"
            badgeVariant="green"
            onClick={() => navigate('/parent-portal/lessons')}
            className={styles.statCard}
          />
          <StatCard
            icon={<PendingIcon />}
            value={pendingBookings.length}
            label="Chờ xử lý"
            subLabel="Booking cần phản hồi"
            badge={pendingBookings.length > 0 ? 'Cần xử lý' : 'OK'}
            badgeVariant={pendingBookings.length > 0 ? 'green' : 'blue'}
            className={styles.statCard}
          />
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button className={styles.quickActionBtn} onClick={() => navigate('/parent-portal/messages')}>
            <MessageIcon />
            <span>Tin nhắn</span>
          </button>
          <button className={styles.quickActionBtn} onClick={() => navigate('/parent-portal/student')}>
            <ChildrenActionIcon />
            <span>Quản lý học sinh</span>
          </button>
          <button className={styles.quickActionBtn} onClick={() => navigate('/tutor-search')}>
            <FindTutorIcon />
            <span>Tìm gia sư</span>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid} style={inMiniApp ? { gridTemplateColumns: '1fr' } : undefined}>
          {/* Left: Upcoming Lessons */}
          <div className={styles.lessonsCard}>
            <div className={styles.lessonsHeader}>
              <h3>Buổi học sắp tới</h3>
              <a href="/parent-portal/lessons" className={styles.viewAllLink}>Xem lịch đầy đủ &rarr;</a>
            </div>
            <div className={styles.lessonsList}>
              {upcomingLessons.length > 0 ? upcomingLessons.map((lesson) => (
                <div
                  key={lesson.lessonId}
                  className={`${styles.lessonItem} ${lesson.lessonId === nextLesson?.lessonId ? styles.lessonHighlighted : ''}`}
                >
                  <div className={styles.lessonLeft}>
                    <div className={styles.lessonIcon}>
                      <LessonListIcon />
                    </div>
                    <div className={styles.lessonInfo}>
                      <span className={styles.lessonSubject}>
                        {lesson.subject?.subjectName || 'Buổi học'}
                      </span>
                      <span className={styles.lessonTime}>
                        {formatDate(lesson.scheduledStart)} • {lesson.tutor?.fullName || 'Gia sư'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.lessonRight}>
                    <span className={`${styles.lessonBadge} ${getLessonStatusType(lesson.status || '') === 'confirmed' ? styles.badgeConfirmed : styles.badgeScheduled}`}>
                      {getLessonStatusLabel(lesson.status || '')}
                    </span>
                    <button
                      className={styles.lessonViewBtn}
                      onClick={() => navigate(`/parent-portal/lessons/${lesson.lessonId}`)}
                    >
                      Xem
                    </button>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#a3a3a3', fontSize: '14px' }}>
                  Chưa có buổi học nào sắp tới
                </div>
              )}
            </div>
          </div>

          {/* Right: Next Lesson + Pending Bookings */}
          <div className={styles.rightColumn}>
            {/* Next Lesson Card */}
            <div className={styles.sessionCard}>
              <div className={styles.sessionHeader}>
                <h3>Buổi học kế tiếp</h3>
                {nextLesson && (
                  <span className={styles.sessionDate}>
                    {new Date(nextLesson.scheduledStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
              <div className={styles.sessionContent}>
                {nextLesson ? (
                  <>
                    <p className={styles.sessionDescription}>
                      <strong>{nextLesson.subject?.subjectName || 'Buổi học'}</strong>
                      {' '}với {nextLesson.tutor?.fullName || 'gia sư'} — {formatDate(nextLesson.scheduledStart)}
                    </p>
                    <div className={styles.sessionInfo}>
                      <span className={styles.sessionInfoLabel}>Học sinh</span>
                      <span className={styles.sessionInfoValue}>{nextLesson.student?.fullName || '—'}</span>
                    </div>
                    <button className={styles.sessionBtn} onClick={() => navigate(`/parent-portal/lessons/${nextLesson.lessonId}`)}>
                      Xem chi tiết
                    </button>
                  </>
                ) : (
                  <p className={styles.sessionDescription} style={{ color: '#a3a3a3' }}>
                    Chưa có buổi học nào được lên lịch
                  </p>
                )}
              </div>
            </div>

            {/* Pending Bookings */}
            <div className={styles.attentionCard}>
              <h3>Booking cần xử lý</h3>
              {pendingBookings.length > 0 ? (
                pendingBookings.map(booking => (
                  <div key={booking.bookingId} className={styles.attentionContent}>
                    <div className={styles.attentionIcon}>
                      <WarningIcon />
                    </div>
                    <div className={styles.attentionDetails}>
                      <span className={styles.attentionTitle}>
                        BK-{booking.bookingId}: {booking.subject?.subjectName || 'Booking'}
                      </span>
                      <span className={styles.attentionDesc}>
                        {getBookingStatusLabel(booking.status || '')}
                      </span>
                      <a
                        href="#"
                        className={styles.attentionLink}
                        onClick={(e) => { e.preventDefault(); navigate(`/parent-portal/booking/${booking.bookingId}`); }}
                      >
                        Xem chi tiết →
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#a3a3a3', fontSize: '14px' }}>
                  ✅ Không có booking nào cần xử lý
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
