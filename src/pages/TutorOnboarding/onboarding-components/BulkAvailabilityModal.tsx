import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Select, Button } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import { DAY_COLUMNS, END_HOUR, START_HOUR, formatHourMinute, minutesOf } from './constants';

export interface BulkSlot {
  dayOfWeek: number;
  hour: number;
  minute: 0 | 30;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (slots: BulkSlot[]) => boolean | Promise<boolean>;
  saving?: boolean;
}

// Tất cả mốc 30 phút từ 06:00 → 22:00 (33 mốc, bao gồm 22:00 cho end time).
const ALL_HALF_HOUR_TIMES: Array<{ hour: number; minute: 0 | 30 }> = (() => {
  const out: Array<{ hour: number; minute: 0 | 30 }> = [];
  for (let h = START_HOUR; h <= END_HOUR; h += 1) {
    out.push({ hour: h, minute: 0 });
    if (h !== END_HOUR) out.push({ hour: h, minute: 30 });
  }
  return out;
})();

const timeKey = (hour: number, minute: 0 | 30) => `${hour}:${minute}`;

const BulkAvailabilityModal: React.FC<Props> = ({ open, onClose, onApply, saving = false }) => {
  // Khởi tạo không chọn ngày nào — user tự pick mỗi lần mở.
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startKey, setStartKey] = useState<string | null>(null);
  const [endKey, setEndKey] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const isBusy = saving || applying;

  // Khi mở lại modal → reset hoàn toàn để tránh state cũ gây bối rối.
  useEffect(() => {
    if (open) {
      setSelectedDays([]);
      setStartKey(null);
      setEndKey(null);
      setApplying(false);
    }
  }, [open]);

  const startOptions = useMemo(
    () =>
      ALL_HALF_HOUR_TIMES.slice(0, -1).map((t) => ({
        value: timeKey(t.hour, t.minute),
        label: formatHourMinute(t.hour, t.minute),
      })),
    [],
  );

  const startTotal = useMemo(() => {
    if (!startKey) return null;
    const [startH, startM] = startKey.split(':').map(Number);
    return minutesOf(startH, startM);
  }, [startKey]);

  const endOptions = useMemo(
    () =>
      startTotal == null
        ? []
        : ALL_HALF_HOUR_TIMES.filter((t) => minutesOf(t.hour, t.minute) > startTotal).map((t) => ({
            value: timeKey(t.hour, t.minute),
            label: formatHourMinute(t.hour, t.minute),
          })),
    [startTotal],
  );

  const endTotal = useMemo(() => {
    if (!endKey) return null;
    const [endH, endM] = endKey.split(':').map(Number);
    return minutesOf(endH, endM);
  }, [endKey]);

  // Nếu end ≤ start (vd user vừa đổi start sau end) → bỏ chọn end để user tự chọn lại.
  useEffect(() => {
    if (startTotal != null && endTotal != null && endTotal <= startTotal) {
      setEndKey(null);
    }
  }, [startTotal, endTotal]);

  const slotsPerDay =
    startTotal == null || endTotal == null ? 0 : Math.max(0, Math.floor((endTotal - startTotal) / 30));
  const canApply = selectedDays.length > 0 && startTotal != null && endTotal != null && slotsPerDay > 0;

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleApply = async () => {
    if (!canApply) return;
    const slots: BulkSlot[] = [];
    selectedDays.forEach((day) => {
      for (let cur = startTotal as number; cur < (endTotal as number); cur += 30) {
        const h = Math.floor(cur / 60);
        const m = (cur % 60) as 0 | 30;
        slots.push({ dayOfWeek: day, hour: h, minute: m });
      }
    });
    setApplying(true);
    try {
      const shouldClose = await onApply(slots);
      if (shouldClose) onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      className={styles.bulkAvailModal}
      open={open}
      onCancel={isBusy ? undefined : onClose}
      title={
        <div className={styles.bulkAvailTitle}>
          <CalendarOutlined />
          <span>Thêm khung giờ rảnh nhanh</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isBusy}>
          Hủy
        </Button>,
        <Button key="apply" type="primary" onClick={handleApply} disabled={!canApply || isBusy} loading={isBusy}>
          Thêm vào lịch
        </Button>,
      ]}
      width={520}
      destroyOnClose
    >
      <div className={styles.bulkAvailForm}>
        {/* Day chips */}
        <div className={styles.bulkAvailField}>
          <div className={styles.bulkAvailFieldHead}>
            <span className={styles.bulkAvailFieldLabel}>Áp dụng cho ngày</span>
            <div className={styles.bulkAvailQuick}>
              <button type="button" onClick={() => setSelectedDays(DAY_COLUMNS.map((c) => c.dayOfWeek))} disabled={isBusy}>
                Cả tuần
              </button>
              <button type="button" onClick={() => setSelectedDays([])} disabled={isBusy}>
                Bỏ chọn
              </button>
            </div>
          </div>
          <div className={styles.bulkAvailDays}>
            {DAY_COLUMNS.map((col) => {
              const isSelected = selectedDays.includes(col.dayOfWeek);
              return (
                <button
                  key={col.dayOfWeek}
                  type="button"
                  className={`${styles.bulkAvailDay} ${isSelected ? styles.bulkAvailDaySelected : ''}`}
                  onClick={() => toggleDay(col.dayOfWeek)}
                  disabled={isBusy}
                  aria-pressed={isSelected}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time range */}
        <div className={styles.bulkAvailField}>
          <span className={styles.bulkAvailFieldLabel}>Khung giờ</span>
          <div className={styles.bulkAvailTimeRow}>
            <label className={styles.bulkAvailTimeField}>
              <span>Từ</span>
              <Select
                value={startKey ?? undefined}
                onChange={(value) => {
                  setStartKey(value);
                  setEndKey(null);
                }}
                options={startOptions}
                placeholder="Chọn giờ bắt đầu"
                disabled={isBusy}
                style={{ width: '100%' }}
              />
            </label>
            <span className={styles.bulkAvailTimeArrow}>→</span>
            <label className={styles.bulkAvailTimeField}>
              <span>Đến</span>
              <Select
                value={endKey ?? undefined}
                onChange={setEndKey}
                options={endOptions}
                placeholder="Chọn giờ kết thúc"
                disabled={!startKey || isBusy}
                style={{ width: '100%' }}
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkAvailabilityModal;
