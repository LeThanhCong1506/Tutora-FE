import { gradeLevelChips } from "./constants";

interface SubjectItem {
    subjectId: number;
    subjectName: string;
}

interface ActiveFiltersProps {
    subjects: SubjectItem[];
    subjectIds: number[];
    gradeLevels: string[];
    onRemoveSubject: (subjectId: number) => void;
    onRemoveGradeLevel: (gradeLevel: string) => void;
    onClearAll: () => void;
}

const ActiveFilters = ({ subjects, subjectIds, gradeLevels, onRemoveSubject, onRemoveGradeLevel, onClearAll }: ActiveFiltersProps) => {
    const hasAny = subjectIds.length > 0 || gradeLevels.length > 0;
    if (!hasAny) return null;

    return (
        <div className="active-filters-bar">
            <div className="active-filters-container">
                <span className="active-filters-label">Bộ lọc đang chọn:</span>
                <div className="active-filters-chips">
                    {subjectIds.map((id) => {
                        const name = subjects.find((s) => s.subjectId === id)?.subjectName || String(id);
                        return (
                            <span key={`subj-${id}`} className="active-filter-chip category-chip">
                                {name}
                                <button className="chip-remove" onClick={() => onRemoveSubject(id)} aria-label="Xóa">
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
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
