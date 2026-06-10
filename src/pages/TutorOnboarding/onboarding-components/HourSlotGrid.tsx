import React from 'react';
import styles from '../styles.module.css';
import { DAY_COLUMNS, HALF_HOUR_STEPS, formatHourMinute } from './constants';

interface HourSlotGridProps {
  // Render nội dung/handler của 1 ô (day × half-hour).
  renderCell: (dayOfWeek: number, hour: number, minute: 0 | 30) => React.ReactNode;
  // Action nhanh dưới header ngày (vd "Cả ngày").
  wholeDayLabel?: string;
  onWholeDayClick?: (dayOfWeek: number) => void;
  // Cho phép ẩn label phút (chỉ show giờ tròn) để grid gọn hơn — preview hoặc thumbnail.
  hideHalfHourLabels?: boolean;
}

// Lưới ngày × giờ bước 30 phút. Cell appearance/behaviour do parent quyết định
// qua renderCell. Dùng ở Step Availability + Step Combo + Summary preview.
const HourSlotGrid: React.FC<HourSlotGridProps> = ({
  renderCell,
  wholeDayLabel,
  onWholeDayClick,
  hideHalfHourLabels = false,
}) => {
  return (
    <div className={styles.gridCard}>
      <div className={styles.grid}>
        {/* Header row */}
        <div className={styles.gridCorner} />
        {DAY_COLUMNS.map((col) => (
          <div key={`head-${col.dayOfWeek}`} className={styles.colHead}>
            <div className={styles.colHeadDay}>{col.label}</div>
            {wholeDayLabel && onWholeDayClick && (
              <button type="button" className={styles.wholeDayBtn} onClick={() => onWholeDayClick(col.dayOfWeek)}>
                {wholeDayLabel}
              </button>
            )}
          </div>
        ))}

        {/* Body rows: 1 row / 30 phút */}
        {HALF_HOUR_STEPS.map(({ hour, minute }) => {
          const label = hideHalfHourLabels && minute === 30 ? '' : formatHourMinute(hour, minute);
          return (
            <React.Fragment key={`row-${hour}-${minute}`}>
              <div className={styles.rowTime}>{label}</div>
              {DAY_COLUMNS.map((col) => (
                <React.Fragment key={`cell-${col.dayOfWeek}-${hour}-${minute}`}>
                  {renderCell(col.dayOfWeek, hour, minute)}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HourSlotGrid;
