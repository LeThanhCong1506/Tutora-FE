import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isZaloMiniApp } from '../../services/zalo-env';
import { Clock, BookOpen, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPendingLessons, type PendingLessonDto } from '../../services/parent-lesson.service';
import { FilterTabs } from '../../components/shared';
import { Spin } from 'antd';
import { toast } from 'react-toastify';
import CountdownTimer from './components/CountdownTimer';
import styles from './styles.module.css';

// ===== HELPERS =====
const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_confirmation', label: 'Chờ xác nhận' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'disputed', label: 'Đang khiếu nại' },
];

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  scheduled: { label: 'Đã lên lịch', cssClass: 'statusScheduled' },
  checked_in: { label: 'Đang diễn ra', cssClass: 'statusCheckedIn' },
  checked_out: { label: 'Chờ báo cáo', cssClass: 'statusCheckedOut' },
  pending_confirmation: { label: 'Chờ xác nhận', cssClass: 'statusPending' },
  completed: { label: 'Hoàn thành', cssClass: 'statusCompleted' },
  disputed: { label: 'Khiếu nại', cssClass: 'statusDisputed' },
  cancelled: { label: 'Đã hủy', cssClass: 'statusCancelled' },
  no_show: { label: 'Vắng mặt', cssClass: 'statusNoShow' },
};

// ===== COMPONENT =====
const inMiniApp = isZaloMiniApp();

const ParentLessons = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [lessons, setLessons] = useState<PendingLessonDto[]>([]);
  const [allLessons, setAllLessons] = useState<PendingLessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await getPendingLessons();
      const data = Array.isArray(response.content) ? response.content : ((response.content) as any)?.items || [];
      setAllLessons(data);
    } catch {
      toast.error('Không thể tải danh sách buổi học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  // Filter by tab
  useEffect(() => {
    if (activeTab === 'all') {
      setLessons(allLessons);
    } else {
      setLessons(allLessons.filter(l => l.status === activeTab));
    }
    setCurrentPage(1);
  }, [activeTab, allLessons]);

  const totalPages = Math.max(1, Math.ceil(lessons.length / pageSize));
  const paginated = lessons.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const stats = {
    total: allLessons.length,
    pending: allLessons.filter(l => l.status === 'pending_confirmation').length,
    completed: allLessons.filter(l => l.status === 'completed').length,
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Buổi học của tôi</h1>
          {!inMiniApp && <p className={styles.subtitle}>Theo dõi và quản lý các buổi học</p>}
        </div>
      </header>

      {/* Stats Strip */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Tổng buổi học</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Chờ xác nhận</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Hoàn thành</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterSection}>
        <FilterTabs
          tabs={STATUS_TABS}
          activeKey={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : paginated.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BookOpen size={36} />
          </div>
          <h3 className={styles.emptyTitle}>Chưa có buổi học nào</h3>
          <p className={styles.emptyText}>
            Khi bạn đặt lịch gia sư và buổi học được tạo, chúng sẽ xuất hiện ở đây.
          </p>
          <button
            className={styles.emptyBtn}
            onClick={() => navigate('/tutor-search')}
            type="button"
          >
            <BookOpen size={16} />
            Tìm gia sư
          </button>
        </div>
      ) : (
        <>
          <div className={styles.lessonList}>
            {paginated.map((lesson) => {
              const statusCfg = STATUS_CONFIG[lesson.status || ''] || {
                label: lesson.status || 'N/A',
                cssClass: 'statusCancelled',
              };
              const startTime = new Date(lesson.scheduledStart);
              const endTime = new Date(lesson.scheduledEnd);

              return (
                <div
                  key={lesson.lessonId}
                  className={styles.lessonCard}
                  onClick={() => navigate(`/parent-portal/lessons/${lesson.lessonId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/parent-portal/lessons/${lesson.lessonId}`)}
                >
                  <div className={styles.lessonCardLeft}>
                    {/* Date block */}
                    <div className={styles.dateBlock}>
                      <span className={styles.dateDay}>{startTime.getDate()}</span>
                      <span className={styles.dateMonth}>
                        {startTime.toLocaleDateString('vi-VN', { month: 'short' })}
                      </span>
                    </div>

                    {/* Info */}
                    <div className={styles.lessonInfo}>
                      <div className={styles.lessonTitle}>
                        {lesson.subjectName || 'Buổi học'}
                        {lesson.tutorName && <span> — {lesson.tutorName}</span>}
                      </div>
                      <div className={styles.lessonTime}>
                        <Clock size={13} />
                        {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {startTime.toLocaleDateString('vi-VN', { weekday: 'long' })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.lessonCardRight}>
                    {lesson.confirmDeadline && lesson.status === 'pending_confirmation' && (
                      <CountdownTimer deadline={lesson.confirmDeadline} />
                    )}
                    <span className={`${styles.statusBadge} ${styles[statusCfg.cssClass]}`}>
                      <span className={styles.statusDot} />
                      {statusCfg.label}
                    </span>
                    <ChevronLeft size={16} className={styles.chevron} style={{ transform: 'rotate(180deg)' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParentLessons;
