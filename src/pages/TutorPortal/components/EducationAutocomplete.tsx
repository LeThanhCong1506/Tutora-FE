import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import fieldStyles from './FormField.module.css';
import styles from './EducationAutocomplete.module.css';
import { applySchoolToValue, searchSchools, splitActiveSegment } from '../utils/schoolSearch';
import type { School, SchoolKind } from '../../../data/vnSchools';

interface Props {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    maxLength?: number;
    placeholder?: string;
}

/** Nhãn loại trường, hiện ở cột phải mỗi dòng gợi ý. */
type KindLabels = Record<SchoolKind, string>;

/**
 * Ô "Trình độ học vấn" kèm gợi ý tên trường.
 *
 * Vẫn là ô NHẬP TỰ DO — gia sư gõ được bằng cấp/chuyên ngành, và trường không có trong
 * danh sách (trường nước ngoài, trường mới) vẫn nhập bình thường. Danh sách chỉ để gợi ý,
 * không ép chọn.
 *
 * Dữ liệu 447 trường được nạp ĐỘNG lúc người dùng chạm vào ô lần đầu, nên không nằm trong
 * bundle chính — trang hồ sơ vẫn nhẹ với người chỉ xem mà không sửa.
 */
const EducationAutocomplete: React.FC<Props> = ({
    value,
    onChange,
    error,
    maxLength = 255,
    placeholder,
}) => {
    const [schools, setSchools] = useState<readonly School[] | null>(null);
    const [kindLabels, setKindLabels] = useState<KindLabels | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const loadStartedRef = useRef(false);

    // Nạp dataset một lần duy nhất, ngay khi có dấu hiệu người dùng sắp dùng ô này.
    const ensureLoaded = useCallback(() => {
        if (loadStartedRef.current) return;
        loadStartedRef.current = true;
        import('../../../data/vnSchools')
            .then((mod) => {
                setSchools(mod.VN_SCHOOLS);
                setKindLabels(mod.SCHOOL_KIND_LABEL);
            })
            .catch(() => {
                // Gợi ý hỏng thì ô vẫn phải gõ tay được — chỉ tắt dropdown đi.
                setLoadFailed(true);
            });
    }, []);

    const { query } = useMemo(() => splitActiveSegment(value), [value]);

    const suggestions = useMemo(
        () => (schools ? searchSchools(schools, query) : []),
        [schools, query],
    );

    // Danh sách đổi thì con trỏ chọn phải về đầu, nếu không sẽ trỏ ra ngoài mảng.
    // Chỉnh state ngay trong lúc render (pattern React khuyến nghị cho "reset khi input
    // đổi") thay vì trong useEffect — làm ở effect sẽ render thừa một nhịp với con trỏ
    // đang trỏ sai, và vi phạm quy tắc set-state-in-effect.
    const [lastResetKey, setLastResetKey] = useState(query);
    if (lastResetKey !== query) {
        setLastResetKey(query);
        setHighlighted(0);
    }

    // Bấm ra ngoài → đóng dropdown.
    useEffect(() => {
        if (!isOpen) return undefined;
        const onPointerDown = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [isOpen]);

    // Giữ dòng đang chọn nằm trong tầm nhìn khi di chuyển bằng bàn phím.
    useEffect(() => {
        if (!isOpen) return;
        listRef.current
            ?.querySelector<HTMLLIElement>(`[data-index="${highlighted}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [highlighted, isOpen]);

    const commitSchool = (school: School) => {
        const next = applySchoolToValue(value, school.name);
        onChange(next.slice(0, maxLength));
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            return;
        }
        if (event.key === 'ArrowDown' && !isOpen) {
            ensureLoaded();
            setIsOpen(true);
            return;
        }
        if (!isOpen || suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted((i) => (i + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
        } else if (event.key === 'Enter') {
            // Chỉ nuốt Enter khi dropdown đang mở và có dòng để chọn — nếu không sẽ
            // chặn mất hành vi submit form bình thường.
            event.preventDefault();
            commitSchool(suggestions[highlighted]);
        } else if (event.key === 'Tab') {
            setIsOpen(false);
        }
    };

    const showDropdown = isOpen && !loadFailed;
    const listboxId = 'education-school-listbox';

    return (
        <div className={fieldStyles.field}>
            <label className={fieldStyles.label} htmlFor="education">
                Trình độ học vấn<span className={fieldStyles.required}>*</span>
            </label>
            <span className={fieldStyles.hint}>
                Gõ để tìm trường (không dấu hoặc viết tắt đều được), hoặc tự nhập nếu không có trong danh sách
            </span>

            <div className={styles.combobox} ref={wrapperRef}>
                <div className={fieldStyles.inputWrapper}>
                    <input
                        id="education"
                        name="education"
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={showDropdown}
                        aria-controls={showDropdown ? listboxId : undefined}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            showDropdown && suggestions.length > 0
                                ? `school-option-${highlighted}`
                                : undefined
                        }
                        autoComplete="off"
                        value={value}
                        maxLength={maxLength}
                        placeholder={placeholder}
                        onChange={(event) => {
                            ensureLoaded();
                            onChange(event.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => {
                            ensureLoaded();
                            setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        className={`${fieldStyles.input} ${error ? fieldStyles.inputError : ''}`}
                        aria-invalid={!!error}
                        aria-describedby={error ? 'education-error' : undefined}
                    />
                    <span className={fieldStyles.charCounter}>
                        {value.length}/{maxLength}
                    </span>
                </div>

                {showDropdown && (
                    <div className={styles.dropdown}>
                        {schools === null ? (
                            <p className={styles.status}>Đang tải danh sách trường…</p>
                        ) : suggestions.length === 0 ? (
                            <p className={styles.status}>
                                Không tìm thấy trường khớp “{query}”. Bạn vẫn có thể tự nhập.
                            </p>
                        ) : (
                            <ul className={styles.list} id={listboxId} role="listbox" ref={listRef}>
                                {suggestions.map((school, index) => (
                                    <li
                                        key={school.name}
                                        id={`school-option-${index}`}
                                        data-index={index}
                                        role="option"
                                        aria-selected={index === highlighted}
                                        className={`${styles.option} ${
                                            index === highlighted ? styles.optionActive : ''
                                        }`}
                                        // mousedown thay vì click: click chạy SAU blur, lúc đó
                                        // dropdown đã đóng nên không bao giờ chọn được.
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            commitSchool(school);
                                        }}
                                        onMouseEnter={() => setHighlighted(index)}
                                    >
                                        <span className={styles.optionName}>{school.name}</span>
                                        {school.abbr && (
                                            <span className={styles.optionAbbr}>{school.abbr}</span>
                                        )}
                                        {kindLabels && (
                                            <span className={styles.optionKind}>
                                                {kindLabels[school.kind]}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <span id="education-error" className={fieldStyles.error}>
                    {error}
                </span>
            )}
        </div>
    );
};

export default EducationAutocomplete;
