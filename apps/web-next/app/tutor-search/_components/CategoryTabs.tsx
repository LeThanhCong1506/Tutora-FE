'use client';

import { useState } from 'react';
import { categories } from './constants';
import { SubjectIcons } from './icons';

interface CategoryTabsProps {
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
}

export default function CategoryTabs({ activeCategories, onCategoryToggle }: CategoryTabsProps) {
  const [showSubjects, setShowSubjects] = useState(false);

  const getLabel = () => {
    if (activeCategories.length === 0) return 'Tất cả';
    if (activeCategories.length === 1)
      return categories.find((c) => c.id === activeCategories[0])?.name || 'Tất cả';
    return `${activeCategories.length} môn`;
  };

  const getIcon = () => {
    if (activeCategories.length === 1) {
      return categories.find((c) => c.id === activeCategories[0])?.icon || SubjectIcons.all;
    }
    return SubjectIcons.all;
  };

  return (
    <section className="category-section">
      <div className="category-header">
        <button
          className={`category-toggle-btn ${showSubjects ? 'open' : ''}`}
          onClick={() => setShowSubjects(!showSubjects)}
        >
          <span className="category-toggle-icon">{getIcon()}</span>
          <span className="category-toggle-label">
            Môn học: <strong>{getLabel()}</strong>
          </span>
          <svg
            className="category-toggle-arrow"
            width="12"
            height="7"
            viewBox="0 0 12 7"
            fill="none"
            style={{ transform: showSubjects ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}
          >
            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {showSubjects && (
        <div className="category-dropdown">
          {categories.map((category) => {
            const isAll = category.id === 'all';
            const isActive = isAll ? activeCategories.length === 0 : activeCategories.includes(category.id);
            return (
              <button
                key={category.id}
                className={`category-option ${isActive ? 'active' : ''}`}
                onClick={() => onCategoryToggle(isAll ? 'all' : category.id)}
              >
                <span className="category-option-icon">{category.icon}</span>
                <span className="category-option-text">{category.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
