import React, { useMemo, useState } from 'react';
import { Popconfirm, Tooltip } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import styles from '../styles.module.css';
import ComboFormModal from './ComboFormModal';
import { DAY_COLUMNS, formatDuration, formatHourMinute, minutesOf } from './constants';
import type { ComboSessionSlot, FixedCombo, SubjectRecord, TutorAvailabilitySlot } from './types';

interface ComboManagerProps {
  combos: FixedCombo[];
  availability: TutorAvailabilitySlot[];
  subjectRecords: SubjectRecord[];
  onAdd: (combo: FixedCombo) => void;
  onUpdate: (id: string, combo: FixedCombo) => void;
  onRemove: (id: string) => void;
  onCreatePackage?: (combo: FixedCombo) => Promise<FixedCombo | null>;
  onUpdatePackage?: (comboId: string, combo: FixedCombo) => Promise<FixedCombo | null>;
  onDeactivatePackage?: (comboId: string) => Promise<boolean>;
}

const dayLabel = (dow: number) => DAY_COLUMNS.find((c) => c.dayOfWeek === dow)?.full ?? `Ngày ${dow}`;
const getTotalHours = (combo: FixedCombo) => combo.sessions.reduce((sum, session) => sum + session.durationHours, 0);
const formatSessionRange = (session: ComboSessionSlot) => {
  const start = minutesOf(session.startHour, session.startMinute);
  const end = start + session.durationHours * 60;
  return `${formatHourMinute(Math.floor(start / 60), (start % 60) as 0 | 30)} - ${formatHourMinute(
    Math.floor(end / 60),
    (end % 60) as 0 | 30,
  )}`;
};

const LOCKED_HINT =
  'Gói đang có buổi dạy được đặt và chưa hoàn tất — không thể sửa hay xóa. Vui lòng chờ hoàn tất hoặc hủy booking trước.';

