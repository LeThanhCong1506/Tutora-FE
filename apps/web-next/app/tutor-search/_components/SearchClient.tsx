'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchHero from './SearchHero';
import CategoryTabs from './CategoryTabs';
import FilterBar from './FilterBar';
import ActiveFilters from './ActiveFilters';
import ResultsSection from './ResultsSection';
import { searchTutors } from '@/services/tutorSearch.service';
import {
  applyMultiSelectFilters,
  buildApiParams,
  filtersToQueryString,
  needsMultiSelectFilter,
  parseSearchParams,
} from './filters';
import { mapApiTutorToUi } from './utils';
import type { SearchFilters, Tutor } from './types';

/**
 * SearchClient — Orchestrator client island.
 *
 * Architecture:
 *  - URL searchParams = single source of truth cho filters (SEO-friendly, share-able).
 *  - Initial data (tutors page 1, totalCount, hasNext) đến từ Server `page.tsx`.
 *  - User đổi filter → `router.push` URL mới → Next re-runs server Component
 *    → trang re-renders với props mới (KHÔNG full page reload, RSC streaming).
 *  - "Load more" → client fetch trực tiếp + append (giữ scroll position).
 *
 * State local:
 *  - `inputSearchTerm`: user typing (uncommitted)
 *  - `loadedMore`: tutors page 2+ (append-only sau Load more click)
 *  - `currentPage`, `hasNext`: pagination state cho load-more
 */

interface SearchClientProps {
  initialTutors: Tutor[];
  initialTotalCount: number;
  initialHasNext: boolean;
  initialPage: number;
  /**
   * Set bởi Server `page.tsx` khi `searchTutorsServer` throw (vd. backend 5xx /
   * connect timeout). Khi non-null, ResultsSection render error card thay vì
   * danh sách rỗng — user thấy được lý do + nút "Thử lại".
   */
  initialError: string | null;
}

interface StatefulSearchClientProps extends SearchClientProps {
  filters: SearchFilters;
}

export default function SearchClient(props: SearchClientProps) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const filters: SearchFilters = useMemo(() => {
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    return parseSearchParams(raw);
  }, [searchParams]);

  return <StatefulSearchClient key={searchKey} {...props} filters={filters} />;
}

