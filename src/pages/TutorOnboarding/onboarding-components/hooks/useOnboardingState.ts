import { useState, useCallback } from 'react';
import { isSessionWithinAvailability } from '../availability-utils';
import { HALF_HOUR_STEPS, formatHourMinute, minutesOf } from '../constants';
import type { OnboardingState, OnboardingStep, SubjectRecord, FixedCombo } from '../types';

const clampStep = (n: number): OnboardingStep => Math.min(3, Math.max(1, n)) as OnboardingStep;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const availabilityId = (dayOfWeek: number, hour: number, minute: number) => `${dayOfWeek}-${hour}-${minute}`;

// Tính endTime sau khi cộng 30 phút (bằng phút) → "HH:mm".
const addHalfHour = (hour: number, minute: number) => {
  const total = minutesOf(hour, minute) + 30;
  return formatHourMinute(Math.floor(total / 60), (total % 60) as 0 | 30);
};

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>({
    subjectRecords: [],
    availability: [],
    combos: [],
    currentStep: 1,
  });
  // Nạp dữ liệu đã load từ API (upsert): thay 3 mảng, giữ nguyên currentStep.
  const hydrate = useCallback((data: Partial<Pick<OnboardingState, 'subjectRecords' | 'availability' | 'combos'>>) => {
    setState((prev) => ({
      ...prev,
      subjectRecords: data.subjectRecords ?? prev.subjectRecords,
      availability: data.availability ?? prev.availability,
      combos: data.combos ?? prev.combos,
    }));
  }, []);

  // ── Step navigation ──
  const goToStep = useCallback((step: OnboardingStep) => {
    setState((p) => ({ ...p, currentStep: step }));
  }, []);
  const goNext = useCallback(() => {
    setState((p) => ({ ...p, currentStep: clampStep(p.currentStep + 1) }));
  }, []);
  const goBack = useCallback(() => {
    setState((p) => ({ ...p, currentStep: clampStep(p.currentStep - 1) }));
  }, []);

  // ── B1: subject records ──
  // Thêm 1 record (môn, khối, giá). Trả false nếu đã tồn tại (môn, khối).
  const addSubjectRecord = useCallback(
    (input: {
      id?: string;
      subjectId: number;
      subjectName: string;
      gradeLevel: string;
      hourlyRate: number;
      hoursPerSession: number;
      sessionsPerWeek: number;
    }): boolean => {
      let added = false;
      setState((prev) => {
        const dup = prev.subjectRecords.some(
          (r) => r.subjectId === input.subjectId && r.gradeLevel === input.gradeLevel,
        );
        if (dup) return prev;
        added = true;
        return {
          ...prev,
          subjectRecords: [...prev.subjectRecords, { ...input, id: input.id ?? newId() }],
        };
      });
      return added;
    },
    [],
  );

  const updateSubjectRecord = useCallback((id: string, patch: Partial<Omit<SubjectRecord, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      subjectRecords: prev.subjectRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeSubjectRecord = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      subjectRecords: prev.subjectRecords.filter((r) => r.id !== id),
    }));
  }, []);

  // ── B2: lịch rảnh demo theo ô 30 phút ──
  const setAvailable = useCallback((dayOfWeek: number, hour: number, minute: 0 | 30, isAvailable: boolean) => {
    setState((prev) => {
      const id = availabilityId(dayOfWeek, hour, minute);
      const exists = prev.availability.some((slot) => slot.id === id);
      if (isAvailable && !exists) {
        return {
          ...prev,
          availability: [
            ...prev.availability,
            {
              id,
              dayOfWeek,
              startTime: formatHourMinute(hour, minute),
              endTime: addHalfHour(hour, minute),
            },
          ],
        };
      }
      if (!isAvailable && exists) {
        return {
          ...prev,
          availability: prev.availability.filter((slot) => slot.id !== id),
        };
      }
      return prev;
    });
  }, []);

  const toggleAvailabilityDay = useCallback((dayOfWeek: number) => {
    setState((prev) => {
      // Set chứa key "hour-minute" của ô đã chọn cho ngày này.
      const selectedKeys = new Set(
        prev.availability
          .filter((slot) => slot.dayOfWeek === dayOfWeek)
          .map((slot) => {
            const [h, m] = slot.startTime.split(':').map(Number);
            return `${h}-${m || 0}`;
          }),
      );
      const isFullDay = HALF_HOUR_STEPS.every(({ hour, minute }) => selectedKeys.has(`${hour}-${minute}`));
      if (isFullDay) {
        return {
          ...prev,
          availability: prev.availability.filter((slot) => slot.dayOfWeek !== dayOfWeek),
        };
      }

      const additions = HALF_HOUR_STEPS.filter(({ hour, minute }) => !selectedKeys.has(`${hour}-${minute}`)).map(
        ({ hour, minute }) => ({
          id: availabilityId(dayOfWeek, hour, minute),
          dayOfWeek,
          startTime: formatHourMinute(hour, minute),
          endTime: addHalfHour(hour, minute),
        }),
      );
      return {
        ...prev,
        availability: [...prev.availability, ...additions],
      };
    });
  }, []);

  const clearAvailability = useCallback(() => {
    setState((prev) => ({ ...prev, availability: [] }));
  }, []);

  // ── B3: combos (state-only — không call API) ──
  const addCombo = useCallback((combo: FixedCombo) => {
    setState((prev) => ({ ...prev, combos: [...prev.combos, combo] }));
  }, []);
  const updateCombo = useCallback((id: string, next: FixedCombo) => {
    setState((prev) => ({
      ...prev,
      combos: prev.combos.map((c) => (c.id === id ? next : c)),
    }));
  }, []);
  const removeCombo = useCallback((id: string) => {
    setState((prev) => ({ ...prev, combos: prev.combos.filter((c) => c.id !== id) }));
  }, []);

  // ── Derived ──
  const canProceedStep1 = state.availability.length > 0;
  const canProceedStep2 = state.subjectRecords.length > 0;
  const requiredDurationHours = Math.max(1, ...state.subjectRecords.map((record) => record.hoursPerSession || 0));
  const requiredSessionsPerWeek = Math.max(1, ...state.subjectRecords.map((record) => record.sessionsPerWeek || 0));
  const combosMatchAvailability = state.combos.every((combo) =>
    combo.sessions.every((session) => isSessionWithinAvailability(session, state.availability)),
  );
  const combosMatchSubjectRules = state.combos.every(
    (combo) =>
      combo.sessions.length > 0 &&
      combo.sessions.length <= requiredSessionsPerWeek &&
      combo.sessions.every((session) => session.durationHours > 0 && session.durationHours <= requiredDurationHours),
  );
  const canFinish = canProceedStep1 && canProceedStep2 && combosMatchAvailability && combosMatchSubjectRules; // B3 combo optional

  return {
    state,
    canProceedStep1,
    canProceedStep2,
    combosMatchAvailability,
    combosMatchSubjectRules,
    canFinish,
    hydrate,
    goToStep,
    goNext,
    goBack,
    addSubjectRecord,
    updateSubjectRecord,
    removeSubjectRecord,
    setAvailable,
    toggleAvailabilityDay,
    clearAvailability,
    addCombo,
    updateCombo,
    removeCombo,
  };
}

export type UseOnboardingState = ReturnType<typeof useOnboardingState>;
