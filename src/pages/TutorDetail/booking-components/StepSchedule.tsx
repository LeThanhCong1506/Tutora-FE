import {
    AlertTriangle,
    BookOpen,
    CalendarDays,
    CalendarRange,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    LockKeyhole,
    Repeat2,
    RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import type { StepProps } from "./types";
import type { FixedCombo } from "../../../types/combo.types";
import MonthSimulation from "./MonthSimulation";
import {
    comboToWeeklyPattern,
    formatDuration,
    formatFullDate,
    formatShortDate,
    mondayOf,
    rangesOverlap,
    sessionFitsAvailability,
    slotCoversCell,
    timeToMinutes,
    toDateKey,
    toDemoWeekday,
} from "./utils";
import styles from "./bookingModal.module.css";

// Nhãn cột theo quy ước demo: index 0 = Thứ 2 … 6 = CN.
const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
const pad2 = (n: number) => String(n).padStart(2, "0");

const StepSchedule: React.FC<StepProps> = ({
    formData,
    setFormData,
    combos,
    scheduling,
    sessionHours,
    selectedCombo,
}) => {
    const isPackageMode = formData.bookingMode === "package";
    const isAvailabilityMode = formData.bookingMode === "schedule";
    const isFixedPackage = isPackageMode && selectedCombo?.type === "fixed";
    const fixedCombos = combos.filter(
        (combo): combo is FixedCombo => combo.type === "fixed" && combo.subjectId === formData.subjectId,
    );

    const {
        today,
        bookingDeadline,
        visibleWeekIndex,
        setVisibleWeekIndex,
        visibleDays,
        maxVisibleWeekIndex,
        calendarTimes,
        calendarAvailability,
        pickedWeekSlots,
        selectedSlots,
        bookingWindowStart,
        bookingWindowEnd,
        navLocked,
        bookedSlotsLoading,
        bookedSlotsError,
        hasSelectedSlotConflict,
        isBookedCell,
        getContestedCount,
        wouldAvailabilityPickConflict,
        fixedWeekHasConflict,
        toggleAvailabilityPick,
        pickFixedStartWeek,
        clearPicks,
    } = scheduling;

    const fixedPattern = selectedCombo?.type === "fixed" ? comboToWeeklyPattern(selectedCombo) : [];
    // Chụp "bây giờ" tại thời điểm render — đủ để loại các ô giờ hôm nay đã trôi qua
    // (vd 2h sáng thì ô 1h sáng phải bị khoá), khác với `today` (mốc 00:00, chỉ so ngày).
    const now = new Date();

    const selectCombo = (combo: FixedCombo) => {
        if (combo.id === formData.comboId) return;
        setFormData((d) => ({ ...d, comboId: combo.id }));
    };

    return (
        <>
            <div className={styles.sectionHeading}>
                <span className={styles.headingIcon}>
                    <CalendarDays size={20} />
                </span>
                <div>
                    <span className={styles.eyebrow}>Bước 03</span>
                    <h2>{isPackageMode && !selectedCombo ? "Chọn gói cố định" : "Chọn lịch học"}</h2>
                </div>

                {/* Thời lượng buổi + cửa sổ đặt lịch: hai thông tin tham chiếu, người dùng
                    liếc chứ không thao tác, nên nằm gọn cùng hàng tiêu đề thay vì chiếm hai
                    banner ngang trọn chiều rộng đẩy bảng lịch (phần thao tác chính) xuống. */}
                {(isAvailabilityMode || selectedCombo) && (
                    <div className={styles.headingMeta}>
                        {isAvailabilityMode && (
                            <span className={styles.headingMetaItem}>
                                <Clock3 size={14} />
                                <span>
                                    <strong>{formatDuration(sessionHours)}</strong>/buổi
                                </span>
                            </span>
                        )}
                        <span className={styles.headingMetaItem}>
                            <CalendarRange size={14} />
                            <span>
                                {pickedWeekSlots.length > 0 ? (
                                    <>
                                        <strong>{bookingWindowStart && formatFullDate(bookingWindowStart)}</strong> →{" "}
                                        <strong>{bookingWindowEnd && formatFullDate(bookingWindowEnd)}</strong> ·{" "}
                                        <strong>{selectedSlots.length} buổi</strong>
                                    </>
                                ) : (
                                    <>
                                        Chọn buổi đầu tiên trên lịch · kết thúc sau <strong>1 tháng</strong>
                                    </>
                                )}
                            </span>
                        </span>
                        {pickedWeekSlots.length > 0 && (
                            <button type="button" className={styles.changeWeekBtn} onClick={clearPicks}>
                                <RotateCcw size={14} />
                                Đổi tuần khác
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isPackageMode && (
                <section className={styles.comboPickSection}>
                    {fixedCombos.length === 0 ? (
                        <p className={styles.noFitNotice}>
                            <AlertTriangle size={15} />
                            Gia sư chưa tạo gói cố định cho môn học đã chọn. Hãy chọn "Tự chọn lịch rảnh" để đặt theo lịch trống.
                        </p>
                    ) : (
                        <div className={styles.comboGrid}>
                            {fixedCombos.map((combo) => {
                                const isSelected = combo.id === formData.comboId;
                                const comboDuration = combo.sessions[0]?.durationHours ?? 1;
                                return (
                                    <button
                                        key={combo.id}
                                        type="button"
                                        className={`${styles.comboCard} ${isSelected ? styles.selectedCard : ""}`}
                                        onClick={() => selectCombo(combo)}
                                    >
                                        <span className={`${styles.comboIcon} ${styles.fixedPackageIcon}`}>
                                            <Repeat2 size={18} />
                                        </span>
                                        <span className={styles.comboType}>Gói cố định</span>
                                        <h3>{combo.name}</h3>
                                        <div className={styles.comboMeta}>
                                            <span>
                                                <BookOpen size={14} />
                                                {combo.sessions.length} buổi / tuần
                                            </span>
                                            <span>
                                                <Clock3 size={14} />
                                                {formatDuration(comboDuration)} / buổi
                                            </span>
                                        </div>
                                        <ul className={styles.comboSessionList}>
                                            {combo.sessions.map((session, i) => (
                                                <li key={i}>
                                                    <strong>{DAY_LABELS[toDemoWeekday(session.dayOfWeek) - 1]}</strong>
                                                    <span>
                                                        {pad2(session.startHour)}:{pad2(session.startMinute)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <small>{isSelected ? "Đã chọn" : "Chọn gói"}</small>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {(isAvailabilityMode || selectedCombo) && (
                <>
                    {bookedSlotsLoading && (
                        <section className={styles.durationInfo}>
                            <Clock3 size={15} />
                            <span>Đang kiểm tra các khung giờ gia sư đã có lịch…</span>
                        </section>
                    )}

                    {bookedSlotsError && (
                        <p className={styles.noFitNotice}>
                            <AlertTriangle size={15} />
                            Chưa thể tải lịch đã đặt. Hệ thống vẫn sẽ kiểm tra lại khi gửi yêu cầu.
                        </p>
                    )}

                    {hasSelectedSlotConflict && (
                        <p className={styles.noFitNotice} role="alert">
                            <AlertTriangle size={15} />
                            Lịch đã chọn trùng với một buổi học hiện có. Vui lòng bỏ buổi đang chọn và chọn giờ khác.
                        </p>
                    )}

                    <div className={styles.scheduleLayout}>
                        <section className={styles.calendarSection}>
                            <div className={styles.calendarHeading}>
                                <div>
                                    <span className={styles.eyebrow}>Lịch rảnh của gia sư</span>
                                </div>
                                <div className={styles.calendarControls}>
                                    <button
                                        type="button"
                                        onClick={() => setVisibleWeekIndex((c) => Math.max(0, c - 1))}
                                        disabled={navLocked || visibleWeekIndex === 0}
                                        aria-label="Tuần trước"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <strong>
                                        {formatShortDate(visibleDays[0])} - {formatShortDate(visibleDays[6])}
                                    </strong>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setVisibleWeekIndex((c) => Math.min(maxVisibleWeekIndex, c + 1))
                                        }
                                        disabled={navLocked || visibleWeekIndex === maxVisibleWeekIndex}
                                        aria-label="Tuần sau"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            {calendarTimes.length === 0 ? (
                                <p className={styles.noFitNotice}>
                                    <AlertTriangle size={15} />
                                    Gia sư chưa mở khung giờ rảnh nào.
                                </p>
                            ) : (
                                <div className={styles.calendarScroller}>
                                    <div className={styles.calendarGrid}>
                                        <div className={`${styles.calendarCell} ${styles.timeHead}`}>Giờ học</div>
                                        {visibleDays.map((date, index) => (
                                            <div
                                                key={toDateKey(date)}
                                                className={`${styles.calendarCell} ${styles.dayHead} ${
                                                    date < today || date > bookingDeadline
                                                        ? styles.dayOutsideWindow
                                                        : ""
                                                }`}
                                            >
                                                <strong>{DAY_LABELS[index]}</strong>
                                                <span>{formatShortDate(date)}</span>
                                            </div>
                                        ))}

                                        {calendarTimes.map((time) => (
                                            <div className={styles.calendarRow} key={time}>
                                                <div className={`${styles.calendarCell} ${styles.timeCell}`}>
                                                    {time}
                                                </div>
                                                {visibleDays.map((date, dayIndex) => {
                                                    const cellMin = timeToMinutes(time);
                                                    const dateKey = toDateKey(date);
                                                    const demoDow = dayIndex + 1;
                                                    const isOpen = calendarAvailability.some(
                                                        (slot) =>
                                                            slot.dayOfWeek === demoDow &&
                                                            slot.available !== false &&
                                                            slotCoversCell(slot.startTime, slot.durationHours, cellMin),
                                                    );
                                                    const cellStart = new Date(date);
                                                    cellStart.setHours(0, cellMin, 0, 0);
                                                    const isPast = cellStart <= now;
                                                    const selectedCovering = selectedSlots.find(
                                                        (s) =>
                                                            s.date === dateKey &&
                                                            slotCoversCell(s.startTime, s.durationHours, cellMin),
                                                    );
                                                    const isSelected = Boolean(selectedCovering);
                                                    const isSelectedStart = selectedCovering?.startTime === time;
                                                    const isSelectedContinuation = isSelected && !isSelectedStart;
                                                    const bookedCell = isBookedCell(dateKey, time);
                                                    // Còn chọn được, nhưng >=2 người khác đã đặt cọc chờ gia sư xác nhận cho
                                                    // đúng khung giờ này — cảnh báo nhẹ, không chặn chọn.
                                                    const contestedCount = getContestedCount(dateKey, time);
                                                    const isContestedCell = !bookedCell && contestedCount >= 2;

                                                    let clickable = false;
                                                    let isOpenButCannotStart = false;
                                                    let isBlockedBySelectedSession = false;
                                                    let conflictsWithExistingBooking = false;
                                                    let onCellClick: (() => void) | null = null;
                                                    if (!isPast && (isOpen || isSelected)) {
                                                        if (isAvailabilityMode) {
                                                            const fits =
                                                                isOpen &&
                                                                sessionFitsAvailability(
                                                                    demoDow,
                                                                    time,
                                                                    sessionHours,
                                                                    calendarAvailability,
                                                                );
                                                            const overlapsSelectedSession = pickedWeekSlots.some(
                                                                (p) =>
                                                                    p.date === dateKey &&
                                                                    p.startTime !== time &&
                                                                    rangesOverlap(
                                                                        timeToMinutes(p.startTime),
                                                                        p.durationHours,
                                                                        cellMin,
                                                                        sessionHours,
                                                                    ),
                                                            );
                                                            conflictsWithExistingBooking =
                                                                wouldAvailabilityPickConflict(
                                                                    dateKey,
                                                                    demoDow,
                                                                    time,
                                                                );
                                                            // Chỉ chặn bấm khi CHÍNH ô này đã bị khóa (gia sư có lịch cố
                                                            // định hoặc đã accept booking khác đúng ô này). Nếu việc lặp
                                                            // lịch hàng tuần sẽ đụng 1 tuần sau đó (conflictsWithExistingBooking
                                                            // nhưng !bookedCell), vẫn cho bấm bình thường — chỉ báo lỗi lúc
                                                            // bấm trúng, tránh khóa/tô màu khác thường trước khi user thao tác.
                                                            const canStartSession =
                                                                isOpen &&
                                                                fits &&
                                                                date <= bookingDeadline &&
                                                                !bookedSlotsLoading &&
                                                                !bookedCell;

                                                            clickable =
                                                                isSelectedStart ||
                                                                (canStartSession && !overlapsSelectedSession);
                                                            isOpenButCannotStart =
                                                                isOpen && !canStartSession && !isSelectedContinuation;
                                                            isBlockedBySelectedSession =
                                                                isSelectedContinuation || overlapsSelectedSession;
                                                            onCellClick = () => {
                                                                if (wouldAvailabilityPickConflict(dateKey, demoDow, time)) {
                                                                    toast.error(
                                                                        "Lịch bạn chọn đang bị lấn qua khung giờ mà gia sư đang dạy, vui lòng thử lại khung giờ khác ạ.",
                                                                    );
                                                                    return;
                                                                }
                                                                toggleAvailabilityPick(dateKey, demoDow, time);
                                                            };
                                                        } else if (isFixedPackage) {
                                                            const isComboCell = fixedPattern.some(
                                                                (p) =>
                                                                    p.dayOfWeek === demoDow &&
                                                                    slotCoversCell(
                                                                        p.startTime,
                                                                        p.durationHours,
                                                                        cellMin,
                                                                    ),
                                                            );
                                                            conflictsWithExistingBooking =
                                                                isComboCell && fixedWeekHasConflict(mondayOf(date));
                                                            clickable =
                                                                !navLocked &&
                                                                isComboCell &&
                                                                date <= bookingDeadline &&
                                                                !bookedSlotsLoading &&
                                                                !conflictsWithExistingBooking;
                                                            onCellClick = () => pickFixedStartWeek(mondayOf(date));
                                                        }
                                                    }
                                                    const showAvailable = clickable && !isSelected;
                                                    const showContested = showAvailable && isContestedCell;
                                                    const showBooked =
                                                        !isSelected &&
                                                        isOpen &&
                                                        (bookedCell || conflictsWithExistingBooking);
                                                    const showBlockedChoose =
                                                        isAvailabilityMode && isBlockedBySelectedSession && !isSelected;
                                                    const showSelectedState = isSelected;
                                                    const slotLabel = showSelectedState ? (
                                                        <>
                                                            <Check size={13} />
                                                            Đã chọn
                                                        </>
                                                    ) : showContested ? (
                                                        <>
                                                            + Chọn
                                                            <span className={styles.slotContestedBadge}>{contestedCount}</span>
                                                        </>
                                                    ) : showAvailable ? (
                                                        "+ Chọn"
                                                    ) : showBooked ? (
                                                        bookedCell ? (
                                                            <>
                                                                <LockKeyhole size={11} />
                                                                Đã có lịch
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle size={11} />
                                                                Trùng lịch
                                                            </>
                                                        )
                                                    ) : showBlockedChoose ? (
                                                        "Chọn"
                                                    ) : isOpenButCannotStart ? (
                                                        "Không đủ giờ"
                                                    ) : (
                                                        "—"
                                                    );

                                                    return (
                                                        <div
                                                            key={`${dateKey}-${time}`}
                                                            className={`${styles.calendarCell} ${styles.slotCell}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                className={`${styles.slotButton} ${
                                                                    showSelectedState
                                                                        ? styles.slotSelected
                                                                        : showContested
                                                                          ? `${styles.slotAvailable} ${styles.slotContested}`
                                                                          : showAvailable
                                                                            ? styles.slotAvailable
                                                                            : showBooked
                                                                              ? bookedCell
                                                                                  ? styles.slotBooked
                                                                                  : styles.slotConflict
                                                                              : showBlockedChoose || isOpenButCannotStart
                                                                                ? styles.slotOpen
                                                                                : styles.slotUnavailable
                                                                }`}
                                                                disabled={!clickable}
                                                                onClick={() => onCellClick?.()}
                                                                aria-label={`${formatShortDate(date)} lúc ${time}`}
                                                                title={
                                                                    isSelectedContinuation
                                                                        ? `Thuộc buổi học bắt đầu lúc ${selectedCovering?.startTime}.`
                                                                        : showContested
                                                                          ? `Hiện có ${contestedCount} người muốn chọn khung giờ này. Nếu bạn muốn gia sư xác nhận nhanh hơn, bạn có thể chọn khung giờ khác.`
                                                                        : showBooked
                                                                          ? bookedCell
                                                                              ? "Gia sư đã có buổi học tại khung giờ này."
                                                                              : "Buổi học lặp theo tuần sẽ trùng với lịch hiện có của gia sư."
                                                                        : showBlockedChoose
                                                                        ? "Khung này đã được khóa theo buổi đã chọn. Bấm ô bắt đầu đã chọn để bỏ buổi."
                                                                        : isOpenButCannotStart
                                                                          ? "Khung này vẫn rảnh nhưng không đủ thời lượng để bắt đầu buổi học."
                                                                          : undefined
                                                                }
                                                            >
                                                                {slotLabel}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <MonthSimulation
                            slots={selectedSlots}
                            windowStart={bookingWindowStart ?? today}
                            windowEnd={bookingWindowEnd ?? today}
                        />
                    </div>
                </>
            )}
        </>
    );
};

export default StepSchedule;
