import type { StudentDashboardData } from './types';

const ASSETS = {
  statCourse: 'https://www.figma.com/api/mcp/asset/779f0a63-d8a0-4261-a956-aeff1bfd406e',
  statTasks: 'https://www.figma.com/api/mcp/asset/6f7b4aa2-f8d2-4537-8584-b2f4a7f4b61b',
  statProgress: 'https://www.figma.com/api/mcp/asset/68c6ecd0-9319-4b07-9756-1f632316ace7',
  statNext: 'https://www.figma.com/api/mcp/asset/b646247c-4b05-4dd4-ad76-65734f2f82dd',
  focusHeading: 'https://www.figma.com/api/mcp/asset/13f9e147-d6a3-4e0a-909c-305161c21757',
  joinIcon: 'https://www.figma.com/api/mcp/asset/f012e7b7-2d3a-4b23-92c9-7fc0708a3b1e',
  moreIcon: 'https://www.figma.com/api/mcp/asset/1193d27b-04e8-4431-9fc3-97e76d0873e5',
  noteIcon: 'https://www.figma.com/api/mcp/asset/fbf3cb7a-157e-423a-a388-134710306d38',
  priorityAttachment: 'https://www.figma.com/api/mcp/asset/e8b12156-7752-404f-bd93-77a7f55d11f9',
  priorityStart: 'https://www.figma.com/api/mcp/asset/1cffda9a-de14-4b5e-8498-d9a7eb25da2d',
  priorityResource: 'https://www.figma.com/api/mcp/asset/20bc3323-e197-487f-83b2-c8bbf4f736d3',
  courseMath: 'https://www.figma.com/api/mcp/asset/ce19062e-9444-4066-b01a-989cb83490bb',
  coursePhysics: 'https://www.figma.com/api/mcp/asset/a4fc934c-3514-4a8f-853b-450915be2bc2',
  courseChemistry: 'https://www.figma.com/api/mcp/asset/2802838e-df42-45cc-95fa-7b52bb61dd42',
  courseEnglish: 'https://www.figma.com/api/mcp/asset/d3ab12cd-8fc6-4d4b-8061-5f6bcec874cf',
} as const;

const DATA: StudentDashboardData = {
  quickStats: [
    {
      id: 'active-courses',
      label: 'Active Courses',
      value: '4',
      icon: ASSETS.statCourse,
    },
    {
      id: 'tasks-due',
      label: 'Tasks Due',
      value: '3',
      icon: ASSETS.statTasks,
    },
    {
      id: 'progress',
      label: 'Progress',
      value: '85%',
      icon: ASSETS.statProgress,
    },
    {
      id: 'next-class',
      label: 'Next Class',
      value: '23:45',
      icon: ASSETS.statNext,
    },
  ],
  focus: {
    headingIcon: ASSETS.focusHeading,
    headingLabel: "Today's Focus",
    session: {
      label: 'NEXT SESSION',
      title: 'Advanced Mathematics',
      instructor: 'with Dr. Sarah Chen',
      countdown: '23:45',
      countdownLabel: 'starts in',
      buttons: {
        joinLabel: 'Join Session',
        detailsLabel: 'View Details',
      },
      note: {
        icon: ASSETS.noteIcon,
        text: 'Topic: Calculus Derivatives • Remember to bring your practice notebook',
      },
      joinIcon: ASSETS.joinIcon,
      detailsIcon: ASSETS.joinIcon,
      moreIcon: ASSETS.moreIcon,
    },
    priorityTask: {
      label: 'TOP PRIORITY',
      title: 'Physics Chapter 12 Problems',
      dueLabel: 'Due: Today, 11:59 PM',
      attachmentLabel: 'Materials attached',
      attachmentIcon: ASSETS.priorityAttachment,
      startLabel: 'Start Now',
      resourceLabel: 'Open Resources',
      startIcon: ASSETS.priorityStart,
      resourceIcon: ASSETS.priorityResource,
    },
  },
  courses: [
    {
      id: 'course-math',
      title: 'Advanced Mathematics',
      instructor: 'Dr. Sarah Chen',
      icon: ASSETS.courseMath,
      progress: 75,
      nextLabel: 'Next: Today, 3:00 PM',
    },
    {
      id: 'course-physics',
      title: 'Physics',
      instructor: 'Prof. James Wilson',
      icon: ASSETS.coursePhysics,
      progress: 60,
      nextLabel: 'Next: Tomorrow, 10:00 AM',
    },
    {
      id: 'course-chemistry',
      title: 'Chemistry',
      instructor: 'Dr. Maria Garcia',
      icon: ASSETS.courseChemistry,
      progress: 90,
      nextLabel: 'Next: Friday, 5:00 PM',
    },
    {
      id: 'course-english',
      title: 'English',
      instructor: 'Ms. Sarah Thompson',
      icon: ASSETS.courseEnglish,
      progress: 40,
      nextLabel: 'Next: Monday, 12:00 PM',
    },
  ],
  tasks: [
    {
      id: 'task-physics',
      title: 'Physics Chapter 12 Problems',
      dueLabel: 'Due: Today, 11:59 PM',
      status: 'Overdue',
      actionLabel: 'Start',
    },
    {
      id: 'task-chemistry',
      title: 'Chemistry Lab Report',
      dueLabel: 'Due: Tomorrow, 2:00 PM',
      status: 'In Progress',
      actionLabel: 'Continue',
    },
    {
      id: 'task-math',
      title: 'Math Practice Set 5',
      dueLabel: 'Due: Friday, 5:00 PM',
      status: 'Completed',
      actionLabel: 'Review',
    },
  ],
  progress: {
    title: 'Progress Overview',
    chartLabel: 'Progress Chart',
    percent: '85%',
    description: 'Lessons completed this month',
  },
  recentSessions: [
    {
      id: 'session-calculus',
      title: 'Calculus Derivatives',
      note: 'Great progress on chain rule!',
    },
    {
      id: 'session-physics',
      title: 'Physics Momentum',
      note: 'Need more practice with collisions',
    },
    {
      id: 'session-chemistry',
      title: 'Chemistry Bonding',
      note: 'Excellent understanding shown',
    },
  ],
};

export const fetchStudentDashboardData = (): Promise<StudentDashboardData> => {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(DATA), 350);
  });
};
