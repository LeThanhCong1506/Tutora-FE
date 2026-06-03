'use client';

import { useState } from 'react';
import CustomDropdown from '@/components/CustomDropdown/CustomDropdown';
import { FilterIcon } from './icons';
import {
  budgetRangeOptions,
  teachingModeOptions,
  cityOptions,
  gradeLevelChips,
  sortByOptions,
} from './constants';

interface FilterBarProps {
  gradeLevels: string[];
  budgetRange: string;
  teachingMode: string;
  city: string;
  sortBy: string;
  onGradeLevelToggle: (value: string) => void;
  onBudgetRangeChange: (value: string) => void;
  onTeachingModeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onResetFilters: () => void;
}

export default function FilterBar({
  gradeLevels,
  budgetRange,
  teachingMode,
  city,
  sortBy,
  onGradeLevelToggle,
  onBudgetRangeChange,
  onTeachingModeChange,
  onCityChange,
  onSortByChange,
  onResetFilters,
}: FilterBarProps) {
  const [showGrades, setShowGrades] = useState(false);
  const hasActiveFilters =
    gradeLevels.length > 0 ||
    budgetRange !== 'all' ||
    teachingMode !== '' ||
    city !== '' ||
    sortBy !== 'rating_desc';

  const getGradeLabel = () => {
    if (gradeLevels.length === 0) return 'Tất cả';
    if (gradeLevels.length === 1)
      return gradeLevelChips.find((g) => g.value === gradeLevels[0])?.label || 'Tất cả';
    return `${gradeLevels.length} lớp`;
  };

  return (
    <section className="filter-section">
      <div className="filter-container">
        <div className="filter-row-main">
          <div className="filter-groups">
            <div className="filter-group">
              <span className="filter-label">Cấp học</span>
              <button
                className={`filter-toggle-btn ${showGrades ? 'active' : ''} ${gradeLevels.length > 0 ? 'has-value' : ''}`}
                onClick={() => setShowGrades(!showGrades)}
              >
                <span>{getGradeLabel()}</span>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  style={{ transform: showGrades ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="filter-divider"></div>
            <div className="filter-group">
              <span className="filter-label">Khu vực</span>
              <CustomDropdown variant="filter" value={city} onChange={onCityChange} options={cityOptions} />
            </div>
            <div className="filter-divider"></div>
            <div className="filter-group">
              <span className="filter-label">Ngân sách</span>
              <CustomDropdown variant="filter" value={budgetRange} onChange={onBudgetRangeChange} options={budgetRangeOptions} />
            </div>
            <div className="filter-divider"></div>
            <div className="filter-group">
              <span className="filter-label">Hình thức</span>
              <CustomDropdown variant="filter" value={teachingMode} onChange={onTeachingModeChange} options={teachingModeOptions} />
            </div>
          </div>
          <div className="filter-actions">
            <div className="sort-group">
              <span className="sort-label">Sort by</span>
              <CustomDropdown variant="sort" value={sortBy} onChange={onSortByChange} options={sortByOptions} />
            </div>
            <button className="btn-filter" onClick={onResetFilters} title={hasActiveFilters ? 'Xóa bộ lọc' : 'Bộ lọc'}>
              <span className="btn-filter-icon">
                <FilterIcon />
              </span>
              <span className="btn-filter-text">{hasActiveFilters ? 'Xóa lọc' : 'Filters'}</span>
            </button>
          </div>
        </div>

        {showGrades && (
          <div className="grade-chips-row">
            <button
              className={`grade-chip ${gradeLevels.length === 0 ? 'active' : ''}`}
              onClick={() => onGradeLevelToggle('all')}
            >
              Tất cả
            </button>
            {gradeLevelChips.map((chip) => (
              <button
                key={chip.value}
                className={`grade-chip ${gradeLevels.includes(chip.value) ? 'active' : ''}`}
                onClick={() => onGradeLevelToggle(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
