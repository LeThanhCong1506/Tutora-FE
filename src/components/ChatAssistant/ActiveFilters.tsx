// Chip "đang lọc theo…" — cho user THẤY và TỰ BỎ tiêu chí đang áp dụng.
//
// Vì sao cần: filter tích luỹ qua các lượt và vô hình với user. Một tiêu chí nêu từ 5 lượt
// trước vẫn đang chặn kết quả, mà cách duy nhất để gỡ là nói đúng câu khiến AI hiểu là bỏ.
// Chip biến việc đó thành một cú bấm — không phải thuyết phục mô hình.
import React from 'react';
import { X } from 'lucide-react';
import type { AssistantFilters } from '../../services/assistant.service';
import { useSubjects } from '../../hooks/useSubjects';
import { useGradeLevels } from '../../hooks/useGradeLevels';
import styles from './ChatAssistant.module.css';

const DAY_LABELS: Record<number, string> = {
  1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN',
};

const money = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

/** Các field bị xoá cùng nhau khi bấm ✕ trên 1 chip. Lịch là MỘT CỤM: bỏ ngày mà giữ
 *  khung giờ thì vẫn còn lọc theo giờ, user tưởng đã gỡ hết ràng buộc lịch. */
type Chip = { key: string; label: string; clears: (keyof AssistantFilters)[] };

export const buildChips = (
  f: AssistantFilters | null,
  subjectName: (id: number) => string | undefined,
  gradeName: (id: number) => string | undefined,
): Chip[] => {
  if (!f) return [];
  const chips: Chip[] = [];

  if (f.subject_id) {
    chips.push({ key: 'subject', label: subjectName(f.subject_id) ?? 'Môn đã chọn',
                 clears: ['subject_id'] });
  }
  if (f.grade_level_id) {
    chips.push({ key: 'grade', label: gradeName(f.grade_level_id) ?? 'Lớp đã chọn',
                 clears: ['grade_level_id'] });
  }
  if (f.min_rate != null || f.max_rate != null) {
    const label = f.min_rate != null && f.max_rate != null
      ? `${money(f.min_rate)}–${money(f.max_rate)}/giờ`
      : f.max_rate != null ? `dưới ${money(f.max_rate)}/giờ` : `từ ${money(f.min_rate!)}/giờ`;
    chips.push({ key: 'rate', label, clears: ['min_rate', 'max_rate'] });
  }
  if (f.tutor_gender) {
    chips.push({ key: 'gender', label: f.tutor_gender === 'female' ? 'Gia sư nữ' : 'Gia sư nam',
                 clears: ['tutor_gender'] });
  }
  if (f.available_days?.length) {
    const sep = f.available_days_match === 'all' ? ' + ' : ' / ';
    const days = [...f.available_days].sort().map((d) => DAY_LABELS[d] ?? d).join(sep);
    const time = f.available_from && f.available_to ? ` ${f.available_from}–${f.available_to}` : '';
    chips.push({
      key: 'days', label: `Rảnh ${days}${time}`,
      clears: ['available_days', 'available_days_match', 'available_from', 'available_to'],
    });
  } else if (f.available_from && f.available_to) {
    chips.push({ key: 'time', label: `${f.available_from}–${f.available_to}`,
                 clears: ['available_from', 'available_to'] });
  }
  if (f.preferences) {
    // Tiêu chí mềm: chỉ ảnh hưởng thứ tự, không loại ai — nói "ưu tiên" cho đúng.
    chips.push({ key: 'prefs', label: `Ưu tiên: ${f.preferences}`, clears: ['preferences'] });
  }
  return chips;
};

interface Props {
  filters: AssistantFilters | null;
  onClear: (fields: (keyof AssistantFilters)[]) => void;
}

const ActiveFilters: React.FC<Props> = ({ filters, onClear }) => {
  const { subjects } = useSubjects();
  const { gradeLevels } = useGradeLevels();

  const chips = buildChips(
    filters,
    (id) => subjects.find((s) => s.subjectId === id)?.subjectName,
    (id) => gradeLevels.find((g) => g.gradeLevelId === id)?.gradeName,
  );
  if (chips.length === 0) return null;

  return (
    <div className={styles.activeFilters} aria-label="Tiêu chí đang lọc">
      <span className={styles.activeFiltersLabel}>Đang lọc:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className={styles.filterChip}
          onClick={() => onClear(c.clears)}
          aria-label={`Bỏ tiêu chí ${c.label}`}
          title={`Bỏ tiêu chí ${c.label}`}
        >
          <span className={styles.filterChipText}>{c.label}</span>
          <X size={12} />
        </button>
      ))}
    </div>
  );
};

export default ActiveFilters;
