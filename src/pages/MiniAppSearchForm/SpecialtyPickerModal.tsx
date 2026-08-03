import { useMemo, useState } from "react";
import type { SpecialtyGroup } from "./specialtyOptions";
import { tr, type Lang } from "./i18n";

interface SpecialtyPickerModalProps {
    groups: SpecialtyGroup[];
    selected: string[];
    lang: Lang;
    onToggle: (option: string) => void;
    onClearAll: () => void;
    onClose: () => void;
    /** Bấm "Áp dụng" — đóng modal VÀ tiến luôn sang bước kế tiếp của wizard (khác onClose:
     * quay lại đúng bước "focus" hiện tại mà không tiến bước, dùng cho nút back). */
    onApply: () => void;
}

/** Full-screen picker kiểu Preply "Specialties": search + nhóm chủ đề + checkbox + đếm số đã chọn. */
const SpecialtyPickerModal = ({ groups, selected, lang, onToggle, onClearAll, onClose, onApply }: SpecialtyPickerModalProps) => {
    const [search, setSearch] = useState("");

    // Search khớp trên CẢ bản gốc tiếng Việt lẫn bản dịch hiện tại — PH gõ tiếng Anh vẫn tìm được dù data gốc là VI.
    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return groups;
        return groups
            .map((g) => ({
                ...g,
                options: g.options.filter(
                    (o) => o.toLowerCase().includes(q) || tr(o, lang).toLowerCase().includes(q)
                ),
            }))
            .filter((g) => g.options.length > 0);
    }, [groups, search, lang]);

    return (
        <div className="specialty-modal">
            <div className="specialty-modal__header">
                <button type="button" className="specialty-modal__close" onClick={onClose} aria-label={tr("Quay lại", lang)}>
                    ←
                </button>
                <span className="specialty-modal__title">{tr("Chọn trọng tâm", lang)}</span>
                <button type="button" className="specialty-modal__clear" onClick={onClearAll}>
                    {tr("Bỏ chọn tất cả", lang)}
                </button>
            </div>

            <div className="specialty-modal__search">
                <input
                    type="text"
                    placeholder={tr("Tìm trọng tâm...", lang)}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="specialty-modal__list">
                {filteredGroups.length === 0 && (
                    <p className="specialty-modal__empty">{tr("Không tìm thấy kết quả phù hợp.", lang)}</p>
                )}
                {filteredGroups.map((group) => (
                    <div key={group.title} className="specialty-modal__group">
                        <div className="specialty-modal__group-title">{tr(group.title, lang)}</div>
                        {group.options.map((option) => (
                            <label key={option} className="specialty-modal__item">
                                <span>{tr(option, lang)}</span>
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => onToggle(option)}
                                />
                            </label>
                        ))}
                    </div>
                ))}
            </div>

            <div className="specialty-modal__footer">
                <button type="button" className="specialty-modal__apply" onClick={onApply}>
                    {tr("Áp dụng", lang)} ({selected.length})
                </button>
            </div>
        </div>
    );
};

export default SpecialtyPickerModal;
