import React from 'react';
import './TourPageMenu.css';

export interface TourPageOption {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

interface TourPageMenuProps {
    options: TourPageOption[];
    completedKeys: Set<string>;
    onSelect: (key: string) => void;
    onClose: () => void;
}

const TourPageMenu: React.FC<TourPageMenuProps> = ({ options, completedKeys, onSelect, onClose }) => {
    return (
        <div className="tour-page-menu-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-page-menu-title">
            <div className="tour-page-menu-card">
                <button
                    type="button"
                    className="tour-page-menu-close-btn"
                    onClick={onClose}
                    aria-label="Đóng"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2 2L12 12M12 2L2 12" strokeLinecap="round" />
                    </svg>
                </button>

                <h2 id="tour-page-menu-title" className="tour-page-menu-title">
                    🧭 Bạn cần hướng dẫn về phần nào?
                </h2>
                <p className="tour-page-menu-subtitle">
                    Chọn một trang bên dưới — chúng tôi sẽ đưa bạn tới đó và hướng dẫn chi tiết từng phần.
                </p>

                <div className="tour-page-menu-grid">
                    {options.map((option) => {
                        const isCompleted = completedKeys.has(option.key);
                        return (
                            <button
                                type="button"
                                key={option.key}
                                className="tour-page-menu-item"
                                onClick={() => onSelect(option.key)}
                            >
                                <span className="tour-page-menu-item-icon" aria-hidden="true">
                                    {option.icon}
                                </span>
                                <span className="tour-page-menu-item-copy">
                                    <span className="tour-page-menu-item-label">
                                        {option.label}
                                        {isCompleted && (
                                            <span className="tour-page-menu-item-badge">✓ Đã xem</span>
                                        )}
                                    </span>
                                    <span className="tour-page-menu-item-desc">{option.description}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TourPageMenu;
