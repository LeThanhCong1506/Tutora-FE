import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  GraduationCap,
  Save,
  Info,
  ShieldCheck,
  ShieldAlert,
  Phone,
  IdCard,
  X,
  Check,
} from 'lucide-react';
import {
  updateMyStudentProfile,
  verifyStudentCccd,
  getBookingEligibility,
  setParentPhone,
  getMyCccdUrls,
  type StudentBookingEligibility,
  type MyCccdUrls,
} from '../../services/student.service';
import { getUserProfile } from '../../services/user.service';
import { getGradeLevels, type GradeLevelLookup } from '../../services/lookup.service';
import { useStudentProfile } from '../../contexts/StudentProfileContext';
import { takeBookingOtpResume } from '../../utils/bookingOtpResume';
import { takePendingRedirect } from '../../services/auth.service';
import styles from './styles.module.css';

/** So khớp không phân biệt "0xxxxxxxxx" với "+84xxxxxxxxx" — cùng một số thật. */
const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
};

interface FormState {
  fullname: string;
  birthdate: string;
  school: string;
  gradeLevelId: string; // giữ string cho <select>, convert sang number khi submit
  learninggoals: string;
}

const EMPTY_FORM: FormState = { fullname: '', birthdate: '', school: '', gradeLevelId: '', learninggoals: '' };
const TODAY = new Date().toISOString().slice(0, 10);

const validateIdImage = (file: File): string | null => {
  if (file.size > 5 * 1024 * 1024) return 'Kích thước ảnh không được vượt quá 5MB.';
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type))
    return 'Chỉ chấp nhận định dạng JPG hoặc PNG.';
  return null;
};

const StudentProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading, isComplete, isParentManaged, refresh } = useStudentProfile();
  // Được điều hướng tới đây từ luồng xác thực OTP giao dịch lớn (thiếu SĐT phụ huynh) —
  // cuộn tới + focus ô SĐT phụ huynh và giải thích lý do.
  const highlightParentPhone = searchParams.get('highlight') === 'parent-phone';
  const [grades, setGrades] = useState<GradeLevelLookup[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  // Student rule: xác minh CCCD + đủ điều kiện đặt lịch + SĐT phụ huynh.
  const [eligibility, setEligibility] = useState<StudentBookingEligibility | null>(null);
  // Ảnh CCCD đã upload — tự xem lại. Lần gọi lúc mở trang chỉ để biết CÓ ảnh hay không (hiện/ẩn nút);
  // link thật lấy lại ngay lúc bấm vì signed URL chỉ sống ~15 phút, để lâu sẽ hỏng.
  const [myCccd, setMyCccd] = useState<MyCccdUrls | null>(null);
  const [openingCccdSide, setOpeningCccdSide] = useState<'front' | 'back' | null>(null);
  const [cccdPreview, setCccdPreview] = useState<{ label: string; url: string } | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  // savedParentPhone = số đã lưu ở DB, hiển thị mờ khi ô chưa được bấm vào.
  // phoneDraft = giá trị đang gõ, chỉ dùng khi phoneEditing = true (sau khi bấm/focus vào ô).
  const [savedParentPhone, setSavedParentPhone] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  // Số điện thoại của chính tài khoản — chỉ để so khớp tức thì, chặn gõ trùng số của mình
  // trước khi gọi API. BE vẫn là nguồn xác thực cuối (còn kiểm trùng với tài khoản khác nữa).
  const [ownPhone, setOwnPhone] = useState('');
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // Lần đầu (hồ sơ chưa đầy đủ) → bắt buộc hoàn tất.
  const mustComplete = !isComplete;
  const identityVerified =
    profile?.isIdentityVerified === true ||
    eligibility?.canBook === true ||
    eligibility?.isUnderage === true;

  useEffect(() => {
    getGradeLevels()
      .then((res) => setGrades(res.content ?? []))
      .catch(() => setGrades([]));
  }, []);

  // Tải trạng thái đủ điều kiện đặt lịch (nguồn tin cậy cho trạng thái verify CCCD/tuổi).
  const refreshEligibility = () =>
    getBookingEligibility()
      .then((res) => setEligibility(res.content ?? null))
      .catch(() => setEligibility(null));

  useEffect(() => {
    void refreshEligibility();
  }, []);

  // Chỉ học sinh tự đăng ký mới eKYC CCCD — với tài khoản do phụ huynh tạo, gọi vẫn an toàn
  // (BE chỉ trả về của chính người gọi) nhưng sẽ luôn rỗng nên không cần điều kiện thêm ở đây.
  useEffect(() => {
    getMyCccdUrls()
      .then((res) => setMyCccd(res.content ?? null))
      .catch(() => setMyCccd(null));
  }, []);

  // Lấy signed URL mới ngay lúc bấm — link cũ lấy lúc mở trang có thể đã hết hạn.
  const handleViewCccd = async (side: 'front' | 'back') => {
    if (openingCccdSide) return;
    setOpeningCccdSide(side);
    try {
      const res = await getMyCccdUrls();
      setMyCccd(res.content ?? null);
      const url = side === 'front' ? res.content?.frontImageUrl : res.content?.backImageUrl;
      if (!url) {
        toast.error('Không tìm thấy ảnh CCCD.');
        return;
      }
      setCccdPreview({ label: side === 'front' ? 'CCCD mặt trước' : 'CCCD mặt sau', url });
    } catch {
      toast.error('Không mở được ảnh CCCD. Vui lòng thử lại.');
    } finally {
      setOpeningCccdSide(null);
    }
  };

  // Cuộn tới + focus ô SĐT phụ huynh khi được điều hướng tới đây từ luồng xác thực OTP giao
  // dịch lớn. Đợi `loading` xong (context tải profile async) để đảm bảo card đã render.
  useEffect(() => {
    if (loading || !highlightParentPhone) return;
    const timer = setTimeout(() => {
      const el = document.getElementById('parent-phone');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, highlightParentPhone]);

  // SĐT của chính tài khoản — chỉ dùng để so khớp tức thì trước khi gọi API lưu SĐT phụ huynh.
  useEffect(() => {
    getUserProfile()
      .then((res) => setOwnPhone(res?.content?.phone ?? res?.phone ?? ''))
      .catch(() => setOwnPhone(''));
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
    setSavedParentPhone(profile.parentPhone ?? '');
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

  const pickImage = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateIdImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') setFrontPreview(reader.result as string);
      else setBackPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (side === 'front') setFrontImage(file);
    else setBackImage(file);
  };

  const removeImage = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
      if (frontRef.current) frontRef.current.value = '';
    } else {
      setBackImage(null);
      setBackPreview(null);
      if (backRef.current) backRef.current.value = '';
    }
  };

  const handleVerifyCccd = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!frontImage || !backImage) {
      toast.error('Vui lòng chọn cả ảnh mặt trước và mặt sau CCCD.');
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyStudentCccd(frontImage, backImage);
      toast.success(res.content?.message || res.message || 'Xác minh độ tuổi thành công.');
      removeImage('front');
      removeImage('back');
      await Promise.all([refresh(), refreshEligibility()]);
    } catch (err) {
      // 422 = nghiệp vụ (ảnh mờ/giả, chưa đủ 16, tên không khớp, CCCD trùng); 400 = file; message sẵn tiếng Việt.
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Xác minh độ tuổi thất bại. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  // Bấm/focus vào ô số phụ huynh → xóa hiển thị mờ, để gõ số mới từ đầu.
  const handleFocusParentPhone = () => {
    if (phoneEditing) return;
    setPhoneEditing(true);
    setPhoneDraft('');
  };

  // Rời ô mà không gõ gì → coi như không đổi, quay lại hiển thị mờ số cũ
  // (tránh lưu nhầm thành rỗng nếu người dùng chỉ bấm vào xem rồi bấm ra).
  const handleBlurParentPhone = () => {
    if (phoneDraft.trim() === '') setPhoneEditing(false);
  };

  const handleSaveParentPhone = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const valueToSave = phoneEditing ? phoneDraft.trim() : savedParentPhone;

    // Chặn tức thì nếu trùng số của chính mình — đỡ một vòng round-trip cho trường hợp phổ biến
    // nhất. Trùng với số của TÀI KHOẢN KHÁC thì không thể kiểm ở FE (sẽ lộ chuyện số đó có đang
    // được dùng hay không cho bất kỳ ai gõ thử), nên phần đó luôn phải qua BE.
    if (valueToSave && ownPhone && normalizePhone(valueToSave) === normalizePhone(ownPhone)) {
      toast.error('Số điện thoại phụ huynh không được trùng với số điện thoại của chính bạn.');
      return;
    }

    setSavingPhone(true);
    try {
      const res = await setParentPhone(valueToSave || null);
      setSavedParentPhone(res.content?.parentPhone ?? '');
      setPhoneEditing(false);
      setPhoneDraft('');
      toast.success('Cập nhật số điện thoại phụ huynh thành công.');

      // Vừa nhập một SĐT thật (không phải xoá số cũ) → nếu đang dở luồng xác thực OTP giao dịch
      // lớn (thiếu SĐT phụ huynh), tự động quay lại đúng chỗ đang thanh toán dở.
      if (valueToSave) {
        const resume = takeBookingOtpResume();
        if (resume) {
          navigate(`/tutor-detail/${resume.tutorId}`, { state: { resumeBookingOtp: resume.bookingId } });
          return;
        }
        const pendingRedirect = await takePendingRedirect();
        if (pendingRedirect) {
          navigate(pendingRedirect);
          return;
        }
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cập nhật số điện thoại phụ huynh thất bại.';
      toast.error(message);
    } finally {
      setSavingPhone(false);
    }
  };

  // Checklist tiến trình (card tracking bên phải)
  const checklist = useMemo(() => {
    return [
      { key: 'profile', label: 'Hoàn thiện hồ sơ học tập', done: isComplete, required: true },
      { key: 'cccd', label: 'Xác minh độ tuổi qua CCCD (đủ 16 tuổi)', done: identityVerified, required: true },
    ];
  }, [isComplete, identityVerified]);

  const totalSteps = checklist.length;
  const doneSteps = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneSteps / totalSteps) * 100);
  const firstIncomplete = checklist.findIndex((c) => !c.done);
  const allDone = doneSteps === totalSteps;

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
          <p>Hoàn thiện hồ sơ và xác minh độ tuổi để có thể đặt lịch học với gia sư.</p>
        </div>
      </header>

      {mustComplete && (
        <div className={styles.mandatoryBanner}>
          <Info size={18} />
          <span>Vui lòng hoàn tất hồ sơ học sinh trước khi sử dụng các tính năng khác.</span>
        </div>
      )}

      <div className={`${styles.layout} ${isParentManaged ? styles.layoutSingle : ''}`}>
        <div className={styles.leftColumn}>
          <form className={styles.card} onSubmit={handleSubmit} noValidate>
            <h2 className={styles.cardTitle}>Thông tin học tập</h2>

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
                disabled={identityVerified}
              />
              {identityVerified ? (
                <span className={styles.verifiedHint}>Đã xác minh qua CCCD, không thể chỉnh sửa.</span>
              ) : (
                errors.fullname && <span className={styles.err}>{errors.fullname}</span>
              )}
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
                  disabled={identityVerified}
                />
                {identityVerified ? (
                  <span className={styles.verifiedHint}>Đã xác minh qua CCCD, không thể chỉnh sửa.</span>
                ) : (
                  errors.birthdate && <span className={styles.err}>{errors.birthdate}</span>
                )}
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
              <label htmlFor="sp-school">Trường đang học</label>
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

          {/* Card: xác minh CCCD (chỉ học sinh tự đăng ký) */}
          {!isParentManaged && (
            <section className={styles.card}>
              <div className={styles.cccdHeader}>
                <h2 className={styles.cardTitle}>
                  <IdCard size={18} /> Xác minh độ tuổi
                </h2>
                {identityVerified ? (
                  <span className={`${styles.badge} ${styles.badgeVerified}`}>
                    <ShieldCheck size={14} /> Đã xác minh
                  </span>
                ) : eligibility?.isUnderage ? (
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>
                    <ShieldAlert size={14} /> Chưa đủ 16 tuổi
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                    <ShieldAlert size={14} /> Chưa xác minh
                  </span>
                )}
              </div>

              {identityVerified ? (
                <>
                  <p className={styles.cccdVerifiedNote}>
                    <ShieldCheck size={16} />
                    Độ tuổi đã được xác minh qua CCCD{eligibility?.age != null ? ` · ${eligibility.age} tuổi` : ''}.
                    {eligibility?.canBook
                      ? ' Bạn có thể đặt lịch học.'
                      : ' Bạn cần đủ 16 tuổi để tự đặt lịch.'}
                  </p>
                  {(myCccd?.frontImageUrl || myCccd?.backImageUrl) && (
                    <div className={styles.cccdViewActions}>
                      {myCccd.frontImageUrl && (
                        <button
                          type="button"
                          className={styles.cccdViewLink}
                          disabled={openingCccdSide !== null}
                          onClick={() => void handleViewCccd('front')}
                        >
                          <IdCard size={14} />
                          {openingCccdSide === 'front' ? 'Đang mở…' : 'Xem CCCD mặt trước'}
                        </button>
                      )}
                      {myCccd.backImageUrl && (
                        <button
                          type="button"
                          className={styles.cccdViewLink}
                          disabled={openingCccdSide !== null}
                          onClick={() => void handleViewCccd('back')}
                        >
                          <IdCard size={14} />
                          {openingCccdSide === 'back' ? 'Đang mở…' : 'Xem CCCD mặt sau'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleVerifyCccd}>
                  <div className={styles.instructions}>
                    <h4>Hướng dẫn xác minh độ tuổi</h4>
                    <ul>
                      <li>Chụp ảnh CCCD/CMND rõ ràng, không bị mờ hay cắt góc.</li>
                      <li>Họ tên trên CCCD phải khớp với họ tên trong hồ sơ.</li>
                      <li>Bạn phải đủ 16 tuổi để có thể tự đặt lịch học.</li>
                      <li>File JPG hoặc PNG, tối đa 5MB.</li>
                    </ul>
                  </div>

                  <div className={styles.uploadRow}>
                    {(['front', 'back'] as const).map((side) => {
                      const preview = side === 'front' ? frontPreview : backPreview;
                      const ref = side === 'front' ? frontRef : backRef;
                      const label = side === 'front' ? 'Mặt trước CCCD' : 'Mặt sau CCCD';
                      return (
                        <div key={side} className={styles.uploadCol}>
                          <label className={styles.uploadLabel}>
                            {label} <span className={styles.req}>*</span>
                          </label>
                          {preview ? (
                            <div className={styles.imagePreview}>
                              <img src={preview} alt={label} />
                              <button type="button" className={styles.removeBtn} onClick={() => removeImage(side)}>
                                <X size={12} />
                              </button>
                              <span className={styles.previewOk}>
                                <Check size={14} />
                              </span>
                            </div>
                          ) : (
                            <div className={styles.uploadArea} onClick={() => ref.current?.click()}>
                              <IdCard size={26} />
                              <span>Tải lên {side === 'front' ? 'mặt trước' : 'mặt sau'}</span>
                              <span className={styles.uploadHint}>JPG, PNG · tối đa 5MB</span>
                            </div>
                          )}
                          <input
                            ref={ref}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={pickImage(side)}
                            className={styles.fileInput}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <p className={styles.privacyNote}>
                    Thông tin CCCD/CMND được bảo mật và chỉ dùng để xác minh độ tuổi, không chia sẻ với bên thứ ba.
                  </p>

                  <div className={styles.actions}>
                    <button
                      type="submit"
                      className={styles.saveBtn}
                      disabled={verifying || !frontImage || !backImage}
                    >
                      <ShieldCheck size={16} />
                      {verifying ? 'Đang xác minh...' : 'Gửi xác minh'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* Card: SĐT phụ huynh (tùy chọn, chỉ học sinh tự đăng ký) */}
          {!isParentManaged && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <Phone size={18} /> Số điện thoại phụ huynh
              </h2>
              {highlightParentPhone && (
                <div className={styles.mandatoryBanner}>
                  <Info size={18} />
                  <span>
                    Đây là giao dịch lớn nên cần xác thực qua SĐT phụ huynh. Vui lòng nhập số điện thoại
                    phụ huynh và lưu lại để tiếp tục thanh toán.
                  </span>
                </div>
              )}
              <form onSubmit={handleSaveParentPhone}>
                <div className={styles.field}>
                  <input
                    id="parent-phone"
                    value={phoneEditing ? phoneDraft : savedParentPhone}
                    onFocus={handleFocusParentPhone}
                    onBlur={handleBlurParentPhone}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="VD: 0901234567"
                    maxLength={12}
                    className={!phoneEditing && savedParentPhone ? styles.savedPhoneDisplay : ''}
                  />
                  <span className={styles.counter}>
                    Tùy chọn — để phụ huynh nhận thông báo theo dõi (ZNS). Không tạo liên kết tài khoản.
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.saveBtn} disabled={savingPhone}>
                    <Save size={16} />
                    {savingPhone ? 'Đang lưu...' : 'Lưu số điện thoại'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        {!isParentManaged && (
        <aside className={styles.rightColumn}>
          <div className={styles.trackCard}>
            <div className={styles.trackHeader}>
              <span className={styles.trackLabel}>Tiến trình hoàn thiện</span>
              <span className={styles.trackCount}>
                {doneSteps}
                <span className={styles.trackTotal}>/{totalSteps}</span>
              </span>
            </div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>

            <div className={styles.trackStatus}>
              {allDone ? (
                <span className={styles.trackComplete}>Bạn đã đủ điều kiện đặt lịch học!</span>
              ) : (
                <span className={styles.trackNeeds}>Hoàn thành các bước để có thể đặt lịch học.</span>
              )}
            </div>

            <div className={styles.trackSteps}>
              {checklist.map((item, idx) => {
                const isCurrent = !item.done && idx === firstIncomplete;
                return (
                  <div
                    key={item.key}
                    className={`${styles.trackStep} ${item.done ? styles.trackStepDone : ''} ${
                      isCurrent ? styles.trackStepCurrent : ''
                    }`}
                  >
                    <span className={styles.trackDot}>
                      {item.done ? <Check size={14} /> : <span className={styles.trackNum}>{idx + 1}</span>}
                    </span>
                    <span className={styles.trackStepLabel}>{item.label}</span>
                    {isCurrent && <span className={styles.trackNext}>Tiếp theo</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
        )}
      </div>

      {cccdPreview && (
        <div
          className={styles.cccdPreviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={cccdPreview.label}
          onClick={() => setCccdPreview(null)}
        >
          <div className={styles.cccdPreviewBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cccdPreviewHead}>
              <strong>{cccdPreview.label}</strong>
              <button
                type="button"
                className={styles.cccdPreviewClose}
                onClick={() => setCccdPreview(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <img src={cccdPreview.url} alt={cccdPreview.label} className={styles.cccdPreviewImg} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
