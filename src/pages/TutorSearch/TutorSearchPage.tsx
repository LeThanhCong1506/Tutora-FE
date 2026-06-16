import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { searchTutors } from "../../services/tutorSearch.service";
import type { TutorSearchParams } from "../../services/tutorSearch.service";
import { useProvinces } from "../../hooks/useVietnamLocations";
import { useSubjects } from "../../hooks/useSubjects";
import { useGradeLevels } from "../../hooks/useGradeLevels";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { isZaloMiniApp } from "../../services/zalo-env";
import {
    SearchHero,
    FilterBar,
    ActiveFilters,
    ResultsSection,
    mapApiTutorToUi,
    defaultFilters,
} from "./components";
import type { Tutor, SearchFilters } from "./components";
import "../../styles/pages/tutor-search.css";

const CLIENT_FILTER_PAGE_SIZE = 500;

const TutorSearchPage = () => {
    const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
    const [inputSearchTerm, setInputSearchTerm] = useState("");

    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isFilterStuck, setIsFilterStuck] = useState(false);

    const filterSentinelRef = useRef<HTMLDivElement | null>(null);

    // Tỉnh/thành cho bộ lọc "Khu vực" — lấy từ API v2 (provinces.open-api.vn).
    // Giá trị filter = TÊN tỉnh, khớp đúng teachingAreaCity mà hồ sơ gia sư lưu (BE so khớp chính xác).
    const { provinces } = useProvinces();
    const cityOptions = useMemo(
        () => [
            { value: "", label: "Tất cả" },
            ...provinces.map((p) => ({ value: p.name, label: p.name })),
        ],
        [provinces]
    );

    // Danh sách môn học cho bộ lọc — lấy từ API (GET /api/subjects) thay vì hardcode.
    const { subjects } = useSubjects();

    // Danh sách cấp học cho bộ lọc — lấy từ API (GET /api/grade-levels) thay vì hardcode.
    const { gradeLevels: gradeLevelOptions } = useGradeLevels();

    // Build API params from filters.
    // NOTE: subjectIds hỗ trợ multi-select SERVER-SIDE (BE lọc theo List<int>).
    // Cấp học KHÔNG gửi lên server: BE lọc gradeLevel bằng ILIKE substring trên
    // gradeName nên "Lớp 1" sẽ dính cả "Lớp 10/11/12". Vì vậy lọc cấp học hoàn toàn
    // ở client (khớp chính xác theo tên) — xem applyClientSideFilters.
    const buildApiParams = useCallback((f: SearchFilters): TutorSearchParams => {
        const params: TutorSearchParams = {
            pageNumber: f.pageNumber,
            pageSize: f.pageSize,
            sortBy: f.sortBy,
        };

        if (f.searchTerm.trim()) params.searchTerm = f.searchTerm.trim();
        if (f.subjectIds.length > 0) params.subjectIds = f.subjectIds;
        if (f.budgetRange && f.budgetRange !== "all") params.budgetRange = f.budgetRange;
        if (f.teachingMode) params.teachingMode = f.teachingMode;
        if (f.city) params.teachingAreaCity = f.city;

        return params;
    }, []);

    const applyClientSideFilters = useCallback((tutorsList: Tutor[], f: SearchFilters): Tutor[] => {
        if (f.gradeLevels.length === 0) return tutorsList;

        // Giá trị filter chính là gradeName ("Lớp 10") — khớp chính xác với
        // tutor.gradeLevels (cũng là gradeName). Gia sư phải dạy TẤT CẢ cấp đã chọn.
        return tutorsList.filter(tutor =>
            f.gradeLevels.every(gl => tutor.gradeLevels.includes(gl))
        );
    }, []);

    useEffect(() => {
        const sentinel = filterSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsFilterStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
            },
            { threshold: 0 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                setLoading(true);
                setError(null);
                const needsClientFilter = filters.gradeLevels.length > 0;
                const apiParams = buildApiParams(
                    needsClientFilter
                        ? { ...filters, pageNumber: 1, pageSize: CLIENT_FILTER_PAGE_SIZE }
                        : filters
                );
                const response = await searchTutors(apiParams);
                let mapped = response.content.items.map(mapApiTutorToUi);

                if (needsClientFilter) {
                    mapped = applyClientSideFilters(mapped, filters);
                    const startIndex = (filters.pageNumber - 1) * filters.pageSize;
                    setTutors(mapped.slice(startIndex, startIndex + filters.pageSize));
                    setTotalCount(mapped.length);
                    setTotalPages(Math.max(1, Math.ceil(mapped.length / filters.pageSize)));
                } else {
                    setTutors(mapped);
                    setTotalCount(response.content.totalCount);
                    setTotalPages(
                        Math.max(
                            1,
                            response.content.totalPages ||
                            Math.ceil(response.content.totalCount / filters.pageSize)
                        )
                    );
                }
            } catch (err) {
                console.error("Failed to fetch tutors:", err);
                setError("Không thể tải danh sách gia sư. Vui lòng thử lại.");
                setTutors([]);
                setTotalCount(0);
                setTotalPages(1);
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

    const handleSubjectToggle = useCallback((subjectId: number) => {
        setFilters(prev => {
            const next = prev.subjectIds.includes(subjectId)
                ? prev.subjectIds.filter(id => id !== subjectId)
                : [...prev.subjectIds, subjectId];
            return { ...prev, subjectIds: next, pageNumber: 1 };
        });
    }, []);

    const handleClearSubjects = useCallback(() => {
        updateFilter("subjectIds", []);
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

    const handlePageChange = useCallback((page: number) => {
        const nextPage = Math.max(1, Math.min(page, totalPages));
        setFilters((prev) => {
            if (prev.pageNumber === nextPage) return prev;
            return { ...prev, pageNumber: nextPage };
        });

        window.setTimeout(() => {
            document.querySelector(".results-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    }, [totalPages]);

    const inMiniApp = isZaloMiniApp();

    return (
        <div className={`tutor-search-page ${isFilterStuck ? "filter-stuck" : ""}`}>
            {!inMiniApp && <Header />}

            <main style={inMiniApp ? { paddingTop: 0 } : undefined}>
                <SearchHero
                    searchTerm={inputSearchTerm}
                    onSearchTermChange={setInputSearchTerm}
                    onSearch={handleSearchSubmit}
                    onTrendingClick={handleTrendingClick}
                />
                <div ref={filterSentinelRef} className="filter-sticky-sentinel" aria-hidden="true"></div>
                <FilterBar
                    subjects={subjects}
                    activeSubjectIds={filters.subjectIds}
                    gradeLevelOptions={gradeLevelOptions}
                    gradeLevels={filters.gradeLevels}
                    budgetRange={filters.budgetRange}
                    teachingMode={filters.teachingMode}
                    city={filters.city}
                    cityOptions={cityOptions}
                    sortBy={filters.sortBy}
                    onSubjectToggle={handleSubjectToggle}
                    onClearSubjects={handleClearSubjects}
                    onGradeLevelToggle={handleGradeLevelToggle}
                    onBudgetRangeChange={(v) => updateFilter("budgetRange", v)}
                    onTeachingModeChange={(v) => updateFilter("teachingMode", v)}
                    onCityChange={(v) => updateFilter("city", v)}
                    onSortByChange={(v) => updateFilter("sortBy", v)}
                    onResetFilters={handleResetFilters}
                />
                <ActiveFilters
                    subjects={subjects}
                    subjectIds={filters.subjectIds}
                    gradeLevels={filters.gradeLevels}
                    onRemoveSubject={handleSubjectToggle}
                    onRemoveGradeLevel={handleGradeLevelToggle}
                    onClearAll={() => {
                        setFilters(prev => ({ ...prev, subjectIds: [], gradeLevels: [], pageNumber: 1 }));
                    }}
                />
                <ResultsSection
                    tutors={tutors}
                    loading={loading}
                    error={error}
                    totalCount={totalCount}
                    currentPage={filters.pageNumber}
                    pageSize={filters.pageSize}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </main>
            {!inMiniApp && <Footer />}
        </div>
    );
};

export default TutorSearchPage;
