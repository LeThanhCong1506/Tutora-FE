import styles from './styles.module.css';
import type { TaskItem, TaskStatus } from './types';

type TasksSectionProps = {
  tasks: TaskItem[];
};

const statusClassMap: Record<TaskStatus, string> = {
  Overdue: styles.taskStatusOverdue,
  'In Progress': styles.taskStatusProgress,
  Completed: styles.taskStatusCompleted,
};

const TasksSection = ({ tasks }: TasksSectionProps) => {
  return (
    <section className={styles.tasksSection}>
      <div className={styles.sectionTitle}>Tasks</div>
      <div className={styles.tasksList}>
        {tasks.map((task) => (
          <article key={task.id} className={styles.taskCard}>
            <div className={styles.taskInfo}>
              <span className={styles.taskDot} />
              <div>
                <h4 className={styles.taskTitle}>{task.title}</h4>
                <span className={styles.taskDue}>{task.dueLabel}</span>
              </div>
            </div>
            <div className={styles.taskActions}>
              <span className={`${styles.taskStatus} ${statusClassMap[task.status]}`}>
                {task.status}
              </span>
              <button className={styles.darkButtonSmall} type="button">
                {task.actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TasksSection;
