'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarRange,
  CalendarDays,
  Check,
  Clock3,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  PackageCheck,
  Repeat2,
  Route,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AvailabilitySlot, SubjectInfo } from '@/services/tutorDetail.types';
import type { TutorPackageResponse, TutorSubjectGradePrice } from '@/services/tutorDetail.types';
import {
  createBooking,
  getTutorBookedSlots,
  validatePromotion,
  type CreateBookingPayload,
  type PromotionValidateResult,
  type ScheduleItemPayload,
} from '@/services/booking.client';
import { getApiErrorMessage, getCurrentUserRole, getUserIdFromToken } from '@/services/auth.client';
import { getMyLinkStatus, getStudents, type StudentType } from '@/services/student.client';

type ScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type SubjectOption = {
  id: number;
  name: string;
  optionKey?: string;
  price?: TutorSubjectGradePrice;
  gradePrices?: TutorSubjectGradePrice[];
};

type BookingFormData = {
  studentId: string;
  subjectId: number;
  tutorSubjectGradePriceId: number | null;
  bookingMode: 'schedule' | 'package';
  packageId: number | null;
  teachingMode: 'online' | 'offline' | 'hybrid';
  startDate: string;
  schedule: ScheduleSlot[];
  locationCity: string;
  locationDistrict: string;
  locationWard: string;
  locationDetail: string;
  promotionCode: string;
};

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tutorName: string;
  tutorId: string;
  hourlyRate: number;
  subjects: SubjectInfo[];
  subjectGradePrices?: TutorSubjectGradePrice[];
  packages?: TutorPackageResponse[];
  availabilities?: AvailabilitySlot[] | null;
  tutorTeachingMode?: string | null;
};

type StepProps = {
  formData: BookingFormData;
  setFormData: Dispatch<SetStateAction<BookingFormData>>;
  hourlyRate: number;
  students: StudentType[];
  loadingStudents: boolean;
  availableSubjects: SubjectOption[];
  subjectGradePrices: TutorSubjectGradePrice[];
  packages: TutorPackageResponse[];
  selectedPrice: TutorSubjectGradePrice | null;
  bookedSlots: ScheduleSlot[];
  availabilities: AvailabilitySlot[];
  slotDuration: number;
  setSlotDuration: Dispatch<SetStateAction<number>>;
  userRole: string | null;
  tutorTeachingMode?: string | null;
};

function resolveLockedMode(raw?: string | null): 'online' | 'offline' | null {
  const m = (raw ?? '').toLowerCase();
  if (m === 'online') return 'online';
  if (m === 'offline') return 'offline';
  return null;
}

const SUBJECT_MAPPING: SubjectOption[] = [
  { id: 1, name: 'Toán' },
  { id: 2, name: 'Tiếng Anh' },
  { id: 3, name: 'Vật Lý' },
  { id: 4, name: 'Hóa Học' },
  { id: 5, name: 'Ngữ Văn' },
  { id: 6, name: 'Sinh Học' },
  { id: 7, name: 'Lịch Sử' },
  { id: 8, name: 'Địa Lý' },
  { id: 9, name: 'Tin Học' },
  { id: 10, name: 'IELTS' },
];

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DURATION_OPTIONS = [
  { value: 1, label: '1 giờ' },
  { value: 1.5, label: '1.5 giờ' },
  { value: 2, label: '2 giờ' },
];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
    .toString()
    .padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});
const STEPS = [
  { key: 'student', label: 'Học sinh & Môn' },
  { key: 'mode', label: 'Cách đặt' },
  { key: 'schedule', label: 'Lịch học' },
  { key: 'review', label: 'Xác nhận' },
];
const TEACHING_MODES = [
  { key: 'online' as const, label: 'Online', icon: '▣', desc: 'Học qua video call' },
  { key: 'offline' as const, label: 'Tại nhà', icon: '⌂', desc: 'Gia sư đến tận nơi' },
  { key: 'hybrid' as const, label: 'Linh hoạt', icon: '⇄', desc: 'Kết hợp online & offline' },
];