const ComboManager: React.FC<ComboManagerProps> = ({
  combos,
  availability,
  subjectRecords,
  onAdd,
  onUpdate,
  onRemove,
  onCreatePackage,
  onUpdatePackage,
  onDeactivatePackage,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedCombo | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [removingComboId, setRemovingComboId] = useState<string | null>(null);
  const requiredDurationHours = useMemo(
    () => Math.max(1, ...subjectRecords.map((record) => record.hoursPerSession || 0)),
    [subjectRecords],
  );
  const requiredSessionsPerWeek = useMemo(
    () => Math.max(1, ...subjectRecords.map((record) => record.sessionsPerWeek || 0)),
    [subjectRecords],
  );

  const applySubjectRules = (combo: FixedCombo): FixedCombo => {
    const next = {
      ...combo,
      sessions: combo.sessions.map((session) => ({ ...session, durationHours: requiredDurationHours })),
    };
    delete next.description;
    return next;
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (combo: FixedCombo) => {
    setEditing(applySubjectRules(combo));
    setModalOpen(true);
  };
  const handleSave = async (combo: FixedCombo) => {
    const normalized = applySubjectRules(combo);
    if (editing) {
      if (onUpdatePackage) {
        setSavingPackage(true);
        const updatedCombo = await onUpdatePackage(editing.id, normalized).finally(() => setSavingPackage(false));
        if (!updatedCombo) return; // lỗi (vd BE 409) → giữ modal mở cho tutor sửa tiếp
        onUpdate(editing.id, updatedCombo);
      } else {
        onUpdate(editing.id, normalized);
      }
    } else if (onCreatePackage) {
      setSavingPackage(true);
      const persistedCombo = await onCreatePackage(normalized).finally(() => setSavingPackage(false));
      if (!persistedCombo) return;
      onAdd(persistedCombo);
    } else {
      onAdd(normalized);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleRemove = async (comboId: string) => {
    setRemovingComboId(comboId);
    const canRemove = onDeactivatePackage ? await onDeactivatePackage(comboId) : true;
    setRemovingComboId(null);
    if (canRemove) onRemove(comboId);
  };

  return (
    <>
      <section className={styles.comboManager}>
        <div className={styles.comboManagerHead}>
          <h3 className={styles.comboManagerTitle}>Gói lịch học của bạn</h3>
          {combos.length > 0 && (
            <button type="button" className={styles.comboPrimaryAction} onClick={openCreate}>
              <PlusOutlined />
              <span>Thêm gói</span>
            </button>
          )}
        </div>

        {combos.length === 0 ? (
          <div className={styles.comboEmptyState}>
            <div className={styles.comboEmptyIcon}>
              <CalendarOutlined />
            </div>
            <button type="button" className={styles.comboPrimaryAction} onClick={openCreate}>
              <PlusOutlined />
              <span>Tạo gói lịch học</span>
            </button>
          </div>
        ) : (
          <div className={styles.comboList}>
            {combos.map((combo) => {
              const displayCombo = applySubjectRules(combo);
              // Gói đang có buổi dạy được đặt & chưa hoàn tất → khóa Sửa/Xóa (BE cũng chặn 409).
              const locked = combo.hasActiveBooking === true;

              return (
                <div key={combo.id} className={styles.comboCard}>
                  <div className={styles.comboCardHead}>
                    <div className={styles.comboBadgeRow}>
                      <span className={`${styles.comboTypeBadge} ${styles.comboFixed}`}>Lịch cố định</span>
                      {locked && (
                        <Tooltip title={LOCKED_HINT}>
                          <span className={`${styles.comboTypeBadge} ${styles.comboLocked}`}>
                            <LockOutlined /> Đang có lớp
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className={styles.comboCardActions}>
                      <Tooltip title={locked ? LOCKED_HINT : undefined}>
                        <span className={styles.iconBtnWrap}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => openEdit(combo)}
                            disabled={locked}
                            aria-label={`Sửa ${combo.name}`}
                            title={locked ? undefined : 'Sửa gói lịch học'}
                          >
                            <EditOutlined />
                          </button>
                        </span>
                      </Tooltip>
                      <Popconfirm
                        title="Xóa gói lịch học này?"
                        onConfirm={() => handleRemove(combo.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, loading: removingComboId === combo.id }}
                        disabled={locked}
                      >
                        <Tooltip title={locked ? LOCKED_HINT : undefined}>
                          <span className={styles.iconBtnWrap}>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              disabled={locked}
                              aria-label={`Xóa ${combo.name}`}
                              title={locked ? undefined : 'Xóa gói lịch học'}
                            >
                              <DeleteOutlined />
                            </button>
                          </span>
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </div>

                  <h4 className={styles.comboName}>{combo.name}</h4>

                  <div className={styles.comboMetaRow}>
                    <span>
                      <CalendarOutlined />
                      <strong>{displayCombo.sessions.length}</strong> buổi/tuần
                    </span>
                    <span>
                      <ClockCircleOutlined />
                      <strong>{formatDuration(getTotalHours(displayCombo))}</strong>/tuần
                    </span>
                  </div>

                  <div className={styles.comboScheduleList}>
                    {displayCombo.sessions.map((session, index) => (
                      <div key={index} className={styles.comboScheduleItem}>
                        <span className={styles.comboScheduleIndex}>{index + 1}</span>
                        <div>
                          <strong>{dayLabel(session.dayOfWeek)}</strong>
                          <span>{formatSessionRange(session)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button type="button" className={styles.comboAddBtn} onClick={openCreate}>
              <span className={styles.comboAddIcon}>
                <PlusOutlined />
              </span>
              <strong>Thêm gói lịch học khác</strong>
              <span>Mở thêm lựa chọn lịch học cho phụ huynh</span>
            </button>
          </div>
        )}
      </section>

      {modalOpen && (
        <ComboFormModal
          open
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
          initial={editing}
          availability={availability}
          requiredDurationHours={requiredDurationHours}
          requiredSessionsPerWeek={requiredSessionsPerWeek}
          saving={savingPackage}
          existingCombos={editing ? combos.filter((c) => c.id !== editing.id) : combos}
        />
      )}
    </>
  );
};

export default ComboManager;
