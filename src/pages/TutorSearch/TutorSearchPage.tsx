import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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

// Ánh xạ field filter -> tên param trên URL. Toàn bộ điều kiện tìm kiếm (môn học,
// khu vực, ngân sách,...) và trang hiện tại sống trong URL — để "xem hồ sơ gia sư"
// rồi back trả về đúng trang + điều kiện lọc đang dùng, thay vì luôn reset về mặc định.
const FILTER_PARAM_KEYS: Record<keyof SearchFilters, string> = {
    searchTerm: "q",
    subjectIds: "subjects",
    gradeLevels: "grades",
    budgetRange: "budget",
    teachingMode: "mode",
    city: "city",
    sortBy: "sort",
    pageNumber: "page",
    pageSize: "pageSize",
};

const parseFiltersFromParams = (params: URLSearchParams): SearchFilters => {
    const subjectsParam = params.get(FILTER_PARAM_KEYS.subjectIds);
    const gradesParam = params.get(FILTER_PARAM_KEYS.gradeLevels);
    const pageParam = Number(params.get(FILTER_PARAM_KEYS.pageNumber));

    return {
        searchTerm: params.get(FILTER_PARAM_KEYS.searchTerm) || defaultFilters.searchTerm,
        subjectIds: subjectsParam
            ? subjectsParam
                  .split(",")
                  .map(Number)
                  .filter((id) => !Number.isNaN(id))
            : defaultFilters.subjectIds,
        gradeLevels: gradesParam ? gradesParam.split(",") : defaultFilters.gradeLevels,
        budgetRange: params.get(FILTER_PARAM_KEYS.budgetRange) || defaultFilters.budgetRange,
        teachingMode: params.get(FILTER_PARAM_KEYS.teachingMode) || defaultFilters.teachingMode,
        city: params.get(FILTER_PARAM_KEYS.city) || defaultFilters.city,
        sortBy: params.get(FILTER_PARAM_KEYS.sortBy) || defaultFilters.sortBy,
        pageNumber: pageParam > 0 ? pageParam : defaultFilters.pageNumber,
        pageSize: defaultFilters.pageSize,
    };
};

const TutorSearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
    const [inputSearchTerm, setInputSearchTerm] = useState(
        () => searchParams.get(FILTER_PARAM_KEYS.searchTerm) || ""
    );

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

    const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "") next.delete(key);
            else next.set(key, value);
        });
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
        const paramKey = FILTER_PARAM_KEYS[key];
        const isDefault = JSON.stringify(value) === JSON.stringify(defaultFilters[key]);
        const stringValue = Array.isArray(value) ? value.join(",") : String(value);
        updateSearchParams({
            [paramKey]: isDefault ? null : stringValue,
            [FILTER_PARAM_KEYS.pageNumber]: null,
        });
    }, [updateSearchParams]);

    const handleSearchSubmit = useCallback(() => {
        updateFilter("searchTerm", inputSearchTerm);
    }, [inputSearchTerm, updateFilter]);

    const handleTrendingClick = useCallback((tag: string) => {
        setInputSearchTerm(tag);
        updateFilter("searchTerm", tag);
    }, [updateFilter]);

    const handleSubjectToggle = useCallback((subjectId: number) => {
        const next = filters.subjectIds.includes(subjectId)
            ? filters.subjectIds.filter(id => id !== subjectId)
            : [...filters.subjectIds, subjectId];
        updateFilter("subjectIds", next);
    }, [filters.subjectIds, updateFilter]);

    const handleClearSubjects = useCallback(() => {
        updateFilter("subjectIds", []);
    }, [updateFilter]);

    const handleGradeLevelToggle = useCallback((value: string) => {
        if (value === "all") {
            updateFilter("gradeLevels", []);
        } else {
            const next = filters.gradeLevels.includes(value)
                ? filters.gradeLevels.filter(g => g !== value)
                : [...filters.gradeLevels, value];
            updateFilter("gradeLevels", next);
        }
    }, [filters.gradeLevels, updateFilter]);

    const handleResetFilters = useCallback(() => {
        setInputSearchTerm("");
        setSearchParams(new URLSearchParams());
    }, [setSearchParams]);

    const handlePageChange = useCallback((page: number) => {
        const nextPage = Math.max(1, Math.min(page, totalPages));
        if (nextPage !== filters.pageNumber) {
            updateSearchParams({ [FILTER_PARAM_KEYS.pageNumber]: nextPage <= 1 ? null : String(nextPage) });
        }

        window.setTimeout(() => {
            document.querySelector(".results-section")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    }, [totalPages, filters.pageNumber, updateSearchParams]);

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
                        updateSearchParams({
                            [FILTER_PARAM_KEYS.subjectIds]: null,
                            [FILTER_PARAM_KEYS.gradeLevels]: null,
                            [FILTER_PARAM_KEYS.pageNumber]: null,
                        });
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
