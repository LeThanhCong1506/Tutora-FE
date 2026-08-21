import React, { useMemo } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import { DAY_COLUMNS, formatHourMinute } from './constants';
import { getAvailabilityRanges } from './availability-utils';
import type { TutorAvailabilitySlot } from './types';

interface AvailabilityRangeListProps {
  availability: TutorAvailabilitySlot[];
  /** Xoá một khoảng — parent chịu trách nhiệm cập nhật state + persist. */
  onRemoveRange: (dayOfWeek: number, startMinutes: number, endMinutes: number) => void;
  disabled?: boolean;
}

const formatMinutes = (totalMinutes: number) => formatHourMinute(Math.floor(totalMinutes / 60), totalMinutes % 60);

/**
 * Danh sách khung giờ rảnh gom theo ngày. Dùng thay cho lưới 30 phút trên mobile —
 * lưới quá cao và ô quá nhỏ để thao tác bằng ngón tay, nhưng vẫn cần chỗ để gia sư
 * xem lại và xoá những khoảng đã thêm qua modal.
 */
const AvailabilityRangeList: React.FC<AvailabilityRangeListProps> = ({
  availability,
  onRemoveRange,
  disabled = false,
}) => {
  // Gom theo ngày, giữ đúng thứ tự T2 → CN của DAY_COLUMNS.
  const rangesByDay = useMemo(() => {
    const ranges = getAvailabilityRanges(availability);
    return DAY_COLUMNS.map((day) => ({
      day,
      ranges: ranges
        .filter((range) => range.dayOfWeek === day.dayOfWeek)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    })).filter((entry) => entry.ranges.length > 0);
  }, [availability]);

  if (rangesByDay.length === 0) {
    return (
      <div className={styles.rangeListEmpty}>
        <p className={styles.rangeListEmptyTitle}>Chưa có khung giờ nào</p>
        <p className={styles.rangeListEmptyHint}>
          Bấm “Thêm theo khung giờ” để chọn ngày và khoảng thời gian bạn có thể dạy.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.rangeList}>
      {rangesByDay.map(({ day, ranges }) => (
        <div key={day.dayOfWeek} className={styles.rangeListDay}>
          <div className={styles.rangeListDayHead}>
            <span className={styles.rangeListDayName}>{day.full}</span>
            <span className={styles.rangeListDayCount}>{ranges.length} khung</span>
          </div>

          <ul className={styles.rangeListItems}>
            {ranges.map((range) => (
              <li key={`${day.dayOfWeek}-${range.startMinutes}`} className={styles.rangeListItem}>
                <span className={styles.rangeListTime}>
                  {formatMinutes(range.startMinutes)} – {formatMinutes(range.endMinutes)}
                </span>
                <span className={styles.rangeListDuration}>
                  {(range.endMinutes - range.startMinutes) / 60} giờ
                </span>
                <button
                  type="button"
                  className={styles.rangeListRemove}
                  disabled={disabled}
                  aria-label={`Xoá khung ${formatMinutes(range.startMinutes)} đến ${formatMinutes(range.endMinutes)} ${day.full}`}
                  onClick={() => onRemoveRange(day.dayOfWeek, range.startMinutes, range.endMinutes)}
                >
                  <CloseOutlined />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default AvailabilityRangeList;
