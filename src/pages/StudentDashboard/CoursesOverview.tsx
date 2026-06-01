import styles from './styles.module.css';
import type { CourseProgress } from './types';

type CoursesOverviewProps = {
  courses: CourseProgress[];
};

const CoursesOverview = ({ courses }: CoursesOverviewProps) => {
  return (
    <section className={styles.coursesSection}>
      <div className={styles.sectionTitle}>My Courses</div>
      <div className={styles.coursesGrid}>
        {courses.map((course) => (
          <article key={course.id} className={styles.courseCard}>
            <div className={styles.courseHeader}>
              <div>
                <h4 className={styles.courseTitle}>{course.title}</h4>
                <span className={styles.courseInstructor}>{course.instructor}</span>
              </div>
              <span className={styles.courseIcon}>
                <img src={course.icon} alt="" />
              </span>
            </div>
            <div className={styles.courseProgressRow}>
              <div className={styles.courseProgressTrack}>
                <div
                  className={styles.courseProgressFill}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <span className={styles.courseProgressValue}>{course.progress}%</span>
            </div>
            <span className={styles.courseNextLabel}>{course.nextLabel}</span>
          </article>
        ))}
      </div>
    </section>
  );
};

export default CoursesOverview;
