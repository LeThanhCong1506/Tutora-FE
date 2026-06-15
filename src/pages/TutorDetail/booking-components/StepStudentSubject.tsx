import { BookOpen, CalendarDays, Clock3, GraduationCap, Wallet } from "lucide-react";
import type { StepProps } from "./types";
import { formatDuration, formatGrade, formatPrice, normalizeGradeToken, studentInitials } from "./utils";
import styles from "./bookingModal.module.css";

// Compact grade label cho chip (vd ["grade_10", "grade_11", "grade_12"] → "Lớp 10-12").
const formatGradeRange = (grades: string[]): string => {
    if (grades.length === 0) return "";
    const nums = grades
        .map((g) => Number(g.replace("grade_", "")))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
    if (nums.length === 0) return grades.join(", ");
    if (nums.length === 1) return `Lớp ${nums[0]}`;
    const isContiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    return isContiguous ? `Lớp ${nums[0]}-${nums[nums.length - 1]}` : `Lớp ${nums.join(", ")}`;
};

const StepStudentSubject: React.FC<StepProps> = ({
    formData,
    setFormData,
    students,
    loadingStudents,
    availableSubjects,
    subjectGradePrices,
    userRole,
}) => {
    const hasSubject = formData.subjectId !== 0;
    const selectedStudent = students.find((s) => s.studentId === formData.studentId);
    const selectedGradeToken = normalizeGradeToken(selectedStudent?.gradeLevel);
    // TẠM THỜI: bỏ banner cảnh báo khớp lớp (gradeMatchInfo) — khôi phục khi cần.

    return (
        <>
            <div className={styles.sectionHeading}>
                <span className={styles.headingIcon}>
                    <GraduationCap size={20} />
                </span>
                <div>
                    <span className={styles.eyebrow}>Bước 01</span>
                    <h2>Chọn môn học và trẻ</h2>
                </div>
            </div>

            <section className={styles.formSection}>
                <h3>Môn học muốn đặt</h3>
                {availableSubjects.length === 0 ? (
                    <p className={styles.inlineHint}>Gia sư này chưa cập nhật môn học.</p>
                ) : (
                    <div className={styles.subjectGrid}>
                        {availableSubjects.map((subj) => {
                            const activePrices = subjectGradePrices.filter(
                                (price) => price.isActive !== false && price.subjectId === subj.id,
                            );
                            const matchedPrice =
                                selectedGradeToken &&
                                activePrices.find(
                                    (price) => normalizeGradeToken(price.gradeLevelName) === selectedGradeToken,
                                );
                            const setup = matchedPrice || activePrices[0];
                            const gradeText = setup?.gradeLevelName || formatGradeRange(subj.gradeLevels ?? []);
                            const sessionsLabel = setup?.sessionsPerWeek ? `${setup.sessionsPerWeek} buổi` : "—";
                            const durationLabel =
                                setup?.durationMinutesPerSession && setup.durationMinutesPerSession > 0
                                    ? formatDuration(setup.durationMinutesPerSession / 60)
                                    : "—";
                            const pricePerHour = setup?.pricePerHour ?? 0;
                            return (
                                <button
                                    key={subj.id}
                                    type="button"
                                    className={`${styles.subjectCard} ${
                                        formData.subjectId === subj.id ? styles.selectedCard : ""
                                    }`}
                                    onClick={() => setFormData((d) => ({ ...d, subjectId: subj.id }))}
                                >
                                    <div className={styles.subjectCardHead}>
                                        <span className={styles.subjectIcon}>
                                            <BookOpen size={17} />
                                        </span>
                                        <div>
                                            <strong>{subj.name}</strong>
                                            {gradeText && <small>{gradeText}</small>}
                                        </div>
                                    </div>

                                    {pricePerHour > 0 && (
                                        <div className={styles.subjectPrice}>
                                            <span className={styles.subjectPriceIcon}>
                                                <Wallet size={14} />
                                            </span>
                                            <span className={styles.subjectPriceText}>
                                                <strong>{formatPrice(pricePerHour)}</strong>
                                                <small>/giờ</small>
                                            </span>
                                        </div>
                                    )}

                                    <div className={styles.subjectSetupGrid}>
                                        <span>
                                            <CalendarDays size={14} />
                                            <b>{sessionsLabel}</b>
                                            <small>/ tuần</small>
                                        </span>
                                        <span>
                                            <Clock3 size={14} />
                                            <b>{durationLabel}</b>
                                            <small>/ buổi</small>
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {userRole === "Parent" && (
                <section className={styles.formSection}>
                    <h3>Trẻ sẽ tham gia học</h3>
                    {loadingStudents ? (
                        <p className={styles.inlineHint}>Đang tải danh sách học sinh…</p>
                    ) : students.length === 0 ? (
                        <p className={styles.inlineHint}>
                            Chưa có hồ sơ học sinh.{" "}
                            <a href="/parent-portal/student" target="_blank" rel="noreferrer">
                                + Thêm hồ sơ
                            </a>
                        </p>
                    ) : (
                        <div className={styles.childGrid}>
                            {students.map((s) => (
                                <button
                                    key={s.studentId}
                                    type="button"
                                    className={`${styles.childCard} ${
                                        formData.studentId === s.studentId ? styles.selectedCard : ""
                                    }`}
                                    onClick={() => setFormData((d) => ({ ...d, studentId: s.studentId }))}
                                    disabled={!hasSubject}
                                >
                                    <span className={styles.childAvatar}>{studentInitials(s.fullName)}</span>
                                    <span>
                                        <strong>{s.fullName}</strong>
                                        <small>
                                            {[s.gradeLevel ? formatGrade(s.gradeLevel) : null, s.school]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    {!hasSubject && <p className={styles.inlineHint}>Hãy chọn môn học trước khi chọn trẻ.</p>}
                </section>
            )}
        </>
    );
};

export default StepStudentSubject;
