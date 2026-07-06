import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GraduationCap, Save, Info } from 'lucide-react';
import { updateMyStudentProfile } from '../../services/student.service';
import { getGradeLevels, type GradeLevelLookup } from '../../services/lookup.service';
import { useStudentProfile } from '../../contexts/StudentProfileContext';
import styles from './styles.module.css';

interface FormState {
  fullname: string;
  birthdate: string;
  school: string;
  gradeLevelId: string; // giữ string cho <select>, convert sang number khi submit
  learninggoals: string;
}

const EMPTY_FORM: FormState = { fullname: '', birthdate: '', school: '', gradeLevelId: '', learninggoals: '' };
const TODAY = new Date().toISOString().slice(0, 10);

const StudentProfile = () => {
  const navigate = useNavigate();
  const { profile, loading, isComplete, refresh } = useStudentProfile();
  const [grades, setGrades] = useState<GradeLevelLookup[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  // Lần đầu (hồ sơ chưa đầy đủ) → bắt buộc hoàn tất.
  const mustComplete = !isComplete;

  useEffect(() => {
    getGradeLevels()
      .then((res) => setGrades(res.content ?? []))
      .catch(() => setGrades([]));
  }, []);

  // Prefill khi có hồ sơ.
  useEffect(() => {
    if (!profile) return;
    setForm({
      fullname: profile.fullName ?? '',
      birthdate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
      school: profile.school ?? '',
      gradeLevelId: profile.gradeLevelId != null ? String(profile.gradeLevelId) : '',
      learninggoals: profile.learningGoals ?? '',
    });
  }, [profile]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    const name = form.fullname.trim();
    if (name.length < 2 || name.length > 100) e.fullname = 'Họ tên phải từ 2 đến 100 ký tự.';
    if (!form.birthdate) e.birthdate = 'Vui lòng chọn ngày sinh.';
    else if (new Date(form.birthdate).getTime() > Date.now()) e.birthdate = 'Ngày sinh không hợp lệ.';
    if (!form.gradeLevelId) e.gradeLevelId = 'Vui lòng chọn khối lớp.';
    if (form.learninggoals.length > 1000) e.learninggoals = 'Mục tiêu học tập tối đa 1000 ký tự.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const wasIncomplete = !isComplete;
    setSaving(true);
    try {
      await updateMyStudentProfile({
        fullname: form.fullname.trim(),
        birthdate: form.birthdate,
        school: form.school.trim() || undefined,
        gradeLevelId: Number(form.gradeLevelId),
        learninggoals: form.learninggoals.trim() || undefined,
      });
      toast.success('Cập nhật hồ sơ thành công!');
      await refresh();
      // Sau khi hoàn tất lần đầu, đưa học sinh về trang Tổng quan.
      if (wasIncomplete) navigate('/student-portal/dashboard');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cập nhật hồ sơ thất bại. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Đang tải hồ sơ...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <GraduationCap size={22} />
        </span>
        <div>
          <h1>Hồ sơ học sinh</h1>
          <p>Cập nhật thông tin học tập để gia sư hiểu rõ và hỗ trợ bạn tốt hơn.</p>
        </div>
      </header>

      {mustComplete && (
        <div className={styles.mandatoryBanner}>
          <Info size={18} />
          <span>Vui lòng hoàn tất hồ sơ học sinh trước khi sử dụng các tính năng khác.</span>
        </div>
      )}

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="sp-fullname">
            Họ và tên <span className={styles.req}>*</span>
          </label>
          <input
            id="sp-fullname"
            value={form.fullname}
            onChange={(e) => set('fullname', e.target.value)}
            placeholder="Nguyễn Văn A"
            maxLength={100}
          />
          {errors.fullname && <span className={styles.err}>{errors.fullname}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="sp-birthdate">
              Ngày sinh <span className={styles.req}>*</span>
            </label>
            <input
              id="sp-birthdate"
              type="date"
              value={form.birthdate}
              max={TODAY}
              onChange={(e) => set('birthdate', e.target.value)}
            />
            {errors.birthdate && <span className={styles.err}>{errors.birthdate}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="sp-grade">
              Khối lớp <span className={styles.req}>*</span>
            </label>
            <select id="sp-grade" value={form.gradeLevelId} onChange={(e) => set('gradeLevelId', e.target.value)}>
              <option value="">-- Chọn khối lớp --</option>
              {grades.map((g) => (
                <option key={g.gradeLevelId} value={g.gradeLevelId}>
                  {g.gradeName}
                </option>
              ))}
            </select>
            {errors.gradeLevelId && <span className={styles.err}>{errors.gradeLevelId}</span>}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="sp-school">
            Trường đang học
          </label>
          <input
            id="sp-school"
            value={form.school}
            onChange={(e) => set('school', e.target.value)}
            placeholder="VD: THPT Chuyên Lê Hồng Phong"
            maxLength={255}
          />
          {errors.school && <span className={styles.err}>{errors.school}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="sp-goals">Mục tiêu học tập</label>
          <textarea
            id="sp-goals"
            value={form.learninggoals}
            onChange={(e) => set('learninggoals', e.target.value)}
            rows={4}
            placeholder="VD: Cải thiện điểm Toán, luyện thi vào lớp 10..."
            maxLength={1000}
          />
          <span className={styles.counter}>{form.learninggoals.length}/1000</span>
          {errors.learninggoals && <span className={styles.err}>{errors.learninggoals}</span>}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentProfile;
