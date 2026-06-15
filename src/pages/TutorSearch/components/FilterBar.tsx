import { useState } from "react";
import CustomDropdown, { type DropdownOption } from "../../../components/CustomDropdown/CustomDropdown";
import { FilterIcon, SubjectIcons, subjectIcon } from "./icons";
import {
    budgetRangeOptions,
    teachingModeOptions,
    gradeLevelChips,
    sortByOptions,
} from "./constants";

interface SubjectItem {
    subjectId: number;
    subjectName: string;
}

interface FilterBarProps {
    subjects: SubjectItem[];
    activeSubjectIds: number[];
    gradeLevels: string[];
    budgetRange: string;
    teachingMode: string;
    city: string;
    cityOptions: DropdownOption[];
    sortBy: string;
    onSubjectToggle: (subjectId: number) => void;
    onClearSubjects: () => void;
    onGradeLevelToggle: (value: string) => void;
    onBudgetRangeChange: (value: string) => void;
    onTeachingModeChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onSortByChange: (value: string) => void;
    onResetFilters: () => void;
}

type OpenPanel = "subjects" | "grades" | null;

const Chevron = ({ open }: { open: boolean }) => (
    <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const FilterBar = ({
    subjects,
    activeSubjectIds,
    gradeLevels,
    budgetRange,
    teachingMode,
    city,
    cityOptions,
    sortBy,
    onSubjectToggle,
    onClearSubjects,
    onGradeLevelToggle,
    onBudgetRangeChange,
    onTeachingModeChange,
    onCityChange,
    onSortByChange,
    onResetFilters,
}: FilterBarProps) => {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
    const hasActiveFilters =
        activeSubjectIds.length > 0 ||
        gradeLevels.length > 0 ||
        budgetRange !== "all" ||
        teachingMode !== "" ||
        city !== "" ||
        sortBy !== "rating_desc";

    const getSubjectLabel = () => {
        if (activeSubjectIds.length === 0) return "Tất cả";
        if (activeSubjectIds.length === 1) {
            return subjects.find((s) => s.subjectId === activeSubjectIds[0])?.subjectName || "Tất cả";
        }
        return `${activeSubjectIds.length} môn`;
    };

    const getSubjectIcon = () => {
        if (activeSubjectIds.length === 1) {
            const s = subjects.find((x) => x.subjectId === activeSubjectIds[0]);
            return s ? subjectIcon(s.subjectName) : SubjectIcons.all;
        }
        return SubjectIcons.all;
    };

    const getGradeLabel = () => {
        if (gradeLevels.length === 0) return "Tất cả";
        if (gradeLevels.length === 1) {
            return gradeLevelChips.find((grade) => grade.value === gradeLevels[0])?.label || "Tất cả";
        }
        return `${gradeLevels.length} lớp`;
    };

    const togglePanel = (panel: Exclude<OpenPanel, null>) => {
        setOpenPanel((current) => (current === panel ? null : panel));
    };

    const handleClearSubjects = () => {
        onClearSubjects();
        setOpenPanel(null);
    };

    const handleGradeToggle = (grade: string) => {
        onGradeLevelToggle(grade);
        if (grade === "all") setOpenPanel(null);
    };

    const handleReset = () => {
        setOpenPanel(null);
        onResetFilters();
    };

    return (
        <section className={`filter-section ${openPanel ? "panel-open" : ""}`}>
            <div className="filter-container">
                <div className="filter-row-main">
                    <div className="filter-primary">
                        <button
                            type="button"
                            className={`filter-summary-pill subject-pill ${openPanel === "subjects" ? "active" : ""} ${activeSubjectIds.length > 0 ? "has-value" : ""}`}
                            onClick={() => togglePanel("subjects")}
                            aria-expanded={openPanel === "subjects"}
                            aria-controls="subject-filter-panel"
                        >
                            <span className="filter-pill-icon">{getSubjectIcon()}</span>
                            <span className="filter-pill-copy">
                                <span className="filter-label">Môn học</span>
                                <strong>{getSubjectLabel()}</strong>
                            </span>
                            <span className="filter-pill-chevron">
                                <Chevron open={openPanel === "subjects"} />
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`filter-summary-pill ${openPanel === "grades" ? "active" : ""} ${gradeLevels.length > 0 ? "has-value" : ""}`}
                            onClick={() => togglePanel("grades")}
                            aria-expanded={openPanel === "grades"}
                            aria-controls="grade-filter-panel"
                        >
                            <span className="filter-pill-copy">
                                <span className="filter-label">Cấp học</span>
                                <strong>{getGradeLabel()}</strong>
                            </span>
                            <span className="filter-pill-chevron">
                                <Chevron open={openPanel === "grades"} />
                            </span>
                        </button>

                        <div className={`filter-dropdown-pill ${city ? "has-value" : ""}`}>
                            <span className="filter-label">Khu vực</span>
                            <CustomDropdown variant="filter" value={city} onChange={onCityChange} options={cityOptions} />
                        </div>

                        <div className={`filter-dropdown-pill ${budgetRange !== "all" ? "has-value" : ""}`}>
                            <span className="filter-label">Ngân sách</span>
                            <CustomDropdown variant="filter" value={budgetRange} onChange={onBudgetRangeChange} options={budgetRangeOptions} />
                        </div>

                        <div className={`filter-dropdown-pill ${teachingMode ? "has-value" : ""}`}>
                            <span className="filter-label">Hình thức</span>
                            <CustomDropdown variant="filter" value={teachingMode} onChange={onTeachingModeChange} options={teachingModeOptions} />
                        </div>
                    </div>

                    <div className="filter-actions">
                        <div className="sort-group">
                            <span className="sort-label">Sort by</span>
                            <CustomDropdown variant="sort" value={sortBy} onChange={onSortByChange} options={sortByOptions} />
                        </div>
                        <button
                            type="button"
                            className={`btn-filter ${hasActiveFilters ? "has-value" : ""}`}
                            onClick={handleReset}
                            title={hasActiveFilters ? "Xóa bộ lọc" : "Bộ lọc"}
                        >
                            <span className="btn-filter-icon"><FilterIcon /></span>
                            <span className="btn-filter-text">{hasActiveFilters ? "Xóa lọc" : "Filters"}</span>
                        </button>
                    </div>
                </div>

                {openPanel === "subjects" && (
                    <div id="subject-filter-panel" className="filter-options-panel subject-options-panel">
                        <button
                            type="button"
                            className={`filter-option-chip subject-option ${activeSubjectIds.length === 0 ? "active" : ""}`}
                            onClick={handleClearSubjects}
                            aria-pressed={activeSubjectIds.length === 0}
                        >
                            <span className="filter-option-icon">{SubjectIcons.all}</span>
                            <span>Tất cả</span>
                        </button>
                        {subjects.map((subject) => {
                            const isActive = activeSubjectIds.includes(subject.subjectId);
                            return (
                                <button
                                    key={subject.subjectId}
                                    type="button"
                                    className={`filter-option-chip subject-option ${isActive ? "active" : ""}`}
                                    onClick={() => onSubjectToggle(subject.subjectId)}
                                    aria-pressed={isActive}
                                >
                                    <span className="filter-option-icon">{subjectIcon(subject.subjectName)}</span>
                                    <span>{subject.subjectName}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {openPanel === "grades" && (
                    <div id="grade-filter-panel" className="filter-options-panel grade-options-panel">
                        <button
                            type="button"
                            className={`filter-option-chip ${gradeLevels.length === 0 ? "active" : ""}`}
                            onClick={() => handleGradeToggle("all")}
                            aria-pressed={gradeLevels.length === 0}
                        >
                            Tất cả
                        </button>
                        {gradeLevelChips.map((chip) => (
                            <button
                                key={chip.value}
                                type="button"
                                className={`filter-option-chip ${gradeLevels.includes(chip.value) ? "active" : ""}`}
                                onClick={() => handleGradeToggle(chip.value)}
                                aria-pressed={gradeLevels.includes(chip.value)}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default FilterBar;
