import React, { useMemo, useState } from 'react';
import { Select, Button, Popconfirm, InputNumber } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import styles from '../styles.module.css';
import { getMaxSessionHours, getMaxSessionsPerWeek } from './availability-utils';
import { SUBJECTS, GRADE_LEVELS, formatPrice, formatDuration } from './constants';
import type { UseOnboardingState } from './hooks/useOnboardingState';
import type { SubjectOption, GradeOption } from './hooks/useLookups';
import type { SubjectRecord } from './types';

interface StepSubjectRecordsProps {
  onboarding: UseOnboardingState;
  // Lấy từ BE (GET /api/subjects, /api/grade-levels); mặc định = hằng số nếu chưa truyền.
  subjects?: SubjectOption[];
  gradeLevels?: GradeOption[];
  onSaveSubjectRecords?: (records: SubjectRecord[]) => Promise<boolean>;
  saving?: boolean;
}

// Ngưỡng cảnh báo giá: tutor thường không cao quá 1tr/giờ. > 2tr coi như nhập nhầm.
const PRICE_WARN_HIGH = 2_000_000;
const MIN_PRICE = 1000;

// Số giờ/buổi gia sư có thể chọn cho môn.
const PRICE_PRESETS = [50_000, 100_000, 150_000, 200_000, 250_000];
const DURATION_OPTIONS = [1, 1.5, 2];
const MIN_DURATION = 0.5;
const DURATION_STEP = 0.5;
// Số buổi/tuần đề xuất cho cấu hình.
const SESSIONS_PER_WEEK_OPTIONS = [1, 2, 3];
const MIN_SESSIONS_PER_WEEK = 1;

// 30 phút = 0.5 giờ → số giờ/buổi hợp lệ phải là bội số của 0.5 (1e-9 để tránh sai số dấu phẩy động).
const isHalfHourMultiple = (hours: number) => Math.abs(hours * 2 - Math.round(hours * 2)) < 1e-9;

// Khối lớp hợp lệ cho 1 môn — so theo levelOrder (id không đảm bảo tăng dần theo khối lớp).
// Chưa chọn môn (subject=null) -> rỗng, ép chọn môn trước khi chọn lớp.
const getAllowedGradeLevels = <G extends { levelOrder: number }>(
  subject: Pick<SubjectOption, 'minGradeLevelOrder' | 'maxGradeLevelOrder'> | null,
  gradeLevels: G[],
): G[] => {
  if (!subject) return [];
  const { minGradeLevelOrder, maxGradeLevelOrder } = subject;
  if (minGradeLevelOrder == null && maxGradeLevelOrder == null) return gradeLevels;
  return gradeLevels.filter(
    (g) =>
      (minGradeLevelOrder == null || g.levelOrder >= minGradeLevelOrder) &&
      (maxGradeLevelOrder == null || g.levelOrder <= maxGradeLevelOrder),
  );
};

