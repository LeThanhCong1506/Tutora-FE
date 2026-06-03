'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './CustomDropdown.css';

/**
 * Port từ Vite (`src/components/CustomDropdown/CustomDropdown.tsx`).
 * Toàn bộ là client logic (portal, scroll lock, click outside) → 'use client' bắt buộc.
 *
 * SSR safety: `createPortal(panel, document.body)` chỉ chạy khi `isOpen` true,
 * mà `isOpen` chỉ true sau user click → KHÔNG bao giờ chạy ở SSR. An toàn.
 */

const ChevronIcon = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownOptionGroup {
  label: string;
  options: DropdownOption[];
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: DropdownOption[];
  optionGroups?: DropdownOptionGroup[];
  placeholder?: DropdownOption;
  className?: string;
  variant?: 'filter' | 'sort';
}

const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

export default function CustomDropdown({
  value,
  onChange,
  options,
  optionGroups,
  placeholder,
  className = '',
  variant = 'filter',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 200 });

  const getSelectedLabel = (): string => {
    if (placeholder && value === placeholder.value) return placeholder.label;
    if (optionGroups) {
      for (const group of optionGroups) {
        const found = group.options.find((opt) => opt.value === value);
        if (found) return found.label;
      }
    }
    if (options) {
      const found = options.find((opt) => opt.value === value);
      if (found) return found.label;
    }
    return placeholder?.label || '';
  };

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current || isMobile()) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(200, rect.width),
    });
  }, []);

  useEffect(() => {
    if (!isOpen || isMobile()) return;
    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (isOpen && isMobile()) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isMobile()) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const renderOptions = () => {
    const items: React.ReactNode[] = [];

    if (placeholder) {
      items.push(
        <button
          key={placeholder.value}
          className={`custom-dropdown-option ${value === placeholder.value ? 'selected' : ''}`}
          onClick={() => handleSelect(placeholder.value)}
          type="button"
        >
          <span className="custom-dropdown-option-label">{placeholder.label}</span>
          {value === placeholder.value && <span className="custom-dropdown-check">✓</span>}
        </button>
      );
    }

    if (optionGroups) {
      optionGroups.forEach((group) => {
        items.push(
          <div key={group.label} className="custom-dropdown-group">
            <div className="custom-dropdown-group-label">{group.label}</div>
            {group.options.map((opt) => (
              <button
                key={opt.value}
                className={`custom-dropdown-option grouped ${value === opt.value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
                type="button"
              >
                <span className="custom-dropdown-option-label">{opt.label}</span>
                {value === opt.value && <span className="custom-dropdown-check">✓</span>}
              </button>
            ))}
          </div>
        );
      });
    }

    if (options && !optionGroups) {
      options.forEach((opt) => {
        if (placeholder && opt.value === placeholder.value) return;
        items.push(
          <button
            key={opt.value}
            className={`custom-dropdown-option ${value === opt.value ? 'selected' : ''}`}
            onClick={() => handleSelect(opt.value)}
            type="button"
          >
            <span className="custom-dropdown-option-label">{opt.label}</span>
            {value === opt.value && <span className="custom-dropdown-check">✓</span>}
          </button>
        );
      });
    }

    return items;
  };

  const dropdownPanel =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className={`custom-dropdown-portal ${variant}`}>
            <div className="custom-dropdown-backdrop" onClick={() => setIsOpen(false)} />
            <div
              ref={panelRef}
              className="custom-dropdown-panel"
              style={
                !isMobile()
                  ? {
                      position: 'fixed',
                      top: `${panelPos.top}px`,
                      left: `${panelPos.left}px`,
                      minWidth: `${panelPos.width}px`,
                    }
                  : undefined
              }
            >
              <div className="custom-dropdown-handle">
                <div className="custom-dropdown-handle-bar" />
              </div>
              <div className="custom-dropdown-title">{getSelectedLabel()}</div>
              <div className="custom-dropdown-options" role="listbox">
                {renderOptions()}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`custom-dropdown ${variant} ${isOpen ? 'open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="custom-dropdown-value">{getSelectedLabel()}</span>
        <span className={`custom-dropdown-chevron ${isOpen ? 'rotated' : ''}`}>
          <ChevronIcon />
        </span>
      </button>
      {dropdownPanel}
    </div>
  );
}
