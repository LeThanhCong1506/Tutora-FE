'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { AvailabilitySlot, SubjectInfo } from '@/services/tutorDetail.types';
import {
  createBooking,
  validatePromotion,
  type CreateBookingPayload,
  type PromotionValidateResult,
} from '@/services/booking.client';
import {
  getApiErrorMessage,
  getCurrentUserRole,
  getUserIdFromToken,
} from '@/services/auth.client';
import { getMyLinkStatus, getStudents, type StudentType } from '@/services/student.client';

type ScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type SubjectOption = {
  id: number;
  name: string;
};

type BookingFormData = {
  studentId: string;
  subjectId: number;
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
  { key: 'mode', label: 'Hình thức' },
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

function isSlotWithinAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  availabilities: AvailabilitySlot[]
) {
  if (availabilities.length === 0) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  for (let current = startMins; current < endMins; current += 30) {
    const chunkStart = current;
    const chunkEnd = current + 30;
    const isChunkCovered = availabilities.some((slot) => {
      if (slot.dayofweek !== dayOfWeek || !slot.starttime || !slot.endtime) return false;
      const [ash, asm] = slot.starttime.split(':').map(Number);
      const [aeh, aem] = slot.endtime.split(':').map(Number);
      const availabilityStart = ash * 60 + (asm || 0);
      const availabilityEnd = aeh * 60 + (aem || 0);
      return chunkStart >= availabilityStart && chunkEnd <= availabilityEnd;
    });

    if (!isChunkCovered) return false;
  }

  return true;
}