const formatPresetPrice = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}tr` : `${Math.round(n / 1000)}k`;

const StepSubjectRecords: React.FC<StepSubjectRecordsProps> = ({
  onboarding,
  subjects = SUBJECTS,
  gradeLevels = GRADE_LEVELS,
  onSaveSubjectRecords,
  saving = false,
}) => {
  const { state, addSubjectRecord, removeSubjectRecord, updateSubjectRecord } = onboarding;

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [hoursPerSession, setHoursPerSession] = useState<number | null>(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => (subjectId == null ? null : (subjects.find((s) => s.id === subjectId) ?? null)),
    [subjectId, subjects],
  );
  const subjectName = selectedSubject?.name ?? '';

  // Lớp áp dụng phụ thuộc môn đã chọn (vd Vật Lý/Hóa Học không hiện Lớp 1-5 — sai chương trình).
  const allowedGradeLevels = useMemo(
    () => getAllowedGradeLevels(selectedSubject, gradeLevels),
    [selectedSubject, gradeLevels],
  );

  // Đổi môn -> lọc lại các lớp đã chọn xuống phần còn hợp lệ với môn mới (giữ giao nhau thay
  // vì xoá trắng, đỡ khó chịu hơn khi tutor lỡ chọn nhầm môn rồi sửa lại).
  const handleSubjectChange = (nextSubjectId: number) => {
    setSubjectId(nextSubjectId);
    const nextSubject = subjects.find((s) => s.id === nextSubjectId) ?? null;
    const allowedValues = new Set(getAllowedGradeLevels(nextSubject, gradeLevels).map((g) => g.value));
    setSelectedGradeLevels((prev) => prev.filter((v) => allowedValues.has(v)));
  };

  // Giới hạn suy ra từ lịch rảnh đã thiết lập ở bước 1:
  // - Số giờ/buổi không thể vượt khối rảnh liên tục dài nhất trong 1 ngày.
  // - Số buổi/tuần không thể vượt số buổi (cùng độ dài) nhét vừa cả tuần.
  const maxHoursPerSession = useMemo(() => getMaxSessionHours(state.availability), [state.availability]);
  const maxSessionsPerWeek = useMemo(
    () => (hoursPerSession && hoursPerSession > 0 ? getMaxSessionsPerWeek(state.availability, hoursPerSession) : 0),
    [state.availability, hoursPerSession],
  );

  // Gộp mọi lỗi của "số giờ/buổi" thành 1 thông điệp (chỉ hiện 1 dòng tại một thời điểm).
  const hoursWarning = useMemo(() => {
    if (hoursPerSession == null) return null;
    if (!isHalfHourMultiple(hoursPerSession)) {
      return 'Thời gian mỗi buổi phải là bội số của 30 phút (vd 1 giờ, 1h30, 2 giờ).';
    }
    if (maxHoursPerSession > 0 && hoursPerSession > maxHoursPerSession) {
      return `Mỗi buổi tối đa ${formatDuration(maxHoursPerSession)} theo lịch rảnh bạn đã thiết lập. Hãy giảm thời lượng hoặc mở thêm khung giờ rảnh ở bước trước.`;
    }
    return null;
  }, [hoursPerSession, maxHoursPerSession]);
  const isSessionsTooHigh = sessionsPerWeek != null && maxSessionsPerWeek > 0 && sessionsPerWeek > maxSessionsPerWeek;

  const canAdd =
    subjectId != null &&
    selectedGradeLevels.length > 0 &&
    hourlyRate != null &&
    hourlyRate > 0 &&
    hoursPerSession != null &&
    hoursPerSession > 0 &&
    hoursWarning == null &&
    sessionsPerWeek != null &&
    sessionsPerWeek > 0 &&
    !isSessionsTooHigh;
  const isPriceTooHigh = hourlyRate != null && hourlyRate > PRICE_WARN_HIGH;
  const isEditMode = editingRecordId != null;

  const resetForm = () => {
    setSubjectId(null);
    setSelectedGradeLevels([]);
    setHourlyRate(null);
    setHoursPerSession(null);
    setSessionsPerWeek(null);
    setEditingRecordId(null);
  };

  const startEditRecord = (record: SubjectRecord) => {
    setEditingRecordId(record.id);
    setSubjectId(record.subjectId);
    setSelectedGradeLevels(record.gradeLevels);
    setHourlyRate(record.hourlyRate);
    setHoursPerSession(record.hoursPerSession);
    setSessionsPerWeek(record.sessionsPerWeek);
  };

  const handleSaveRecord = async () => {
    if (!canAdd) return;
    const gradeOrder = new Map(gradeLevels.map((grade, index) => [grade.value, index]));
    const normalizedGradeLevels = Array.from(new Set(selectedGradeLevels)).sort(
      (a, b) => (gradeOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (gradeOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
    const input = {
      subjectId: subjectId as number,
      subjectName,
      gradeLevels: normalizedGradeLevels,
      hourlyRate: hourlyRate as number,
      hoursPerSession: hoursPerSession as number,
      sessionsPerWeek: sessionsPerWeek as number,
    };
    const conflictingGrades = new Set(
      state.subjectRecords
        .filter((record) => record.id !== editingRecordId && record.subjectId === input.subjectId)
        .flatMap((record) => record.gradeLevels)
        .filter((gradeLevel) => input.gradeLevels.includes(gradeLevel)),
    );

    if (conflictingGrades.size > 0) {
      const labels = Array.from(conflictingGrades).map(
        (value) => gradeLevels.find((grade) => grade.value === value)?.label ?? value,
      );
      toast.warning(`Môn này đã có cấu hình cho ${labels.join(', ')}.`);
      return;
    }

    if (editingRecordId) {
      const nextRecords = state.subjectRecords.map((record) =>
        record.id === editingRecordId ? { ...record, ...input } : record,
      );
      const ok = onSaveSubjectRecords ? await onSaveSubjectRecords(nextRecords) : true;
      if (!ok) return;

      updateSubjectRecord(editingRecordId, input);
      toast.success('Đã cập nhật cấu hình');
      resetForm();
      return;
    }

    const nextRecords: SubjectRecord[] = [
      ...state.subjectRecords,
      { ...input, id: `pending_${Date.now()}` },
    ];
    const saved = onSaveSubjectRecords ? await onSaveSubjectRecords(nextRecords) : true;
    if (!saved) return;

    addSubjectRecord(input);
    resetForm();
    toast.success('Đã thêm cấu hình');
  };

  const handleRemoveRecord = async (record: SubjectRecord) => {
    const nextRecords = state.subjectRecords.filter((r) => r.id !== record.id);
    const ok = onSaveSubjectRecords ? await onSaveSubjectRecords(nextRecords) : true;
    if (!ok) return;

    removeSubjectRecord(record.id);
    if (editingRecordId === record.id) resetForm();
    toast.success('Đã xoá cấu hình');
  };

  return (
    <div className={styles.subjectRecordsStep}>
      <section className={styles.subjectRecordsIntro}>
        <div className={styles.subjectRecordsIntroMain}>
          <span className={styles.subjectRecordsEyebrow}>Mục bắt buộc</span>
          <h2 className={styles.stepHeading}>Môn học & giá theo khối lớp</h2>
        </div>
      </section>

      {/* 2-column layout: form bên trái, list cấu hình đã thêm bên phải */}
      <div className={styles.recordsLayout}>
        <div className={styles.recordsMain}>
          <div className={styles.recordForm}>
            <div className={styles.recordFormHead}>
              <div>
                <h3 className={styles.recordFormTitle}>
                  {isEditMode ? 'Chỉnh sửa cấu hình giảng dạy' : 'Thêm cấu hình giảng dạy'}
                </h3>
              </div>
              <span className={`${styles.recordFormStep} ${isEditMode ? styles.recordFormStepActive : ''}`}>
                {isEditMode ? 'Đang chỉnh sửa' : 'Cấu hình mới'}
              </span>
            </div>

            <div className={styles.recordSelectGrid}>
              <label className={styles.recordField}>
                <span className={styles.recordFieldLabel}>1. Môn học</span>
                <Select
                  placeholder="Chọn môn bạn giảng dạy"
                  value={subjectId}
                  onChange={handleSubjectChange}
                  options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label className={styles.recordField}>
                <span className={styles.recordFieldLabel}>2. Khối lớp áp dụng</span>
                <Select
                  mode="multiple"
                  allowClear
                  maxTagCount="responsive"
                  optionFilterProp="label"
                  disabled={subjectId == null}
                  placeholder={subjectId == null ? 'Chọn môn học trước' : 'Chọn một hoặc nhiều khối lớp'}
                  value={selectedGradeLevels}
                  onChange={setSelectedGradeLevels}
                  options={allowedGradeLevels.map((g) => ({ value: g.value, label: g.label }))}
                  className={styles.recordGradeSelect}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div className={styles.recordSetupGrid}>
              <div className={`${styles.recordSetupCard} ${styles.recordSetupCardWide}`}>
                <div className={styles.recordSetupHead}>
                  <span className={styles.recordFieldLabel}>3. Giá cho mỗi giờ học</span>
                  <strong className={styles.recordValueBadge}>
                    {hourlyRate != null ? `${formatPrice(hourlyRate)}đ/giờ` : 'Chưa chọn'}
                  </strong>
                </div>
                <div className={styles.pricePresetList}>
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`${styles.pricePresetBtn} ${hourlyRate === preset ? styles.activePricePreset : ''}`}
                      onClick={() => setHourlyRate(preset)}
                    >
                      {formatPresetPrice(preset)}
                    </button>
                  ))}
                </div>
                <label className={styles.recordManualInput}>
                  <span>Nhập khác</span>
                  <InputNumber<number>
                    min={MIN_PRICE}
                    step={10_000}
                    value={hourlyRate ?? undefined}
                    onChange={(value) => setHourlyRate(value ?? null)}
                    formatter={(value) => (value ? formatPrice(Number(value)) : '')}
                    parser={(value) => (value ? Number(value.replace(/\D/g, '')) : 0)}
                    addonAfter="VND"
                    placeholder="Nhập số tiền"
                    style={{ width: '100%' }}
                  />
                </label>
                {isPriceTooHigh && (
                  <div className={styles.recordPriceWarn}>
                    <WarningOutlined />
                    <span>
                      Mức giá <strong>{formatPrice(hourlyRate ?? 0)}đ/giờ</strong> khá cao so với mặt bằng chung. Hãy
                      kiểm tra lại trước khi lưu.
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.recordSetupCard}>
                <div className={styles.recordSetupHead}>
                  <span className={styles.recordFieldLabel}>4. Thời gian mỗi buổi học</span>
                  <strong className={styles.recordValueBadge}>
                    {hoursPerSession != null ? `${formatDuration(hoursPerSession)}/buổi` : 'Chưa chọn'}
                  </strong>
                </div>
                <div className={styles.pricePresetList}>
                  {DURATION_OPTIONS.map((d) => {
                    const disabled = maxHoursPerSession > 0 && d > maxHoursPerSession;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        title={
                          disabled
                            ? `Vượt quá lịch rảnh (tối đa ${formatDuration(maxHoursPerSession)}/buổi)`
                            : undefined
                        }
                        className={`${styles.pricePresetBtn} ${hoursPerSession === d ? styles.activePricePreset : ''}`}
                        onClick={() => setHoursPerSession(d)}
                      >
                        {formatDuration(d)}
                      </button>
                    );
                  })}
                </div>
                <label className={styles.recordManualInput}>
                  <span>Nhập khác</span>
                  {/* Không set max ở đây: để Antd không tự kẹp giá trị, nhờ vậy số nhập vượt
                      ngưỡng được giữ nguyên và kích hoạt cảnh báo bên dưới. */}
                  <InputNumber<number>
                    min={MIN_DURATION}
                    step={DURATION_STEP}
                    value={hoursPerSession ?? undefined}
                    onChange={(value) => setHoursPerSession(value ?? null)}
                    addonAfter="giờ/buổi"
                    placeholder="VD: 3.5"
                    status={hoursWarning ? 'error' : undefined}
                    style={{ width: '100%' }}
                  />
                </label>
                {hoursWarning && (
                  <div className={styles.recordPriceWarn}>
                    <WarningOutlined />
                    <span>{hoursWarning}</span>
                  </div>
                )}
              </div>

              <div className={styles.recordSetupCard}>
                <div className={styles.recordSetupHead}>
                  <span className={styles.recordFieldLabel}>5. Số buổi mỗi tuần</span>
                  <strong className={styles.recordValueBadge}>
                    {sessionsPerWeek != null ? `${sessionsPerWeek} buổi/tuần` : 'Chưa chọn'}
                  </strong>
                </div>
                <div className={styles.pricePresetList}>
                  {SESSIONS_PER_WEEK_OPTIONS.map((n) => {
                    const disabled = maxSessionsPerWeek > 0 && n > maxSessionsPerWeek;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        title={disabled ? `Vượt quá lịch rảnh (tối đa ${maxSessionsPerWeek} buổi/tuần)` : undefined}
                        className={`${styles.pricePresetBtn} ${sessionsPerWeek === n ? styles.activePricePreset : ''}`}
                        onClick={() => setSessionsPerWeek(n)}
                      >
                        {n} buổi
                      </button>
                    );
                  })}
                </div>
                <label className={styles.recordManualInput}>
                  <span>Nhập khác</span>
                  {/* Không set max: giữ nguyên giá trị vượt ngưỡng để hiển thị cảnh báo thay vì tự kẹp. */}
                  <InputNumber<number>
                    min={MIN_SESSIONS_PER_WEEK}
                    step={1}
                    precision={0}
                    value={sessionsPerWeek ?? undefined}
                    onChange={(value) => setSessionsPerWeek(value ?? null)}
                    addonAfter="buổi/tuần"
                    placeholder="VD: 6"
                    status={isSessionsTooHigh ? 'error' : undefined}
                    style={{ width: '100%' }}
                  />
                </label>
                {isSessionsTooHigh && hoursPerSession != null && (
                  <div className={styles.recordPriceWarn}>
                    <WarningOutlined />
                    <span>
                      Tối đa <strong>{maxSessionsPerWeek} buổi/tuần</strong> với lịch rảnh hiện tại (mỗi buổi{' '}
                      {formatDuration(hoursPerSession)}). Hãy giảm số buổi hoặc mở thêm khung giờ rảnh.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.recordFormActions}>
              {isEditMode && (
                <Button
                  icon={<CloseOutlined />}
                  onClick={resetForm}
                  disabled={saving}
                  className={styles.recordCancelBtn}
                >
                  Huỷ chỉnh sửa
                </Button>
              )}
              <Button
                type="primary"
                icon={isEditMode ? <CheckOutlined /> : <PlusOutlined />}
                onClick={handleSaveRecord}
                disabled={!canAdd || saving}
                loading={saving}
                className={styles.recordAddBtn}
              >
                {isEditMode ? 'Cập nhật cấu hình' : 'Thêm cấu hình'}
              </Button>
            </div>
          </div>
        </div>

        <aside className={styles.recordsAside}>
          <div className={styles.recordsAsideHead}>
            <h3 className={styles.recordsSectionTitle}>Cấu hình đã thêm</h3>
            <span className={styles.recordsCount}>{state.subjectRecords.length}</span>
          </div>

          {state.subjectRecords.length === 0 ? (
            <div className={styles.recordsAsideEmpty}>Chưa có cấu hình nào.</div>
          ) : (
            <ul className={styles.recordsAsideList}>
              {state.subjectRecords.map((r) => {
                const isActive = editingRecordId === r.id;
                const gradeTexts = r.gradeLevels.map(
                  (gradeLevel) => gradeLevels.find((grade) => grade.value === gradeLevel)?.label ?? gradeLevel,
                );
                return (
                  <li
                    key={r.id}
                    className={`${styles.recordsAsideItem} ${isActive ? styles.recordsAsideItemActive : ''}`}
                  >
                    <div className={styles.recordsAsideCardTop}>
                      <div className={styles.recordsAsideItemMain}>
                        <div className={styles.recordsAsideTitleRow}>
                          <strong>{r.subjectName}</strong>
                        </div>
                      </div>
                      <div className={styles.recordsAsideItemPrice}>{formatPrice(r.hourlyRate)}đ</div>
                    </div>

                    <div className={styles.recordsAsideGradeList} aria-label={`Khối lớp: ${gradeTexts.join(', ')}`}>
                      {gradeTexts.map((gradeText) => (
                        <span key={gradeText} className={styles.recordsAsideGradeChip}>
                          {gradeText}
                        </span>
                      ))}
                    </div>

                    <div className={styles.recordsAsideMetaGrid}>
                      <span>{formatDuration(r.hoursPerSession)}/buổi</span>
                      <span>{r.sessionsPerWeek} buổi/tuần</span>
                    </div>

                    <div className={styles.recordsAsideFooter}>
                      {isActive && <span className={styles.recordsAsideStatus}>Đang chỉnh sửa</span>}
                      <div className={styles.recordsAsideItemActions}>
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => startEditRecord(r)}
                          disabled={saving}
                          aria-label={`Sửa cấu hình ${r.subjectName}`}
                          title="Sửa cấu hình"
                        />
                        <Popconfirm
                          title="Xoá cấu hình này?"
                          onConfirm={() => handleRemoveRecord(r)}
                          okText="Xoá"
                          cancelText="Huỷ"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            size="small"
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            disabled={saving}
                            aria-label={`Xoá ${r.subjectName}`}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default StepSubjectRecords;
