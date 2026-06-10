import { useMemo, useState } from "react";
import type { StepProps } from "./types";
import { formatGrade } from "./utils";

// Compact grade label cho chip (vd ["grade_10", "grade_11", "grade_12"] → "Lớp 10-12").
const formatGradeRange = (grades: string[]): string => {
    if (grades.length === 0) return "";
    const nums = grades
        .map((g) => Number(g.replace("grade_", "")))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
    if (nums.length === 0) return grades.join(", ");
    if (nums.length === 1) return `Lớp ${nums[0]}`;
    // Liên tục?
    const isContiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    return isContiguous ? `Lớp ${nums[0]}-${nums[nums.length - 1]}` : `Lớp ${nums.join(", ")}`;
};

const StepStudentSubject: React.FC<StepProps> = ({
    formData,
    setFormData,
    students,
    loadingStudents,
    availableSubjects,
    userRole,
}) => {
    const [subjectQuery, setSubjectQuery] = useState("");

    const filteredSubjects = useMemo(() => {
        if (!subjectQuery.trim()) return availableSubjects;
        const q = subjectQuery.trim().toLowerCase();
        return availableSubjects.filter((s) => s.name.toLowerCase().includes(q));
    }, [subjectQuery, availableSubjects]);

    const showSearch = availableSubjects.length > 6;

    // Banner check khớp lớp: nếu cả student + subject đã chọn → so sánh.
    const selectedStudent = students.find((s) => s.studentId === formData.studentId);
    const selectedSubject = availableSubjects.find((s) => s.id === formData.subjectId);
    const gradeMatchInfo = (() => {
        if (!selectedStudent || !selectedSubject) return null;
        const grades = selectedSubject.gradeLevels ?? [];
        if (grades.length === 0) return null; // tutor không khai báo → bỏ qua
        const matches = grades.includes(selectedStudent.gradeLevel);
        return {
            matches,
            studentGrade: formatGrade(selectedStudent.gradeLevel),
            tutorGrades: formatGradeRange(grades),
        };
    })();

    return (
        <div className="bm-step">
            {/* Student selection (Parent only) */}
            {userRole === "Parent" && (
                <>
                    <div className="bm-step-title">Chọn học sinh</div>
                    {loadingStudents ? (
                        <div className="bm-loading">Đang tải...</div>
                    ) : students.length === 0 ? (
                        <div className="bm-empty-msg">
                            <p>Chưa có hồ sơ học sinh.</p>
                            <a href="/parent-portal/student" target="_blank" className="bm-btn-add-student">
                                + Thêm hồ sơ
                            </a>
                        </div>
                    ) : (
                        <div className="bm-student-row">
                            {students.map((s) => (
                                <button
                                    key={s.studentId}
                                    type="button"
                                    className={`bm-student-pill ${formData.studentId === s.studentId ? "selected" : ""}`}
                                    onClick={() => setFormData((d) => ({ ...d, studentId: s.studentId }))}
                                >
                                    <span className="bm-student-pill-name">{s.fullName}</span>
                                    <span className="bm-student-pill-grade">
                                        {s.gradeLevel ? formatGrade(s.gradeLevel) : s.school || ""}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Subject selection */}
            <div className="bm-step-title" style={{ marginTop: userRole === "Parent" ? 22 : 0 }}>
                Chọn môn học
            </div>

            {showSearch && (
                <input
                    type="text"
                    className="bm-form-input"
                    placeholder="Tìm môn..."
                    value={subjectQuery}
                    onChange={(e) => setSubjectQuery(e.target.value)}
                    style={{ marginBottom: 12, maxWidth: 280 }}
                />
            )}

            {availableSubjects.length === 0 ? (
                <div className="bm-empty-msg">Gia sư này chưa cập nhật môn học.</div>
            ) : (
                <div className="bm-subject-grid">
                    {filteredSubjects.map((subj) => {
                        const gradeText = formatGradeRange(subj.gradeLevels ?? []);
                        return (
                            <button
                                key={subj.id}
                                className={`bm-subject-btn ${formData.subjectId === subj.id ? "selected" : ""}`}
                                onClick={() => setFormData((d) => ({ ...d, subjectId: subj.id }))}
                                type="button"
                            >
                                <span className="bm-subject-btn-name">{subj.name}</span>
                                {gradeText && <span className="bm-subject-btn-grade">{gradeText}</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Grade matching banner */}
            {gradeMatchInfo && (
                <div className={`bm-grade-match-banner ${gradeMatchInfo.matches ? "match" : "mismatch"}`}>
                    {gradeMatchInfo.matches ? (
                        <span>✓ Học sinh {gradeMatchInfo.studentGrade} khớp với khối {gradeMatchInfo.tutorGrades} gia sư dạy.</span>
                    ) : (
                        <span>
                            ✗ Học sinh đang ở <b>{gradeMatchInfo.studentGrade}</b>, nhưng gia sư chỉ dạy <b>{gradeMatchInfo.tutorGrades}</b>. Hãy đổi học sinh hoặc môn khác.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default StepStudentSubject;
