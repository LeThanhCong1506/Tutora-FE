import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getParentCalendar, getParentLessonDetail, type CalendarLessonDto, type ParentLessonDetailDto } from '../../services/parent-lesson.service';
import { createChannel } from '../../services/chat.service';
import { formatVNDNumber } from '../../utils/formatters';
import styles from './MonthlySchedule.module.css';
import { getClassSessionStatusMeta } from '../../utils/classSessionStatus';
import { getApiErrorMessage } from '../../utils/apiError';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const STUDENT_COLORS = ['#1f2a40', '#846f5b', '#687783', '#9a8d70', '#59675d'];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getGridDates = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const getStudentName = (lesson: CalendarLessonDto) => lesson.studentName?.trim() || 'Học sinh';

const getStudentColor = (name: string) => {
  const hash = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return STUDENT_COLORS[hash % STUDENT_COLORS.length];
};

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/**
 * Nhãn trạng thái lấy từ `classSessionStatus.ts` — bản đồ duy nhất khớp `ClassSessionStatus.cs`.
 *
 * Bản đồ cục bộ trước đây bị lệch khỏi BE theo cả hai chiều: thiếu `reserved` (giá trị BE có
 * thật) nên fallback `|| status` đổ nguyên chữ "reserved" ra cho phụ huynh đọc, đồng thời thừa
 * `confirmed`/`checked_in`/`checked_out` là những giá trị BE không hề trả về.
 */
const getStatusLabel = (status: string) => getClassSessionStatusMeta(status).label;

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d={direction === 'left' ? 'M11 4.5 6.5 9l4.5 4.5' : 'm7 4.5 4.5 4.5L7 13.5'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="m4.5 4.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MessageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M3 3.5h12v9H8l-3.5 2.5v-2.5H3v-9Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PersonAvatar = ({ name, avatarUrl }: { name: string; avatarUrl?: string }) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <span className={styles.personAvatar} aria-hidden="true">
      <span>{initials || '?'}</span>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </span>
  );
};

const formatCurrency = (value?: number) =>
  typeof value === 'number' ? `${formatVNDNumber(value)} đ` : 'Chưa cập nhật';

