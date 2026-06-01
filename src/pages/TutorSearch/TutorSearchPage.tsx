import { useState, useEffect, useCallback, useRef } from "react";
import { searchTutors } from "../../services/tutorSearch.service";
import type { TutorSearchParams } from "../../services/tutorSearch.service";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { isZaloMiniApp } from "../../services/zalo-env";
import {
    SearchHero,
    CategoryTabs,
    FilterBar,
    ActiveFilters,
    ResultsSection,
    mapApiTutorToUi,
    categoryNameMap,
    defaultFilters,
} from "./components";
import type { Tutor, SearchFilters } from "./components";
import "../../styles/pages/tutor-search.css";

const TutorSearchPage = () => {
    const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
    const [inputSearchTerm, setInputSearchTerm] = useState("");

    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [hasNext, setHasNext] = useState(false);

    const isLoadMore = useRef(false);

    // Build API params from filters.
    // NOTE: Backend only supports single `category` and `gradeLevel` values.
    // For multi-select, we fetch all results and filter client-side.
    const buildApiParams = useCallback((f: SearchFilters): TutorSearchParams => {
        const params: TutorSearchParams = {
            pageNumber: f.pageNumber,
            pageSize: f.pageSize,
            sortBy: f.sortBy,
        };

        if (f.searchTerm.trim()) params.searchTerm = f.searchTerm.trim();
        if (f.categories.length === 1) params.category = f.categories[0];
        if (f.gradeLevels.length === 1) params.gradeLevel = f.gradeLevels[0];
        if (f.budgetRange && f.budgetRange !== "all") params.budgetRange = f.budgetRange;
        if (f.teachingMode) params.teachingMode = f.teachingMode;
        if (f.city) params.teachingAreaCity = f.city;

        return params;
    }, []);

    const applyClientSideFilters = useCallback((tutorsList: Tutor[], f: SearchFilters): Tutor[] => {
        let filtered = tutorsList;

        if (f.categories.length > 1) {
            const selectedNames = f.categories.map(id => categoryNameMap[id]).filter(Boolean);
            filtered = filtered.filter(tutor =>
                selectedNames.every(name => tutor.subjects.includes(name))
            );
        }

        if (f.gradeLevels.length > 1) {
            const selectedGradeLabels = f.gradeLevels.map(gl => {
                const match = gl.match(/^Grade_(\d+)$/i);
                return match ? `Lớp ${match[1]}` : gl;
            });
            filtered = filtered.filter(tutor =>
                selectedGradeLabels.every(gl => tutor.gradeLevels.includes(gl))
            );
        }

        return filtered;
    }, []);

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                setLoading(true);
                setError(null);
                const apiParams = buildApiParams(filters);
                const response = await searchTutors(apiParams);
                let mapped = response.content.items.map(mapApiTutorToUi);
                mapped = applyClientSideFilters(mapped, filters);

                if (isLoadMore.current) {
                    setTutors((prev) => [...prev, ...mapped]);
                    isLoadMore.current = false;
                } else {
                    setTutors(mapped);
                }

                const needsClientFilter = filters.categories.length > 1 || filters.gradeLevels.length > 1;
                setTotalCount(needsClientFilter ? mapped.length : response.content.totalCount);
                setHasNext(needsClientFilter ? false : response.content.hasNext);
            } catch (err) {
                console.error("Failed to fetch tutors:", err);
                setError("Không thể tải danh sách gia sư. Vui lòng thử lại.");
                if (!isLoadMore.current) {
                    setTutors([]);
                    setTotalCount(0);
                }
                isLoadMore.current = false;
            } finally {
                setLoading(false);
            }
        };

        fetchTutors();
    }, [filters, buildApiParams, applyClientSideFilters]);

    const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
        setFilters((prev) => ({ ...prev, [key]: value, pageNumber: 1 }));
    }, []);

    const handleSearchSubmit = useCallback(() => {
        updateFilter("searchTerm", inputSearchTerm);
    }, [inputSearchTerm, updateFilter]);

    const handleTrendingClick = useCallback((tag: string) => {
        setInputSearchTerm(tag);
        updateFilter("searchTerm", tag);
    }, [updateFilter]);

    const handleCategoryToggle = useCallback((category: string) => {
        if (category === "all") {
            updateFilter("categories", []);
        } else {
            setFilters(prev => {
                const next = prev.categories.includes(category)
                    ? prev.categories.filter(c => c !== category)
                    : [...prev.categories, category];
                return { ...prev, categories: next, pageNumber: 1 };
            });
        }
    }, [updateFilter]);

    const handleGradeLevelToggle = useCallback((value: string) => {
        if (value === "all") {
            updateFilter("gradeLevels", []);
        } else {
            setFilters(prev => {
                const next = prev.gradeLevels.includes(value)
                    ? prev.gradeLevels.filter(g => g !== value)
                    : [...prev.gradeLevels, value];
                return { ...prev, gradeLevels: next, pageNumber: 1 };
            });
        }
    }, [updateFilter]);

    const handleResetFilters = useCallback(() => {
        setInputSearchTerm("");
        setFilters({ ...defaultFilters });
    }, []);

    const handleLoadMore = useCallback(() => {
        isLoadMore.current = true;
        setFilters((prev) => ({ ...prev, pageNumber: prev.pageNumber + 1 }));
    }, []);

    const inMiniApp = isZaloMiniApp();

    return (
        <div className="tutor-search-page">
            {!inMiniApp && <Header />}

            <main style={inMiniApp ? { paddingTop: 0 } : undefined}>
                <SearchHero
                    searchTerm={inputSearchTerm}
                    onSearchTermChange={setInputSearchTerm}
                    onSearch={handleSearchSubmit}
                    onTrendingClick={handleTrendingClick}
                />
                <CategoryTabs
                    activeCategories={filters.categories}
                    onCategoryToggle={handleCategoryToggle}
                />
                <FilterBar
                    gradeLevels={filters.gradeLevels}
                    budgetRange={filters.budgetRange}
                    teachingMode={filters.teachingMode}
                    city={filters.city}
                    sortBy={filters.sortBy}
                    onGradeLevelToggle={handleGradeLevelToggle}
                    onBudgetRangeChange={(v) => updateFilter("budgetRange", v)}
                    onTeachingModeChange={(v) => updateFilter("teachingMode", v)}
                    onCityChange={(v) => updateFilter("city", v)}
                    onSortByChange={(v) => updateFilter("sortBy", v)}
                    onResetFilters={handleResetFilters}
                />
                <ActiveFilters
                    categories={filters.categories}
                    gradeLevels={filters.gradeLevels}
                    onRemoveCategory={handleCategoryToggle}
                    onRemoveGradeLevel={handleGradeLevelToggle}
                    onClearAll={() => {
                        setFilters(prev => ({ ...prev, categories: [], gradeLevels: [], pageNumber: 1 }));
                    }}
                />
                <ResultsSection
                    tutors={tutors}
                    loading={loading}
                    error={error}
                    totalCount={totalCount}
                    hasNext={hasNext}
                    onLoadMore={handleLoadMore}
                />
            </main>
            {!inMiniApp && <Footer />}
        </div>
    );
};

export default TutorSearchPage;
