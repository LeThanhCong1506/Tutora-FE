import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  DragOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import styles from '../styles.module.css';
import { DAY_COLUMNS, formatHourMinute } from './constants';
import HourSlotGrid from './HourSlotGrid';
import BulkAvailabilityModal, { type BulkSlot } from './BulkAvailabilityModal';
import type { UseOnboardingState } from './hooks/useOnboardingState';
import type { TutorAvailabilitySlot } from './types';

interface StepAvailabilityProps {
  onboarding: UseOnboardingState;
  onSaveAvailability?: (availability: TutorAvailabilitySlot[]) => Promise<boolean>;
  saving?: boolean;
}

type PaintMode = 'add' | 'remove';

const slotKey = (dayOfWeek: number, hour: number, minute: number) => `${dayOfWeek}-${hour}-${minute}`;
const addHalfHour = (hour: number, minute: 0 | 30) => {
  const total = hour * 60 + minute + 30;
  return formatHourMinute(Math.floor(total / 60), (total % 60) as 0 | 30);
};

const StepAvailability: React.FC<StepAvailabilityProps> = ({ onboarding, onSaveAvailability, saving = false }) => {
  const { state, setAvailable, toggleAvailabilityDay, clearAvailability } = onboarding;
  const paintModeRef = useRef<PaintMode | null>(null);
  const paintedKeysRef = useRef(new Set<string>());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const handleBulkApply = async (slots: BulkSlot[]) => {
    // Cộng dồn: mỗi slot được set true (nếu đã rảnh sẵn thì setAvailable no-op).
    const existingKeys = new Set(
      state.availability.map((slot) => {
        const [hour, minute] = slot.startTime.split(':').map(Number);
        return slotKey(slot.dayOfWeek, hour, minute || 0);
      }),
    );
    const additions = slots
      .filter(({ dayOfWeek, hour, minute }) => !existingKeys.has(slotKey(dayOfWeek, hour, minute)))
      .map<TutorAvailabilitySlot>(({ dayOfWeek, hour, minute }) => ({
        id: slotKey(dayOfWeek, hour, minute),
        dayOfWeek,
        startTime: formatHourMinute(hour, minute),
        endTime: addHalfHour(hour, minute),
      }));

    if (additions.length === 0) {
      toast.info('Các khung giờ này đã có trong lịch rảnh.');
      return true;
    }

    const nextAvailability = [...state.availability, ...additions];
    const saved = onSaveAvailability ? await onSaveAvailability(nextAvailability) : true;
    if (!saved) return false;

    additions.forEach(({ dayOfWeek, startTime }) => {
      const [hour, minute] = startTime.split(':').map(Number);
      setAvailable(dayOfWeek, hour, (minute || 0) as 0 | 30, true);
    });
    toast.success('Đã lưu lịch rảnh');
    return true;
  };

  // Set chứa key "day-hour-minute" cho ô đã rảnh.
  const availabilityKeys = useMemo(() => {
    const set = new Set<string>();
    state.availability.forEach((slot) => {
      const [h, m] = slot.startTime.split(':').map(Number);
      set.add(slotKey(slot.dayOfWeek, h, m || 0));
    });
    return set;
  }, [state.availability]);

  const selectedDayCount = useMemo(
    () => new Set(state.availability.map((slot) => slot.dayOfWeek)).size,
    [state.availability],
  );

  useEffect(() => {
    const stopPainting = () => {
      paintModeRef.current = null;
      paintedKeysRef.current.clear();
    };

    window.addEventListener('pointerup', stopPainting);
    window.addEventListener('pointercancel', stopPainting);
    return () => {
      window.removeEventListener('pointerup', stopPainting);
      window.removeEventListener('pointercancel', stopPainting);
    };
  }, []);

  const paintCell = (dayOfWeek: number, hour: number, minute: 0 | 30, mode: PaintMode) => {
    const key = slotKey(dayOfWeek, hour, minute);
    if (paintedKeysRef.current.has(key)) return;

    paintedKeysRef.current.add(key);
    setAvailable(dayOfWeek, hour, minute, mode === 'add');
  };

  const startPainting = (dayOfWeek: number, hour: number, minute: 0 | 30, isAvailable: boolean) => {
    const mode: PaintMode = isAvailable ? 'remove' : 'add';
    paintModeRef.current = mode;
    paintedKeysRef.current.clear();
    paintCell(dayOfWeek, hour, minute, mode);
  };

  const extendPainting = (dayOfWeek: number, hour: number, minute: 0 | 30) => {
    if (!paintModeRef.current) return;
    paintCell(dayOfWeek, hour, minute, paintModeRef.current);
  };

  const extendPaintingAtPoint = (clientX: number, clientY: number) => {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-availability-day][data-availability-hour][data-availability-minute]');
    if (!target) return;

    const dayOfWeek = Number(target.dataset.availabilityDay);
    const hour = Number(target.dataset.availabilityHour);
    const minute = Number(target.dataset.availabilityMinute) as 0 | 30;
    extendPainting(dayOfWeek, hour, minute);
  };

  const renderCell = (dayOfWeek: number, hour: number, minute: 0 | 30) => {
    const key = slotKey(dayOfWeek, hour, minute);
    const isAvailable = availabilityKeys.has(key);
    const day = DAY_COLUMNS.find((column) => column.dayOfWeek === dayOfWeek)?.full ?? `Ngày ${dayOfWeek}`;
    const startLabel = formatHourMinute(hour, minute);

    return (
      <button
        type="button"
        className={`${styles.cell} ${isAvailable ? styles.available : ''}`}
        data-availability-day={dayOfWeek}
        data-availability-hour={hour}
        data-availability-minute={minute}
        aria-label={`${day}, ${startLabel}`}
        aria-pressed={isAvailable}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          startPainting(dayOfWeek, hour, minute, isAvailable);
        }}
        onPointerEnter={() => extendPainting(dayOfWeek, hour, minute)}
        onPointerMove={(event) => extendPaintingAtPoint(event.clientX, event.clientY)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setAvailable(dayOfWeek, hour, minute, !isAvailable);
        }}
      >
        {isAvailable ? (
          <CheckOutlined className={styles.cellCheck} />
        ) : (
          <span className={styles.cellAdd}>+</span>
        )}
      </button>
    );
  };

  const totalHours = (state.availability.length * 0.5).toFixed(1);
  const isEmpty = state.availability.length === 0;

  return (
    <div className={styles.availabilityStep}>
      <section className={styles.availabilityIntro}>
        <div>
          <span className={styles.availabilityEyebrow}>Bước bắt buộc</span>
          <h2 className={styles.stepHeading}>Thiết lập lịch rảnh hàng tuần</h2>
        </div>
      </section>

      {/* 2-column layout: grid bên trái, panel sticky bên phải */}
      <div className={styles.availabilityLayout}>
        <div className={styles.availabilityMain}>
          <HourSlotGrid renderCell={renderCell} wholeDayLabel="Cả ngày" onWholeDayClick={toggleAvailabilityDay} />
        </div>

        <aside className={styles.availabilityAside}>
          <div className={styles.availabilityAsideCard}>
            <div
              className={`${styles.availabilityAsideStatus} ${isEmpty ? styles.statusEmpty : styles.statusFilled}`}
            >
              {isEmpty ? (
                <>
                  <InfoCircleOutlined />
                  <span>Chưa chọn lịch rảnh. Hãy chọn ít nhất một ô 30 phút để tiếp tục.</span>
                </>
              ) : (
                <>
                  <CheckCircleOutlined />
                  <span>
                    <strong>
                      {selectedDayCount} ngày · {totalHours} giờ
                    </strong>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className={styles.availabilityAddBulkBtn}
              onClick={() => setBulkModalOpen(true)}
            >
              <PlusOutlined />
              Thêm theo khung giờ
            </button>

            <div className={styles.availabilityAsideHints}>
              <div className={styles.availabilityAsideHint}>
                <DragOutlined />
                <span>Click hoặc kéo để chọn nhiều ô liền</span>
              </div>
              <div className={styles.availabilityAsideHint}>
                <span className={`${styles.legendDot} ${styles.available}`} />
                <span>Ô xanh = khung bạn có thể dạy</span>
              </div>
            </div>

            {!isEmpty && (
              <button type="button" className={styles.availabilityClearBtn} onClick={clearAvailability}>
                <DeleteOutlined />
                Xoá tất cả lịch rảnh
              </button>
            )}
          </div>
        </aside>
      </div>

      <BulkAvailabilityModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onApply={handleBulkApply}
        saving={saving}
      />
    </div>
  );
};

export default StepAvailability;
