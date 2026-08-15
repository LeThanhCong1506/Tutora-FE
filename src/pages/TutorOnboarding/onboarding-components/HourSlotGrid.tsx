import React, { useState } from 'react';
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
  // Desktop hiển thị cả tuần. Trên mobile chỉ hiện một ngày để mỗi ô có đủ kích
  // thước chạm; thanh chọn ngày vẫn cho phép chuyển nhanh giữa các ngày.
  const [activeDayOfWeek, setActiveDayOfWeek] = useState(DAY_COLUMNS[0].dayOfWeek);

  return (
    <div className={styles.gridCard}>
      <div className={styles.mobileDayPicker} role="tablist" aria-label="Chọn ngày thiết lập lịch rảnh">
        {DAY_COLUMNS.map((col) => (
          <button
            key={`picker-${col.dayOfWeek}`}
            type="button"
            role="tab"
            aria-selected={activeDayOfWeek === col.dayOfWeek}
            className={`${styles.mobileDayButton} ${activeDayOfWeek === col.dayOfWeek ? styles.mobileDayButtonActive : ''}`}
            onClick={() => setActiveDayOfWeek(col.dayOfWeek)}
          >
            {col.label}
          </button>
        ))}
      </div>

      <div className={styles.weekHeader}>
        {/* Header row */}
        {DAY_COLUMNS.map((col) => (
          <div
            key={`head-${col.dayOfWeek}`}
            className={`${styles.colHead} ${activeDayOfWeek === col.dayOfWeek ? styles.colHeadActive : ''}`}
          >
            <button type="button" className={styles.colHeadDay} onClick={() => setActiveDayOfWeek(col.dayOfWeek)}>
              {col.label}
            </button>
            {wholeDayLabel && onWholeDayClick && (
              <button type="button" className={styles.wholeDayBtn} onClick={() => onWholeDayClick(col.dayOfWeek)}>
                {wholeDayLabel}
              </button>
            )}
          </div>
        ))}

        {/* Body rows: 1 row / 30 phút */}
      </div>

      <div className={styles.grid}>
        {HALF_HOUR_STEPS.map(({ hour, minute }) => {
          const label = hideHalfHourLabels && minute === 30 ? '' : formatHourMinute(hour, minute);
          return (
            <React.Fragment key={`row-${hour}-${minute}`}>
              <div className={styles.rowTime}>{label}</div>
              {DAY_COLUMNS.map((col) => (
                <div
                  key={`cell-${col.dayOfWeek}-${hour}-${minute}`}
                  className={`${styles.slotCellWrap} ${activeDayOfWeek === col.dayOfWeek ? styles.slotCellActive : ''}`}
                >
                  {renderCell(col.dayOfWeek, hour, minute)}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HourSlotGrid;
