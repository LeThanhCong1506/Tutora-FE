import React, { useMemo, useState } from 'react';
import { Input, Modal, Select } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import ComboPreview from './ComboPreview';
import { findFirstAvailableSession, getAvailableStartTimes, isSessionWithinAvailability } from './availability-utils';
import { DAY_COLUMNS, END_HOUR, formatHourMinute, minutesOf } from './constants';
import type { ComboSessionSlot, FixedCombo, TutorAvailabilitySlot } from './types';

interface ComboFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (combo: FixedCombo) => void | Promise<void>;
  initial: FixedCombo | null;
  availability: TutorAvailabilitySlot[];
  requiredDurationHours: number;
  requiredSessionsPerWeek: number;
  saving?: boolean;
  // Các gói khác đã có (đã loại bỏ gói đang edit) — dùng để cảnh báo trùng giờ giữa các gói.
  existingCombos: FixedCombo[];
}

export interface ExternalBusyInfo {
  comboName: string;
}

const newComboId = () => `combo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaultFixed = (): FixedCombo => ({
  id: newComboId(),
  type: 'fixed',
  name: '',
  sessions: [],
});

const applyFixedRules = (fixedCombo: FixedCombo, durationHours: number): FixedCombo => {
  const next = {
    ...fixedCombo,
    sessions: fixedCombo.sessions.map((session) => ({ ...session, durationHours })),
  };
  delete next.description;
  return next;
};

// Helper: encode (hour, minute) → "h:m" string cho Select option (Antd Select không
// nhận object value tốt). Decode khi onChange.
const encodeStart = (hour: number, minute: 0 | 30) => `${hour}:${minute}`;
const decodeStart = (raw: string): { hour: number; minute: 0 | 30 } => {
  const [h, m] = raw.split(':').map(Number);
  return { hour: h, minute: (m === 30 ? 30 : 0) as 0 | 30 };
};

const doSessionsOverlap = (left: ComboSessionSlot, right: ComboSessionSlot) => {
  if (left.dayOfWeek !== right.dayOfWeek) return false;
  const leftStart = minutesOf(left.startHour, left.startMinute);
  const leftEnd = leftStart + left.durationHours * 60;
  const rightStart = minutesOf(right.startHour, right.startMinute);
  const rightEnd = rightStart + right.durationHours * 60;
  return leftStart < rightEnd && rightStart < leftEnd;
};

const sessionsOverlap = (sessions: FixedCombo['sessions'], targetIndex?: number) =>
  sessions.some((session, index) =>
    sessions.some((other, otherIndex) => {
      if (index === otherIndex) return false;
      if (targetIndex != null && index !== targetIndex && otherIndex !== targetIndex) return false;
      return doSessionsOverlap(session, other);
    }),
  );

const ComboFormModal: React.FC<ComboFormModalProps> = ({
  open,
  onClose,
  onSave,
  initial,
  availability,
  requiredDurationHours,
  requiredSessionsPerWeek,
  saving = false,
  existingCombos,
}) => {
  const [combo, setCombo] = useState<FixedCombo>(() =>
    applyFixedRules(initial ?? defaultFixed(), requiredDurationHours),
  );

  const canFitRequiredDuration = (dayOfWeek: number, hour: number, minute: 0 | 30) => {
    const candidate: ComboSessionSlot = {
      dayOfWeek,
      startHour: hour,
      startMinute: minute,
      durationHours: requiredDurationHours,
    };
    const endTotalMinutes = minutesOf(hour, minute) + requiredDurationHours * 60;
    return endTotalMinutes <= END_HOUR * 60 && isSessionWithinAvailability(candidate, availability);
  };

  // Map "dayOfWeek-hour-minute" (30-phút granularity) → gói khác đang chiếm khung này.
  const externalBusyCells = useMemo(() => {
    const map = new Map<string, ExternalBusyInfo>();
    existingCombos.forEach((other) => {
      other.sessions.forEach((session) => {
        const startMin = minutesOf(session.startHour, session.startMinute);
        const endMin = startMin + requiredDurationHours * 60;
        for (let cur = startMin; cur < endMin; cur += 30) {
          const h = Math.floor(cur / 60);
          const m = cur % 60;
          map.set(`${session.dayOfWeek}-${h}-${m}`, { comboName: other.name || 'Gói khác' });
        }
      });
    });
    return map;
  }, [existingCombos, requiredDurationHours]);

  // Trả về thông tin gói khác đang chặn session này (nếu có).
  const findExternalConflict = (session: ComboSessionSlot): ExternalBusyInfo | null => {
    const startMin = minutesOf(session.startHour, session.startMinute);
    const endMin = startMin + session.durationHours * 60;
    for (let cur = startMin; cur < endMin; cur += 30) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      const hit = externalBusyCells.get(`${session.dayOfWeek}-${h}-${m}`);
      if (hit) return hit;
    }
    return null;
  };

  const fixedHasExternalConflict = useMemo(
    () => combo.sessions.some((session) => findExternalConflict(session) !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combo, externalBusyCells],
  );

  const fixedHasOverlap = useMemo(() => sessionsOverlap(combo.sessions), [combo]);
  const fixedHasOutOfRange = useMemo(
    () =>
      combo.sessions.some(
        (session) => minutesOf(session.startHour, session.startMinute) + session.durationHours * 60 > END_HOUR * 60,
      ),
    [combo],
  );
  const fixedHasOutsideAvailability = useMemo(
    () => combo.sessions.some((session) => !isSessionWithinAvailability(session, availability)),
    [availability, combo],
  );
  const nextAvailableSession = useMemo(
    () =>
      combo.sessions.length >= requiredSessionsPerWeek
        ? null
        : findFirstAvailableSession(availability, combo.sessions, requiredDurationHours),
    [availability, combo.sessions, requiredDurationHours, requiredSessionsPerWeek],
  );
  const availableDayOptions = useMemo(
    () =>
      DAY_COLUMNS.filter((column) =>
        getAvailableStartTimes(column.dayOfWeek, availability).some(({ hour, minute }) =>
          canFitRequiredDuration(column.dayOfWeek, hour, minute),
        ),
      ).map((column) => ({
        value: column.dayOfWeek,
        label: column.full,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availability, requiredDurationHours],
  );

  const fixedHasNoSessions = combo.sessions.length === 0;
  const fixedExceedsSessionLimit = combo.sessions.length > requiredSessionsPerWeek;
  const isValid =
    combo.name.trim().length > 0 &&
    !fixedHasNoSessions &&
    !fixedExceedsSessionLimit &&
    combo.sessions.every((session) => session.durationHours <= requiredDurationHours) &&
    !fixedHasOverlap &&
    !fixedHasOutOfRange &&
    !fixedHasOutsideAvailability &&
    !fixedHasExternalConflict;

  const addSession = () => {
    if (!nextAvailableSession || combo.sessions.length >= requiredSessionsPerWeek) return;
    setCombo({ ...combo, sessions: [...combo.sessions, nextAvailableSession] });
  };

  const getStartOptions = (dayOfWeek: number, currentIndex: number) =>
    getAvailableStartTimes(dayOfWeek, availability).filter(({ hour, minute }) => {
      const candidate: ComboSessionSlot = {
        dayOfWeek,
        startHour: hour,
        startMinute: minute,
        durationHours: requiredDurationHours,
      };
      return (
        canFitRequiredDuration(dayOfWeek, hour, minute) &&
        !combo.sessions.some((session, sessionIndex) =>
          sessionIndex !== currentIndex ? doSessionsOverlap(session, candidate) : false,
        )
      );
    });

  const normalizeSession = (session: ComboSessionSlot, currentIndex: number): ComboSessionSlot => {
    const startTimes = getStartOptions(session.dayOfWeek, currentIndex);
    const matchesCurrent = startTimes.some((st) => st.hour === session.startHour && st.minute === session.startMinute);
    const start = matchesCurrent
      ? { hour: session.startHour, minute: session.startMinute }
      : (startTimes[0] ?? { hour: session.startHour, minute: session.startMinute });

    return {
      ...session,
      startHour: start.hour,
      startMinute: start.minute,
      durationHours: requiredDurationHours,
    };
  };

  const updateSession = (index: number, patch: Partial<ComboSessionSlot>) => {
    setCombo({
      ...combo,
      sessions: combo.sessions.map((session, sessionIndex) => {
        if (sessionIndex !== index) return session;
        return normalizeSession({ ...session, ...patch, durationHours: requiredDurationHours }, sessionIndex);
      }),
    });
  };
  const removeSession = (index: number) => {
    setCombo({ ...combo, sessions: combo.sessions.filter((_, sessionIndex) => sessionIndex !== index) });
  };

  return (
    <Modal
      className={styles.comboModal}
      open={open}
      onCancel={saving ? undefined : onClose}
      onOk={() => onSave(applyFixedRules(combo, requiredDurationHours))}
      okText={initial ? 'Cập nhật gói' : 'Tạo gói'}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: !isValid, loading: saving }}
      cancelButtonProps={{ disabled: saving }}
      title={
        <div className={styles.comboModalTitle}>
          <span className={styles.comboModalEyebrow}>
            {initial ? 'Chỉnh sửa gói lịch cố định' : 'Gói lịch cố định mới'}
          </span>
          <strong>{initial ? 'Cập nhật gói lịch học' : 'Tạo gói lịch học'}</strong>
        </div>
      }
      width={920}
      destroyOnClose
    >
      <div className={styles.comboForm}>
        <div className={styles.comboBuilderLayout}>
          <div className={styles.comboBuilderMain}>
            <section className={styles.comboBuilderSection}>
              <div className={styles.comboBuilderSectionHead}>
                <div>
                  <span className={styles.comboBuilderStep}>01</span>
                  <h4>Thông tin gói</h4>
                </div>
              </div>
              <label className={styles.comboFormField}>
                <span className={styles.comboFormLabel}>Tên gói</span>
                <Input
                  value={combo.name}
                  onChange={(event) => setCombo({ ...combo, name: event.target.value })}
                  placeholder="Ví dụ: Gói 8 buổi tối Thứ 2 và Thứ 4"
                  size="large"
                />
              </label>
              <div className={styles.comboFormHint}>
                Giá gói sẽ được tính theo môn và khối lớp mà phụ huynh chọn khi đặt lịch.
              </div>
            </section>

            <section className={styles.comboBuilderSection}>
              <div className={styles.comboBuilderSectionHead}>
                <div>
                  <span className={styles.comboBuilderStep}>02</span>
                  <h4>Lịch học lặp lại hàng tuần</h4>
                </div>
              </div>

              {combo.sessions.length === 0 ? (
                <div className={styles.sessionEmptyState}>
                  <CalendarOutlined />
                  <strong>Chưa có buổi học nào</strong>
                  <button
                    type="button"
                    className={styles.sessionAddBtn}
                    onClick={addSession}
                    disabled={!nextAvailableSession}
                  >
                    <PlusOutlined />
                    <span>Thêm buổi học</span>
                  </button>
                </div>
              ) : (
                <div className={styles.sessionList}>
                  {combo.sessions.map((session, index) => {
                    const internalConflict = sessionsOverlap(combo.sessions, index);
                    const externalConflict = findExternalConflict(session);
                    const hasConflict = internalConflict || externalConflict !== null;

                    return (
                      <div key={index} className={`${styles.sessionRow} ${hasConflict ? styles.sessionRowError : ''}`}>
                        <span className={styles.sessionIndex}>{index + 1}</span>
                        <div className={styles.sessionControlGrid}>
                          <label>
                            <span>Ngày học</span>
                            <Select
                              value={session.dayOfWeek}
                              onChange={(value) => updateSession(index, { dayOfWeek: value })}
                              options={availableDayOptions}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label>
                            <span>Bắt đầu</span>
                            <Select
                              value={encodeStart(session.startHour, session.startMinute)}
                              onChange={(value) => {
                                const { hour, minute } = decodeStart(value);
                                updateSession(index, { startHour: hour, startMinute: minute });
                              }}
                              options={getStartOptions(session.dayOfWeek, index).map(({ hour, minute }) => ({
                                value: encodeStart(hour, minute),
                                label: formatHourMinute(hour, minute),
                              }))}
                              style={{ width: '100%' }}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className={styles.sessionRemoveBtn}
                          onClick={() => removeSession(index)}
                          aria-label={`Xóa buổi ${index + 1}`}
                          title="Xóa buổi học"
                        >
                          <DeleteOutlined />
                        </button>
                        {externalConflict && (
                          <div
                            style={{
                              gridColumn: '2 / 3',
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#631b1b',
                              lineHeight: 1.4,
                            }}
                          >
                            Trùng giờ với gói "{externalConflict.comboName}". Hãy chọn khung giờ khác.
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {combo.sessions.length < requiredSessionsPerWeek && (
                    <button
                      type="button"
                      className={styles.sessionAddBtn}
                      onClick={addSession}
                      disabled={!nextAvailableSession}
                    >
                      <PlusOutlined />
                      <span>Thêm buổi học</span>
                    </button>
                  )}
                </div>
              )}

              {fixedExceedsSessionLimit && (
                <div className={styles.comboAvailabilityHint}>
                  Gói này đang vượt quá {requiredSessionsPerWeek} buổi/tuần theo cấu hình môn học.
                </div>
              )}

              {!nextAvailableSession && combo.sessions.length < requiredSessionsPerWeek && (
                <div className={styles.comboAvailabilityHint}>
                  Không còn khung giờ rảnh phù hợp để thêm buổi học mới.
                </div>
              )}

              {(fixedHasOverlap || fixedHasOutOfRange || fixedHasOutsideAvailability) && (
                <div className={styles.comboValidationWarn}>
                  <ClockCircleOutlined />
                  <span>
                    Các buổi học đang bị trùng nhau, vượt quá khung giờ cho phép hoặc nằm ngoài lịch rảnh đã thiết lập.
                    Hãy điều chỉnh trước khi lưu gói.
                  </span>
                </div>
              )}

              {fixedHasExternalConflict && (
                <div className={styles.comboValidationWarn}>
                  <ClockCircleOutlined />
                  <span>
                    Một số buổi học đang trùng giờ với gói khác bạn đã tạo trước đó. Hãy đổi khung giờ để tránh đặt 2
                    lớp cùng lúc.
                  </span>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.comboPreviewPanel}>
            <ComboPreview combo={combo} availability={availability} externalBusyCells={externalBusyCells} />
          </aside>
        </div>
      </div>
    </Modal>
  );
};

export default ComboFormModal;
