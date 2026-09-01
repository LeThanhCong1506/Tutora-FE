import { useEffect, useMemo, useRef, useState } from "react";
import { getTutorBookedSlots } from "../../../../services/booking.service";
import type { AvailabilitySlot } from "../../../../services/tutorDetail.service";
import type { Combo } from "../../../../types/combo.types";
import { parseUtc } from "../../../../utils/datetime";
import type { BookedSlotInfo, BookingFormData, BookingScheduleApi, BookingSlot, ScheduleSlot, WeeklyPatternSlot } from "../types";
import {
    addDays,
    buildScheduleFromPattern,
    comboToWeeklyPattern,
    fromDateKey,
    getBookingValidityEnd,
    getEndOfNextMonth,
    minutesToTime,
    mondayOf,
    rangesOverlap,
    sessionFitsAvailability,
    slotCoversCell,
    sortSlots,
    timeToMinutes,
    toCalendarAvailability,
    toDateKey,
    toDemoWeekday,
} from "../utils";

interface Args {
    isOpen: boolean;
    tutorId: string;
    availabilities: AvailabilitySlot[];
    // Số giờ mỗi buổi theo cấu hình môn/lớp đã chọn.
    sessionHours: number;
    /**
     * Số buổi mỗi tuần gia sư nhận dạy. Phụ huynh phải chọn ĐÚNG chừng này buổi trong tuần mẫu —
     * pattern đó được lặp lại cho các tuần sau, nên chọn thiếu/thừa là lệch cấu hình của gia sư.
     * Khớp với BookingSchedulePolicy ở backend; chặn tại đây để phụ huynh biết ngay khi bấm thay
     * vì chọn xong 5 buổi mới bị từ chối lúc gửi.
     */
    sessionsPerWeek: number;
    /**
     * Buổi học phải cách hiện tại ít nhất chừng này giờ. Khác nhau theo luồng: phụ huynh tự đặt
     * thì 24 giờ, học sinh gửi yêu cầu cho phụ huynh duyệt thì 28 giờ. Nếu FE dùng ngưỡng thấp
     * hơn backend, người dùng chọn được ô mà lúc gửi mới bị từ chối.
     */
    minLeadHours: number;
    selectedCombo: Combo | undefined;
    // Theo dõi để reset khi phụ huynh đổi lựa chọn.
    subjectId: number;
    bookingMode: string;
    comboId: string | null;
    // Để rehydrate khi mở lại modal từ draft đã lưu.
    schedule: ScheduleSlot[];
    startDate: string;
    setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
}

// demo weekday (1..7, CN=7) → backend (0=CN..6=T7).
const toBackendDow = (demoDow: number) => (demoDow === 7 ? 0 : demoDow);

/**
 * Buổi học phải cách hiện tại ít nhất chừng này giờ mới được đặt. Phải khớp với
 * `BookingLeadTimePolicy.MinimumLeadHours` ở backend.
 *
 * Không chỉ là "chưa trôi qua": hạn phản hồi của gia sư được tính lùi từ giờ học, nên đặt quá sát
 * thì hạn đó rơi vào quá khứ ngay khi booking vừa sinh ra — gia sư không kịp trả lời và booking
 * tự hủy. Backend chặn ở ValidateSlotsAsync; khóa luôn trên lịch để phụ huynh không chọn hụt.
 */
export const MIN_BOOKING_LEAD_HOURS = 24;

// Buổi [dateKey, startTime] đã đủ xa để đặt chưa — so đủ ngày+giờ, không chỉ ngày.
const isFutureSlot = (dateKey: string, startTime: string, leadHours: number): boolean => {
    const start = fromDateKey(dateKey);
    start.setHours(0, timeToMinutes(startTime), 0, 0);
    const earliest = new Date();
    earliest.setHours(earliest.getHours() + leadHours);
    return start >= earliest;
};

const endTimeOf = (startTime: string, durationHours: number) =>
    minutesToTime(timeToMinutes(startTime) + Math.round(durationHours * 60));

