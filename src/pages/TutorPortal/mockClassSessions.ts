import dayjs from 'dayjs';
import type { LessonResponse } from '../../services/lesson.service';

/**
 * Mock data — Backend hiện KHÔNG còn endpoint `/tutor/lessons*` (đã đổi sang
 * `ClassSession` domain, xem `api/tutor/class-sessions`, `api/parent/class-sessions`,
 * `api/student/class-sessions`). `lesson.service.ts` gọi route cũ đã chết (404).
 *
 * Dùng mock này tạm thời cho UI Quản lý lớp học (list + detail) cho tới khi
 * `lesson.service.ts` được viết lại để trỏ đúng các route class-sessions.
 */

const now = dayjs();

export const MOCK_LESSONS: LessonResponse[] = [
    // ── Booking 5001 — AP Mathematics A / Emma Johnson ──
    {
        lessonId: 9001,
        bookingId: 5001,
        scheduledStart: now.subtract(7, 'day').hour(14).minute(0).toISOString(),
        scheduledEnd: now.subtract(7, 'day').hour(15).minute(30).toISOString(),
        status: 'completed',
        lessonPrice: 350000,
        lessonContent: 'Ôn tập đạo hàm và ứng dụng.',
        homework: 'Làm bài 1-15 trang 42.',
        checkInTime: now.subtract(7, 'day').hour(14).minute(1).toISOString(),
        checkOutTime: now.subtract(7, 'day').hour(15).minute(28).toISOString(),
        isTutorPresent: true,
        isStudentPresent: true,
        student: { studentId: 'stu-emma', fullName: 'Emma Johnson', gradeLevel: '11' },
        subject: { subjectId: 1, subjectName: 'AP Mathematics A' },
    },
    {
        lessonId: 9002,
        bookingId: 5001,
        scheduledStart: now.add(5, 'minute').toISOString(),
        scheduledEnd: now.add(95, 'minute').toISOString(),
        status: 'scheduled',
        lessonPrice: 350000,
        meetingLink: undefined,
        student: { studentId: 'stu-emma', fullName: 'Emma Johnson', gradeLevel: '11' },
        subject: { subjectId: 1, subjectName: 'AP Mathematics A' },
    },
    {
        lessonId: 9003,
        bookingId: 5001,
        scheduledStart: now.add(3, 'day').hour(14).minute(0).toISOString(),
        scheduledEnd: now.add(3, 'day').hour(15).minute(30).toISOString(),
        status: 'scheduled',
        lessonPrice: 350000,
        student: { studentId: 'stu-emma', fullName: 'Emma Johnson', gradeLevel: '11' },
        subject: { subjectId: 1, subjectName: 'AP Mathematics A' },
    },

    // ── Booking 5002 — Physics Grade 11 / Michael Chen ──
    {
        lessonId: 9004,
        bookingId: 5002,
        scheduledStart: now.subtract(2, 'day').hour(16).minute(0).toISOString(),
        scheduledEnd: now.subtract(2, 'day').hour(17).minute(30).toISOString(),
        status: 'pending_confirmation',
        lessonPrice: 300000,
        lessonContent: 'Định luật Newton và bài tập vận dụng.',
        submittedAt: now.subtract(2, 'day').hour(17).minute(35).toISOString(),
        confirmDeadline: now.add(22, 'hour').toISOString(),
        checkInTime: now.subtract(2, 'day').hour(16).minute(2).toISOString(),
        checkOutTime: now.subtract(2, 'day').hour(17).minute(29).toISOString(),
        student: { studentId: 'stu-michael', fullName: 'Michael Chen', gradeLevel: '11' },
        subject: { subjectId: 2, subjectName: 'Physics Grade 11' },
    },
    {
        lessonId: 9005,
        bookingId: 5002,
        scheduledStart: now.hour(16).minute(0).toISOString(),
        scheduledEnd: now.hour(17).minute(30).toISOString(),
        status: 'scheduled',
        lessonPrice: 300000,
        student: { studentId: 'stu-michael', fullName: 'Michael Chen', gradeLevel: '11' },
        subject: { subjectId: 2, subjectName: 'Physics Grade 11' },
    },

    // ── Booking 5003 — Chemistry Grade 10 / Alex Rodriguez ──
    {
        lessonId: 9006,
        bookingId: 5003,
        scheduledStart: now.subtract(1, 'hour').toISOString(),
        scheduledEnd: now.add(30, 'minute').toISOString(),
        status: 'in_progress',
        lessonPrice: 280000,
        meetingLink: 'https://meet.example.com/mock-room-9006',
        checkInTime: now.subtract(1, 'hour').add(2, 'minute').toISOString(),
        student: { studentId: 'stu-alex', fullName: 'Alex Rodriguez', gradeLevel: '10' },
        subject: { subjectId: 3, subjectName: 'Chemistry Grade 10' },
    },
    {
        lessonId: 9007,
        bookingId: 5003,
        scheduledStart: now.add(4, 'day').hour(18).minute(30).toISOString(),
        scheduledEnd: now.add(4, 'day').hour(19).minute(30).toISOString(),
        status: 'scheduled',
        lessonPrice: 280000,
        student: { studentId: 'stu-alex', fullName: 'Alex Rodriguez', gradeLevel: '10' },
        subject: { subjectId: 3, subjectName: 'Chemistry Grade 10' },
    },
];