const MonthlySchedule = () => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [lessons, setLessons] = useState<CalendarLessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalLessonId, setModalLessonId] = useState<number | null>(null);
  const [lessonDetail, setLessonDetail] = useState<ParentLessonDetailDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [openingChat, setOpeningChat] = useState(false);

  const gridDates = useMemo(() => getGridDates(currentMonth), [currentMonth]);

  useEffect(() => {
    let active = true;

    const fetchMonth = async () => {
      setLoading(true);
      try {
        const endDate = new Date(gridDates[gridDates.length - 1]);
        endDate.setDate(endDate.getDate() + 1);
        const response = await getParentCalendar(toDateKey(gridDates[0]), toDateKey(endDate));
        if (!active) return;

        const nextLessons = (response.content || [])
          .flatMap((day) => day.lessons || [])
          .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

        setLessons(nextLessons);

        const isCurrentMonth =
          currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth();
        const firstLessonThisMonth = nextLessons.find((lesson) => {
          const lessonDate = new Date(lesson.scheduledStart);
          return (
            lessonDate.getFullYear() === currentMonth.getFullYear() && lessonDate.getMonth() === currentMonth.getMonth()
          );
        });

        setSelectedDate(
          isCurrentMonth
            ? toDateKey(today)
            : firstLessonThisMonth
              ? toDateKey(new Date(firstLessonThisMonth.scheduledStart))
              : toDateKey(currentMonth),
        );
      } catch (error) {
        if (active) {
          setLessons([]);
          console.error('Dashboard: failed to fetch monthly calendar:', error);
          toast.error(getApiErrorMessage(error, 'Không tải được lịch học trong tháng.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMonth();
    return () => {
      active = false;
    };
  }, [currentMonth, gridDates, today]);

  useEffect(() => {
    if (modalLessonId === null) return;
    let active = true;

    const fetchDetail = async () => {
      setModalLoading(true);
      setModalError('');
      setLessonDetail(null);
      try {
        const response = await getParentLessonDetail(modalLessonId);
        if (active) setLessonDetail(response.content || null);
      } catch (error) {
        if (active) {
          setModalError(getApiErrorMessage(error, 'Không thể tải thông tin buổi học. Vui lòng thử lại.'));
          console.error('Dashboard: failed to fetch lesson detail:', error);
        }
      } finally {
        if (active) setModalLoading(false);
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [modalLessonId]);

  useEffect(() => {
    if (modalLessonId === null) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalLessonId(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalLessonId]);

  const lessonsByDate = useMemo(
    () =>
      lessons.reduce<Record<string, CalendarLessonDto[]>>((result, lesson) => {
        const key = toDateKey(new Date(lesson.scheduledStart));
        (result[key] ||= []).push(lesson);
        return result;
      }, {}),
    [lessons],
  );

  const studentNames = useMemo(() => Array.from(new Set(lessons.map(getStudentName))), [lessons]);
  const selectedLessons = lessonsByDate[selectedDate] || [];

  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const moveMonth = (offset: number) => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  const handleMessageTutor = async () => {
    const tutor = lessonDetail?.tutor;
    if (!tutor?.tutorId) {
      toast.error('Chưa có thông tin tài khoản của gia sư.');
      return;
    }

    try {
      setOpeningChat(true);
      const response = await createChannel(tutor.tutorId);
      const channelId = response.content?.channelId;
      if (!channelId) throw new Error('Missing channelId');

      navigate('/parent-portal/messages', {
        state: {
          openChannel: {
            channelId,
            bookingId: lessonDetail?.bookingId || 0,
            otherUserId: tutor.tutorId,
            otherUserName: tutor.fullName || 'Gia sư',
            otherUserAvatarUrl: tutor.avatarUrl || '',
            status: 'active',
            lastMessageAt: '',
            lastMessagePreview: '',
          },
        },
      });
    } catch (error) {
      console.error('Dashboard: failed to open tutor conversation:', error);
      toast.error(getApiErrorMessage(error, 'Không mở được cuộc trò chuyện. Vui lòng thử lại.'));
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <section className={styles.scheduleSection} aria-label="Lịch học theo tháng">
      <div className={styles.calendarPanel}>
        <header className={styles.calendarHeader}>
          <div className={styles.sectionTitle}>
            <span className={styles.titleIcon}>
              <CalendarIcon />
            </span>
            <div>
              <h2>Lịch học theo tháng</h2>
            </div>
          </div>

          <div className={styles.monthControls}>
            <button type="button" className={styles.navButton} onClick={() => moveMonth(-1)} aria-label="Tháng trước">
              <ChevronIcon direction="left" />
            </button>
            <span className={styles.monthLabel}>
              Tháng {currentMonth.getMonth() + 1}/{currentMonth.getFullYear()}
            </span>
            <button type="button" className={styles.navButton} onClick={() => moveMonth(1)} aria-label="Tháng sau">
              <ChevronIcon direction="right" />
            </button>
            <button type="button" className={styles.todayButton} onClick={goToToday}>
              Hôm nay
            </button>
          </div>
        </header>

        {studentNames.length > 0 && (
          <div className={styles.studentLegend} aria-label="Chú thích học sinh">
            {studentNames.map((name) => (
              <span key={name} className={styles.legendItem}>
                <i style={{ backgroundColor: getStudentColor(name) }} />
                {name}
              </span>
            ))}
          </div>
        )}

        <div className={styles.weekHeader}>
          {WEEK_DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className={`${styles.monthGrid} ${loading ? styles.loading : ''}`}>
          {gridDates.map((date) => {
            const dateKey = toDateKey(date);
            const dayLessons = lessonsByDate[dateKey] || [];
            const dayStudents = Array.from(new Set(dayLessons.map(getStudentName)));
            const outsideMonth = date.getMonth() !== currentMonth.getMonth();
            const isToday = dateKey === toDateKey(today);
            const isSelected = dateKey === selectedDate;
            const hasLessons = dayLessons.length > 0;

            return (
              <button
                type="button"
                key={dateKey}
                className={`${styles.dayCell} ${outsideMonth ? styles.outsideMonth : ''} ${hasLessons ? styles.hasLessons : ''} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedDate(dateKey)}
                aria-label={`${date.toLocaleDateString('vi-VN')}, ${dayLessons.length} buổi học`}
                aria-pressed={isSelected}
              >
                <span className={styles.dayNumber}>{date.getDate()}</span>
                <span className={styles.dayDots}>
                  {dayStudents.slice(0, 5).map((name) => (
                    <i key={name} style={{ backgroundColor: getStudentColor(name) }} title={name} />
                  ))}
                  {dayStudents.length > 5 && <small>+{dayStudents.length - 5}</small>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className={styles.detailsPanel}>
        <div className={styles.detailsHeader}>
          <div>
            <span className={styles.detailsEyebrow}>Chi tiết trong ngày</span>
            <h3>{selectedDateLabel.charAt(0).toUpperCase() + selectedDateLabel.slice(1)}</h3>
          </div>
          <span className={styles.lessonCount}>{selectedLessons.length} buổi</span>
        </div>

        <div className={styles.detailsList}>
          {loading ? (
            <div className={styles.detailsEmpty}>Đang tải lịch học...</div>
          ) : selectedLessons.length > 0 ? (
            selectedLessons.map((lesson) => {
              const name = getStudentName(lesson);
              return (
                <article key={lesson.lessonId} className={styles.lessonDetail}>
                  <div className={styles.lessonTime}>
                    <strong>{formatTime(lesson.scheduledStart)}</strong>
                    <span>đến {formatTime(lesson.scheduledEnd)}</span>
                  </div>
                  <div className={styles.lessonMain}>
                    <h4>{lesson.subjectName || 'Buổi học'}</h4>
                    <div className={styles.lessonParticipants}>
                      <div>
                        <span>Học sinh</span>
                        <strong className={styles.studentName}>
                          <i style={{ backgroundColor: getStudentColor(name) }} />
                          {name}
                        </strong>
                      </div>
                      <div>
                        <span>Gia sư</span>
                        <strong>{lesson.tutorName || 'Chưa cập nhật'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.lessonActions}>
                    <span className={styles.statusBadge}>{getStatusLabel(lesson.status)}</span>
                    <button
                      type="button"
                      className={styles.detailButton}
                      onClick={() => setModalLessonId(lesson.lessonId)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className={styles.detailsEmpty}>
              <span className={styles.emptyCalendar}>
                <CalendarIcon />
              </span>
              <strong>Không có buổi học</strong>
              <p>Ngày này chưa có lịch học nào được sắp xếp.</p>
            </div>
          )}
        </div>
      </aside>

      {modalLessonId !== null && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalLessonId(null);
          }}
        >
          <div className={styles.lessonModal} role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title">
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.detailsEyebrow}>Thông tin buổi học</span>
                <h3 id="lesson-modal-title">{lessonDetail?.subject?.subjectName || 'Chi tiết buổi học'}</h3>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModalLessonId(null)}
                aria-label="Đóng chi tiết buổi học"
                autoFocus
              >
                <CloseIcon />
              </button>
            </header>

            <div className={styles.modalBody}>
              {modalLoading ? (
                <div className={styles.modalState}>
                  <span className={styles.modalSpinner} />
                  Đang tải thông tin buổi học...
                </div>
              ) : modalError ? (
                <div className={styles.modalState}>
                  <strong>Không tải được dữ liệu</strong>
                  <p>{modalError}</p>
                  <button type="button" onClick={() => setModalLessonId(null)}>
                    Đóng
                  </button>
                </div>
              ) : lessonDetail ? (
                <>
                  <div className={styles.modalSummary}>
                    <div>
                      <span>Thời gian</span>
                      <strong>
                        {new Date(lessonDetail.scheduledStart).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </strong>
                      <p>
                        {formatTime(lessonDetail.scheduledStart)} - {formatTime(lessonDetail.scheduledEnd)}
                      </p>
                    </div>
                    <span className={styles.modalStatus}>{getStatusLabel(lessonDetail.status || '')}</span>
                  </div>

                  <div className={styles.modalInfoGrid}>
                    <div className={styles.modalPersonItem}>
                      <PersonAvatar
                        name={lessonDetail.student?.fullName || 'Học sinh'}
                        avatarUrl={lessonDetail.student?.avatarUrl}
                      />
                      <div className={styles.personText}>
                        <span>Học sinh</span>
                        <strong>{lessonDetail.student?.fullName || 'Chưa cập nhật'}</strong>
                      </div>
                    </div>
                    <div className={styles.modalPersonItem}>
                      <PersonAvatar
                        name={lessonDetail.tutor?.fullName || 'Gia sư'}
                        avatarUrl={lessonDetail.tutor?.avatarUrl}
                      />
                      <div className={styles.personText}>
                        <span>Gia sư</span>
                        <strong>{lessonDetail.tutor?.fullName || 'Chưa cập nhật'}</strong>
                      </div>
                      <button
                        type="button"
                        className={styles.messageTutorButton}
                        onClick={handleMessageTutor}
                        disabled={openingChat || !lessonDetail.tutor?.tutorId}
                      >
                        <MessageIcon />
                        {openingChat ? 'Đang mở...' : 'Nhắn tin'}
                      </button>
                    </div>
                    <div className={styles.modalMetaItem}>
                      <span>Mã buổi học</span>
                      <strong>#{lessonDetail.lessonId}</strong>
                    </div>
                    <div className={styles.modalMetaItem}>
                      <span>Học phí</span>
                      <strong>{formatCurrency(lessonDetail.lessonPrice)}</strong>
                    </div>
                  </div>

                  {(lessonDetail.lessonContent || lessonDetail.homework || lessonDetail.tutorNotes) && (
                    <div className={styles.modalNotes}>
                      {lessonDetail.lessonContent && (
                        <div>
                          <span>Nội dung buổi học</span>
                          <p>{lessonDetail.lessonContent}</p>
                        </div>
                      )}
                      {lessonDetail.homework && (
                        <div>
                          <span>Bài tập</span>
                          <p>{lessonDetail.homework}</p>
                        </div>
                      )}
                      {lessonDetail.tutorNotes && (
                        <div>
                          <span>Ghi chú của gia sư</span>
                          <p>{lessonDetail.tutorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <footer className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.modalSecondaryButton}
                      onClick={() => setModalLessonId(null)}
                    >
                      Đóng
                    </button>
                  </footer>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MonthlySchedule;