/**
 * State + logic cho bước "Lịch học" (ported từ ParentBookingDemo): phụ huynh bấm các buổi
 * trong MỘT tuần → ngày bắt đầu = ngày sớm nhất, tuần đó bị khóa; pattern (thứ + giờ) tự lặp
 * đến hết cửa sổ 1 tháng. Đồng bộ formData.schedule (pattern tuần) + startDate để submit dùng.
 */
export function useBookingSchedule({
    isOpen,
    tutorId,
    availabilities,
    sessionHours,
    sessionsPerWeek,
    minLeadHours,
    selectedCombo,
    subjectId,
    bookingMode,
    comboId,
    schedule,
    startDate,
    setFormData,
}: Args): BookingScheduleApi {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const bookingDeadline = useMemo(() => getEndOfNextMonth(today), [today]);
    const bookedSlotWindowEnd = useMemo(
        () => addDays(getBookingValidityEnd(bookingDeadline), 1),
        [bookingDeadline],
    );
    const thisWeekStart = useMemo(() => mondayOf(today), [today]);
    const calendarAvailability = useMemo(() => toCalendarAvailability(availabilities), [availabilities]);

    const [visibleWeekIndex, setVisibleWeekIndex] = useState(0);
    const [pickedWeekSlots, setPickedWeekSlots] = useState<BookingSlot[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<BookingSlot[]>([]);
    const [bookedSlots, setBookedSlots] = useState<BookedSlotInfo[]>([]);
    const [bookedSlotsLoading, setBookedSlotsLoading] = useState(false);
    const [bookedSlotsError, setBookedSlotsError] = useState(false);

    useEffect(() => {
        if (!isOpen || !tutorId) return;

        let cancelled = false;
        setBookedSlotsLoading(true);
        setBookedSlotsError(false);

        getTutorBookedSlots(tutorId, today.toISOString(), bookedSlotWindowEnd.toISOString())
            .then((response) => {
                if (cancelled) return;
                const slots = (response.content ?? [])
                    .map((slot): BookedSlotInfo | null => {
                        const start = parseUtc(slot.scheduledStart);
                        const end = parseUtc(slot.scheduledEnd);
                        if (!start || !end || end <= start) return null;

                        return {
                            date: toDateKey(start),
                            dayOfWeek: toDemoWeekday(start.getDay()),
                            startTime: minutesToTime(start.getHours() * 60 + start.getMinutes()),
                            durationHours: (end.getTime() - start.getTime()) / (60 * 60 * 1000),
                            isLocked: slot.isLocked,
                            pendingCount: slot.pendingCount,
                        };
                    })
                    .filter((slot): slot is BookedSlotInfo => slot !== null);
                setBookedSlots(slots);
            })
            .catch(() => {
                if (cancelled) return;
                setBookedSlots([]);
                setBookedSlotsError(true);
            })
            .finally(() => {
                if (!cancelled) setBookedSlotsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bookedSlotWindowEnd, isOpen, today, tutorId]);

    // Đổi môn / cách đặt / gói → reset lựa chọn lịch. Bỏ qua lần mount (kể cả StrictMode
    // double-invoke) bằng cách so key đã lưu, để không xoá nhầm state vừa rehydrate.
    const prevKeyRef = useRef(`${subjectId}|${bookingMode}|${comboId}|${sessionHours}`);
    useEffect(() => {
        const key = `${subjectId}|${bookingMode}|${comboId}|${sessionHours}`;
        if (prevKeyRef.current === key) return;
        prevKeyRef.current = key;
        setPickedWeekSlots([]);
        setSelectedSlots([]);
        setVisibleWeekIndex(0);
    }, [subjectId, bookingMode, comboId, sessionHours]);

    // Rehydrate ĐÚNG 1 lần khi mở lại modal từ draft: dựng lại picks/selectedSlots từ
    // formData.schedule + startDate. Draft được nạp ở effect sau mount nên không dùng deps []
    // mà phản ứng khi schedule xuất hiện; ref chặn chạy lại, và bỏ qua khi schedule đến từ
    // tương tác của user (selectedSlots đã có) thay vì từ draft.
    const didHydrateRef = useRef(false);
    useEffect(() => {
        if (didHydrateRef.current) return;
        if (schedule.length === 0 || !startDate) return;
        if (selectedSlots.length > 0) {
            didHydrateRef.current = true; // schedule do user tạo, đã đồng bộ — không cần dựng lại
            return;
        }
        const start = fromDateKey(startDate);
        const pattern: WeeklyPatternSlot[] = schedule.map((s) => ({
            dayOfWeek: toDemoWeekday(s.dayOfWeek),
            startTime: s.startTime,
            durationHours: (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) / 60,
        }));
        // Bản nháp có thể đã cũ vài ngày: ngày bắt đầu lưu trong đó giờ nằm trong quá khứ hoặc
        // trong cửa sổ chưa đủ giờ báo trước. Kẹp về mốc hợp lệ để không dựng lại những buổi mà
        // backend chắc chắn từ chối — người dùng sẽ chỉ biết khi bấm gửi ở bước cuối.
        const earliest = earliestBookableAt();
        const projected = buildScheduleFromPattern(pattern, start > earliest ? start : earliest);
        if (!projected.length) return;
        didHydrateRef.current = true;
        setSelectedSlots(projected);

        // Dựng lại tuần mẫu từ CHÍNH mẫu, mỗi khung lấy buổi sớm nhất khớp nó — không cắt theo
        // "7 ngày kể từ ngày bắt đầu". Tuần đầu của lịch có thể thiếu buổi (ngày đã trôi qua hoặc
        // chưa đủ xa), cắt theo tuần sẽ ra ít hơn số buổi/tuần và bộ đếm báo nhầm "còn N buổi"
        // dù lịch đã đầy đủ.
        const templateSlots = pattern
            .map((p) => projected.find((s) => s.dayOfWeek === p.dayOfWeek && s.startTime === p.startTime))
            .filter((s): s is BookingSlot => Boolean(s));
        setPickedWeekSlots(templateSlots);

        const anchorDate = fromDateKey((templateSlots[0] ?? projected[0]).date);
        const idx = Math.round((mondayOf(anchorDate).getTime() - thisWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        setVisibleWeekIndex(Math.max(0, idx));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, startDate, selectedSlots]);

    // Lưới calendar chỉ hiện các mốc 30' có lịch rảnh (gộp khung dài → nhiều ô), sort tăng dần.
    const calendarTimes = useMemo(() => {
        const covered = new Set<number>();
        calendarAvailability.forEach((slot) => {
            if (slot.available === false) return;
            const start = timeToMinutes(slot.startTime);
            for (let m = start; m < start + slot.durationHours * 60; m += 30) covered.add(m);
        });
        return [...covered].sort((a, b) => a - b).map(minutesToTime);
    }, [calendarAvailability]);

    const visibleWeekStart = useMemo(
        () => addDays(thisWeekStart, visibleWeekIndex * 7),
        [thisWeekStart, visibleWeekIndex],
    );
    const visibleDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(visibleWeekStart, i)),
        [visibleWeekStart],
    );
    const maxVisibleWeekIndex = useMemo(
        () =>
            Math.max(
                0,
                Math.floor((bookingDeadline.getTime() - thisWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)),
            ),
        [bookingDeadline, thisWeekStart],
    );

    const sortedPicks = useMemo(() => sortSlots(pickedWeekSlots), [pickedWeekSlots]);
    // Khoảng hiển thị trên header phải lấy từ LỊCH THẬT ĐÃ SINH, không phải từ ô người dùng bấm.
    // Hai thứ này khác nhau kể từ khi lịch được neo vào mốc hợp lệ sớm nhất: bấm ô ngày 08/09
    // nhưng mẫu "mỗi thứ Ba" vẫn bắt đầu từ 01/09 nếu ngày đó đã đủ xa. Lấy theo ô bấm sẽ ghi
    // "08/09 → 08/10" trong khi buổi đầu thật là 01/09 — header nói một đằng, lịch một nẻo.
    const bookingWindowStart = selectedSlots.length ? fromDateKey(selectedSlots[0].date) : null;
    const bookingWindowEnd = selectedSlots.length
        ? fromDateKey(selectedSlots[selectedSlots.length - 1].date)
        : null;

    // Lịch chỉ thực sự khóa (chặn chọn) khi gia sư đã accept booking khác cho khung giờ đó —
    // booking đang chờ xác nhận (dù đã đóng cọc) không chặn ai, kể cả chính người tạo nó.
    const lockedSlots = useMemo(() => bookedSlots.filter((slot) => slot.isLocked), [bookedSlots]);

    const slotsOverlapBooked = (candidateSlots: BookingSlot[]): boolean =>
        candidateSlots.some((candidate) =>
            lockedSlots.some(
                (booked) =>
                    booked.date === candidate.date &&
                    rangesOverlap(
                        timeToMinutes(booked.startTime),
                        booked.durationHours,
                        timeToMinutes(candidate.startTime),
                        candidate.durationHours,
                    ),
            ),
        );

    const isBookedCell = (dateKey: string, time: string): boolean => {
        const cellMinutes = timeToMinutes(time);
        return lockedSlots.some(
            (slot) =>
                slot.date === dateKey && slotCoversCell(slot.startTime, slot.durationHours, cellMinutes),
        );
    };

    // Số người khác đang chờ gia sư xác nhận cho khung giờ này — 0 nếu đã bị khóa hẳn (không cần
    // cảnh báo tranh chấp nữa, vì đằng nào cũng không chọn được) hoặc chưa ai đặt cọc.
    const getContestedCount = (dateKey: string, time: string): number => {
        const cellMinutes = timeToMinutes(time);
        const match = bookedSlots.find(
            (slot) =>
                slot.date === dateKey &&
                !slot.isLocked &&
                slotCoversCell(slot.startTime, slot.durationHours, cellMinutes),
        );
        return match?.pendingCount ?? 0;
    };

    const wouldAvailabilityPickConflict = (
        dateKey: string,
        dayOfWeek: number,
        startTime: string,
    ): boolean => {
        const projected = buildScheduleFromPattern(
            [{ dayOfWeek, startTime, durationHours: sessionHours }],
            fromDateKey(dateKey),
        );
        return slotsOverlapBooked(projected);
    };

    const fixedSlotsForWeek = (weekMonday: Date): BookingSlot[] => {
        if (selectedCombo?.type !== "fixed") return [];
        const pattern = comboToWeeklyPattern(selectedCombo);
        const futureInWeek = pattern
            .map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                durationHours: slot.durationHours,
                date: toDateKey(addDays(weekMonday, slot.dayOfWeek - 1)),
            }))
            .filter((slot) => isFutureSlot(slot.date, slot.startTime, minLeadHours));
        if (!futureInWeek.length) return [];
        // Gói cố định: phụ huynh CHỦ ĐỘNG chọn tuần bắt đầu nên tôn trọng lựa chọn đó, chỉ đảm
        // bảo không sinh buổi sớm hơn mốc hợp lệ.
        const weekStart = fromDateKey(sortSlots(futureInWeek)[0].date);
        const earliest = earliestBookableAt();
        return buildScheduleFromPattern(pattern, weekStart > earliest ? weekStart : earliest);
    };

    const fixedWeekHasConflict = (weekMonday: Date): boolean =>
        slotsOverlapBooked(fixedSlotsForWeek(weekMonday));

    const hasSelectedSlotConflict = slotsOverlapBooked(selectedSlots);

    // Đồng bộ formData.schedule (pattern tuần, dedupe) + startDate từ selectedSlots.
    useEffect(() => {
        const startKey = sortedPicks.length ? toDateKey(fromDateKey(sortedPicks[0].date)) : null;
        setFormData((d) => {
            const seen = new Set<string>();
            const pattern: ScheduleSlot[] = [];
            for (const s of selectedSlots) {
                const key = `${s.dayOfWeek}-${s.startTime}`;
                if (seen.has(key)) continue;
                seen.add(key);
                pattern.push({
                    dayOfWeek: toBackendDow(s.dayOfWeek),
                    startTime: s.startTime,
                    endTime: endTimeOf(s.startTime, s.durationHours),
                });
            }
            return { ...d, schedule: pattern, startDate: startKey ?? d.startDate };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSlots]);

    // Chiếu pattern tuần (thứ + giờ các ô đã bấm) ra cả cửa sổ, bắt đầu từ mốc hợp lệ sớm nhất.
    const projectFromWeekPicks = (weekSlots: BookingSlot[]) => {
        if (!weekSlots.length) {
            setSelectedSlots([]);
            return;
        }
        const pattern: WeeklyPatternSlot[] = weekSlots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            durationHours: slot.durationHours,
        }));
        // Neo vào mốc hợp lệ sớm nhất, KHÔNG phải ngày của ô được bấm: mẫu tuần chỉ định nghĩa
        // "học thứ mấy, giờ nào", còn lịch bắt đầu ngay khi đủ điều kiện thời gian.
        setSelectedSlots(buildScheduleFromPattern(pattern, earliestBookableAt()));
    };

    /**
     * Thời điểm sớm nhất được đặt = bây giờ + thời gian báo trước của luồng đang chạy.
     * Đây là mốc neo lịch, thay cho ngày của ô người dùng bấm — xem buildScheduleFromPattern.
     */
    const earliestBookableAt = () => new Date(Date.now() + minLeadHours * 60 * 60 * 1000);

    // Mỗi ngày tối đa 1 buổi: hai buổi liền trong cùng ngày không phải ý đồ của "N buổi/tuần",
    // và backend cũng chặn (BookingSchedulePolicy.MaxSessionsPerDay).
    const isDayFull = (dateKey: string) => pickedWeekSlots.some((p) => p.date === dateKey);

    // Đã chọn đủ số buổi của tuần mẫu → không cho thêm nữa (bỏ bớt thì bấm lại ô đã chọn).
    const isWeekFull = sessionsPerWeek > 0 && pickedWeekSlots.length >= sessionsPerWeek;

    // Còn thiếu bao nhiêu buổi nữa mới đủ tuần mẫu — dùng cho nhãn hướng dẫn ở UI.
    const remainingWeekPicks = Math.max(0, sessionsPerWeek - pickedWeekSlots.length);

    // Chỉ khoá điều hướng khi mẫu tuần ĐÃ ĐỦ. Trước đây khoá ngay từ ô đầu tiên, tạo ra ngõ cụt:
    // gia sư rảnh T2+T4 mà phụ huynh đặt tối Chủ Nhật thì tuần kế chỉ còn ô T4 hợp lệ (T2 chưa đủ
    // 24 giờ) — bấm T4 xong là hết đường sang tuần sau chọn nốt T2, mà cũng không có cách nào
    // biết mình đang kẹt. Mẫu chỉ quan tâm THỨ + GIỜ nên gom ô từ nhiều tuần vẫn ra mẫu hợp lệ.
    const navLocked = isWeekFull;

    /**
     * Tuần đang xem còn ô nào bấm được không. Dùng để chỉ đường khi mẫu chưa đủ mà tuần này đã
     * hết chỗ — nếu không, người dùng chỉ thấy bộ đếm đứng im mà không hiểu phải làm gì.
     *
     * Dùng đúng bộ điều kiện mà StepSchedule dùng để bật/tắt ô, nên hai nơi không lệch nhau.
     */
    const hasSelectableSlotInVisibleWeek = (() => {
        if (isWeekFull) return false;
        const earliest = earliestBookableAt();

        return visibleDays.some((date) => {
            const dateKey = toDateKey(date);
            if (isDayFull(dateKey)) return false;

            const demoDow = toDemoWeekday(date.getDay());
            return calendarTimes.some((time) => {
                const cellStart = new Date(date);
                cellStart.setHours(0, timeToMinutes(time), 0, 0);
                return cellStart >= earliest
                    && sessionFitsAvailability(demoDow, time, sessionHours, calendarAvailability)
                    && !isBookedCell(dateKey, time)
                    && !wouldAvailabilityPickConflict(dateKey, demoDow, time);
            });
        });
    })();

    // Tự chọn lịch rảnh: bấm 1 ô = đặt buổi [giờ bấm, +sessionHours]. Bấm lại để bỏ.
    const toggleAvailabilityPick = (dateKey: string, dayOfWeek: number, startTime: string) => {
        const cellMin = timeToMinutes(startTime);
        // Bấm BẤT KỲ ô nào thuộc buổi đã chọn đều bỏ được, không chỉ ô bắt đầu. Buổi 1 tiếng phủ
        // hai ô 30 phút trông y hệt nhau (cùng nhãn "Đã chọn"), nên bắt người dùng đoán ô nào bấm
        // được là vô lý — trước đây chỉ ô bắt đầu mới bỏ chọn được.
        const covering = pickedWeekSlots.find(
            (p) => p.date === dateKey && slotCoversCell(p.startTime, p.durationHours, cellMin),
        );
        if (covering) {
            const next = pickedWeekSlots.filter((p) => p !== covering);
            setPickedWeekSlots(next);
            projectFromWeekPicks(next);
            return;
        }

        const overlapsSelectedSession = pickedWeekSlots.some(
            (p) =>
                p.date === dateKey &&
                rangesOverlap(timeToMinutes(p.startTime), p.durationHours, cellMin, sessionHours),
        );
        if (
            bookedSlotsLoading ||
            wouldAvailabilityPickConflict(dateKey, dayOfWeek, startTime) ||
            overlapsSelectedSession ||
            isDayFull(dateKey) ||
            isWeekFull ||
            !sessionFitsAvailability(dayOfWeek, startTime, sessionHours, calendarAvailability)
        ) {
            return;
        }

        const next = [...pickedWeekSlots, { dayOfWeek, startTime, durationHours: sessionHours, date: dateKey }];
        setPickedWeekSlots(next);
        projectFromWeekPicks(next);
    };

    // Gói cố định: bấm 1 buổi của gói = chọn cả pattern của tuần đó làm tuần bắt đầu (khóa tuần).
    const pickFixedStartWeek = (weekMonday: Date) => {
        if (
            selectedCombo?.type !== "fixed" ||
            bookedSlotsLoading ||
            fixedWeekHasConflict(weekMonday)
        ) return;
        const pattern = comboToWeeklyPattern(selectedCombo);
        const datedInWeek: BookingSlot[] = pattern.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            durationHours: slot.durationHours,
            date: toDateKey(addDays(weekMonday, slot.dayOfWeek - 1)), // demo: T2=1 → offset 0
        }));
        // Tuần 1 chỉ gồm buổi từ GIỜ HIỆN TẠI trở đi (không chỉ từ hôm nay); pattern vẫn lặp đủ các tuần sau.
        const futureInWeek = datedInWeek.filter((slot) => isFutureSlot(slot.date, slot.startTime, minLeadHours));
        if (!futureInWeek.length) return;
        setPickedWeekSlots(futureInWeek);
        const weekStart = fromDateKey(sortSlots(futureInWeek)[0].date);
        const earliest = earliestBookableAt();
        setSelectedSlots(buildScheduleFromPattern(pattern, weekStart > earliest ? weekStart : earliest));
    };

    const clearPicks = () => {
        setPickedWeekSlots([]);
        setSelectedSlots([]);
    };

    return {
        today,
        bookingDeadline,
        visibleWeekIndex,
        setVisibleWeekIndex,
        visibleWeekStart,
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
        isDayFull,
        isWeekFull,
        remainingWeekPicks,
        hasSelectableSlotInVisibleWeek,
        minLeadHours,
        isBookedCell,
        getContestedCount,
        wouldAvailabilityPickConflict,
        fixedWeekHasConflict,
        toggleAvailabilityPick,
        pickFixedStartWeek,
        clearPicks,
    };
}
