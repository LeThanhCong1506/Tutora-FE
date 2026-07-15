import { useCallback, useEffect, useMemo, useState } from "react";
import { useSubjects } from "../../hooks/useSubjects";
import { useGradeLevels } from "../../hooks/useGradeLevels";
import { useProvinces } from "../../hooks/useVietnamLocations";
import {
    fetchMiniAppPrefill,
    fetchMiniAppSearchResults,
    type MiniAppTutorResult,
} from "../../services/miniAppSearch.service";
import { storageAdapter } from "../../services/storage.adapter";
import { MINI_APP_SEARCH_LANG_KEY, MINI_APP_SEARCH_FRESH_KEY } from "../../components/DeeplinkHandler/DeeplinkHandler";
import { BUDGET_RANGE_OPTIONS, budgetRangeToMinMax, minMaxToBudgetRange } from "../../utils/budgetRange";
import { getSpecialtyGroupsForSubject, getSpecialtyPreview } from "./specialtyOptions";
import SpecialtyPickerModal from "./SpecialtyPickerModal";
import TutorResultsList from "./TutorResultsList";
import { tr, type Lang } from "./i18n";
import "../../styles/pages/mini-app-search-form.css";

type TeachingMode = "online" | "offline" | "both";
type TutorGender = "male" | "female" | "";

const TEACHING_MODE_OPTIONS: { value: TeachingMode; label: string }[] = [
    { value: "online", label: "Online" },
    { value: "offline", label: "Tại nhà" },
    { value: "both", label: "Cả hai" },
];

const GOAL_OPTIONS = [
    "Theo chương trình ở trường",
    "Ôn thi, kiểm tra",
    "Mất gốc, cần củng cố lại",
    "Nâng cao, bồi dưỡng giỏi",
];

const GENDER_OPTIONS: { value: TutorGender; label: string }[] = [
    { value: "", label: "Không yêu cầu" },
    { value: "female", label: "Gia sư nữ" },
    { value: "male", label: "Gia sư nam" },
];

const LEVEL_OPTIONS = [
    "Mới bắt đầu, chưa có nền tảng",
    "Nắm kiến thức cơ bản",
    "Đã có một số kinh nghiệm",
    "Nền tảng vững, muốn nâng cao",
];

const DAY_OPTIONS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const TIME_OPTIONS = ["Buổi sáng", "Buổi chiều", "Buổi tối"];

const CHIP_PREVIEW_COUNT = 8;

type StepId =
    | "subject"
    | "grade"
    | "goal"
    | "level"
    | "schedule"
    | "budget"
    | "teachingMode"
    | "city"
    | "gender"
    | "focus"
    | "crossSell"
    | "notes"
    | "summary";

const STEP_TITLES: Record<StepId, string> = {
    subject: "Bé cần học môn gì?",
    grade: "Bé đang học lớp mấy?",
    goal: "Lý do học lần này là gì?",
    level: "Trình độ hiện tại của bé thế nào?",
    schedule: "Bé rảnh học vào lúc nào?",
    budget: "Ngân sách mong muốn?",
    teachingMode: "Hình thức học?",
    city: "Khu vực học tại nhà?",
    gender: "Có ưu tiên giới tính gia sư không?",
    focus: "Bạn muốn gia sư tập trung vào điều gì?",
    crossSell: "Sắp tới có cần tìm thêm gia sư môn khác không?",
    notes: "Còn điều gì khác nữa không?",
    summary: "Xác nhận thông tin",
};

const SKIPPABLE_STEPS: ReadonlySet<StepId> = new Set(["schedule", "focus", "crossSell", "notes"]);

function toggleInList<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Wizard nhập tiêu chí tìm gia sư — điểm vào duy nhất của luồng hybrid Zalo Mini App
 * (bot gửi nút mở trang này khi PH chưa Matched). Mỗi bước 1 câu hỏi (kiểu Preply) thay
 * vì dồn hết field vào 1 form dài — phù hợp màn hình nhỏ trong Mini App.
 *
 * Thứ tự bước theo nguyên tắc form UX (Baymard Institute và cộng đồng CRO): câu dễ/quen
 * thuộc trước (môn/lớp) → câu qualifying dùng filter CỨNG (goal/budget/mode/city/gender,
 * khớp đúng field pipeline agent thật sự dùng — xem tutora-ai/app/services/agent.py
 * _run_search) → câu tín hiệu MỀM có thể bỏ qua (focus/schedule/crossSell — chưa có filter
 * cứng ở BE nên gộp vào `preferences` text cho AI đọc) → câu tự do cam kết cao nhất
 * (ghi chú) ở cuối cùng, đúng "progressive profiling": không chặn tiến trình bằng field
 * không ảnh hưởng trực tiếp kết quả — phần đó nhường cho đoạn CHAT sau khi đã có card.
 */
