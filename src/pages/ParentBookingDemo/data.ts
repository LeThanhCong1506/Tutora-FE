// Combo dùng MODEL CHUNG với tutor onboarding (src/types/combo.types.ts) — không định nghĩa lại.
// Số buổi/tháng KHÔNG lưu: hệ thống lặp pattern tuần theo cửa sổ [ngày bắt đầu → ngày này tháng sau]
// nên ra 4 hoặc 5 buổi tuỳ lịch (xem buildScheduleFromPattern trong index.tsx).
import type { Combo, FixedCombo, FlexCombo } from '../../types/combo.types';

export type { FixedCombo, FlexCombo };
export type TutorCombo = Combo;

export interface TutorSubject {
  id: string;
  name: string;
  grade: number;
  hourlyRate: number;
  // Số giờ mỗi buổi của môn (gia sư đặt khi setup môn + giá). Buổi học trong "tự chọn lịch rảnh"
  // tự bôi đúng độ dài này; phụ huynh KHÔNG tự chọn giờ/buổi nữa.
  hoursPerSession: number;
  sessionsPerWeek: number;
}

// Lịch rảnh hàng tuần của gia sư (KHÁC combo) — giữ startTime dạng "HH:mm" cho lưới calendar.
export interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  durationHours: number;
  available?: boolean;
}

// 1 buổi học cụ thể đã gắn ngày (runtime, sinh từ combo hoặc từ lịch rảnh).
export interface BookingSlot extends WeeklySlot {
  date: string;
}

export interface Tutor {
  id: string;
  name: string;
  initials: string;
  title: string;
  education: string;
  bio: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  studentCount: number;
  trialLessonPrice: number;
  subjects: TutorSubject[];
  availability: WeeklySlot[];
  combos: TutorCombo[];
}

export interface Child {
  id: string;
  name: string;
  initials: string;
  grade: number;
  school: string;
  dateOfBirth: string;
  learningGoal: string;
  note: string;
}