function useFormDraft<T>(draftKey: string) {
  const saveDraft = useCallback((data: T) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(data));
    } catch {
      // Draft persistence is best-effort.
    }
  }, [draftKey]);

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
          setPromoDiscount(
            result.maxDiscountAmount ? Math.min(calculated, result.maxDiscountAmount) : calculated
          );
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
    [estimatedPrice]
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
          {index < STEPS.length - 1 && (
            <div className={`bm-stepper-line ${index < step ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StepStudentSubject({
  formData,
  setFormData,
  students,
  loadingStudents,
  availableSubjects,
  userRole,
}: StepProps) {
  return (
    <div className="bm-step">
      {userRole === 'Parent' && (
        <>
          <div className="bm-step-title">Chọn học sinh</div>
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
                  onClick={() => setFormData((draft) => ({ ...draft, studentId: student.studentId }))}
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
                  {formData.studentId === student.studentId && <span className="bm-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="bm-step-title" style={{ marginTop: userRole === 'Parent' ? 24 : 0 }}>
        Chọn môn học
      </div>
      {availableSubjects.length === 0 ? (
        <div className="bm-empty-msg">Gia sư này chưa cập nhật môn học.</div>
      ) : (
        <div className="bm-subject-grid">
          {availableSubjects.map((subject) => (
            <button
              key={subject.id}
              className={`bm-subject-btn ${formData.subjectId === subject.id ? 'selected' : ''}`}
              onClick={() => setFormData((draft) => ({ ...draft, subjectId: subject.id }))}
              type="button"
            >
              {subject.name}
            </button>
          ))}
        </div>
      )}
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
          <span aria-hidden style={{ fontSize: 16, lineHeight: '20px' }}>ℹ️</span>
          <span>
            Gia sư này chỉ dạy theo hình thức{' '}
            <b>{lockedMode === 'online' ? 'Online' : 'Tại nhà (Offline)'}</b>. Bạn không thể đổi sang hình thức khác.
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
                onChange={(event) =>
                  setFormData((draft) => ({ ...draft, locationCity: event.target.value }))
                }
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Quận / Huyện *</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: Quận 1"
                value={formData.locationDistrict}
                onChange={(event) =>
                  setFormData((draft) => ({ ...draft, locationDistrict: event.target.value }))
                }
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Phường / Xã</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: Phường Bến Nghé"
                value={formData.locationWard}
                onChange={(event) =>
                  setFormData((draft) => ({ ...draft, locationWard: event.target.value }))
                }
              />
            </label>
            <label className="bm-form-group">
              <span className="bm-form-label">Địa chỉ cụ thể</span>
              <input
                type="text"
                className="bm-form-input"
                placeholder="VD: 123 Nguyễn Huệ"
                value={formData.locationDetail}
                onChange={(event) =>
                  setFormData((draft) => ({ ...draft, locationDetail: event.target.value }))
                }
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
        if (slot.dayofweek !== day || !slot.starttime || !slot.endtime) return false;
        const [ash, asm] = slot.starttime.split(':').map(Number);
        const [aeh, aem] = slot.endtime.split(':').map(Number);
        return startMins >= ash * 60 + asm && endMins <= aeh * 60 + aem;
      });
    },
    [availabilities]
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
    [formData.schedule]
  );

  const toggleSlot = (dayOfWeek: number, startTime: string) => {
    const exists = formData.schedule.find(
      (slot) => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime
    );

    if (exists) {
      setFormData((draft) => ({
        ...draft,
        schedule: draft.schedule.filter(
          (slot) => !(slot.dayOfWeek === dayOfWeek && slot.startTime === startTime)
        ),
      }));
      return;
    }

    const endTime = addHoursToTime(startTime, slotDuration);

    if (checkOverlap(dayOfWeek, startTime, endTime)) {
      setToastMessage('Khung giờ này bị trùng với một lịch học khác bạn đã chọn.');
      return;
    }

    if (!isSlotWithinAvailability(dayOfWeek, startTime, endTime, availabilities)) {
      setToastMessage(
        `Gia sư không rảnh khung giờ ${startTime}-${endTime} vào ${DAY_NAMES[dayOfWeek]}.`
      );
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
        const isAvailable = isSlotWithinAvailability(
          slot.dayOfWeek,
          slot.startTime,
          nextEndTime,
          availabilities
        );
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

  const sessionCount = formData.schedule.length * 4;

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

      <div className="bm-step-title">Chọn lịch học hàng tuần</div>
      <p className="bm-step-desc">
        Chọn các khoảng thời gian học và ngày bắt đầu mong muốn. Học phí tạm tính theo{' '}
        <strong>{formData.schedule.length} buổi/tuần x 4 tuần = {sessionCount} buổi/tháng</strong>.
      </p>

      <div className="bm-duration-section">
        <span className="bm-duration-label">Ngày bắt đầu dự kiến:</span>
        <input
          type="date"
          className="bm-form-input"
          min={new Date().toISOString().split('T')[0]}
          value={formData.startDate}
          onChange={(event) => setFormData((draft) => ({ ...draft, startDate: event.target.value }))}
        />
      </div>

      <div className="bm-duration-section">
        <span className="bm-duration-label">Thời lượng mỗi slot:</span>
        <div className="bm-hours-grid">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`bm-hours-btn ${slotDuration === option.value ? 'selected' : ''}`}
              onClick={() => handleDurationChange(option.value)}
              disabled={availabilities.length === 0}
              style={availabilities.length === 0 ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {availabilities.length === 0 && (
        <div className="bm-toast-warning" style={{ marginBottom: 16 }}>
          <span>Gia sư này chưa thiết lập lịch rảnh. Bạn tạm thời chưa thể đặt lịch.</span>
        </div>
      )}

      <div className="bm-schedule-table">
        <div className="bm-schedule-header">
          <div className="bm-schedule-corner" />
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="bm-schedule-day-header">
              {DAY_NAMES[day]}
            </div>
          ))}
        </div>
        <div className="bm-schedule-body">
          {TIME_SLOTS.map((time) => (
            <div key={time} className="bm-schedule-row">
              <div className="bm-schedule-time">{time}</div>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const endTime = addHoursToTime(time, slotDuration);
                const isBusy = !isChunkAvailable(day, time);
                const isInvalid = isBusy || !isSlotWithinAvailability(day, time, endTime, availabilities);
                const startHovered = hoveredSlot?.day === day && hoveredSlot?.time === time;
                const overlapHovered = startHovered && checkOverlap(day, time, endTime);
                const hoverInvalid = startHovered && (isInvalid || overlapHovered);

                return (
                  <button
                    key={day}
                    className={`bm-schedule-cell ${isSelected(day, time) ? 'selected' : ''} ${
                      isBusy ? 'unavailable' : ''
                    } ${isSlotHovered(day, time) ? 'hovering' : ''} ${hoverInvalid ? 'hover-invalid' : ''}`}
                    onClick={() => toggleSlot(day, time)}
                    onMouseEnter={() => setHoveredSlot({ day, time })}
                    onMouseLeave={() => setHoveredSlot(null)}
                    title={
                      isBusy
                        ? 'Gia sư bận khung giờ này'
                        : isInvalid
                          ? 'Thời lượng đã chọn vượt quá lịch rảnh'
                          : overlapHovered
                            ? 'Trùng với lịch học đã chọn'
                            : ''
                    }
                    type="button"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {formData.schedule.length > 0 && (
        <div className="bm-selected-slots">
          <div className="bm-step-title small">
            Đã chọn ({formData.schedule.length} slot/tuần {'->'} {sessionCount} buổi/tháng)
          </div>
          <div className="bm-slot-tags">
            {formData.schedule.map((slot, index) => (
              <span key={`${slot.dayOfWeek}-${slot.startTime}`} className="bm-slot-tag">
                {DAY_NAMES[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                <button
                  className="bm-slot-remove"
                  onClick={() =>
                    setFormData((draft) => ({
                      ...draft,
                      schedule: draft.schedule.filter((_, slotIndex) => slotIndex !== index),
                    }))
                  }
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepReview({ formData, setFormData, hourlyRate, students, availableSubjects }: StepProps) {
  const student = students.find((item) => item.studentId === formData.studentId);
  const subject = availableSubjects.find((item) => item.id === formData.subjectId);
  const teachingModeInfo = TEACHING_MODES.find((item) => item.key === formData.teachingMode);
  const totalHours = calcTotalHoursFromSchedule(formData.schedule);
  const estimatedPrice = hourlyRate * totalHours;
  const { promoResult, promoLoading, promoDiscount, validate, reset } = usePromotion(estimatedPrice);
  const baseAmount = estimatedPrice - promoDiscount;
  const serviceFee = Math.round(baseAmount * 0.05);
  const finalEstimate = Math.max(0, baseAmount + serviceFee);

  return (
    <div className="bm-step">
      <div className="bm-step-title">Xác nhận booking</div>

      <div className="bm-review-card">
        <div className="bm-review-row">
          <span className="bm-review-label">Học sinh</span>
          <span className="bm-review-value">
            {student?.fullName || 'Học sinh hiện tại'}{' '}
            {student?.gradeLevel ? `(${formatGrade(student.gradeLevel)})` : student?.school ? `(${student.school})` : ''}
          </span>
        </div>
        <div className="bm-review-row">
          <span className="bm-review-label">Môn học</span>
          <span className="bm-review-value">{subject?.name}</span>
        </div>
        <div className="bm-review-row">
          <span className="bm-review-label">Hình thức</span>
          <span className="bm-review-value">
            {teachingModeInfo?.icon} {teachingModeInfo?.label}
          </span>
        </div>
        {(formData.teachingMode === 'offline' || formData.teachingMode === 'hybrid') && (
          <div className="bm-review-row">
            <span className="bm-review-label">Địa điểm</span>
            <span className="bm-review-value">
              {[formData.locationDetail, formData.locationWard, formData.locationDistrict, formData.locationCity]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}
        <div className="bm-review-row">
          <span className="bm-review-label">Ngày bắt đầu</span>
          <span className="bm-review-value">
            {new Date(formData.startDate || new Date().toISOString()).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <div className="bm-review-row">
          <span className="bm-review-label">Số buổi/tháng</span>
          <span className="bm-review-value">{formData.schedule.length * 4} buổi</span>
        </div>
        <div className="bm-review-row">
          <span className="bm-review-label">Tổng giờ/tháng</span>
          <span className="bm-review-value">{totalHours} giờ</span>
        </div>
        <div className="bm-review-row">
          <span className="bm-review-label">Lịch học</span>
          <div className="bm-review-schedule">
            {formData.schedule.map((slot) => (
              <span key={`${slot.dayOfWeek}-${slot.startTime}`} className="bm-slot-tag-sm">
                {DAY_NAMES[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bm-promo-section">
        <div className="bm-step-title small">Mã khuyến mãi</div>
        <div className="bm-promo-input-row">
          <input
            type="text"
            placeholder="Nhập mã khuyến mãi"
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
        {promoResult?.valid && (
          <div className="bm-promo-msg valid">
            ✓ {promoResult.message || `Mã hợp lệ! Giảm ${formatPrice(promoDiscount)}`}
          </div>
        )}
        {promoResult && !promoResult.valid && (
          <div className="bm-promo-msg invalid">✕ {promoResult.message || 'Mã không hợp lệ'}</div>
        )}
      </div>

      <div className="bm-price-section">
        <div className="bm-price-note">Giá ước tính. Giá cuối cùng sẽ được backend tính chính xác.</div>
        <div className="bm-price-row">
          <span>
            Giá gốc ({totalHours} giờ x {formatPrice(hourlyRate)}/h)
          </span>
          <span>{formatPrice(estimatedPrice)}</span>
        </div>
        {promoResult?.valid && promoDiscount > 0 && (
          <div className="bm-price-row discount">
            <span>Mã khuyến mãi ({promoResult.code})</span>
            <span>-{formatPrice(promoDiscount)}</span>
          </div>
        )}
        <div className="bm-price-row fee">
          <span>Phí dịch vụ (5%)</span>
          <span>{formatPrice(serviceFee)}</span>
        </div>
        <div className="bm-price-divider" />
        <div className="bm-price-row total">
          <span>Dự kiến thanh toán</span>
          <span>{formatPrice(finalEstimate)}</span>
        </div>
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
      teachingMode: lockedMode ?? 'online',
      startDate: new Date().toISOString().split('T')[0],
      schedule: [],
      locationCity: '',
      locationDistrict: '',
      locationWard: '',
      locationDetail: '',
      promotionCode: '',
    }),
    [currentUserId, userRole, lockedMode]
  );

  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<number | null>(null);
  const [slotDuration, setSlotDuration] = useState(2);
  const [formData, setFormData] = useState<BookingFormData>(defaultFormData);
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
    formData: BookingFormData;
    step: number;
    slotDuration: number;
  }>(`draft_booking_${currentUserId || 'anon'}_${tutorId}`);

  const availableSubjects = useMemo(
    () =>
      SUBJECT_MAPPING.filter((subject) =>
        subjects.some((tutorSubject) => tutorSubject.subjectId === subject.id)
      ),
    [subjects]
  );

  useEffect(() => {
    if (!isOpen || userRole !== 'Student') return;
    getMyLinkStatus()
      .then((response) => {
        const studentId = response.content.studentProfile?.studentId;
        if (studentId) {
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
    if (isOpen) {
      const draft = loadDraft();
      if (draft) {
        const restored = draft.formData || defaultFormData;
        const todayStr = new Date().toISOString().split('T')[0];
        if (restored.startDate && restored.startDate < todayStr) {
          restored.startDate = todayStr;
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

  const canNext = () => {
    switch (step) {
      case 0:
        if (userRole === 'Student') return formData.subjectId !== 0 && !!formData.studentId;
        return formData.studentId !== '' && formData.subjectId !== 0;
      case 1:
        if (formData.teachingMode === 'offline' || formData.teachingMode === 'hybrid') {
          return formData.locationCity.trim() !== '' && formData.locationDistrict.trim() !== '';
        }
        return true;
      case 2:
        return formData.schedule.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canNext()) {
      if (step === 0) {
        if (userRole === 'Student') {
          toast.warning(
            formData.studentId ? 'Vui lòng chọn môn học trước khi tiếp tục.' : 'Tài khoản học sinh chưa liên kết hồ sơ.'
          );
        } else if (!formData.studentId) {
          toast.warning('Vui lòng chọn học sinh trước khi tiếp tục.');
        } else {
          toast.warning('Vui lòng chọn môn học trước khi tiếp tục.');
        }
      } else if (step === 1) {
        toast.warning('Vui lòng nhập đầy đủ địa điểm học.');
      } else if (step === 2) {
        toast.warning('Vui lòng chọn ít nhất 1 slot lịch học.');
      }
      return;
    }
    setStep((current) => current + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: CreateBookingPayload = {
        studentId: formData.studentId,
        tutorId,
        subjectId: formData.subjectId,
        teachingMode: formData.teachingMode,
        startDate: formData.startDate,
        schedule: formData.schedule.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
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
                Yêu cầu booking của bạn đã được gửi đến <strong>{tutorName}</strong>. Gia sư sẽ xác nhận
                trong thời gian sớm nhất.
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
          <button className="bm-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <BookingStepper step={step} />

        <div className="bm-body">
          {step === 0 && <StepStudentSubject {...stepProps} />}
          {step === 1 && <StepTeachingMode {...stepProps} />}
          {step === 2 && <StepSchedule {...stepProps} />}
          {step === 3 && <StepReview {...stepProps} />}
        </div>

        <div className="bm-footer">
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
                {submitting ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
