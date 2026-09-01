export { default as CourseCard } from './CourseCard';
export type { CourseCardProps } from './CourseCard';

export { default as CourseCardSkeleton } from './CourseCardSkeleton';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { useStudentProgress } from './hooks/useStudentProgress';
export type { UseStudentProgressResult } from './hooks/useStudentProgress';

export {
  buildCourseProgress,
  courseProgressBar,
  courseStatusMeta,
  coverForCourse,
  formatSessionSlot,
  getInitials,
  isCourseCancelled,
  nextSessionLabel,
  scheduleAnchorDate,
} from './utils';

export type { CourseProgress, NextSessionInfo } from './types';
