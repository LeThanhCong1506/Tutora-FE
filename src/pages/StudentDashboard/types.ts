export type QuickStatItem = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

export type FocusNote = {
  icon: string;
  text: string;
};

export type FocusSession = {
  label: string;
  title: string;
  instructor: string;
  countdown: string;
  countdownLabel: string;
  buttons: {
    joinLabel: string;
    detailsLabel: string;
  };
  note: FocusNote;
  joinIcon: string;
  detailsIcon: string;
  moreIcon: string;
};

export type PriorityTask = {
  label: string;
  title: string;
  dueLabel: string;
  attachmentLabel: string;
  attachmentIcon: string;
  startLabel: string;
  resourceLabel: string;
  startIcon: string;
  resourceIcon: string;
};

export type FocusHeroData = {
  headingIcon: string;
  headingLabel: string;
  session: FocusSession;
  priorityTask: PriorityTask;
};

export type CourseProgress = {
  id: string;
  title: string;
  instructor: string;
  icon: string;
  progress: number;
  nextLabel: string;
};

export type TaskStatus = 'Overdue' | 'In Progress' | 'Completed';

export type TaskItem = {
  id: string;
  title: string;
  dueLabel: string;
  status: TaskStatus;
  actionLabel: string;
};

export type ProgressOverview = {
  title: string;
  chartLabel: string;
  percent: string;
  description: string;
};

export type RecentSession = {
  id: string;
  title: string;
  note: string;
};

export type StudentDashboardData = {
  quickStats: QuickStatItem[];
  focus: FocusHeroData;
  courses: CourseProgress[];
  tasks: TaskItem[];
  progress: ProgressOverview;
  recentSessions: RecentSession[];
};
