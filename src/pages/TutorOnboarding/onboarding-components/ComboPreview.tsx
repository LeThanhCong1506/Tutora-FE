import React from 'react';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import HourSlotGrid from './HourSlotGrid';
import { isHalfHourAvailable } from './availability-utils';
import { formatDuration, minutesOf } from './constants';
import type { FixedCombo, TutorAvailabilitySlot } from './types';

export interface ExternalBusyInfo {
  comboName: string;
}

interface ComboPreviewProps {
  combo: FixedCombo;
  availability: TutorAvailabilitySlot[];
  // (dayOfWeek-hour-minute) → gói khác đang chiếm khung giờ. Map rỗng khi tạo gói đầu tiên.
  externalBusyCells?: Map<string, ExternalBusyInfo>;
}

const ComboPreview: React.FC<ComboPreviewProps> = ({ combo, availability, externalBusyCells }) => {
  // Map "day-hour-minute" → { sessionIdx, isStart } cho lưới preview.
  const comboCells = new Map<string, { sessionIdx: number; isStart: boolean }>();
  combo.sessions.forEach((session, index) => {
    const startMin = minutesOf(session.startHour, session.startMinute);
    const endMin = startMin + session.durationHours * 60;
    let isFirst = true;
    for (let cur = startMin; cur < endMin; cur += 30) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      comboCells.set(`${session.dayOfWeek}-${h}-${m}`, {
        sessionIdx: index,
        isStart: isFirst,
      });
      isFirst = false;
    }
  });

  const renderCell = (dayOfWeek: number, hour: number, minute: 0 | 30) => {
    const key = `${dayOfWeek}-${hour}-${minute}`;
    const inCombo = comboCells.get(key);
    const externalBusy = externalBusyCells?.get(key);

    // Xung đột: gói hiện tại VÀ gói khác cùng claim ô này.
    if (inCombo && externalBusy) {
      return (
        <div
          className={`${styles.cell} ${styles.cellStatic} ${styles.comboPreviewConflict}`}
          title={`Trùng với "${externalBusy.comboName}"`}
        >
          {inCombo.isStart && <span className={styles.previewLabel}>!</span>}
        </div>
      );
    }

    // Gói hiện tại đang dùng ô này.
    if (inCombo) {
      return (
        <div className={`${styles.cell} ${styles.cellStatic} ${styles.comboPreviewSelected}`}>
          {inCombo.isStart && <span className={styles.previewLabel}>{inCombo.sessionIdx + 1}</span>}
        </div>
      );
    }

    // Gói khác đang chiếm (không xung đột vì gói hiện tại không dùng giờ này, nhưng vẫn show).
    if (externalBusy) {
      return (
        <div
          className={`${styles.cell} ${styles.cellStatic} ${styles.comboPreviewBusy}`}
          title={`Đã dùng cho "${externalBusy.comboName}"`}
        />
      );
    }

    // Ô rảnh — nền nhạt.
    if (isHalfHourAvailable(dayOfWeek, hour, minute, availability)) {
      return <div className={`${styles.cell} ${styles.cellStatic} ${styles.comboPreviewAvail}`} />;
    }
    return <div className={`${styles.cell} ${styles.cellStatic}`} />;
  };

  const totalHours = combo.sessions.reduce((sum, session) => sum + session.durationHours, 0);
  const hasExternal = (externalBusyCells?.size ?? 0) > 0;

  return (
    <div className={styles.comboPreview}>
      <div className={styles.comboPreviewHead}>
        <span className={styles.comboPreviewIcon}>
          <CalendarOutlined />
        </span>
        <div>
          <h4 className={styles.comboPreviewTitle}>Lịch tuần mô phỏng</h4>
          <p className={styles.comboPreviewSubtitle}>
            {combo.sessions.length === 0
              ? 'Thêm buổi học để xem lịch'
              : `${combo.sessions.length} buổi · ${formatDuration(totalHours)} mỗi tuần`}
          </p>
        </div>
      </div>
      <div className={styles.comboPreviewLegend}>
        <span>
          <i className={styles.comboPreviewAvailableDot} />
          Lịch rảnh
        </span>
        <span>
          <i />
          Buổi học trong gói
        </span>
        {hasExternal && (
          <>
            <span>
              <i className={styles.comboPreviewBusyDot} />
              Gói khác
            </span>
            <span>
              <i className={styles.comboPreviewConflictDot} />
              Trùng giờ
            </span>
          </>
        )}
        <span>
          <ClockCircleOutlined />
          06:00 - 22:00
        </span>
      </div>
      <HourSlotGrid renderCell={renderCell} hideHalfHourLabels />
    </div>
  );
};

export default ComboPreview;