export const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export const TUTORS: Tutor[] = [
  {
    id: 'tutor-minh-an',
    name: 'Nguyễn Minh An',
    initials: 'MA',
    title: 'Gia sư Toán & Vật lý THCS',
    education: 'Cựu sinh viên Đại học Sư phạm TP.HCM',
    bio: 'Tập trung xây nền tảng, giải bài theo tư duy và theo sát tiến độ từng tuần. Lộ trình được cá nhân hóa để học sinh hiểu bản chất trước khi tăng tốc luyện đề.',
    rating: 4.9,
    reviewCount: 86,
    yearsExperience: 8,
    studentCount: 124,
    trialLessonPrice: 50000,
    subjects: [
      { id: 'math', name: 'Toán', grade: 7, hourlyRate: 220000, hoursPerSession: 1.5, sessionsPerWeek: 2 },
      { id: 'physics', name: 'Vật lý', grade: 8, hourlyRate: 240000, hoursPerSession: 2, sessionsPerWeek: 2 },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 1, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 2, startTime: '17:00', durationHours: 1.5 },
      { dayOfWeek: 3, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 3, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 4, startTime: '17:00', durationHours: 1.5 },
      { dayOfWeek: 5, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '08:00', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '09:30', durationHours: 1.5 },
      { dayOfWeek: 7, startTime: '14:00', durationHours: 1.5 },
    ],
    combos: [
      {
        id: 'an-fixed-evening',
        type: 'fixed',
        name: 'Combo nền tảng tối T2 - T4',
        description: '2 buổi cố định mỗi tuần, phù hợp để duy trì nhịp học đều đặn.',
        sessions: [
          { dayOfWeek: 1, startHour: 18, startMinute: 0, durationHours: 1.5 },
          { dayOfWeek: 3, startHour: 18, startMinute: 0, durationHours: 1.5 },
        ],
      },
      {
        id: 'an-fixed-weekend',
        type: 'fixed',
        name: 'Combo cuối tuần T7 - CN',
        description: '2 buổi cuối tuần (sáng Thứ 7 và chiều Chủ nhật), phù hợp khi lịch trong tuần bận.',
        sessions: [
          { dayOfWeek: 6, startHour: 8, startMinute: 0, durationHours: 1.5 },
          { dayOfWeek: 0, startHour: 14, startMinute: 0, durationHours: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'tutor-linh-chi',
    name: 'Trần Linh Chi',
    initials: 'LC',
    title: 'Gia sư Tiếng Anh thiếu nhi',
    education: 'Cử nhân Ngôn ngữ Anh - Đại học Ngoại thương',
    bio: 'Lộ trình giao tiếp kết hợp củng cố từ vựng, ngữ pháp và phản xạ theo độ tuổi. Mỗi buổi học có mục tiêu rõ ràng và phản hồi ngắn cho phụ huynh.',
    rating: 4.8,
    reviewCount: 63,
    yearsExperience: 6,
    studentCount: 91,
    trialLessonPrice: 40000,
    subjects: [
      { id: 'english', name: 'Tiếng Anh', grade: 7, hourlyRate: 200000, hoursPerSession: 1.5, sessionsPerWeek: 2 },
      { id: 'vietnamese', name: 'Tiếng Việt', grade: 4, hourlyRate: 180000, hoursPerSession: 1, sessionsPerWeek: 2 },
    ],
    availability: [
      { dayOfWeek: 2, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 2, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 4, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 4, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '08:00', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '09:30', durationHours: 1.5 },
      { dayOfWeek: 7, startTime: '14:00', durationHours: 1.5 },
      { dayOfWeek: 7, startTime: '15:30', durationHours: 1.5 },
    ],
    combos: [
      {
        id: 'chi-fixed-weekday',
        type: 'fixed',
        name: 'Combo giao tiếp tối T3 - T5',
        description: '2 buổi học cố định mỗi tuần, ưu tiên xây phản xạ giao tiếp.',
        sessions: [
          { dayOfWeek: 2, startHour: 18, startMinute: 0, durationHours: 1.5 },
          { dayOfWeek: 4, startHour: 18, startMinute: 0, durationHours: 1.5 },
        ],
      },
      {
        id: 'chi-fixed-weekend',
        type: 'fixed',
        name: 'Combo cuối tuần giao tiếp',
        description: '2 buổi cuối tuần (sáng Thứ 7 và chiều Chủ nhật) để luyện phản xạ giao tiếp.',
        sessions: [
          { dayOfWeek: 6, startHour: 8, startMinute: 0, durationHours: 1.5 },
          { dayOfWeek: 0, startHour: 14, startMinute: 0, durationHours: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'tutor-quang-huy',
    name: 'Phạm Quang Huy',
    initials: 'QH',
    title: 'Gia sư luyện thi THPT',
    education: 'Thạc sĩ Toán ứng dụng - Đại học Quốc gia',
    bio: 'Ôn tập theo chuyên đề, bám sát mục tiêu điểm số và kế hoạch thi chuyển cấp. Phù hợp với học sinh cần tăng tốc và rèn kỹ năng làm bài.',
    rating: 5,
    reviewCount: 42,
    yearsExperience: 10,
    studentCount: 78,
    trialLessonPrice: 60000,
    subjects: [
      { id: 'math', name: 'Toán', grade: 12, hourlyRate: 280000, hoursPerSession: 1.5, sessionsPerWeek: 2 },
      { id: 'physics', name: 'Vật lý', grade: 12, hourlyRate: 300000, hoursPerSession: 1.5, sessionsPerWeek: 2 },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 3, startTime: '19:30', durationHours: 1.5 },
      { dayOfWeek: 5, startTime: '18:00', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '08:00', durationHours: 1.5 },
      { dayOfWeek: 6, startTime: '09:30', durationHours: 1.5 },
      { dayOfWeek: 7, startTime: '14:00', durationHours: 1.5 },
    ],
    combos: [
      {
        id: 'huy-fixed-exam',
        type: 'fixed',
        name: 'Combo tăng tốc T2 - T4',
        description: '2 buổi cố định mỗi tuần dành cho lộ trình luyện thi.',
        sessions: [
          { dayOfWeek: 1, startHour: 19, startMinute: 30, durationHours: 1.5 },
          { dayOfWeek: 3, startHour: 19, startMinute: 30, durationHours: 1.5 },
        ],
      },
      {
        id: 'huy-fixed-weekend',
        type: 'fixed',
        name: 'Combo cuối tuần luyện đề',
        description: '2 buổi cuối tuần (sáng Thứ 7 và chiều Chủ nhật) tập trung luyện đề.',
        sessions: [
          { dayOfWeek: 6, startHour: 8, startMinute: 0, durationHours: 1.5 },
          { dayOfWeek: 0, startHour: 14, startMinute: 0, durationHours: 1.5 },
        ],
      },
    ],
  },
];

export const CHILDREN: Child[] = [
  {
    id: 'child-gia-han',
    name: 'Nguyễn Gia Hân',
    initials: 'GH',
    grade: 7,
    school: 'THCS Nguyễn Du',
    dateOfBirth: '18/09/2013',
    learningGoal: 'Củng cố nền tảng và nâng điểm kiểm tra Toán lên trên 8.',
    note: 'Tiếp thu tốt khi được giải thích bằng ví dụ trực quan.',
  },
  {
    id: 'child-bao-nam',
    name: 'Nguyễn Bảo Nam',
    initials: 'BN',
    grade: 4,
    school: 'Tiểu học Lê Văn Tám',
    dateOfBirth: '07/03/2016',
    learningGoal: 'Tăng khả năng tập trung và tự tin khi làm bài.',
    note: 'Cần nhắc lại kiến thức bằng các bài tập ngắn.',
  },
  {
    id: 'child-minh-khoa',
    name: 'Nguyễn Minh Khoa',
    initials: 'MK',
    grade: 9,
    school: 'THCS Trần Đại Nghĩa',
    dateOfBirth: '22/11/2011',
    learningGoal: 'Ôn thi vào lớp 10 và cải thiện kỹ năng giải bài nâng cao.',
    note: 'Đã có nền tảng khá, cần rèn tốc độ làm bài.',
  },
];
