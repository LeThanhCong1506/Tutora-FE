'use client';

import {
  budgetRangeOptions,
  categories,
  cityOptions,
  gradeLevelChips,
  sortByOptions,
  teachingModeOptions,
} from './constants';

interface ActiveFiltersProps {
  categories: string[];
  gradeLevels: string[];
  city: string;
  budgetRange: string;
  teachingMode: string;
  sortBy: string;
  onRemoveCategory: (category: string) => void;
  onRemoveGradeLevel: (gradeLevel: string) => void;
  onRemoveCity: () => void;
  onRemoveBudgetRange: () => void;
  onRemoveTeachingMode: () => void;
  onRemoveSortBy: () => void;
  onClearAll: () => void;
}

const RemoveIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function ActiveFilters({
  categories: selectedCategories,
  gradeLevels,
  city,
  budgetRange,
  teachingMode,
  sortBy,
  onRemoveCategory,
  onRemoveGradeLevel,
  onRemoveCity,
  onRemoveBudgetRange,
  onRemoveTeachingMode,
  onRemoveSortBy,
  onClearAll,
}: ActiveFiltersProps) {
  const hasBudget = budgetRange !== '' && budgetRange !== 'all';
  const hasTeachingMode = teachingMode !== '';
  const hasSortBy = sortBy !== '' && sortBy !== 'rating_desc';
  const hasAny =
    selectedCategories.length > 0 ||
    gradeLevels.length > 0 ||
    city !== '' ||
    hasBudget ||
    hasTeachingMode ||
    hasSortBy;

  if (!hasAny) return null;

  const cityLabel = cityOptions.find((c) => c.value === city)?.label || city;
  const budgetLabel = budgetRangeOptions.find((b) => b.value === budgetRange)?.label || budgetRange;
  const teachingModeLabel =
    teachingModeOptions.find((t) => t.value === teachingMode)?.label || teachingMode;
  const sortByLabel = sortByOptions.find((s) => s.value === sortBy)?.label || sortBy;

  return (
    <div className="active-filters-bar">
      <div className="active-filters-container">
        <span className="active-filters-label">Bộ lọc đang chọn:</span>
        <div className="active-filters-chips">
          {selectedCategories.map((catId) => {
            const catDef = categories.find((c) => c.id === catId);
            return (
              <span key={`cat-${catId}`} className="active-filter-chip category-chip">
                {catDef?.name || catId}
                <button className="chip-remove" onClick={() => onRemoveCategory(catId)} aria-label="Xóa">
                  <RemoveIcon />
                </button>
              </span>
            );
          })}
          {gradeLevels.map((gl) => {
            const chip = gradeLevelChips.find((g) => g.value === gl);
            return (
              <span key={`gl-${gl}`} className="active-filter-chip grade-chip">
                {chip?.label || gl}
                <button className="chip-remove" onClick={() => onRemoveGradeLevel(gl)} aria-label="Xóa">
                  <RemoveIcon />
                </button>
              </span>
            );
          })}
          {city && (
            <span className="active-filter-chip city-chip">
              {cityLabel}
              <button className="chip-remove" onClick={onRemoveCity} aria-label="Xóa">
                <RemoveIcon />
              </button>
            </span>
          )}
          {hasBudget && (
            <span className="active-filter-chip budget-chip">
              {budgetLabel}
              <button className="chip-remove" onClick={onRemoveBudgetRange} aria-label="Xóa">
                <RemoveIcon />
              </button>
            </span>
          )}
          {hasTeachingMode && (
            <span className="active-filter-chip teaching-mode-chip">
              {teachingModeLabel}
              <button className="chip-remove" onClick={onRemoveTeachingMode} aria-label="Xóa">
                <RemoveIcon />
              </button>
            </span>
          )}
          {hasSortBy && (
            <span className="active-filter-chip sort-by-chip">
              {sortByLabel}
              <button className="chip-remove" onClick={onRemoveSortBy} aria-label="Xóa">
                <RemoveIcon />
              </button>
            </span>
          )}
        </div>
        <button className="active-filters-clear" onClick={onClearAll}>
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