function StatefulSearchClient({
  initialTutors,
  initialTotalCount,
  initialHasNext,
  initialPage,
  initialError,
  filters,
}: StatefulSearchClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [inputSearchTerm, setInputSearchTerm] = useState(filters.searchTerm);
  const [loadedMore, setLoadedMore] = useState<Tutor[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const allTutors = useMemo(() => [...initialTutors, ...loadedMore], [initialTutors, loadedMore]);

  const updateFilters = useCallback(
    (next: Partial<SearchFilters>) => {
      const merged: SearchFilters = { ...filters, ...next, pageNumber: 1 };
      const qs = filtersToQueryString(merged);
      startTransition(() => {
        router.push(`/tutor-search${qs ? `?${qs}` : ''}`, { scroll: false });
      });
    },
    [filters, router]
  );

  const handleSearchSubmit = useCallback(() => {
    updateFilters({ searchTerm: inputSearchTerm });
  }, [inputSearchTerm, updateFilters]);

  const handleTrendingClick = useCallback(
    (tag: string) => {
      setInputSearchTerm(tag);
      updateFilters({ searchTerm: tag });
    },
    [updateFilters]
  );

  const handleCategoryToggle = useCallback(
    (category: string) => {
      if (category === 'all') {
        updateFilters({ categories: [] });
        return;
      }
      const next = filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category];
      updateFilters({ categories: next });
    },
    [filters.categories, updateFilters]
  );

  const handleGradeLevelToggle = useCallback(
    (value: string) => {
      if (value === 'all') {
        updateFilters({ gradeLevels: [] });
        return;
      }
      const next = filters.gradeLevels.includes(value)
        ? filters.gradeLevels.filter((g) => g !== value)
        : [...filters.gradeLevels, value];
      updateFilters({ gradeLevels: next });
    },
    [filters.gradeLevels, updateFilters]
  );

  const handleResetFilters = useCallback(() => {
    setInputSearchTerm('');
    startTransition(() => {
      router.push('/tutor-search', { scroll: false });
    });
  }, [router]);

  const handleClearMultiFilters = useCallback(() => {
    updateFilters({
      categories: [],
      gradeLevels: [],
      city: '',
      budgetRange: 'all',
      teachingMode: '',
      sortBy: 'rating_desc',
    });
  }, [updateFilters]);

  const handleRemoveCity = useCallback(() => {
    updateFilters({ city: '' });
  }, [updateFilters]);

  const handleRemoveBudgetRange = useCallback(() => {
    updateFilters({ budgetRange: 'all' });
  }, [updateFilters]);

  const handleRemoveTeachingMode = useCallback(() => {
    updateFilters({ teachingMode: '' });
  }, [updateFilters]);

  const handleRemoveSortBy = useCallback(() => {
    updateFilters({ sortBy: 'rating_desc' });
  }, [updateFilters]);

  /**
   * Soft retry — re-run server component (re-fetch initial data) mà không full reload.
   * Giữ scroll position + client state (filter input). Nếu lý do là BE vẫn down,
   * page render lại sẽ trả `initialError` mới qua try/catch ở `page.tsx`.
   */
  const handleRetry = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleLoadMore = useCallback(async () => {
    setLoadMoreLoading(true);
    setLoadMoreError(null);
    try {
      const nextPage = currentPage + 1;
      const apiParams = buildApiParams({ ...filters, pageNumber: nextPage });
      const res = await searchTutors(apiParams);
      let mapped = res.content.items.map(mapApiTutorToUi);

      // Apply multi-select filter trên page mới (mirror server logic)
      if (needsMultiSelectFilter(filters)) {
        mapped = applyMultiSelectFilters(mapped, filters);
      }

      setLoadedMore((prev) => [...prev, ...mapped]);
      setCurrentPage(nextPage);
      // Multi-select chỉ load 1 page (Vite behavior); single → respect backend hasNext
      setHasNext(needsMultiSelectFilter(filters) ? false : res.content.hasNext);
    } catch (err) {
      console.error('Load more failed', err);
      setLoadMoreError('Không thể tải thêm. Vui lòng thử lại.');
    } finally {
      setLoadMoreLoading(false);
    }
  }, [currentPage, filters]);

  return (
    <div className="tutor-search-page-content">
      <SearchHero
        searchTerm={inputSearchTerm}
        onSearchTermChange={setInputSearchTerm}
        onSearch={handleSearchSubmit}
        onTrendingClick={handleTrendingClick}
      />
      <CategoryTabs activeCategories={filters.categories} onCategoryToggle={handleCategoryToggle} />
      <FilterBar
        gradeLevels={filters.gradeLevels}
        budgetRange={filters.budgetRange}
        teachingMode={filters.teachingMode}
        city={filters.city}
        sortBy={filters.sortBy}
        onGradeLevelToggle={handleGradeLevelToggle}
        onBudgetRangeChange={(v) => updateFilters({ budgetRange: v })}
        onTeachingModeChange={(v) => updateFilters({ teachingMode: v })}
        onCityChange={(v) => updateFilters({ city: v })}
        onSortByChange={(v) => updateFilters({ sortBy: v })}
        onResetFilters={handleResetFilters}
      />
      <ActiveFilters
        categories={filters.categories}
        gradeLevels={filters.gradeLevels}
        city={filters.city}
        budgetRange={filters.budgetRange}
        teachingMode={filters.teachingMode}
        sortBy={filters.sortBy}
        onRemoveCategory={handleCategoryToggle}
        onRemoveGradeLevel={handleGradeLevelToggle}
        onRemoveCity={handleRemoveCity}
        onRemoveBudgetRange={handleRemoveBudgetRange}
        onRemoveTeachingMode={handleRemoveTeachingMode}
        onRemoveSortBy={handleRemoveSortBy}
        onClearAll={handleClearMultiFilters}
      />
      <ResultsSection
        tutors={allTutors}
        loading={isPending || loadMoreLoading}
        // initialError (BE down ở server-side fetch) ưu tiên hơn loadMoreError vì
        // nó nói trang đang vô dụng, không chỉ "load more failed".
        error={initialError ?? loadMoreError}
        errorVariant={initialError ? 'fatal' : 'inline'}
        totalCount={initialTotalCount}
        hasNext={hasNext}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
      />
    </div>
  );
}
