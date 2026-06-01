import { categories, gradeLevelChips } from "./constants";

interface ActiveFiltersProps {
    categories: string[];
    gradeLevels: string[];
    onRemoveCategory: (category: string) => void;
    onRemoveGradeLevel: (gradeLevel: string) => void;
    onClearAll: () => void;
}

const ActiveFilters = ({ categories: selectedCategories, gradeLevels, onRemoveCategory, onRemoveGradeLevel, onClearAll }: ActiveFiltersProps) => {
    const hasAny = selectedCategories.length > 0 || gradeLevels.length > 0;
    if (!hasAny) return null;

    return (
        <div className="active-filters-bar">
            <div className="active-filters-container">
                <span className="active-filters-label">Bộ lọc đang chọn:</span>
                <div className="active-filters-chips">
                    {selectedCategories.map(catId => {
                        const catDef = categories.find(c => c.id === catId);
                        return (
                            <span key={`cat-${catId}`} className="active-filter-chip category-chip">
                                {catDef?.name || catId}
                                <button className="chip-remove" onClick={() => onRemoveCategory(catId)} aria-label="Remove">
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </span>
                        );
                    })}
                    {gradeLevels.map(gl => {
                        const chip = gradeLevelChips.find(g => g.value === gl);
                        return (
                            <span key={`gl-${gl}`} className="active-filter-chip grade-chip">
                                {chip?.label || gl}
                                <button className="chip-remove" onClick={() => onRemoveGradeLevel(gl)} aria-label="Xóa">
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </span>
                        );
                    })}
                </div>
                <button className="active-filters-clear" onClick={onClearAll}>
                    Xóa tất cả
                </button>
            </div>
        </div>
    );
};

export default ActiveFilters;