const MiniAppSearchFormPage = () => {
    const { subjects, loading: subjectsLoading } = useSubjects();
    const { gradeLevels, loading: gradeLevelsLoading } = useGradeLevels();
    const { provinces } = useProvinces();

    const [stepIndex, setStepIndex] = useState(0);
    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [gradeLevelId, setGradeLevelId] = useState<number | null>(null);
    const [goal, setGoal] = useState("");
    const [level, setLevel] = useState("");
    const [budgetRange, setBudgetRange] = useState("all");
    const [teachingMode, setTeachingMode] = useState<TeachingMode>("online");
    const [city, setCity] = useState("");
    const [tutorGender, setTutorGender] = useState<TutorGender>("");
    const [focus, setFocus] = useState<string[]>([]);
    const [days, setDays] = useState<string[]>([]);
    const [times, setTimes] = useState<string[]>([]);
    const [crossSellSubjectIds, setCrossSellSubjectIds] = useState<number[]>([]);
    const [notes, setNotes] = useState("");

    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const [showAllCities, setShowAllCities] = useState(false);
    const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Kết quả hiện NGAY trong Mini App (thay vì chỉ báo "quay lại Zalo xem") — xem
    // TutorResultsList.tsx. findMore* riêng vì nút "Tìm gia sư khác" có trạng thái loading/
    // error độc lập với lượt search đầu, không nên nhảy lại về màn loading toàn trang.
    const [tutors, setTutors] = useState<MiniAppTutorResult[]>([]);
    const [findMoreLoading, setFindMoreLoading] = useState(false);
    const [findMoreError, setFindMoreError] = useState<string | null>(null);
    const [exhausted, setExhausted] = useState(false);

    // lang do bot tự nhận diện lúc gửi nút (đọc lại từ deep link — xem DeeplinkHandler.tsx),
    // KHÔNG tự đoán lại ở đây để tránh lệch nguồn chân lý. Mặc định "vi" cho tới khi đọc xong.
    const [lang, setLang] = useState<Lang>("vi");
    useEffect(() => {
        let cancelled = false;
        void storageAdapter.get(MINI_APP_SEARCH_LANG_KEY).then((v) => {
            if (!cancelled && (v === "en" || v === "vi")) setLang(v);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // PH mở lại Mini App để SỬA tiêu chí (bot gửi nút khi agent trả reopen_mini_app=true
    // giữa chat) — điền sẵn dữ liệu lần tìm trước thay vì bắt điền lại từ đầu. Lần tìm đầu
    // tiên (chưa có agentCtx) → prefill trả {ok:true} không kèm field nào, không đổi gì.
    useEffect(() => {
        let cancelled = false;
        void Promise.all([fetchMiniAppPrefill(), storageAdapter.get(MINI_APP_SEARCH_FRESH_KEY)]).then(
            async ([p, freshFlag]) => {
            if (cancelled || !p.ok) return;
            // fresh=1: PH muốn NHU CẦU KHÁC HẲN — vẫn điền sẵn field cho tiện, nhưng TUYỆT
            // ĐỐI không auto-skip qua kết quả cũ bên dưới (xem MINI_APP_SEARCH_FRESH_KEY).
            const isFresh = freshFlag === "1";
            if (p.subjectId != null) setSubjectId(p.subjectId);
            if (p.gradeLevelId != null) setGradeLevelId(p.gradeLevelId);
            if (p.goal) {
                // goal lưu trong agentCtx có thể đang ở EN (nếu lần trước submit bằng tiếng
                // Anh) — quy về đúng chuỗi VI gốc để khớp GOAL_OPTIONS (logic luôn so khớp
                // trên bản VI, chỉ dịch lúc hiển thị — xem i18n.ts).
                const matched = GOAL_OPTIONS.find((g) => g === p.goal || tr(g, "en") === p.goal);
                if (matched) setGoal(matched);
            }
            if (p.teachingMode) setTeachingMode(p.teachingMode);
            if (p.city) setCity(p.city);
            if (p.tutorGender) setTutorGender(p.tutorGender);
            if (p.minRate != null || p.maxRate != null) {
                setBudgetRange(minMaxToBudgetRange(p.minRate, p.maxRate));
            }

            // Đã từng tìm trước đó (đủ subject+grade) → nhảy THẲNG qua màn kết quả, không
            // bắt đi lại từ đầu wizard mỗi lần mở lại Mini App. PH vẫn đổi được tiêu chí qua
            // nút "Chỉnh sửa tiêu chí" trên màn kết quả (xem handleEditCriteria bên dưới).
            // Lỗi/rỗng ở bước ngầm này → âm thầm rơi về wizard (đã điền sẵn), KHÔNG hiện lỗi
            // (đây là tiện ích nền, không phải hành động PH chủ động bấm).
            // TRỪ khi isFresh (PH chọn "nhu cầu khác hẳn") — bug thật 2026-07-14: thiếu
            // check này khiến chọn "nhu cầu khác" vẫn bị auto-skip hiện lại kết quả CŨ
            // trước khi PH kịp điền gì mới, còn gửi trùng thông báo "đã gửi gợi ý" vào chat.
            if (!isFresh && p.subjectId != null && p.gradeLevelId != null) {
                setStatus("sending");
                const result = await fetchMiniAppSearchResults({
                    subjectId: p.subjectId,
                    gradeLevelId: p.gradeLevelId,
                    minRate: p.minRate,
                    maxRate: p.maxRate,
                    teachingMode: p.teachingMode,
                    city: p.city,
                    tutorGender: p.tutorGender,
                    goal: p.goal,
                });
                if (cancelled) return;
                if (result.ok && result.tutors?.length) {
                    setTutors(result.tutors);
                    setExhausted(false);
                    setStatus("sent");
                } else {
                    setStatus("idle");
                }
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rẽ nhánh: bỏ bước "Khu vực" nếu học Online thuần — hỏi địa chỉ lúc đó vô nghĩa.
    const steps: StepId[] = useMemo(() => {
        const base: StepId[] = ["subject", "grade", "goal", "level", "schedule", "budget", "teachingMode"];
        if (teachingMode !== "online") base.push("city");
        base.push("gender", "focus", "crossSell", "notes", "summary");
        return base;
    }, [teachingMode]);

    const step = steps[stepIndex];
    const totalSteps = steps.length;

    const subjectName = useMemo(
        () => subjects.find((s) => s.subjectId === subjectId)?.subjectName ?? "",
        [subjects, subjectId]
    );
    // Nhóm "trọng tâm" đổi theo môn đã chọn — chọn Toán thì không hiện IELTS/HSK.
    const specialtyGroups = useMemo(() => getSpecialtyGroupsForSubject(subjectName || null), [subjectName]);
    const specialtyPreview = useMemo(() => getSpecialtyPreview(specialtyGroups), [specialtyGroups]);
    // Nếu PH quay lại đổi môn sau khi đã chọn trọng tâm, xoá lựa chọn cũ — tránh giữ chip
    // không còn khớp môn mới (vd đổi từ Tiếng Anh sang Toán mà vẫn còn "Ôn thi IELTS").
    useEffect(() => {
        setFocus([]);
    }, [subjectId]);
    const gradeName = useMemo(
        () => gradeLevels.find((g) => g.gradeLevelId === gradeLevelId)?.gradeName ?? "",
        [gradeLevels, gradeLevelId]
    );
    const budgetLabel = useMemo(
        () => BUDGET_RANGE_OPTIONS.find((b) => b.value === budgetRange)?.label ?? "",
        [budgetRange]
    );
    const teachingModeLabel = useMemo(
        () => TEACHING_MODE_OPTIONS.find((t) => t.value === teachingMode)?.label ?? "",
        [teachingMode]
    );
    const genderLabel = useMemo(
        () => GENDER_OPTIONS.find((g) => g.value === tutorGender)?.label ?? "",
        [tutorGender]
    );
    const crossSellNames = useMemo(
        () =>
            crossSellSubjectIds
                .map((id) => subjects.find((s) => s.subjectId === id)?.subjectName)
                .filter((n): n is string => !!n),
        [crossSellSubjectIds, subjects]
    );

    // Gộp các tín hiệu MỀM (focus/schedule/crossSell/notes) thành 1 đoạn text mạch lạc
    // cho AI đọc — không có field riêng bên BE để gửi filter cứng cho từng cái. Soạn
    // ĐÚNG NGÔN NGỮ đang dùng (lang) để khớp với tin nhắn cuối agent thấy — xem
    // tutora-ai/app/services/agent.py _STYLE (mirror ngôn ngữ tin nhắn gần nhất).
    const composedPreferences = useMemo(() => {
        const t = (v: string) => tr(v, lang);
        const parts: string[] = [];
        if (level) parts.push(`${lang === "en" ? "Current level" : "Trình độ hiện tại"}: ${t(level)}.`);
        if (focus.length) {
            parts.push(`${lang === "en" ? "Desired focus" : "Trọng tâm mong muốn"}: ${focus.map(t).join(", ")}.`);
        }
        if (days.length || times.length) {
            const dayText = days.length ? days.map(t).join(", ") : "";
            const timeText = times.length ? ` ${times.map(t).join(", ").toLowerCase()}` : "";
            const label = lang === "en" ? "Available schedule" : "Lịch rảnh học";
            parts.push(`${label}: ${dayText}${timeText}.`.trim());
        }
        if (crossSellNames.length) {
            const names = crossSellNames.map(t).join(", ");
            parts.push(
                lang === "en"
                    ? `Parent is also interested in finding a tutor for: ${names} soon.`
                    : `Phụ huynh cũng quan tâm tìm thêm gia sư môn: ${names} trong thời gian tới.`
            );
        }
        if (notes.trim()) parts.push(notes.trim());
        return parts.join(" ");
    }, [level, focus, days, times, crossSellNames, notes, lang]);

    const canGoNext = useMemo(() => {
        if (step === "subject") return subjectId !== null;
        if (step === "grade") return gradeLevelId !== null;
        return true;
    }, [step, subjectId, gradeLevelId]);

    const isCurrentStepEmpty = useMemo(() => {
        if (step === "focus") return focus.length === 0;
        if (step === "schedule") return days.length === 0 && times.length === 0;
        if (step === "crossSell") return crossSellSubjectIds.length === 0;
        if (step === "notes") return notes.trim().length === 0;
        return false;
    }, [step, focus, days, times, crossSellSubjectIds, notes]);

    const handleBack = useCallback(() => {
        setStepIndex((i) => Math.max(0, i - 1));
    }, []);

    const handleNext = useCallback(() => {
        setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
    }, [totalSteps]);

    // Payload tiêu chí dùng chung cho lượt search đầu VÀ nút "Tìm gia sư khác" (chỉ khác
    // excludeTutorIds) — tách riêng để 2 chỗ gọi không lệch field.
    const buildSearchPayload = useCallback(
        (excludeTutorIds?: string[]) => {
            if (subjectId === null || gradeLevelId === null) return null;
            const { minRate, maxRate } = budgetRangeToMinMax(budgetRange);
            return {
                subjectId,
                gradeLevelId,
                minRate,
                maxRate,
                teachingMode,
                city: teachingMode !== "online" && city ? city : undefined,
                tutorGender: tutorGender || undefined,
                goal: goal ? tr(goal, lang) : undefined,
                preferences: composedPreferences || undefined,
                excludeTutorIds,
            };
        },
        [subjectId, gradeLevelId, budgetRange, teachingMode, city, tutorGender, goal, composedPreferences, lang]
    );

    const handleSubmit = useCallback(async () => {
        const payload = buildSearchPayload();
        if (!payload) return;

        setStatus("sending");
        setErrorMessage(null);
        const result = await fetchMiniAppSearchResults(payload);

        if (result.ok) {
            setTutors(result.tutors ?? []);
            setExhausted(false);
            setStatus("sent");
        } else {
            setStatus("error");
            setErrorMessage(
                result.error === "missing_token"
                    ? tr("Không tìm thấy phiên làm việc — anh/chị mở lại từ tin nhắn Zalo giúp em nhé.", lang)
                    : tr("Gửi chưa thành công, anh/chị thử lại giúp em nhé.", lang)
            );
        }
    }, [buildSearchPayload, lang]);

    // Nút "Tìm gia sư khác" trong TutorResultsList — giữ NGUYÊN tiêu chí, loại các gia sư
    // đang hiện. Rỗng kết quả mới KHÔNG xoá danh sách cũ (PH vẫn xem được gia sư đã có) —
    // chỉ báo "hết gợi ý mới" qua `exhausted`.
    const handleFindMore = useCallback(async () => {
        const payload = buildSearchPayload(tutors.map((t) => t.tutorId));
        if (!payload) return;

        setFindMoreLoading(true);
        setFindMoreError(null);
        const result = await fetchMiniAppSearchResults(payload);
        setFindMoreLoading(false);

        if (!result.ok) {
            setFindMoreError(tr("Không tìm được kết quả — anh/chị thử lại giúp em nhé.", lang));
            return;
        }
        if (!result.tutors?.length) {
            setExhausted(true);
            return;
        }
        setTutors(result.tutors);
    }, [buildSearchPayload, tutors, lang]);

    // Nút "Chỉnh sửa tiêu chí" trên màn kết quả — quay lại wizard ở bước "summary" (cuối
    // cùng, luôn có sẵn mọi field đã điền) để PH xem lại/đổi rồi tự bấm "Tìm gia sư" lại,
    // thay vì bắt đi từ bước 1. Muốn sửa sâu hơn (đổi môn/lớp...) PH vẫn bấm mũi tên back
    // của wizard để lùi tiếp từ đó — không mất field đã điền.
    const handleEditCriteria = useCallback(() => {
        setStatus("idle");
        setStepIndex(steps.length - 1);
    }, [steps.length]);

    if (status === "sending") {
        return (
            <div className="mini-app-form-page mini-app-form-page--loading">
                <div className="mini-app-form-loading">
                    <div className="mini-app-form-loading__spinner" />
                    <h2>{tr("Đang tìm gia sư phù hợp cho bé...", lang)}</h2>
                </div>
            </div>
        );
    }

    if (status === "sent") {
        if (tutors.length === 0) {
            return (
                <div className="mini-app-form-page">
                    <div className="mini-app-form-success">
                        <div className="mini-app-form-success__icon">✓</div>
                        <h2>{tr("Đã gửi yêu cầu!", lang)}</h2>
                        <p>{tr("Quay lại cuộc trò chuyện Zalo để xem gia sư phù hợp nhé.", lang)}</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="mini-app-form-page">
                <TutorResultsList
                    tutors={tutors}
                    lang={lang}
                    onFindMore={handleFindMore}
                    findMoreLoading={findMoreLoading}
                    findMoreError={findMoreError}
                    exhausted={exhausted}
                    onEditCriteria={handleEditCriteria}
                />
            </div>
        );
    }

    const visibleSubjects = showAllSubjects ? subjects : subjects.slice(0, CHIP_PREVIEW_COUNT);
    const visibleCities = showAllCities ? provinces : provinces.slice(0, CHIP_PREVIEW_COUNT);
    const continueLabel = tr(SKIPPABLE_STEPS.has(step) && isCurrentStepEmpty ? "Bỏ qua" : "Tiếp tục", lang);

    return (
        <div className="mini-app-form-page">
            <div className="mini-app-form-topbar">
                {stepIndex > 0 ? (
                    <button type="button" className="mini-app-form-back" onClick={handleBack} aria-label={tr("Quay lại", lang)}>
                        ←
                    </button>
                ) : (
                    <span className="mini-app-form-back mini-app-form-back--placeholder" />
                )}
                <div className="mini-app-form-progress">
                    <div
                        className="mini-app-form-progress__bar"
                        style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            <h1 className="mini-app-form-title">{tr(STEP_TITLES[step], lang)}</h1>

            <div className="mini-app-form-step">
                {step === "subject" && (
                    <>
                        <div className="mini-app-form-chips">
                            {visibleSubjects.map((s) => (
                                <button
                                    key={s.subjectId}
                                    type="button"
                                    className={`mini-app-form-chip ${subjectId === s.subjectId ? "active" : ""}`}
                                    onClick={() => setSubjectId(s.subjectId)}
                                >
                                    {tr(s.subjectName, lang)}
                                </button>
                            ))}
                        </div>
                        {!showAllSubjects && subjects.length > CHIP_PREVIEW_COUNT && (
                            <button type="button" className="mini-app-form-showall" onClick={() => setShowAllSubjects(true)}>
                                {tr("Xem tất cả", lang)}
                            </button>
                        )}
                        {subjectsLoading && <p className="mini-app-form-hint">{tr("Đang tải danh sách môn học...", lang)}</p>}
                    </>
                )}

                {step === "grade" && (
                    <>
                        <div className="mini-app-form-chips">
                            {gradeLevels.map((g) => (
                                <button
                                    key={g.gradeLevelId}
                                    type="button"
                                    className={`mini-app-form-chip ${gradeLevelId === g.gradeLevelId ? "active" : ""}`}
                                    onClick={() => setGradeLevelId(g.gradeLevelId)}
                                >
                                    {tr(g.gradeName, lang)}
                                </button>
                            ))}
                        </div>
                        {gradeLevelsLoading && <p className="mini-app-form-hint">{tr("Đang tải danh sách lớp...", lang)}</p>}
                    </>
                )}

                {step === "goal" && (
                    <div className="mini-app-form-list">
                        {GOAL_OPTIONS.map((g) => (
                            <button
                                key={g}
                                type="button"
                                className={`mini-app-form-list-item ${goal === g ? "active" : ""}`}
                                onClick={() => setGoal(g)}
                            >
                                {tr(g, lang)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "level" && (
                    <div className="mini-app-form-list">
                        {LEVEL_OPTIONS.map((l) => (
                            <button
                                key={l}
                                type="button"
                                className={`mini-app-form-list-item ${level === l ? "active" : ""}`}
                                onClick={() => setLevel(l)}
                            >
                                {tr(l, lang)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "budget" && (
                    <div className="mini-app-form-list">
                        {BUDGET_RANGE_OPTIONS.map((b) => (
                            <button
                                key={b.value}
                                type="button"
                                className={`mini-app-form-list-item ${budgetRange === b.value ? "active" : ""}`}
                                onClick={() => setBudgetRange(b.value)}
                            >
                                {tr(b.label, lang)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "teachingMode" && (
                    <div className="mini-app-form-list">
                        {TEACHING_MODE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                className={`mini-app-form-list-item ${teachingMode === opt.value ? "active" : ""}`}
                                onClick={() => setTeachingMode(opt.value)}
                            >
                                {tr(opt.label, lang)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "city" && (
                    <>
                        <div className="mini-app-form-chips">
                            <button
                                type="button"
                                className={`mini-app-form-chip ${city === "" ? "active" : ""}`}
                                onClick={() => setCity("")}
                            >
                                {tr("Không yêu cầu", lang)}
                            </button>
                            {visibleCities.map((p) => (
                                <button
                                    key={p.code}
                                    type="button"
                                    className={`mini-app-form-chip ${city === p.name ? "active" : ""}`}
                                    onClick={() => setCity(p.name)}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                        {!showAllCities && provinces.length > CHIP_PREVIEW_COUNT && (
                            <button type="button" className="mini-app-form-showall" onClick={() => setShowAllCities(true)}>
                                {tr("Xem tất cả", lang)}
                            </button>
                        )}
                    </>
                )}

                {step === "gender" && (
                    <div className="mini-app-form-list">
                        {GENDER_OPTIONS.map((g) => (
                            <button
                                key={g.value || "any"}
                                type="button"
                                className={`mini-app-form-list-item ${tutorGender === g.value ? "active" : ""}`}
                                onClick={() => setTutorGender(g.value)}
                            >
                                {tr(g.label, lang)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "focus" && (
                    <>
                        <p className="mini-app-form-subtitle">{tr("Chọn 1 hoặc nhiều — có thể bỏ qua nếu chưa rõ.", lang)}</p>
                        <div className="mini-app-form-chips">
                            <button
                                type="button"
                                className={`mini-app-form-chip ${focus.length === 0 ? "active" : ""}`}
                                onClick={() => setFocus([])}
                            >
                                {tr("Không yêu cầu", lang)}
                            </button>
                            {specialtyPreview.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    className={`mini-app-form-chip ${focus.includes(f) ? "active" : ""}`}
                                    onClick={() => setFocus((prev) => toggleInList(prev, f))}
                                >
                                    {tr(f, lang)}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="mini-app-form-showall" onClick={() => setShowSpecialtyModal(true)}>
                            {tr("Xem tất cả", lang)}
                            {focus.length > 0 ? ` (${focus.length} ${lang === "en" ? "selected" : "đã chọn"})` : ""}
                        </button>
                    </>
                )}

                {step === "schedule" && (
                    <>
                        <p className="mini-app-form-subtitle">{tr("Có thể bỏ qua nếu lịch học linh hoạt.", lang)}</p>
                        <div className="mini-app-form-subsection">
                            <span className="mini-app-form-subsection-label">{tr("Ngày", lang)}</span>
                            <div className="mini-app-form-chips">
                                {DAY_OPTIONS.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`mini-app-form-chip ${days.includes(d) ? "active" : ""}`}
                                        onClick={() => setDays((prev) => toggleInList(prev, d))}
                                    >
                                        {tr(d, lang)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mini-app-form-subsection">
                            <span className="mini-app-form-subsection-label">{tr("Buổi", lang)}</span>
                            <div className="mini-app-form-chips">
                                {TIME_OPTIONS.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        className={`mini-app-form-chip ${times.includes(t) ? "active" : ""}`}
                                        onClick={() => setTimes((prev) => toggleInList(prev, t))}
                                    >
                                        {tr(t, lang)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {step === "crossSell" && (
                    <>
                        <p className="mini-app-form-subtitle">{tr("Có thể bỏ qua nếu chưa có nhu cầu.", lang)}</p>
                        <div className="mini-app-form-chips">
                            {subjects
                                .filter((s) => s.subjectId !== subjectId)
                                .slice(0, CHIP_PREVIEW_COUNT)
                                .map((s) => (
                                    <button
                                        key={s.subjectId}
                                        type="button"
                                        className={`mini-app-form-chip ${crossSellSubjectIds.includes(s.subjectId) ? "active" : ""}`}
                                        onClick={() => setCrossSellSubjectIds((prev) => toggleInList(prev, s.subjectId))}
                                    >
                                        {tr(s.subjectName, lang)}
                                    </button>
                                ))}
                        </div>
                    </>
                )}

                {step === "notes" && (
                    <div className="mini-app-form-textfields">
                        <div className="mini-app-form-field">
                            <label htmlFor="notes">
                                {tr("Có nhu cầu gì thêm mà chúng tôi có thể giúp bạn tìm gia sư phù hợp nhất không?", lang)}
                            </label>
                            <textarea
                                id="notes"
                                rows={4}
                                placeholder={tr("VD: gia sư vui tính, có kinh nghiệm dạy trẻ tăng động, ưu tiên người miền Nam...", lang)}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {step === "summary" && (
                    <>
                        <div className="mini-app-form-summary-chips">
                            {subjectName && <span className="mini-app-form-summary-chip">{tr(subjectName, lang)}</span>}
                            {gradeName && <span className="mini-app-form-summary-chip">{tr(gradeName, lang)}</span>}
                            {goal && <span className="mini-app-form-summary-chip">{tr(goal, lang)}</span>}
                            {level && <span className="mini-app-form-summary-chip">{tr(level, lang)}</span>}
                            {budgetLabel && <span className="mini-app-form-summary-chip">{tr(budgetLabel, lang)}</span>}
                            {teachingModeLabel && <span className="mini-app-form-summary-chip">{tr(teachingModeLabel, lang)}</span>}
                            {teachingMode !== "online" && city && (
                                <span className="mini-app-form-summary-chip">{city}</span>
                            )}
                            {genderLabel && <span className="mini-app-form-summary-chip">{tr(genderLabel, lang)}</span>}
                            {focus.map((f) => (
                                <span key={f} className="mini-app-form-summary-chip">{tr(f, lang)}</span>
                            ))}
                            {(days.length > 0 || times.length > 0) && (
                                <span className="mini-app-form-summary-chip">
                                    {[...days, ...times].map((v) => tr(v, lang)).join(", ")}
                                </span>
                            )}
                            {crossSellNames.map((n) => (
                                <span key={n} className="mini-app-form-summary-chip">+ {tr(n, lang)}</span>
                            ))}
                        </div>
                        {status === "error" && errorMessage && (
                            <p className="mini-app-form-error">{errorMessage}</p>
                        )}
                        <button type="button" className="mini-app-form-submit" onClick={handleSubmit}>
                            {tr("Tìm gia sư", lang)}
                        </button>
                    </>
                )}
            </div>

            {step !== "summary" && (
                <button
                    type="button"
                    className="mini-app-form-continue"
                    disabled={!canGoNext}
                    onClick={handleNext}
                >
                    {continueLabel}
                </button>
            )}

            {showSpecialtyModal && (
                <SpecialtyPickerModal
                    groups={specialtyGroups}
                    selected={focus}
                    lang={lang}
                    onToggle={(option) => setFocus((prev) => toggleInList(prev, option))}
                    onClearAll={() => setFocus([])}
                    onClose={() => setShowSpecialtyModal(false)}
                />
            )}
        </div>
    );
};

export default MiniAppSearchFormPage;
