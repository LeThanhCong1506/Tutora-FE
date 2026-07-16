import type { Dayjs } from 'dayjs';

export type LessonViewMode = 'calendar' | 'grid' | 'list';
export type StatusFilter = '' | 'scheduled' | 'pending_confirmation' | 'completed';

export interface LessonSummary {
  lessonId: number;
  scheduledStart: string;
  scheduledEnd: string;
  tutorName?: string;
  subjectName?: string;
  status: string;
  meetingLink?: string;
}

export interface LessonGroup {
  dateKey: string;
  date: Dayjs;
  lessons: LessonSummary[];
}

export interface LessonViewProps {
  lessons: LessonSummary[];
  onOpenLesson: (lessonId: number) => void;
}
