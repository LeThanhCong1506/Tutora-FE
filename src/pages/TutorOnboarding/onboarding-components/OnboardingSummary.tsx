import React, { useMemo, useState } from 'react';
import styles from '../styles.module.css';
import {
  DAY_COLUMNS,
  GRADE_LEVELS,
  formatHourMinute,
  formatPrice,
  formatDuration,
  minutesOf,
  parseTime,
} from './constants';
import HourSlotGrid from './HourSlotGrid';
import type { FixedCombo, SubjectRecord, TutorAvailabilitySlot } from './types';

// Convert (giờ thập phân, vd 1.5) → "Hh Mm" cho hiển thị end-time.
const formatEndTime = (startHour: number, startMinute: number, durationHours: number) => {
  const totalMinutes = minutesOf(startHour, startMinute) + durationHours * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return formatHourMinute(h, m);
};

interface OnboardingSummaryProps {
  subjectRecords: SubjectRecord[];
  availability: TutorAvailabilitySlot[];
  combos: FixedCombo[];
  onBack: () => void;
  onFinish: () => void;
}

type View = 'schedule' | 'subjects' | 'combos';

const dayLabel = (dow: number) => DAY_COLUMNS.find((c) => c.dayOfWeek === dow)?.full ?? `Ngày ${dow}`;
const gradeLabel = (g: string) => GRADE_LEVELS.find((x) => x.value === g)?.label ?? g;
const formatHourAmount = (hours: number) => (Number.isInteger(hours) ? `${hours}` : hours.toFixed(1).replace('.', ','));

// Palette để phân biệt gói trên lưới (rotate theo index).
const COMBO_COLORS = [
  { bg: '#1a2238', border: '#1a2238' },
  { bg: '#3d4a3e', border: '#3d4a3e' },
  { bg: '#92580f', border: '#92580f' },
  { bg: '#631b1b', border: '#631b1b' },
  { bg: '#5c4836', border: '#5c4836' },
];

const CheckIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const ComboReadOnlyCard: React.FC<{ combo: FixedCombo }> = ({ combo }) => (
  <div className={styles.comboCard}>
    <div className={styles.comboCardHead}>
      <span className={`${styles.comboTypeBadge} ${styles.comboFixed}`}>Cố định</span>
    </div>
    <h4 className={styles.comboName}>{combo.name}</h4>
    <ul className={styles.comboSessionList}>
      {combo.sessions.map((s, i) => (
        <li key={i}>
          {dayLabel(s.dayOfWeek)} · {formatHourMinute(s.startHour, s.startMinute)}–
          {formatEndTime(s.startHour, s.startMinute, s.durationHours)} ({s.durationHours} giờ)
        </li>
      ))}
    </ul>
  </div>
);

