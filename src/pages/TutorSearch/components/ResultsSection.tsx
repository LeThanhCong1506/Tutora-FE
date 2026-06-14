import { useMemo } from "react";
import type { Tutor } from "./types";
import TutorCard from "./TutorCard";

interface ResultsSectionProps {
    tutors: Tutor[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const ChevronLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 3L5 7L9 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 3L9 7L5 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ResultsSection = ({
    tutors,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    onPageChange,
}: ResultsSectionProps) => {
    const pageItems = useMemo(() => {
        const pages: Array<number | string> = [];
        if (totalPages <= 5) {
            for (let page = 1; page <= totalPages; page += 1) pages.push(page);
            return pages;
        }

        pages.push(1);
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) pages.push("start-ellipsis");
        for (let page = start; page <= end; page += 1) pages.push(page);
        if (end < totalPages - 1) pages.push("end-ellipsis");
        pages.push(totalPages);

        return pages;
    }, [currentPage, totalPages]);

    if (loading && tutors.length === 0) {
        return (
            <section className="results-section">
                <div className="results-header">
                    <div className="results-header-left">
                        <span className="results-label">TUTORA Selection</span>
                        <h2 className="results-title">Đang tải...</h2>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="results-section">
                <div className="results-header">
                    <div className="results-header-left">
                        <span className="results-label">TUTORA Selection</span>
                        <h2 className="results-title" style={{ color: "#ef4444" }}>{error}</h2>
                    </div>
                </div>
            </section>
        );
    }

    const showPagination = totalPages > 1 && tutors.length > 0;
    const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return (
        <section className="results-section" aria-busy={loading}>
            <div className="results-header">
                <div className="results-header-left">
                    <span className="results-label">TUTORA Selection</span>
                    <h2 className="results-title">Danh sách gia sư</h2>
                </div>
                <div className="results-header-meta">
                    {loading && <span className="results-loading-pill">Đang cập nhật</span>}
                    <span className="results-count">{totalCount} Kết quả tìm thấy</span>
                </div>
            </div>

            <div className="tutor-grid">
                {tutors.map((tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} />
                ))}
            </div>

            {tutors.length === 0 && !loading && (
                <div className="results-empty-state">
                    <p>Không tìm thấy gia sư phù hợp. Hãy thử thay đổi bộ lọc.</p>
                </div>
            )}

            {showPagination && (
                <nav className="results-pagination" aria-label="Phân trang danh sách gia sư">
                    <span className="pagination-range">
                        Hiển thị {startItem}-{endItem} trong số {totalCount}
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="pagination-nav-btn"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            aria-label="Trang trước"
                        >
                            <ChevronLeftIcon />
                        </button>

                        {pageItems.map((item) =>
                            typeof item === "number" ? (
                                <button
                                    key={item}
                                    type="button"
                                    className={`pagination-page-btn ${currentPage === item ? "active" : ""}`}
                                    onClick={() => onPageChange(item)}
                                    disabled={loading}
                                    aria-current={currentPage === item ? "page" : undefined}
                                >
                                    {item}
                                </button>
                            ) : (
                                <span key={item} className="pagination-ellipsis">...</span>
                            )
                        )}

                        <button
                            type="button"
                            className="pagination-nav-btn"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            aria-label="Trang tiếp"
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>
                </nav>
            )}
        </section>
    );
};

export default ResultsSection;
