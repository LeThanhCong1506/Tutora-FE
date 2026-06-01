import type { Tutor } from "./types";
import TutorCard from "./TutorCard";

interface ResultsSectionProps {
    tutors: Tutor[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    hasNext: boolean;
    onLoadMore: () => void;
}

const ResultsSection = ({ tutors, loading, error, totalCount, hasNext, onLoadMore }: ResultsSectionProps) => {
    const rows: Tutor[][] = [];
    for (let i = 0; i < tutors.length; i += 3) {
        rows.push(tutors.slice(i, i + 3));
    }

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

    return (
        <section className="results-section">
            <div className="results-header">
                <div className="results-header-left">
                    <span className="results-label">TUTORA Selection</span>
                    <h2 className="results-title">Danh sách gia sư</h2>
                </div>
                <span className="results-count">{totalCount} Kết quả tìm thấy</span>
            </div>
            <div className="tutor-grid">
                {rows.map((row, rowIndex) => (
                    <div className="tutor-row" key={rowIndex}>
                        {row.map((tutor, index) => (
                            <TutorCard key={`${tutor.id}-${index}`} tutor={tutor} />
                        ))}
                    </div>
                ))}
            </div>
            {tutors.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                    <p style={{ fontSize: "16px" }}>Không tìm thấy gia sư phù hợp. Hãy thử thay đổi bộ lọc.</p>
                </div>
            )}
            {hasNext && (
                <div className="load-more-container">
                    <button className="btn-load-more" onClick={onLoadMore} disabled={loading}>
                        {loading ? "Đang tải..." : "Khám phá thêm"}
                    </button>
                </div>
            )}
        </section>
    );
};

export default ResultsSection;
