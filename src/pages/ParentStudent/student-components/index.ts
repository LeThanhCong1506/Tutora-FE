export { default as StudentSection } from './StudentSection';
export type { StudentSectionProps } from './StudentSection';

export { default as StudentSectionSkeleton } from './StudentSectionSkeleton';

export { default as BookingCard } from './BookingCard';
export type { BookingCardProps } from './BookingCard';

export { default as StudentOverview } from './StudentOverview';
export type { StudentOverviewProps } from './StudentOverview';
export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { useParentStudents } from './hooks/useParentStudents';
export type { SessionsByBooking, UseParentStudentsResult } from './hooks/useParentStudents';

export {
  bookingNextSessionLabel,
  bookingProgress,
  bookingScheduleAnchor,
  bookingStatusMeta,
  buildStudentBookings,
  buildStudentMeta,
  coverForBooking,
  formatSessionSlot,
  getInitials,
  summarizeStudentBookings,
  summaryNextSessionLabel,
  summaryScheduleAnchor,
} from './utils';

export type { StatusCount, StudentSummary } from './utils';

export { extractApiErrorMessage, hasApiErrorCode } from './apiMessages';

export type { BookingProgress, NextSessionInfo, StudentBookingsMap, StudentWithBookings } from './types';
