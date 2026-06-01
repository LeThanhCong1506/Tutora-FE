import type { StepProps } from "./types";
import { formatGrade } from "./utils";

const StepStudentSubject: React.FC<StepProps> = ({
    formData,
    setFormData,
    students,
    loadingStudents,
    availableSubjects,
    userRole,
}) => (
    <div className="bm-step">
        {/* Only show student selection for Parent role */}
        {userRole === "Parent" && (
            <>
                <div className="bm-step-title">Chọn học sinh</div>
                {loadingStudents ? (
                    <div className="bm-loading">Đang tải danh sách học sinh...</div>
                ) : students.length === 0 ? (
                    <div className="bm-empty-msg">
                        <p>Chưa có hồ sơ học sinh nào.</p>
                        <a href="/parent-portal/student" target="_blank" className="bm-btn-add-student">
                            + Thêm hồ sơ học sinh
                        </a>
                    </div>
                ) : (
                    <div className="bm-student-grid">
                        {students.map((s) => (
                            <div
                                key={s.studentId}
                                className={`bm-student-card ${formData.studentId === s.studentId ? "selected" : ""}`}
                                onClick={() => setFormData((d) => ({ ...d, studentId: s.studentId }))}
                            >
                                <div className="bm-student-avatar">
                                    {s.avatarURL ? (
                                        <img src={s.avatarURL} alt={s.fullName} />
                                    ) : (
                                        s.fullName.charAt(0)
                                    )}
                                </div>
                                <div className="bm-student-info">
                                    <span className="bm-student-name">{s.fullName}</span>
                                    <span className="bm-student-grade">{s.gradeLevel ? formatGrade(s.gradeLevel) : s.school}</span>
                                </div>
                                {formData.studentId === s.studentId && <div className="bm-check">✓</div>}
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}

        <div className="bm-step-title" style={{ marginTop: userRole === "Parent" ? 24 : 0 }}>Chọn môn học</div>
        {availableSubjects.length === 0 ? (
            <div className="bm-empty-msg">Gia sư này chưa cập nhật môn học.</div>
        ) : (
            <div className="bm-subject-grid">
                {availableSubjects.map((subj) => (
                    <button
                        key={subj.id}
                        className={`bm-subject-btn ${formData.subjectId === subj.id ? "selected" : ""}`}
                        onClick={() => setFormData((d) => ({ ...d, subjectId: subj.id }))}
                        type="button"
                    >
                        {subj.name}
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default StepStudentSubject;
