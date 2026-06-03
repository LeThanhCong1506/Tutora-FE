import type { ActiveClassSummary } from '@/services/tutorDetail.types';

/** Server Component. */
export default function ActiveClassesSection({
  classes,
  totalActive,
}: {
  classes: ActiveClassSummary[] | null;
  totalActive: number;
}) {
  if (!classes || classes.length === 0) return null;

  return (
    <section className="active-classes-section">
      <div className="active-classes-header">
        <h2 className="section-title">Lớp học đang giảng dạy</h2>
        <div className="active-classes-count">
          <b>{totalActive} lớp học</b>
        </div>
      </div>
      <div className="active-classes-grid">
        {classes.map((cls) => {
          const progress =
            cls.totalLessons > 0 ? Math.round((cls.completedLessons / cls.totalLessons) * 100) : 0;

          return (
            <div key={cls.bookingId} className="active-class-card">
              <div className="active-class-top">
                <div className="active-class-subject">
                  <b>{cls.subjectName || 'Chưa rõ môn học'}</b>
                </div>
              </div>
              <div className="active-class-student">
                <span className="student-label">Học sinh:</span>
                <span className="student-name">
                  {cls.studentName
                    ? cls.studentName
                        .split(' ')
                        .map((w, i, arr) => (i < arr.length - 1 ? w.charAt(0) + '.' : w))
                        .join(' ')
                    : '—'}
                </span>
              </div>
              <div className="active-class-progress">
                <div className="progress-info">
                  <span>Tiến độ</span>
                  <b>
                    {cls.completedLessons}/{cls.totalLessons} buổi
                  </b>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
