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
import { SUBJECTS, GRADE_LEVELS, formatPrice, formatDuration } from './constants';
import type { UseOnboardingState } from './hooks/useOnboardingState';
import type { SubjectOption, GradeOption } from './hooks/useLookups';
import type { SubjectRecord } from './types';

interface StepSubjectRecordsProps {
  onboarding: UseOnboardingState;
  // Lấy từ BE (GET /api/subjects, /api/grade-levels); mặc định = hằng số nếu chưa truyền.
  subjects?: SubjectOption[];
  gradeLevels?: GradeOption[];
  onCreateSubjectRecord?: (record: Omit<SubjectRecord, 'id'>) => Promise<SubjectRecord | null>;
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

const formatPresetPrice = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}tr` : `${Math.round(n / 1000)}k`;

const StepSubjectRecords: React.FC<StepSubjectRecordsProps> = ({
  onboarding,
  subjects = SUBJECTS,
  gradeLevels = GRADE_LEVELS,
  onCreateSubjectRecord,
  onSaveSubjectRecords,
  saving = false,
}) => {
  const { state, addSubjectRecord, removeSubjectRecord, updateSubjectRecord } = onboarding;

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [hoursPerSession, setHoursPerSession] = useState<number | null>(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const subjectName = useMemo(
    () => (subjectId == null ? '' : (subjects.find((s) => s.id === subjectId)?.name ?? '')),
    [subjectId, subjects],
  );

  const canAdd =
    subjectId != null &&
    gradeLevel != null &&
    hourlyRate != null &&
    hourlyRate > 0 &&
    hoursPerSession != null &&
    hoursPerSession > 0 &&
    sessionsPerWeek != null &&
    sessionsPerWeek > 0;
  const isPriceTooHigh = hourlyRate != null && hourlyRate > PRICE_WARN_HIGH;
  const isEditMode = editingRecordId != null;

  const resetForm = () => {
    setSubjectId(null);
    setGradeLevel(null);
    setHourlyRate(null);
    setHoursPerSession(null);
    setSessionsPerWeek(null);
    setEditingRecordId(null);
  };

  const startEditRecord = (record: SubjectRecord) => {
    setEditingRecordId(record.id);
    setSubjectId(record.subjectId);
    setGradeLevel(record.gradeLevel);
    setHourlyRate(record.hourlyRate);
    setHoursPerSession(record.hoursPerSession);
    setSessionsPerWeek(record.sessionsPerWeek);
  };

  const handleSaveRecord = async () => {
    if (!canAdd) return;
    const input = {
      subjectId: subjectId as number,
      subjectName,
      gradeLevel: gradeLevel as string,
      hourlyRate: hourlyRate as number,
      hoursPerSession: hoursPerSession as number,
      sessionsPerWeek: sessionsPerWeek as number,
    };

    if (editingRecordId) {
      const exists = state.subjectRecords.some(
        (record) =>
          record.id !== editingRecordId &&
          record.subjectId === input.subjectId &&
          record.gradeLevel === input.gradeLevel,
      );
      if (exists) {
        toast.warning('Đã có cấu hình cho môn và khối lớp này.');
        return;
      }

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

    const exists = state.subjectRecords.some(
      (record) => record.subjectId === input.subjectId && record.gradeLevel === input.gradeLevel,
    );
    if (exists) {
      toast.warning('Đã có cấu hình cho môn và khối lớp này.');
      return;
    }

    const recordToAdd = onCreateSubjectRecord ? await onCreateSubjectRecord(input) : input;
    if (!recordToAdd) return;

    const ok = addSubjectRecord(recordToAdd);
    if (!ok) {
      toast.warning('Đã có cấu hình cho môn và khối lớp này.');
      return;
    }
    resetForm();
    if (!onCreateSubjectRecord) {
      toast.success('Đã thêm 1 cấu hình');
    }
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
          <span className={styles.subjectRecordsEyebrow}>Bước bắt buộc</span>
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
                  onChange={(v) => setSubjectId(v)}
                  options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label className={styles.recordField}>
                <span className={styles.recordFieldLabel}>2. Khối lớp</span>
                <Select
                  placeholder="Chọn khối lớp"
                  value={gradeLevel}
                  onChange={(v) => setGradeLevel(v)}
                  options={gradeLevels.map((g) => ({ value: g.value, label: g.label }))}
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
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.pricePresetBtn} ${hoursPerSession === d ? styles.activePricePreset : ''}`}
                      onClick={() => setHoursPerSession(d)}
                    >
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
                <label className={styles.recordManualInput}>
                  <span>Nhập khác</span>
                  <InputNumber<number>
                    min={MIN_DURATION}
                    step={DURATION_STEP}
                    value={hoursPerSession ?? undefined}
                    onChange={(value) => setHoursPerSession(value ?? null)}
                    addonAfter="giờ/buổi"
                    placeholder="VD: 3.5"
                    style={{ width: '100%' }}
                  />
                </label>
              </div>

              <div className={styles.recordSetupCard}>
                <div className={styles.recordSetupHead}>
                  <span className={styles.recordFieldLabel}>5. Số buổi mỗi tuần</span>
                  <strong className={styles.recordValueBadge}>
                    {sessionsPerWeek != null ? `${sessionsPerWeek} buổi/tuần` : 'Chưa chọn'}
                  </strong>
                </div>
                <div className={styles.pricePresetList}>
                  {SESSIONS_PER_WEEK_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.pricePresetBtn} ${sessionsPerWeek === n ? styles.activePricePreset : ''}`}
                      onClick={() => setSessionsPerWeek(n)}
                    >
                      {n} buổi
                    </button>
                  ))}
                </div>
                <label className={styles.recordManualInput}>
                  <span>Nhập khác</span>
                  <InputNumber<number>
                    min={MIN_SESSIONS_PER_WEEK}
                    step={1}
                    precision={0}
                    value={sessionsPerWeek ?? undefined}
                    onChange={(value) => setSessionsPerWeek(value ?? null)}
                    addonAfter="buổi/tuần"
                    placeholder="VD: 6"
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            </div>

            <div className={styles.recordFormActions}>
              {isEditMode && (
                <Button icon={<CloseOutlined />} onClick={resetForm} disabled={saving} className={styles.recordCancelBtn}>
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
                const gradeText = gradeLevels.find((g) => g.value === r.gradeLevel)?.label ?? r.gradeLevel;
                return (
                  <li
                    key={r.id}
                    className={`${styles.recordsAsideItem} ${isActive ? styles.recordsAsideItemActive : ''}`}
                  >
                    <div className={styles.recordsAsideCardTop}>
                      <div className={styles.recordsAsideItemMain}>
                        <div className={styles.recordsAsideTitleRow}>
                          <strong>{r.subjectName}</strong>
                          <span>{gradeText}</span>
                        </div>
                      </div>
                      <div className={styles.recordsAsideItemPrice}>{formatPrice(r.hourlyRate)}đ</div>
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