function formatPrice(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatGrade(grade?: string) {
  if (!grade) return '';
  return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
}

function backendDayToFe(day: number) {
  return day === 7 ? 0 : day;
}

function feDayToIso(day: number) {
  return day === 0 ? 7 : day;
}

function parseGradeId(raw?: string | number | null) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (!raw) return null;
  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function normalizeDateInput(date: string) {
  return date || new Date().toISOString().split('T')[0];
}

function toDateTimeLocal(date: string, time: string) {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateToYmd(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getBookingStartWindow(referenceDate = new Date()) {
  const min = startOfDay(referenceDate);
  const max = new Date(min.getFullYear(), min.getMonth() + 2, 0);
  return { min, max };
}

function getRecurringWindowEnd(firstLessonDate: Date) {
  return addDays(
    new Date(firstLessonDate.getFullYear(), firstLessonDate.getMonth() + 1, firstLessonDate.getDate()),
    -1,
  );
}

function clampDateToWindow(date: Date, min: Date, max: Date) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function isDateInRange(date: Date, min: Date, max: Date) {
  const normalized = startOfDay(date);
  return normalized >= min && normalized <= max;
}

function firstScheduledDateForSlot(slot: ScheduleSlot, startDate: string) {
  const start = new Date(`${normalizeDateInput(startDate)}T00:00:00`);
  const daysUntilSlot = (slot.dayOfWeek - start.getDay() + 7) % 7;
  return addDays(start, daysUntilSlot);
}

function getFirstScheduledDate(schedule: ScheduleSlot[], startDate: string) {
  if (schedule.length === 0) return null;
  return schedule
    .map((slot) => firstScheduledDateForSlot(slot, startDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

function buildFlexibleSlots(schedule: ScheduleSlot[], startDate: string) {
  const firstLessonDate = getFirstScheduledDate(schedule, startDate);
  if (!firstLessonDate) return [];

  const windowEnd = getRecurringWindowEnd(firstLessonDate);
  const slots: { scheduledStart: string; scheduledEnd: string }[] = [];

  schedule.forEach((slot) => {
    const firstDate = firstScheduledDateForSlot(slot, startDate);
    for (let date = firstDate; date <= windowEnd; date = addDays(date, 7)) {
      const dateKey = dateToYmd(date);
      slots.push({
        scheduledStart: toDateTimeLocal(dateKey, slot.startTime),
        scheduledEnd: toDateTimeLocal(dateKey, slot.endTime),
      });
    }
  });

  return slots.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}

function fixedPackageToSchedule(pkg: TutorPackageResponse, durationMinutes?: number | null): ScheduleSlot[] {
  const durationHours = durationMinutes ? durationMinutes / 60 : null;
  return (pkg.fixedSlots || []).map((slot) => ({
    dayOfWeek: backendDayToFe(slot.dayOfWeek),
    startTime: slot.startTime.slice(0, 5),
    endTime: durationHours ? addHoursToTime(slot.startTime.slice(0, 5), durationHours) : slot.endTime.slice(0, 5),
  }));
}

function getStudentGradeIds(student?: StudentType) {
  const explicitGradeLevelId = parseGradeId(
    student ? (student as StudentType & { gradeLevelId?: number | string }).gradeLevelId : null,
  );
  const gradeNumber = parseGradeId(student?.gradeLevel);
  return { explicitGradeLevelId, gradeNumber };
}

function getPriceGradeNumber(price: TutorSubjectGradePrice) {
  return parseGradeId(price.gradeLevelName) ?? (price.gradeLevelId > 0 && price.gradeLevelId <= 12 ? price.gradeLevelId : null);
}

function isPriceCompatibleWithStudent(price: TutorSubjectGradePrice, student?: StudentType) {
  if (!student) return true;
  const { explicitGradeLevelId, gradeNumber } = getStudentGradeIds(student);

  if (explicitGradeLevelId != null && price.gradeLevelId === explicitGradeLevelId) return true;
  if (gradeNumber == null) return true;

  return getPriceGradeNumber(price) === gradeNumber;
}

function resolvePriceForSelection(prices: TutorSubjectGradePrice[], subjectId: number, student?: StudentType) {
  const activePrices = prices.filter((price) => price.isActive && price.subjectId === subjectId);
  if (activePrices.length === 0) return null;

  if (student) {
    const exact = activePrices.find((price) => isPriceCompatibleWithStudent(price, student));
    return exact ?? null;
  }

  return activePrices[0];
}

function formatSessionDuration(minutes?: number | null) {
  if (!minutes) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} giờ` : `${hours.toFixed(1).replace('.', 'h')}`;
}

function addHoursToTime(time: string, hours: number) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function calcTotalHoursFromSchedule(schedule: ScheduleSlot[]) {
  return schedule.reduce((total, slot) => {
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    return total + ((eh * 60 + em - sh * 60 - sm) / 60) * 4;
  }, 0);
}

function parseLocalDate(date: string) {
  return new Date(`${normalizeDateInput(date)}T00:00:00`);
}

function startOfWeek(date: Date) {
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  return addDays(date, offset);
}

function formatShortDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildCalendarPreviewSlots(schedule: ScheduleSlot[], startDate: string) {
  return buildFlexibleSlots(schedule, startDate).map((slot) => ({
    date: slot.scheduledStart.slice(0, 10),
    startTime: slot.scheduledStart.slice(11, 16),
    endTime: slot.scheduledEnd.slice(11, 16),
  }));
}

function MonthSchedulePreview({
  slots,
  startDate,
  variant = 'side',
}: {
  slots: { date: string; startTime: string; endTime: string }[];
  startDate: string;
  variant?: 'side' | 'confirm';
}) {
  const fallbackStart = parseLocalDate(startDate);
  const sortedSlots = [...slots].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const windowStart = sortedSlots[0]?.date ? parseLocalDate(sortedSlots[0].date) : fallbackStart;
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const windowEnd = lastSlot?.date ? parseLocalDate(lastSlot.date) : addDays(fallbackStart, 27);
  const countByDate = new Map<string, number>();
  sortedSlots.forEach((slot) => countByDate.set(slot.date, (countByDate.get(slot.date) ?? 0) + 1));

  const months: { year: number; month: number }[] = [];
  let cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
  const lastMonth = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), 1);
  while (cursor <= lastMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return (
    <aside className={`bm-month-preview ${variant === 'confirm' ? 'confirm' : ''}`}>
      <div className="bm-month-preview-head">
        <CalendarRange size={15} />
        <span>Lịch học theo tháng</span>
      </div>

      {sortedSlots.length === 0 ? (
        <p className="bm-month-empty">Lịch học sẽ hiển thị sau khi bạn chọn giờ.</p>
      ) : (
        <div className="bm-month-list">
          {months.map(({ year, month }) => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
            return (
              <div key={`${year}-${month}`} className="bm-month-grid">
                <div className="bm-month-title">
                  Tháng {month + 1}/{year}
                </div>
                <div className="bm-month-weekdays">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className="bm-month-days">
                  {Array.from({ length: leadingBlanks }, (_, index) => (
                    <span key={`blank-${index}`} className="bm-month-blank" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const date = new Date(year, month, day);
                    const key = dateToYmd(date);
                    const count = countByDate.get(key) ?? 0;
                    const muted = date < windowStart || date > windowEnd;
                    return (
                      <span
                        key={day}
                        className={`bm-month-day ${count > 0 ? 'active' : ''} ${muted ? 'muted' : ''}`}
                        title={count > 0 ? `${day}/${month + 1}: ${count} buổi` : undefined}
                      >
                        {day}
                        {count > 0 && <i />}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function isSlotWithinAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  availabilities: AvailabilitySlot[],
) {
  if (availabilities.length === 0) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins <= startMins) return false;

  // Lấy các khung rảnh của ĐÚNG ngày này, parse về phút và sort theo giờ bắt đầu.
  // Vì onboarding lưu mỗi ô 30' = 1 record, cần MERGE các khung giáp/đè nhau thành
  // dải liên tục trước khi kiểm tra — nếu không, slot vẫn pass khi nó vắt qua
  // các record liền kề nhưng có thể tính sai biên cuối.
  const daySlots = availabilities
    .filter((s) => backendDayToFe(s.dayofweek) === dayOfWeek && s.starttime && s.endtime)
    .map((s) => {
      const [ash, asm] = s.starttime.split(':').map(Number);
      const [aeh, aem] = s.endtime.split(':').map(Number);
      return { start: ash * 60 + (asm || 0), end: aeh * 60 + (aem || 0) };
    })
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  if (daySlots.length === 0) return false;

  const merged: { start: number; end: number }[] = [{ ...daySlots[0] }];
  for (let i = 1; i < daySlots.length; i++) {
    const last = merged[merged.length - 1];
    if (daySlots[i].start <= last.end) {
      last.end = Math.max(last.end, daySlots[i].end);
    } else {
      merged.push({ ...daySlots[i] });
    }
  }

  // Slot [startMins, endMins] phải nằm GỌN trong MỘT dải đã merge — đảm bảo
  // endMins KHÔNG vượt qua biên cuối availability.
  return merged.some((r) => startMins >= r.start && endMins <= r.end);
}

function isScheduleWithinAvailability(schedule: ScheduleSlot[], availabilities: AvailabilitySlot[]) {
  return schedule.every((slot) =>
    isSlotWithinAvailability(slot.dayOfWeek, slot.startTime, slot.endTime, availabilities),
  );
}

function isScheduleStartWithinWindow(schedule: ScheduleSlot[], startDate: string, min: Date, max: Date) {
  const firstDate = getFirstScheduledDate(schedule, startDate);
  return Boolean(firstDate && isDateInRange(firstDate, min, max));
}

function useFormDraft<T>(draftKey: string) {
  const saveDraft = useCallback(
    (data: T) => {
      if (typeof window === 'undefined') return;
      try {
        window.sessionStorage.setItem(draftKey, JSON.stringify(data));
      } catch {
        // Draft persistence is best-effort.
      }
    },
    [draftKey],
  );

  const loadDraft = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Draft persistence is best-effort.
    }
  }, [draftKey]);

  return { saveDraft, loadDraft, clearDraft };
}

function usePromotion(estimatedPrice: number) {
  const [promoResult, setPromoResult] = useState<PromotionValidateResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const validate = useCallback(
    async (code: string) => {
      if (!code) return;
      setPromoLoading(true);
      try {
        const response = await validatePromotion(code, estimatedPrice);
        const result = response.content;
        setPromoResult(result);

        if (!result.valid) {
          setPromoDiscount(0);
          return;
        }

        if ((result.discountType === 'percentage' || result.discountType === 'percent') && result.discountValue) {
          const calculated = estimatedPrice * (result.discountValue / 100);
          setPromoDiscount(result.maxDiscountAmount ? Math.min(calculated, result.maxDiscountAmount) : calculated);
        } else if (result.discountType === 'fixed' && result.discountValue) {
          setPromoDiscount(result.discountValue);
        }
      } catch (error) {
        setPromoResult({
          valid: false,
          message: getApiErrorMessage(error, 'Không thể kiểm tra mã khuyến mãi'),
        });
        setPromoDiscount(0);
      } finally {
        setPromoLoading(false);
      }
    },
    [estimatedPrice],
  );

  const reset = useCallback(() => {
    setPromoResult(null);
    setPromoDiscount(0);
  }, []);

  return { promoResult, promoLoading, promoDiscount, validate, reset };
}

function BookingStepper({ step }: { step: number }) {
  return (
    <div className="bm-stepper">
      {STEPS.map((item, index) => (
        <div
          key={item.key}
          className={`bm-stepper-item ${index === step ? 'active' : ''} ${index < step ? 'completed' : ''}`}
        >
          <div className="bm-stepper-dot">{index < step ? '✓' : index + 1}</div>
          <span className="bm-stepper-label">{item.label}</span>
          {index < STEPS.length - 1 && <div className={`bm-stepper-line ${index < step ? 'completed' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function StepHeading({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="bm-section-heading">
      <span className="bm-heading-icon">{icon}</span>
      <div>
        <span className="bm-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

function StepStudentSubject({
  formData,
  setFormData,
  students,
  loadingStudents,
  availableSubjects,
  subjectGradePrices,
  selectedPrice,
  userRole,
}: StepProps) {
  const selectedStudent = students.find((student) => student.studentId === formData.studentId);
  const selectedPriceFitsStudent = selectedPrice ? isPriceCompatibleWithStudent(selectedPrice, selectedStudent) : false;

  const handleStudentSelect = (student: StudentType) => {
    const currentPrice =
      subjectGradePrices.find((price) => price.id === formData.tutorSubjectGradePriceId) ?? null;
    const price =
      currentPrice && currentPrice.subjectId === formData.subjectId
        ? currentPrice
        : formData.subjectId
          ? resolvePriceForSelection(subjectGradePrices, formData.subjectId, student)
          : null;
    setFormData((draft) => ({
      ...draft,
      studentId: student.studentId,
      tutorSubjectGradePriceId: price?.id ?? null,
      schedule: [],
    }));
  };

  const handleSubjectSelect = (subject: SubjectOption) => {
    const price = subject.price ?? resolvePriceForSelection(subjectGradePrices, subject.id, selectedStudent);
    setFormData((draft) => ({
      ...draft,
      subjectId: subject.id,
      tutorSubjectGradePriceId: price?.id ?? null,
      schedule: [],
    }));
  };

  return (
    <div className="bm-step">
      <StepHeading icon={<GraduationCap size={20} />} eyebrow="Bước 01" title="Chọn môn học và trẻ" />

      <section className="bm-form-section">
        <h4>Môn học muốn đặt</h4>
        {availableSubjects.length === 0 ? (
          <div className="bm-empty-msg">Gia sư này chưa cập nhật môn học.</div>
        ) : (
          <div className="bm-subject-grid">
            {availableSubjects.map((subject) => {
              const selectedPriceForSubject =
                subject.price ?? resolvePriceForSelection(subjectGradePrices, subject.id, selectedStudent);
              const gradeText =
                selectedPriceForSubject?.gradeLevelName ||
                (selectedPriceForSubject?.gradeLevelId ? `Lớp ${selectedPriceForSubject.gradeLevelId}` : '');
              const isSelected = subject.price
                ? formData.tutorSubjectGradePriceId === subject.price.id
                : formData.subjectId === subject.id;

              return (
                <button
                  key={subject.optionKey ?? subject.id}
                  className={`bm-subject-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSubjectSelect(subject)}
                  type="button"
                >
                  <div className="bm-subject-card-head">
                    <span className="bm-subject-icon">
                      <BookOpen size={18} />
                    </span>
                    <div>
                      <strong>{subject.name}</strong>
                      <small>{gradeText || 'Chưa có khối lớp'}</small>
                    </div>
                  </div>

                  <div className="bm-subject-price">
                    <span>Học phí</span>
                    <strong>
                      {selectedPriceForSubject
                        ? `${formatPrice(selectedPriceForSubject.pricePerHour)} / giờ`
                        : 'Chưa phù hợp'}
                    </strong>
                  </div>

                  <div className="bm-subject-setup-grid">
                    <span>
                      <Clock3 size={14} />
                      <b>{formatSessionDuration(selectedPriceForSubject?.durationMinutesPerSession) || '--'}</b>
                      <small>/ buổi</small>
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      <b>{selectedPriceForSubject?.sessionsPerWeek ?? '--'}</b>
                      <small>buổi/tuần</small>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {userRole === 'Parent' && (
        <section className="bm-form-section">
          <h4>Trẻ sẽ tham gia học</h4>
          {loadingStudents ? (
            <div className="bm-loading">Đang tải danh sách học sinh...</div>
          ) : students.length === 0 ? (
            <div className="bm-empty-msg">
              <p>Chưa có hồ sơ học sinh nào.</p>
              <Link href="/parent-portal/student" target="_blank" className="bm-btn-add-student">
                + Thêm hồ sơ học sinh
              </Link>
            </div>
          ) : (
            <div className="bm-student-grid">
              {students.map((student) => (
                <button
                  key={student.studentId}
                  className={`bm-student-card ${formData.studentId === student.studentId ? 'selected' : ''}`}
                  onClick={() => handleStudentSelect(student)}
                  disabled={formData.subjectId === 0}
                  type="button"
                >
                  <span className="bm-student-avatar">
                    {student.avatarURL ? (
                      <Image src={student.avatarURL} alt={student.fullName} width={40} height={40} />
                    ) : (
                      student.fullName.charAt(0)
                    )}
                  </span>
                  <span className="bm-student-info">
                    <span className="bm-student-name">{student.fullName}</span>
                    <span className="bm-student-grade">
                      {student.gradeLevel ? formatGrade(student.gradeLevel) : student.school}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {formData.subjectId !== 0 && selectedStudent && (!selectedPrice || !selectedPriceFitsStudent) && (
        <div className="bm-warning-box">
          <AlertTriangle size={19} />
          <div>
            <strong>Khối lớp chưa phù hợp</strong>
            <p>Hãy chọn cấu hình đúng lớp của học sinh để tiếp tục.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBookingMode({ formData, setFormData, packages }: StepProps) {
  const flexiblePackage = packages.find((pkg) => pkg.isActive && pkg.packageType === 1);
  const fixedPackages = packages.filter((pkg) => pkg.isActive && pkg.packageType === 2);

  useEffect(() => {
    if (formData.bookingMode === 'schedule' && flexiblePackage && formData.packageId !== flexiblePackage.packageId) {
      setFormData((draft) => ({ ...draft, packageId: flexiblePackage.packageId }));
    }
  }, [flexiblePackage, formData.bookingMode, formData.packageId, setFormData]);

  const selectSchedule = () => {
    if (!flexiblePackage) return;
    setFormData((draft) => ({
      ...draft,
      bookingMode: 'schedule',
      packageId: flexiblePackage.packageId,
      schedule: [],
    }));
  };

  const selectPackage = () => {
    if (fixedPackages.length === 0) return;
    setFormData((draft) => ({
      ...draft,
      bookingMode: 'package',
      packageId: null,
      schedule: [],
    }));
  };

  return (
    <div className="bm-step">
      <StepHeading icon={<Route size={20} />} eyebrow="Bước 02" title="Chọn cách đặt lịch" />
      <div className="bm-booking-mode-grid">
        <button
          className={`bm-booking-mode-card ${formData.bookingMode === 'schedule' ? 'selected' : ''} ${
            !flexiblePackage ? 'locked' : ''
          }`}
          onClick={selectSchedule}
          disabled={!flexiblePackage}
          type="button"
        >
          <span className="bm-booking-mode-icon availability">
            <CalendarDays size={20} />
          </span>
          <span className="bm-booking-mode-info">
            <span className="bm-eyebrow">Theo lịch rảnh</span>
            <strong>Tự chọn lịch rảnh</strong>
            <small>Phụ huynh chọn trực tiếp các khung giờ còn trống của gia sư.</small>
          </span>
          <small className="bm-card-action">
            {formData.bookingMode === 'schedule' ? 'Đang chọn' : 'Chọn cách này'}
          </small>
        </button>

        <button
          className={`bm-booking-mode-card ${formData.bookingMode === 'package' ? 'selected' : ''} ${
            fixedPackages.length === 0 ? 'locked' : ''
          }`}
          onClick={selectPackage}
          disabled={fixedPackages.length === 0}
          type="button"
        >
          <span className="bm-booking-mode-icon package">
            <PackageCheck size={20} />
          </span>
          <span className="bm-booking-mode-info">
            <span className="bm-eyebrow">Theo gói cố định</span>
            <strong>Chọn gói cố định</strong>
            <small>
              {fixedPackages.length > 0
                ? `Có ${fixedPackages.length} gói cố định để chọn.`
                : 'Gia sư chưa tạo gói cố định.'}
            </small>
          </span>
          <small className="bm-card-action">{formData.bookingMode === 'package' ? 'Đã chọn' : 'Xem các gói'}</small>
        </button>
      </div>
    </div>
  );
}

function StepTeachingMode({ formData, setFormData, tutorTeachingMode }: StepProps) {
  const lockedMode = useMemo(() => resolveLockedMode(tutorTeachingMode), [tutorTeachingMode]);
  const isLocked = lockedMode !== null;

  const visibleModes = useMemo(() => {
    if (!lockedMode) return TEACHING_MODES;
    return TEACHING_MODES.filter((m) => m.key === lockedMode);
  }, [lockedMode]);

  useEffect(() => {
    if (lockedMode && formData.teachingMode !== lockedMode) {
      setFormData((d) => ({
        ...d,
        teachingMode: lockedMode,
        ...(lockedMode === 'online'
          ? { locationCity: '', locationDistrict: '', locationWard: '', locationDetail: '' }
          : {}),
      }));
    }
  }, [lockedMode, formData.teachingMode, setFormData]);

  const needsLocation = formData.teachingMode === 'offline' || formData.teachingMode === 'hybrid';

  return (
    <div className="bm-step">
      <div className="bm-step-title">Hình thức học</div>

      {isLocked && (
        <div
          className="bm-locked-mode-banner"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(79, 140, 255, 0.10) 0%, rgba(79, 140, 255, 0.04) 100%)',
            border: '1px solid rgba(79, 140, 255, 0.20)',
            borderRadius: 12,
            color: '#1a2238',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <span aria-hidden style={{ fontSize: 16, lineHeight: '20px' }}>
            ℹ️
          </span>
          <span>
            Gia sư này chỉ dạy theo hình thức <b>{lockedMode === 'online' ? 'Online' : 'Tại nhà (Offline)'}</b>. Bạn
            không thể đổi sang hình thức khác.
          </span>
        </div>
      )}

      <div className="bm-teaching-mode-grid" aria-disabled={isLocked || undefined}>
        {visibleModes.map((mode) => (
          <button
            key={mode.key}
            className={`bm-teaching-mode-card ${formData.teachingMode === mode.key ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
            onClick={() => {
              if (isLocked) return;
              setFormData((draft) => ({
                ...draft,
                teachingMode: mode.key,
                ...(mode.key === 'online'
                  ? { locationCity: '', locationDistrict: '', locationWard: '', locationDetail: '' }
                  : {}),
              }));
            }}
            style={isLocked ? { cursor: 'not-allowed', opacity: 0.95 } : undefined}
            type="button"
          >
            <span className="bm-teaching-mode-icon">{mode.icon}</span>
            <span className="bm-teaching-mode-info">
              <span className="bm-teaching-mode-label">{mode.label}</span>
              <span className="bm-teaching-mode-desc">{mode.desc}</span>
            </span>
            {formData.teachingMode === mode.key && <span className="bm-check">✓</span>}
          </button>
        ))}
      </div>

      {needsLocation && (
        <div className="bm-location-section">
          <div className="bm-step-title" style={{ marginTop: 28 }}>
            Địa điểm học <span className="bm-required-badge">Bắt buộc</span>
          </div>
          <div className="bm-location-form">
            <label className="bm-form-group">
              <span className="bm-form-label">Tỉnh / Thành phố *</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: Hồ Chí Minh"
                value={formData.locationCity}
                onChange={(event) => setFormData((draft) => ({ ...draft, locationCity: event.target.value }))}
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Quận / Huyện *</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: Quận 1"
                value={formData.locationDistrict}
                onChange={(event) => setFormData((draft) => ({ ...draft, locationDistrict: event.target.value }))}
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Phường / Xã</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: Phường Bến Nghé"
                value={formData.locationWard}
                onChange={(event) => setFormData((draft) => ({ ...draft, locationWard: event.target.value }))}
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Địa chỉ cụ thể</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: 123 Nguyễn Huệ"
                value={formData.locationDetail}
                onChange={(event) => setFormData((draft) => ({ ...draft, locationDetail: event.target.value }))}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function StepSchedule({
  formData,
  setFormData,
  slotDuration,
  setSlotDuration,
  availabilities,
  packages,
  selectedPrice,
  bookedSlots,
}: StepProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const isChunkAvailable = useCallback(
    (day: number, time: string) => {
      if (availabilities.length === 0) return false;
      const [h, m] = time.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + 30;

      return availabilities.some((slot) => {
        if (backendDayToFe(slot.dayofweek) !== day || !slot.starttime || !slot.endtime) return false;
        const [ash, asm] = slot.starttime.split(':').map(Number);
        const [aeh, aem] = slot.endtime.split(':').map(Number);
        return startMins >= ash * 60 + asm && endMins <= aeh * 60 + aem;
      });
    },
    [availabilities],
  );

  const isChunkBooked = useCallback(
    (day: number, time: string) => {
      const [h, m] = time.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + 30;

      return bookedSlots.some((slot) => {
        if (slot.dayOfWeek !== day) return false;
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        const bookedStart = sh * 60 + sm;
        const bookedEnd = eh * 60 + em;
        return startMins < bookedEnd && endMins > bookedStart;
      });
    },
    [bookedSlots],
  );

  const checkOverlap = useCallback(
    (day: number, start: string, end: string, excludeStartTime?: string) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const nextStart = sh * 60 + sm;
      const nextEnd = eh * 60 + em;

      return formData.schedule.some((slot) => {
        if (slot.dayOfWeek !== day) return false;
        if (excludeStartTime && slot.startTime === excludeStartTime) return false;
        const [ssh, ssm] = slot.startTime.split(':').map(Number);
        const [eeh, eem] = slot.endTime.split(':').map(Number);
        const currentStart = ssh * 60 + ssm;
        const currentEnd = eeh * 60 + eem;
        return nextStart < currentEnd && nextEnd > currentStart;
      });
    },
    [formData.schedule],
  );

  const toggleSlot = (dayOfWeek: number, startTime: string) => {
    const exists = formData.schedule.find((slot) => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime);

    if (exists) {
      setFormData((draft) => ({
        ...draft,
        schedule: draft.schedule.filter((slot) => !(slot.dayOfWeek === dayOfWeek && slot.startTime === startTime)),
      }));
      return;
    }

    const endTime = addHoursToTime(startTime, slotDuration);

    if (checkOverlap(dayOfWeek, startTime, endTime)) {
      setToastMessage('Khung giờ này bị trùng với một lịch học khác bạn đã chọn.');
      return;
    }

    if (!isSlotWithinAvailability(dayOfWeek, startTime, endTime, availabilities)) {
      setToastMessage(`Gia sư không rảnh khung giờ ${startTime}-${endTime} vào ${DAY_NAMES[dayOfWeek]}.`);
      return;
    }

    if (isChunkBooked(dayOfWeek, startTime)) {
      setToastMessage('Khung giờ này đã có lịch đặt. Bạn hãy chọn khung giờ khác.');
      return;
    }

    const maxSlots = selectedPrice?.sessionsPerWeek ?? 1;
    if (formData.bookingMode === 'schedule' && formData.schedule.length >= maxSlots) {
      setToastMessage(`Bạn chỉ cần chọn ${maxSlots} buổi/tuần theo cấu hình gia sư đã thiết lập.`);
      return;
    }

    setFormData((draft) => ({
      ...draft,
      schedule: [...draft.schedule, { dayOfWeek, startTime, endTime }],
    }));
  };

  const isSelected = (day: number, time: string) => {
    const [h, m] = time.split(':').map(Number);
    const cellTime = h * 60 + m;
    return formData.schedule.some((slot) => {
      if (slot.dayOfWeek !== day) return false;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      return cellTime >= sh * 60 + sm && cellTime < eh * 60 + em;
    });
  };

  const isSlotHovered = (day: number, time: string) => {
    if (!hoveredSlot || hoveredSlot.day !== day) return false;
    const [h, m] = time.split(':').map(Number);
    const [hh, hm] = hoveredSlot.time.split(':').map(Number);
    const cellTime = h * 60 + m;
    const hoverStart = hh * 60 + hm;
    const hoverEnd = hoverStart + slotDuration * 60;
    return cellTime >= hoverStart && cellTime < hoverEnd;
  };

  const handleDurationChange = (nextDuration: number) => {
    setSlotDuration(nextDuration);
    setFormData((draft) => {
      const validSlots: ScheduleSlot[] = [];
      let removedCount = 0;

      for (const slot of draft.schedule) {
        const nextEndTime = addHoursToTime(slot.startTime, nextDuration);
        const isAvailable = isSlotWithinAvailability(slot.dayOfWeek, slot.startTime, nextEndTime, availabilities);
        const overlaps = validSlots.some((accepted) => {
          if (accepted.dayOfWeek !== slot.dayOfWeek) return false;
          const [sh, sm] = slot.startTime.split(':').map(Number);
          const [eh, em] = nextEndTime.split(':').map(Number);
          const [ash, asm] = accepted.startTime.split(':').map(Number);
          const [aeh, aem] = accepted.endTime.split(':').map(Number);
          return sh * 60 + sm < aeh * 60 + aem && eh * 60 + em > ash * 60 + asm;
        });

        if (isAvailable && !overlaps) {
          validSlots.push({ ...slot, endTime: nextEndTime });
        } else {
          removedCount++;
        }
      }

      if (removedCount > 0) {
        setToastMessage(`Đã xóa ${removedCount} slot do không còn phù hợp với thời lượng mới.`);
      }

      return { ...draft, schedule: validSlots };
    });
  };

  const expectedWeeklySlots = selectedPrice?.sessionsPerWeek ?? 1;
  const sessionCount = expectedWeeklySlots * 4;
  const fixedPackages = packages.filter((pkg) => pkg.isActive && pkg.packageType === 2);
  const selectedPackage = fixedPackages.find((pkg) => pkg.packageId === formData.packageId);
  const selectedPackageSchedule = selectedPackage
    ? fixedPackageToSchedule(selectedPackage, selectedPrice?.durationMinutesPerSession)
    : [];
  const selectedPackageFitsAvailability =
    selectedPackageSchedule.length > 0 && isScheduleWithinAvailability(selectedPackageSchedule, availabilities);
  const bookingWindow = getBookingStartWindow();
  const minBookingDate = bookingWindow.min;
  const maxBookingDate = bookingWindow.max;
  const weekStart = startOfWeek(parseLocalDate(formData.startDate));
  const visibleDays = WEEK_ORDER.map((_, index) => addDays(weekStart, index));
  const previewSlots = buildCalendarPreviewSlots(formData.schedule, formData.startDate);
  const scheduleChoiceLabel = formData.bookingMode === 'package' ? 'Gói cố định' : 'Tự chọn lịch rảnh';
  const minBookingDateText = formatShortDate(minBookingDate);
  const maxBookingDateText = formatShortDate(maxBookingDate);
  const weekHasBookableDate = (start: Date) =>
    WEEK_ORDER.some((_, index) => isDateInRange(addDays(start, index), minBookingDate, maxBookingDate));
  const weekLockedBySelection = formData.bookingMode === 'schedule' && formData.schedule.length > 0;
  const canGoPrevWeek = !weekLockedBySelection && weekHasBookableDate(addDays(weekStart, -7));
  const canGoNextWeek = !weekLockedBySelection && weekHasBookableDate(addDays(weekStart, 7));

  const shiftWeek = (weekOffset: number) => {
    if (weekLockedBySelection) {
      setToastMessage('Hãy bỏ các buổi đã chọn trước khi đổi sang tuần khác.');
      return;
    }
    const nextStart = addDays(weekStart, weekOffset * 7);
    if (!weekHasBookableDate(nextStart)) {
      setToastMessage(`Chỉ có thể chọn buổi học đầu tiên trong khoảng ${minBookingDateText} - ${maxBookingDateText}.`);
      return;
    }
    setFormData((draft) => ({ ...draft, startDate: dateToYmd(nextStart) }));
  };

  const selectPackageStartDate = (date: Date) => {
    if (!selectedPackage || !selectedPackageFitsAvailability) {
      setToastMessage('Gói này không còn khớp với lịch rảnh hiện tại của gia sư.');
      return;
    }

    if (!isDateInRange(date, minBookingDate, maxBookingDate)) {
      setToastMessage(`Chỉ có thể chọn buổi học đầu tiên trong khoảng ${minBookingDateText} - ${maxBookingDateText}.`);
      return;
    }

    setFormData((draft) => ({
      ...draft,
      startDate: dateToYmd(date),
      schedule: selectedPackageSchedule,
    }));
  };

  const removeCoveringSlot = (day: number, time: string) => {
    const [h, m] = time.split(':').map(Number);
    const cellTime = h * 60 + m;
    setFormData((draft) => ({
      ...draft,
      schedule: draft.schedule.filter((slot) => {
        if (slot.dayOfWeek !== day) return true;
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        return !(cellTime >= sh * 60 + sm && cellTime < eh * 60 + em);
      }),
    }));
  };

  const renderCalendarGrid = (readOnly = false) => (
    <section className="bm-calendar-section">
      <div className="bm-calendar-heading">
        <div>
          <span className="bm-eyebrow">Lịch rảnh của gia sư</span>
          <h3>{scheduleChoiceLabel}</h3>
        </div>
        <div className="bm-calendar-controls">
          <button type="button" onClick={() => shiftWeek(-1)} disabled={!canGoPrevWeek} aria-label="Tuần trước">
            <ChevronLeft size={18} />
          </button>
          <strong>
            {formatShortDate(visibleDays[0])} - {formatShortDate(visibleDays[6])}
          </strong>
          <button type="button" onClick={() => shiftWeek(1)} disabled={!canGoNextWeek} aria-label="Tuần sau">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bm-legend">
        <span>
          <i className="available" />
          Lịch trống
        </span>
        <span>
          <i className="selected" />
          Đã chọn
        </span>
        <span>
          <i className="unavailable" />
          Không mở lịch
        </span>
      </div>

      <div className="bm-calendar-scroller">
        <div className="bm-calendar-grid">
          <div className="bm-calendar-cell bm-time-head">Giờ học</div>
          {visibleDays.map((date, index) => (
            <div key={dateToYmd(date)} className="bm-calendar-cell bm-day-head">
              <strong>{DAY_NAMES[WEEK_ORDER[index]]}</strong>
              <span>{formatShortDate(date)}</span>
            </div>
          ))}

          {TIME_SLOTS.map((time) => (
            <div className="bm-calendar-row" key={time}>
              <div className="bm-calendar-cell bm-time-cell">{time}</div>
              {WEEK_ORDER.map((day) => {
                const endTime = addHoursToTime(time, slotDuration);
                const dayIndex = WEEK_ORDER.indexOf(day);
                const slotDate = visibleDays[dayIndex] ?? weekStart;
                const isBookableDate = isDateInRange(slotDate, minBookingDate, maxBookingDate);
                const dateKey = dateToYmd(slotDate);
                const selectedByPattern = isSelected(day, time);
                const selectedByDate = previewSlots.some((slot) => {
                  if (slot.date !== dateKey) return false;
                  const [sh, sm] = slot.startTime.split(':').map(Number);
                  const [eh, em] = slot.endTime.split(':').map(Number);
                  const [ch, cm] = time.split(':').map(Number);
                  const cellTime = ch * 60 + cm;
                  return cellTime >= sh * 60 + sm && cellTime < eh * 60 + em;
                });
                const selected = formData.bookingMode === 'package' ? selectedByDate : selectedByPattern;
                const isBooked = isChunkBooked(day, time);
                const fitsAvailability = isSlotWithinAvailability(day, time, endTime, availabilities);
                const overlap = checkOverlap(day, time, endTime);
                const isFull = formData.bookingMode === 'schedule' && formData.schedule.length >= expectedWeeklySlots;
                const packageCell = selectedPackageSchedule.some((slot) => {
                  if (slot.dayOfWeek !== day) return false;
                  const [sh, sm] = slot.startTime.split(':').map(Number);
                  const [eh, em] = slot.endTime.split(':').map(Number);
                  const [ch, cm] = time.split(':').map(Number);
                  const cellTime = ch * 60 + cm;
                  return cellTime >= sh * 60 + sm && cellTime < eh * 60 + em;
                });
                const canPickPackage =
                  formData.bookingMode === 'package' &&
                  Boolean(selectedPackage) &&
                  packageCell &&
                  isBookableDate &&
                  selectedPackageFitsAvailability;
                const canPick =
                  formData.bookingMode === 'schedule'
                    ? !readOnly &&
                      (selected || (isBookableDate && fitsAvailability && !isBooked && !overlap && !isFull))
                    : canPickPackage;
                const showAvailable = canPick && !selected && formData.bookingMode === 'schedule';
                const showPackagePick = canPickPackage && !selected;

                return (
                  <div key={`${day}-${time}`} className="bm-calendar-cell bm-slot-cell">
                    <button
                      type="button"
                      className={`bm-slot-button ${
                        selected ? 'selected' : showAvailable || showPackagePick ? 'available' : 'unavailable'
                      } ${isSlotHovered(day, time) && showAvailable ? 'hovering' : ''}`}
                      disabled={!canPick}
                      onClick={() => {
                        if (formData.bookingMode === 'package') {
                          selectPackageStartDate(slotDate);
                          return;
                        }
                        selected ? removeCoveringSlot(day, time) : toggleSlot(day, time);
                      }}
                      onMouseEnter={() => setHoveredSlot({ day, time })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      aria-label={`${DAY_NAMES[day]} lúc ${time}`}
                    >
                      {selected ? (
                        <>
                          <Check size={13} />
                          Đã chọn
                        </>
                      ) : showAvailable ? (
                        '+ Chọn'
                      ) : showPackagePick ? (
                        '+ Bắt đầu'
                      ) : (
                        '—'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  if (formData.bookingMode === 'package') {
    return (
      <div className="bm-step">
        {toastMessage && (
          <div className="bm-toast-warning">
            <span>{toastMessage}</span>
            <button className="bm-toast-close" onClick={() => setToastMessage(null)} type="button">
              ✕
            </button>
          </div>
        )}

        <StepHeading
          icon={<CalendarDays size={20} />}
          eyebrow="Bước 03"
          title={selectedPackage ? 'Chọn lịch học' : 'Chọn gói cố định'}
        />

        <section className="bm-package-pick-section">
          {fixedPackages.length === 0 ? (
            <div className="bm-warning-box">
              <AlertTriangle size={18} />
              <strong>Gia sư chưa tạo gói cố định nào.</strong>
            </div>
          ) : (
            <div className="bm-package-grid">
              {fixedPackages.map((pkg) => {
                const packageSchedule = fixedPackageToSchedule(pkg, selectedPrice?.durationMinutesPerSession);
                const packageFitsAvailability =
                  packageSchedule.length > 0 && isScheduleWithinAvailability(packageSchedule, availabilities);
                const isPicked = formData.packageId === pkg.packageId;
                return (
                  <button
                    key={pkg.packageId}
                    className={`bm-package-card ${isPicked ? 'selected' : ''} ${
                      packageFitsAvailability ? '' : 'locked'
                    }`}
                    onClick={() => {
                      if (!packageFitsAvailability) {
                        setToastMessage('Gói này không còn khớp với lịch rảnh hiện tại của gia sư.');
                        return;
                      }
                      setFormData((draft) => ({
                        ...draft,
                        packageId: pkg.packageId,
                        schedule: [],
                      }));
                    }}
                    type="button"
                    aria-disabled={!packageFitsAvailability}
                  >
                    <span className="bm-combo-icon">
                      <Repeat2 size={18} />
                    </span>
                    <span className="bm-eyebrow">Gói cố định</span>
                    <strong>{pkg.name}</strong>
                    <div className="bm-package-meta">
                      <span>
                        <BookOpen size={14} />
                        {packageSchedule.length || selectedPrice?.sessionsPerWeek || 0} buổi/tuần
                      </span>
                      <span>
                        <Clock3 size={14} />
                        {formatSessionDuration(selectedPrice?.durationMinutesPerSession)} / buổi
                      </span>
                    </div>
                    <small>
                      {packageFitsAvailability ? (isPicked ? 'Đã chọn gói' : 'Chọn gói') : 'Không khả dụng'}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedPackage && (
          <>
            <div className="bm-schedule-layout">
              {renderCalendarGrid(false)}
              <MonthSchedulePreview slots={previewSlots} startDate={formData.startDate} />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bm-step">
      {toastMessage && (
        <div className="bm-toast-warning">
          <span>{toastMessage}</span>
          <button className="bm-toast-close" onClick={() => setToastMessage(null)} type="button">
            ✕
          </button>
        </div>
      )}

      <StepHeading icon={<CalendarDays size={20} />} eyebrow="Bước 03" title="Chọn lịch học" />

      <section className="bm-duration-info">
        <Clock3 size={15} />
        <span>
          {selectedPrice?.subjectName || 'Buổi học'}:{' '}
          <strong>{formatSessionDuration(selectedPrice?.durationMinutesPerSession)}/buổi</strong> ·{' '}
          <strong>{expectedWeeklySlots} buổi/tuần</strong>. Chọn buổi học đầu tiên để bắt đầu hành trình học cùng gia
          sư.
        </span>
      </section>

      {availabilities.length === 0 && (
        <div className="bm-toast-warning" style={{ marginBottom: 16 }}>
          <span>Gia sư này chưa thiết lập lịch rảnh. Bạn tạm thời chưa thể đặt lịch.</span>
        </div>
      )}

      <div className="bm-schedule-layout">
        {renderCalendarGrid(false)}
        <MonthSchedulePreview slots={previewSlots} startDate={formData.startDate} />
      </div>
    </div>
  );
}

function StepReview({
  formData,
  setFormData,
  hourlyRate,
  students,
  availableSubjects,
  selectedPrice,
  packages,
}: StepProps) {
  const student = students.find((item) => item.studentId === formData.studentId);
  const subject =
    availableSubjects.find((item) => item.price?.id === formData.tutorSubjectGradePriceId) ??
    availableSubjects.find((item) => item.id === formData.subjectId);
  const teachingModeInfo = TEACHING_MODES.find((item) => item.key === formData.teachingMode);
  const selectedPackage = packages.find((pkg) => pkg.packageId === formData.packageId);
  const previewSlots = buildCalendarPreviewSlots(formData.schedule, formData.startDate);
  const totalSessions = previewSlots.length;
  const durationHours =
    (selectedPrice?.durationMinutesPerSession ?? Math.round(calcTotalHoursFromSchedule(formData.schedule) * 60)) / 60;
  const effectiveHourlyRate = selectedPrice?.pricePerHour ?? hourlyRate;
  const totalHours = totalSessions * durationHours;
  const estimatedPrice = effectiveHourlyRate * totalHours;
  const { promoResult, promoLoading, promoDiscount, validate, reset } = usePromotion(estimatedPrice);
  const baseAmount = estimatedPrice - promoDiscount;
  const serviceFee = Math.round(baseAmount * 0.05);
  const finalEstimate = Math.max(0, baseAmount + serviceFee);
  const durationLabel = formatSessionDuration(selectedPrice?.durationMinutesPerSession);
  const totalHoursLabel = Number.isInteger(totalHours) ? `${totalHours}` : totalHours.toFixed(1).replace('.', ',');
  const studentName = student?.fullName || 'Học sinh hiện tại';
  const studentInitials = studentName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(-2)
    .toUpperCase();
  const scheduleChoiceLabel =
    formData.bookingMode === 'package'
      ? `Gói cố định${selectedPackage?.name ? ` · ${selectedPackage.name}` : ''}`
      : 'Theo lịch rảnh';
  const subjectGradeLabel =
    selectedPrice?.gradeLevelName || (selectedPrice?.gradeLevelId ? `Lớp ${selectedPrice.gradeLevelId}` : '');

  return (
    <div className="bm-step">
      <StepHeading icon={<ShieldCheck size={20} />} eyebrow="Bước 04" title="Xác nhận đặt lịch" />

      <div className="bm-confirm-layout">
        <div className="bm-confirm-main">
          <section className="bm-review-hero">
            <span className="bm-review-hero-avatar">{studentInitials}</span>
            <div className="bm-review-hero-content">
              <span className="bm-eyebrow">Tóm tắt đặt lịch</span>
              <h3>
                {subject?.name || 'Môn học'}
                {subjectGradeLabel ? ` · ${subjectGradeLabel}` : ''} · {studentName}
              </h3>
              <p>
                {scheduleChoiceLabel}
                {teachingModeInfo?.label ? ` · ${teachingModeInfo.label}` : ''}
              </p>
            </div>
            <div className="bm-confirm-quick-facts">
              <span>
                <b>{totalSessions}</b>
                <small>buổi</small>
              </span>
              <span>
                <b>{durationLabel || '--'}</b>
                <small>/ buổi</small>
              </span>
              <span>
                <b>{totalHoursLabel}</b>
                <small>giờ</small>
              </span>
            </div>
          </section>

          <MonthSchedulePreview slots={previewSlots} startDate={formData.startDate} variant="confirm" />
        </div>

        <aside className="bm-price-summary">
          <div className="bm-price-summary-head">
            <span className="bm-eyebrow">Học phí dự kiến</span>
            <strong>{formatPrice(finalEstimate)}</strong>
            <small>Tổng thanh toán</small>
          </div>

          <div className="bm-price-line">
            <span>Học phí · {totalHoursLabel} giờ</span>
            <strong>{formatPrice(estimatedPrice)}</strong>
          </div>
          {promoResult?.valid === true && promoDiscount > 0 && (
            <div className="bm-price-line discount">
              <span>Mã khuyến mãi ({promoResult?.code})</span>
              <strong>-{formatPrice(promoDiscount)}</strong>
            </div>
          )}
          <div className="bm-price-line">
            <span>Phí dịch vụ (5%)</span>
            <strong>{formatPrice(serviceFee)}</strong>
          </div>

          <div className="bm-promo-compact">
            <span className="bm-eyebrow">Mã khuyến mãi</span>
            <div className="bm-promo-input-row">
              <input
                type="text"
                placeholder="Nhập mã"
                value={formData.promotionCode}
                onChange={(event) => {
                  setFormData((draft) => ({ ...draft, promotionCode: event.target.value.toUpperCase() }));
                  reset();
                }}
                className="bm-promo-input"
              />
              <button
                className="bm-promo-btn"
                onClick={() => validate(formData.promotionCode)}
                disabled={!formData.promotionCode || promoLoading}
                type="button"
              >
                {promoLoading ? '...' : 'Áp dụng'}
              </button>
            </div>
            {promoResult?.valid === true && (
              <div className="bm-promo-msg valid">
                ✓ {promoResult?.message || `Mã hợp lệ! Giảm ${formatPrice(promoDiscount)}`}
              </div>
            )}
            {promoResult?.valid === false && (
              <div className="bm-promo-msg invalid">✕ {promoResult?.message || 'Mã không hợp lệ'}</div>
            )}
          </div>

          <p className="bm-price-summary-note">
            <ShieldCheck size={14} />
            Thanh toán sau khi gia sư xác nhận lịch học.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function BookingModal({
  isOpen,
  onClose,
  tutorName,
  tutorId,
  hourlyRate,
  subjects,
  subjectGradePrices = [],
  packages = [],
  availabilities,
  tutorTeachingMode,
}: BookingModalProps) {
  const userRole = getCurrentUserRole();
  const currentUserId = getUserIdFromToken();
  const lockedMode = resolveLockedMode(tutorTeachingMode);

  const defaultFormData: BookingFormData = useMemo(
    () => ({
      studentId: userRole === 'Student' ? currentUserId || '' : '',
      subjectId: 0,
      tutorSubjectGradePriceId: null,
      bookingMode: 'schedule',
      packageId: packages.find((pkg) => pkg.isActive && pkg.packageType === 1)?.packageId ?? null,
      teachingMode: lockedMode ?? 'online',
      startDate: dateToYmd(new Date()),
      schedule: [],
      locationCity: '',
      locationDistrict: '',
      locationWard: '',
      locationDetail: '',
      promotionCode: '',
    }),
    [currentUserId, userRole, lockedMode, packages],
  );

  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<number | null>(null);
  const [slotDuration, setSlotDuration] = useState(2);
  const [bookedSlots, setBookedSlots] = useState<ScheduleSlot[]>([]);
  const [formData, setFormData] = useState<BookingFormData>(defaultFormData);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
    formData: BookingFormData;
    step: number;
    slotDuration: number;
  }>(`draft_booking_${currentUserId || 'anon'}_${tutorId}`);

  const activeSubjectGradePrices = useMemo(
    () => subjectGradePrices.filter((price) => price.isActive),
    [subjectGradePrices],
  );

  const selectedPrice = useMemo(
    () => activeSubjectGradePrices.find((price) => price.id === formData.tutorSubjectGradePriceId) ?? null,
    [activeSubjectGradePrices, formData.tutorSubjectGradePriceId],
  );

  const availableSubjects = useMemo(() => {
    if (activeSubjectGradePrices.length === 0) {
      return SUBJECT_MAPPING.filter((subject) =>
        subjects.some((tutorSubject) => tutorSubject.subjectId === subject.id),
      );
    }

    return [...activeSubjectGradePrices]
      .sort((a, b) => {
        const subjectName = (a.subjectName || '').localeCompare(b.subjectName || '', 'vi');
        if (subjectName !== 0) return subjectName;
        return (getPriceGradeNumber(a) ?? a.gradeLevelId) - (getPriceGradeNumber(b) ?? b.gradeLevelId);
      })
      .map((price) => {
        const fallback = SUBJECT_MAPPING.find((subject) => subject.id === price.subjectId);
        return {
          id: price.subjectId,
          optionKey: `price_${price.id}`,
          name: price.subjectName || fallback?.name || `Môn ${price.subjectId}`,
          price,
          gradePrices: [price],
        };
      });
  }, [activeSubjectGradePrices, subjects]);

  useEffect(() => {
    if (!formData.tutorSubjectGradePriceId) return;
    const stillActive = activeSubjectGradePrices.some((price) => price.id === formData.tutorSubjectGradePriceId);
    if (stillActive) return;
    setFormData((draft) => ({
      ...draft,
      subjectId: 0,
      tutorSubjectGradePriceId: null,
      schedule: [],
    }));
  }, [activeSubjectGradePrices, formData.tutorSubjectGradePriceId]);

  useEffect(() => {
    if (!formData.subjectId || formData.tutorSubjectGradePriceId) return;
    const matchingOptions = activeSubjectGradePrices.filter((price) => price.subjectId === formData.subjectId);
    if (matchingOptions.length !== 1) return;
    const student = students.find((item) => item.studentId === formData.studentId);
    if (student && !isPriceCompatibleWithStudent(matchingOptions[0], student)) return;
    setFormData((draft) => ({ ...draft, tutorSubjectGradePriceId: matchingOptions[0].id }));
  }, [activeSubjectGradePrices, formData.studentId, formData.subjectId, formData.tutorSubjectGradePriceId, students]);

  const selectedStudentForValidation = students.find((item) => item.studentId === formData.studentId);
  const selectedPriceFitsStudent =
    selectedPrice != null && isPriceCompatibleWithStudent(selectedPrice, selectedStudentForValidation);

  useEffect(() => {
    if (!isOpen || userRole !== 'Student') return;
    getMyLinkStatus()
      .then((response) => {
        const studentId = response.content.studentProfile?.studentId;
        if (studentId) {
          if (response.content.studentProfile) {
            setStudents([response.content.studentProfile]);
          }
          setFormData((draft) => ({ ...draft, studentId }));
        }
      })
      .catch(() => {
        // Same as Vite: link status is helpful, but not a modal blocker.
      });
  }, [isOpen, userRole]);

  useEffect(() => {
    if (!isOpen || userRole !== 'Parent') return;

    setLoadingStudents(true);
    getStudents()
      .then((response) => setStudents(response.content || []))
      .catch((error) => {
        setStudents([]);
        setSubmitError(getApiErrorMessage(error, 'Không thể tải danh sách học sinh'));
      })
      .finally(() => setLoadingStudents(false));
  }, [isOpen, userRole]);

  useEffect(() => {
    if (!selectedPrice) return;
    setSlotDuration(selectedPrice.durationMinutesPerSession / 60);
  }, [selectedPrice]);

  useEffect(() => {
    if (!isOpen || !formData.startDate) return;
    let cancelled = false;

    getTutorBookedSlots(tutorId, formData.startDate)
      .then((response) => {
        if (cancelled) return;
        setBookedSlots(
          (response.content || []).map((slot: ScheduleItemPayload) => ({
            dayOfWeek: backendDayToFe(slot.dayOfWeek),
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setBookedSlots([]);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.startDate, isOpen, tutorId]);

  useEffect(() => {
    if (isOpen) {
      const draft = loadDraft();
      if (draft) {
        const restored = { ...defaultFormData, ...(draft.formData || {}) };
        const { min, max } = getBookingStartWindow();
        if (restored.startDate) {
          restored.startDate = dateToYmd(clampDateToWindow(parseLocalDate(restored.startDate), min, max));
        }
        if (restored.bookingMode === 'schedule' && !restored.packageId) {
          restored.packageId = defaultFormData.packageId;
        }
        setFormData(lockedMode ? { ...restored, teachingMode: lockedMode } : restored);
        setStep(draft.step || 0);
        setSlotDuration(draft.slotDuration || 2);
      } else {
        setFormData(defaultFormData);
      }
    } else {
      setStep(0);
      setSubmitError(null);
      setBookingSuccess(false);
      setSuccessBookingId(null);
    }
  }, [defaultFormData, isOpen, loadDraft]);

  useEffect(() => {
    if (isOpen && !bookingSuccess) {
      saveDraft({ formData, step, slotDuration });
    }
  }, [bookingSuccess, formData, isOpen, saveDraft, slotDuration, step]);

  useEffect(() => {
    if (!submitError) return;
    const timer = window.setTimeout(() => setSubmitError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [submitError]);

  if (!isOpen) return null;

  const bookingWindow = getBookingStartWindow();
  const scheduleStartsInWindow = isScheduleStartWithinWindow(
    formData.schedule,
    formData.startDate,
    bookingWindow.min,
    bookingWindow.max,
  );
  const scheduleFitsAvailability = isScheduleWithinAvailability(formData.schedule, availabilities || []);

  const canNext = () => {
    switch (step) {
      case 0:
        if (userRole === 'Student') {
          return formData.subjectId !== 0 && !!formData.studentId && !!formData.tutorSubjectGradePriceId && selectedPriceFitsStudent;
        }
        return formData.studentId !== '' && formData.subjectId !== 0 && !!formData.tutorSubjectGradePriceId && selectedPriceFitsStudent;
      case 1:
        if (formData.bookingMode === 'schedule') return !!formData.packageId;
        return packages.some((pkg) => pkg.isActive && pkg.packageType === 2);
      case 2:
        if (!selectedPrice || !formData.packageId) return false;
        if (formData.bookingMode === 'schedule') {
          return (
            formData.schedule.length === selectedPrice.sessionsPerWeek &&
            scheduleStartsInWindow &&
            scheduleFitsAvailability
          );
        }
        return formData.schedule.length > 0 && scheduleStartsInWindow && scheduleFitsAvailability;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canNext()) {
      if (step === 0) {
        if (formData.studentId && formData.subjectId && formData.tutorSubjectGradePriceId && !selectedPriceFitsStudent) {
          toast.warning('Cấu hình môn học chưa phù hợp với khối lớp của học sinh.');
          return;
        }
        if (userRole === 'Student') {
          toast.warning(
            formData.studentId
              ? 'Vui lòng chọn môn học trước khi tiếp tục.'
              : 'Tài khoản học sinh chưa liên kết hồ sơ.',
          );
        } else if (!formData.studentId) {
          toast.warning('Vui lòng chọn học sinh trước khi tiếp tục.');
        } else {
          toast.warning('Vui lòng chọn môn học trước khi tiếp tục.');
        }
      } else if (step === 1) {
        toast.warning('Vui lòng chọn cách đặt lịch phù hợp trước khi tiếp tục.');
      } else if (step === 2) {
        if (formData.schedule.length > 0 && !scheduleStartsInWindow) {
          toast.warning('Buổi học đầu tiên chỉ được chọn trong khoảng cho phép hiện tại.');
        } else if (formData.schedule.length > 0 && !scheduleFitsAvailability) {
          toast.warning('Lịch đã chọn không còn khớp với lịch rảnh hiện tại của gia sư.');
        } else {
          toast.warning('Vui lòng chọn đủ lịch học theo cấu hình của gia sư.');
        }
      }
      return;
    }
    setStep((current) => current + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!selectedPrice || !formData.packageId) {
        setSubmitError('Thiếu cấu hình gói hoặc giá theo môn/lớp. Vui lòng chọn lại môn học.');
        return;
      }

      if (!scheduleStartsInWindow) {
        setSubmitError('Buổi học đầu tiên chỉ được chọn trong khoảng cho phép hiện tại.');
        return;
      }

      if (!scheduleFitsAvailability) {
        setSubmitError('Lịch đã chọn không còn khớp với lịch rảnh hiện tại của gia sư.');
        return;
      }

      const recurringSlots = buildFlexibleSlots(formData.schedule, formData.startDate);
      const flexibleSlots = formData.bookingMode === 'schedule' ? recurringSlots : undefined;
      const totalSessions = recurringSlots.length;
      const firstLessonDate = getFirstScheduledDate(formData.schedule, formData.startDate);
      const payloadStartDate = firstLessonDate ? dateToYmd(firstLessonDate) : normalizeDateInput(formData.startDate);

      const payload: CreateBookingPayload = {
        studentId: formData.studentId || undefined,
        tutorId,
        subjectId: formData.subjectId || undefined,
        tutorSubjectGradePriceId: selectedPrice.id,
        packageId: formData.packageId,
        totalSessions,
        startDate: toDateTimeLocal(payloadStartDate, '00:00'),
        schedule: formData.schedule.map((slot) => ({
          dayOfWeek: feDayToIso(slot.dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        flexibleSlots,
        locationCity: formData.locationCity || undefined,
        locationDistrict: formData.locationDistrict || undefined,
        locationWard: formData.locationWard || undefined,
        locationDetail: formData.locationDetail || undefined,
        promotionCode: formData.promotionCode || undefined,
      };

      const response = await createBooking(payload);
      setSuccessBookingId(response.content?.bookingId || null);
      setBookingSuccess(true);
      clearDraft();
      window.setTimeout(onClose, 5000);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Có lỗi xảy ra khi tạo booking. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const stepProps: StepProps = {
    formData,
    setFormData,
    hourlyRate,
    students,
    loadingStudents,
    availableSubjects,
    subjectGradePrices: activeSubjectGradePrices,
    packages,
    selectedPrice,
    bookedSlots,
    availabilities: availabilities || [],
    slotDuration,
    setSlotDuration,
    userRole,
    tutorTeachingMode,
  };

  return (
    <div className="bm-overlay" onClick={onClose}>
      <div className="bm-modal" onClick={(event) => event.stopPropagation()}>
        {bookingSuccess && (
          <div className="bm-success-overlay">
            <div className="bm-success-content">
              <div className="bm-success-icon-wrap">
                <div className="bm-success-icon">
                  <svg className="bm-success-checkmark" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </div>
              </div>
              <h3 className="bm-success-title">Đặt lịch thành công!</h3>
              <p className="bm-success-desc">
                Yêu cầu booking của bạn đã được gửi đến <strong>{tutorName}</strong>. Gia sư sẽ xác nhận trong thời gian
                sớm nhất.
              </p>
              {successBookingId && (
                <div className="bm-success-booking-id">
                  <span>Mã booking</span>
                  <strong>#{successBookingId}</strong>
                </div>
              )}
              <div className="bm-success-steps">
                <div className="bm-success-step is-active">
                  <strong>1</strong>
                  <span>Gia sư xem xét yêu cầu</span>
                </div>
                <div className="bm-success-step">
                  <strong>2</strong>
                  <span>Xác nhận &amp; thanh toán</span>
                </div>
                <div className="bm-success-step">
                  <strong>3</strong>
                  <span>Bắt đầu học</span>
                </div>
              </div>
              <button className="bm-success-close-btn" onClick={onClose} type="button">
                Đóng
              </button>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bm-toast-error">
            <div className="bm-toast-error-icon">✕</div>
            <div className="bm-toast-error-content">
              <div className="bm-toast-error-title">Đặt lịch thất bại</div>
              <div className="bm-toast-error-msg">{submitError}</div>
            </div>
            <button className="bm-toast-error-close" onClick={() => setSubmitError(null)} type="button">
              ✕
            </button>
          </div>
        )}

        <div className="bm-header">
          <div className="bm-header-info">
            <h2 className="bm-title">Đặt lịch học</h2>
            <p className="bm-subtitle">với {tutorName}</p>
          </div>
          <button className="bm-close" onClick={onClose} type="button" aria-label="Đóng modal">
            <X size={24} />✕
          </button>
        </div>

        <BookingStepper step={step} />

        <div className="bm-body">
          {step === 0 && <StepStudentSubject {...stepProps} />}
          {step === 1 && <StepBookingMode {...stepProps} />}
          {step === 2 && <StepSchedule {...stepProps} />}
          {step === 3 && <StepReview {...stepProps} />}
        </div>

        <div className="bm-footer">
          {step === 0 && (
            <button className="bm-btn-back" disabled type="button">
              <ArrowLeft size={16} />
              Quay lại
            </button>
          )}
          {step > 0 && (
            <button
              className="bm-btn-back"
              onClick={() => setStep((current) => current - 1)}
              disabled={submitting}
              type="button"
            >
              ← Quay lại
            </button>
          )}
          <div className="bm-footer-right">
            {step < STEPS.length - 1 ? (
              <button className="bm-btn-next" onClick={handleNext} type="button">
                Tiếp theo →
              </button>
            ) : (
              <button className="bm-btn-submit" onClick={handleSubmit} disabled={submitting} type="button">
                {submitting ? 'Đang xử lý...' : 'Gửi yêu cầu →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