const OnboardingSummary: React.FC<OnboardingSummaryProps> = ({
  subjectRecords,
  availability,
  combos,
  onBack,
  onFinish,
}) => {
  const [view, setView] = useState<View>(() => (combos.length > 0 ? 'schedule' : 'subjects'));

  // ── Subject stats ──
  const uniqueSubjects = new Set(subjectRecords.map((r) => r.subjectId)).size;
  const rates = subjectRecords.map((r) => r.hourlyRate);
  const minRate = rates.length ? Math.min(...rates) : 0;
  const maxRate = rates.length ? Math.max(...rates) : 0;

  const availabilityStats = useMemo(() => {
    const daySet = new Set(availability.map((slot) => slot.dayOfWeek));
    const totalMinutes = availability.reduce((sum, slot) => {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);
      return sum + Math.max(0, minutesOf(end.hour, end.minute) - minutesOf(start.hour, start.minute));
    }, 0);

    return {
      dayCount: daySet.size,
      totalHours: totalMinutes / 60,
      slotCount: availability.length,
    };
  }, [availability]);

  // ── Gói lịch học (chỉ còn loại cố định) ──
  const fixedCombos = combos;

  // ── Set ô 30 phút có lịch rảnh — dùng để render nền xanh cho ô rảnh chưa có gói. ──
  const availableHourSet = useMemo(() => {
    const set = new Set<string>();
    availability.forEach((slot) => {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);
      const startMin = minutesOf(start.hour, start.minute);
      const endMin = minutesOf(end.hour, end.minute);
      for (let cur = startMin; cur < endMin; cur += 30) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        set.add(`${slot.dayOfWeek}-${h}-${m}`);
      }
    });
    return set;
  }, [availability]);

  // ── Lookup map cho lưới: (day-hour-minute) → gói cố định nào đang chiếm ô đó ──
  const comboCellMap = useMemo(() => {
    const map = new Map<string, { comboIndex: number; isStart: boolean; combo: FixedCombo }>();
    fixedCombos.forEach((combo, idx) => {
      combo.sessions.forEach((session) => {
        const startMin = minutesOf(session.startHour, session.startMinute);
        const endMin = startMin + session.durationHours * 60;
        let isFirst = true;
        for (let cur = startMin; cur < endMin; cur += 30) {
          const h = Math.floor(cur / 60);
          const m = cur % 60;
          map.set(`${session.dayOfWeek}-${h}-${m}`, {
            comboIndex: idx,
            isStart: isFirst,
            combo,
          });
          isFirst = false;
        }
      });
    });
    return map;
  }, [fixedCombos]);

  // ── Stats cho tab Lịch tuần (theo phút để chuẩn) ──
  const scheduleStats = useMemo(() => {
    const totalFixedSessions = fixedCombos.reduce((sum, c) => sum + c.sessions.length, 0);
    const totalFixedHours = fixedCombos.reduce(
      (sum, c) => sum + c.sessions.reduce((s, ses) => s + ses.durationHours, 0),
      0,
    );

    let earliestMin: number | null = null;
    let latestMin: number | null = null;
    fixedCombos.forEach((c) =>
      c.sessions.forEach((s) => {
        const start = minutesOf(s.startHour, s.startMinute);
        const end = start + s.durationHours * 60;
        if (earliestMin === null || start < earliestMin) earliestMin = start;
        if (latestMin === null || end > latestMin) latestMin = end;
      }),
    );

    const minToLabel = (mins: number | null) =>
      mins === null ? null : formatHourMinute(Math.floor(mins / 60), mins % 60);

    return {
      totalFixedSessions,
      totalFixedHours,
      earliest: minToLabel(earliestMin),
      latest: minToLabel(latestMin),
      hasAny: combos.length > 0,
    };
  }, [combos, fixedCombos]);

  // ── Gói lịch học stats ──
  const fixedSessionsCount = scheduleStats.totalFixedSessions;

  const renderScheduleCell = (dayOfWeek: number, hour: number, minute: 0 | 30) => {
    const key = `${dayOfWeek}-${hour}-${minute}`;
    const info = comboCellMap.get(key);

    // Có gói cố định ở ô này → render màu của gói + tên (ưu tiên hơn ô rảnh).
    if (info) {
      const color = COMBO_COLORS[info.comboIndex % COMBO_COLORS.length];
      return (
        <div
          className={`${styles.cell} ${styles.cellStatic}`}
          style={{
            background: color.bg,
            borderColor: color.border,
            borderStyle: 'solid',
            color: '#fff',
            padding: '4px 6px',
            justifyContent: 'center',
            alignItems: 'flex-start',
            textAlign: 'left',
          }}
          aria-label={`${dayLabel(dayOfWeek)} ${formatHourMinute(hour, minute)} - ${info.combo.name}`}
        >
          {info.isStart && (
            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.15, color: '#fff' }}>{info.combo.name}</span>
          )}
        </div>
      );
    }

    // Không có gói nhưng tutor rảnh → render nền xanh nhạt (đồng bộ với Step 2).
    if (availableHourSet.has(key)) {
      return (
        <div
          className={`${styles.cell} ${styles.cellStatic} ${styles.available}`}
          aria-label={`${dayLabel(dayOfWeek)} ${formatHourMinute(hour, minute)} - rảnh`}
        />
      );
    }

    // Không rảnh, không gói → ô trống.
    return <div className={`${styles.cell} ${styles.cellStatic}`} />;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.successIcon}>
          <CheckIcon />
        </div>
        <h1 className={styles.headerTitle}>Thiết lập hoàn tất!</h1>
        <p className={styles.headerSubtitle}>
          Bạn đã sẵn sàng nhận booking theo lịch rảnh. Dưới đây là tổng quan môn học và gói lịch học tùy chọn.
        </p>
      </div>

      <div className={styles.body}>
        <section className={styles.summaryHero}>
          <div className={styles.summaryHeroIcon}>
            <CheckIcon />
          </div>
          <div className={styles.summaryHeroMain}>
            <span className={styles.summaryEyebrow}>Sẵn sàng nhận booking</span>
            <h2>Phụ huynh đã có thể đặt lịch theo các khung rảnh của bạn.</h2>
          </div>
          <div className={styles.summaryHeroAside}>
            <strong>{combos.length > 0 ? `${combos.length} gói gợi ý` : 'Không cần tạo gói'}</strong>
            <span>
              {combos.length > 0 ? 'Phụ huynh có thêm lựa chọn đặt nhanh.' : 'Phụ huynh vẫn đặt theo lịch rảnh.'}
            </span>
          </div>
        </section>

        <div className={styles.summaryMetricGrid}>
          <div className={styles.summaryMetric}>
            <span>Môn & giá</span>
            <strong>{subjectRecords.length}</strong>
          </div>
          <div className={styles.summaryMetric}>
            <span>Lịch rảnh</span>
            <strong>{formatHourAmount(availabilityStats.totalHours)} giờ</strong>
          </div>
          <div className={styles.summaryMetric}>
            <span>Gói lịch học</span>
            <strong>{combos.length}</strong>
          </div>
        </div>

        <section className={styles.summaryDetailPanel}>
          <div className={styles.summarySectionHead}>
            <h3>Chi tiết thiết lập</h3>
          </div>

          <div className={styles.subjectTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'schedule'}
              className={`${styles.subjectTab} ${view === 'schedule' ? styles.activeTab : ''}`}
              onClick={() => setView('schedule')}
            >
              <span>Lịch tuần</span>
              <span className={styles.subjectTabBadge}>{availability.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'subjects'}
              className={`${styles.subjectTab} ${view === 'subjects' ? styles.activeTab : ''}`}
              onClick={() => setView('subjects')}
            >
              <span>Môn & giá</span>
              <span className={styles.subjectTabBadge}>{subjectRecords.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'combos'}
              className={`${styles.subjectTab} ${view === 'combos' ? styles.activeTab : ''}`}
              onClick={() => setView('combos')}
            >
              <span>Gói lịch học</span>
              <span className={styles.subjectTabBadge}>{combos.length}</span>
            </button>
          </div>

          <div className={styles.summaryTabContent}>
            {view === 'schedule' ? (
              <>
                <h3 className={styles.recapTitle}>Lịch tuần</h3>
                {/* Legend: lịch rảnh + từng gói cố định */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {availability.length > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: 'rgba(26, 34, 56, 0.04)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1a2238',
                      }}
                    >
                      <i
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: 4,
                          background: 'rgba(61, 74, 62, 0.18)',
                          border: '1.5px solid #3d4a3e',
                        }}
                      />
                      Lịch rảnh
                    </span>
                  )}
                  {fixedCombos.map((c, idx) => {
                    const color = COMBO_COLORS[idx % COMBO_COLORS.length];
                    return (
                      <span
                        key={c.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: 'rgba(26, 34, 56, 0.04)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#1a2238',
                        }}
                      >
                        <i
                          style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: color.bg,
                          }}
                        />
                        {c.name}
                        <span style={{ color: 'rgba(62,47,40,0.55)', fontWeight: 500 }}>
                          · {c.sessions.length} buổi
                        </span>
                      </span>
                    );
                  })}
                </div>
                <HourSlotGrid renderCell={renderScheduleCell} />
              </>
            ) : view === 'subjects' ? (
              <>
                <div className={styles.statRow}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tổng cấu hình</span>
                    <span className={styles.statValue}>{subjectRecords.length}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Số môn khác nhau</span>
                    <span className={styles.statValue}>{uniqueSubjects}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Khoảng giá (đ/giờ)</span>
                    <span className={styles.statValue}>
                      {minRate === maxRate ? formatPrice(minRate) : `${formatPrice(minRate)}-${formatPrice(maxRate)}`}
                    </span>
                  </div>
                </div>

                <h3 className={styles.recapTitle}>Danh sách môn-khối-giá</h3>
                {subjectRecords.length === 0 ? (
                  <div className={styles.summaryEmpty}>
                    <div className={styles.summaryEmptyIcon}>!</div>
                    <strong>Chưa có cấu hình môn học</strong>
                    <p>Hãy quay lại để thêm ít nhất một môn, khối lớp và giá dạy.</p>
                  </div>
                ) : (
                  <div className={styles.recordsTable}>
                    <div className={`${styles.recordsRow} ${styles.recordsHead}`}>
                      <span>Môn</span>
                      <span>Khối lớp</span>
                      <span>Giờ / buổi</span>
                      <span>Buổi / tuần</span>
                      <span>Giá / giờ</span>
                      <span />
                    </div>
                    {subjectRecords.map((r) => (
                      <div key={r.id} className={styles.recordsRow}>
                        <span className={styles.recordSubject}>{r.subjectName}</span>
                        <span>{gradeLabel(r.gradeLevel)}</span>
                        <span>{formatDuration(r.hoursPerSession)}</span>
                        <span>{r.sessionsPerWeek} buổi</span>
                        <span className={styles.recordRate}>{formatPrice(r.hourlyRate)}đ</span>
                        <span />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : combos.length === 0 ? (
              <div className={styles.summaryEmpty}>
                <div className={styles.summaryEmptyIcon}>i</div>
                <strong>Gói lịch học chưa được tạo</strong>
                <p>
                  Gói lịch học chỉ là lựa chọn giúp phụ huynh đặt nhanh hơn. Bạn có thể bổ sung sau nếu muốn đề xuất các
                  nhịp học cố định.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.statRow}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Số gói cố định</span>
                    <span className={styles.statValue}>{combos.length}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tổng buổi / tuần</span>
                    <span className={styles.statValue}>{fixedSessionsCount}</span>
                  </div>
                </div>

                <h3 className={styles.recapTitle}>Danh sách gói lịch học</h3>
                <div className={styles.comboList}>
                  {combos.map((c) => (
                    <ComboReadOnlyCard key={c.id} combo={c} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerBtns}>
          <button type="button" className={styles.btnGhost} onClick={onBack}>
            Chỉnh sửa lại
          </button>
          <button type="button" className={styles.btnPrimary} onClick={onFinish}>
            Về Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSummary;
