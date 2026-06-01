import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/vi";
import styles from "../../styles/pages/tutor-portal-schedule.module.css";
import { AddAvailabilityModal, EditAvailabilityModal } from "./components";
import {
    MobileHeader,
    DesktopHeader,
    CalendarControls,
    ScheduleLegend,
    EmptyState,
    MonthView,
    AvailabilityGrid,
    LessonsGrid,
    LessonDetailPopup,
    FabPlusIcon,
    useDragToCreate,
    useDragToResize,
    DEFAULT_ROW_HEIGHT,
    MAX_ROW_HEIGHT,
    MIN_ROW_HEIGHT,
    ZOOM_STEP,
    apiDayToIsoDay,
    parseTimeToHour,
    parseTimeToMinutes,
    calculateDurationMinutes,
} from "./schedule-components";
import type {
    ActiveTab,
    EditAvailabilityData,
    LocalAvailabilitySlot,
    ViewMode,
} from "./schedule-components";
import { getMyAvailability, deleteAvailability } from "../../services/availability.service";
import type { AvailabilitySlot } from "../../services/availability.service";
import { getTutorCalendar, getTutorLessonDetail } from "../../services/lesson.service";
import type { CalendarDay, CalendarLesson, LessonDetailDto } from "../../services/lesson.service";

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale("vi");

const TutorPortalSchedule: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

    // Mobile tap-to-show-actions
    const [tappedSlotId, setTappedSlotId] = useState<number | null>(null);
    const [tapPosition, setTapPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Availability state
    const [availability, setAvailability] = useState<LocalAvailabilitySlot[]>([]);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [isAddAvailabilityModalOpen, setIsAddAvailabilityModalOpen] = useState(false);
    const [isEditAvailabilityModalOpen, setIsEditAvailabilityModalOpen] = useState(false);
    const [editingAvailability, setEditingAvailability] = useState<EditAvailabilityData | null>(null);
    const [deletingSlotId, setDeletingSlotId] = useState<number | null>(null);

    // Lessons state
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);

    // Lesson detail popup state
    const [selectedLessonDetail, setSelectedLessonDetail] = useState<LessonDetailDto | null>(null);
    const [isLoadingLessonDetail, setIsLoadingLessonDetail] = useState(false);
    const [lessonPopupPosition, setLessonPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [showLessonPopup, setShowLessonPopup] = useState(false);
    const lessonPopupRef = useRef<HTMLDivElement>(null);

    const lessons: CalendarLesson[] = useMemo(() => {
        return calendarData.flatMap(day => day.lessons || []);
    }, [calendarData]);

    // Zoom
    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
    const pxPerMinute = rowHeight / 60;
    const handleZoomIn = () => setRowHeight(prev => Math.min(prev + ZOOM_STEP, MAX_ROW_HEIGHT));
    const handleZoomOut = () => setRowHeight(prev => Math.max(prev - ZOOM_STEP, MIN_ROW_HEIGHT));
    const handleZoomReset = () => setRowHeight(DEFAULT_ROW_HEIGHT);

    const calendarBodyRef = useRef<HTMLDivElement>(null);

    // Fetch availability
    const fetchAvailability = useCallback(async () => {
        setIsLoadingAvailability(true);
        try {
            const response = await getMyAvailability();
            const mapped: LocalAvailabilitySlot[] = (response.content || []).map((slot: AvailabilitySlot, index: number) => ({
                id: index + 1,
                dayOfWeek: apiDayToIsoDay(slot.dayofweek),
                startHour: parseTimeToHour(slot.starttime),
                startMinutes: parseTimeToMinutes(slot.starttime),
                durationMinutes: calculateDurationMinutes(slot.starttime, slot.endtime),
                apiId: slot.availabilityid,
                startTime: slot.starttime,
                endTime: slot.endtime,
                apiDayOfWeek: slot.dayofweek,
            }));
            setAvailability(mapped);
        } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status !== 404) {
                // toastId dedupe — tránh double-fire khi React StrictMode chạy
                // effect 2 lần ở dev mode. Cùng toastId → react-toastify chỉ
                // render 1 toast tại 1 thời điểm.
                toast.error("Không thể tải lịch rảnh. Vui lòng thử lại.", {
                    toastId: 'load-availability-error',
                });
            }
        } finally {
            setIsLoadingAvailability(false);
        }
    }, []);

    // Fetch calendar for lessons tab
    const fetchCalendar = useCallback(async () => {
        setIsLoadingLessons(true);
        try {
            const startDate = dayjs().subtract(7, "day").format("YYYY-MM-DD");
            const endDate = dayjs().add(30, "day").format("YYYY-MM-DD");
            const response = await getTutorCalendar(startDate, endDate);
            setCalendarData(response.content || []);
        } catch (error: unknown) {
            console.error("fetchCalendar error:", error);
            toast.error("Không thể tải lịch dạy. Vui lòng thử lại.", {
                toastId: 'load-calendar-error',
            });
        } finally {
            setIsLoadingLessons(false);
        }
    }, []);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    useEffect(() => {
        if (activeTab === "lessons") {
            fetchCalendar();
        }
    }, [activeTab, fetchCalendar]);

    // Drag-to-create + drag-to-resize hooks
    const {
        dragState,
        isLongPressActive,
        ghostPreview,
        handleCellMouseDown,
        handleCellTouchStart,
    } = useDragToCreate({
        activeTab,
        viewMode,
        rowHeight,
        calendarBodyRef,
        onCreated: fetchAvailability,
    });

    const { handleResizeStart, getResizedSlotStyle } = useDragToResize({
        rowHeight,
        calendarBodyRef,
        onResized: fetchAvailability,
    });

    // Derived date data
    const displayDates = useMemo(() => {
        if (viewMode === "day") return [currentDate];
        const startOfWeek = currentDate.startOf("isoWeek");
        return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"));
    }, [currentDate, viewMode]);

    const monthCalendarData = useMemo(() => {
        if (viewMode !== "month") return [];
        const startOfMonth = currentDate.startOf("month");
        const endOfMonth = currentDate.endOf("month");
        const startDay = startOfMonth.startOf("isoWeek");
        const endDay = endOfMonth.endOf("isoWeek");
        const days: Dayjs[] = [];
        let day = startDay;
        while (day.isBefore(endDay) || day.isSame(endDay, "day")) {
            days.push(day);
            day = day.add(1, "day");
        }
        return days;
    }, [currentDate, viewMode]);

    const dateRangeText = useMemo(() => {
        if (viewMode === "day") return currentDate.format("DD MMMM, YYYY");
        if (viewMode === "month") return currentDate.format("MMMM YYYY");
        const start = displayDates[0];
        const end = displayDates[6];
        if (start.month() === end.month()) {
            return `${start.format("DD")} - ${end.format("DD MMM, YYYY")}`;
        }
        return `${start.format("DD MMM")} - ${end.format("DD MMM, YYYY")}`;
    }, [currentDate, displayDates, viewMode]);

    const isCurrentPeriod = useMemo(() => {
        const today = dayjs();
        if (viewMode === "day") return currentDate.isSame(today, "day");
        if (viewMode === "month") return currentDate.isSame(today, "month");
        const startOfCurrentWeek = today.startOf("isoWeek");
        const startOfDisplayWeek = currentDate.startOf("isoWeek");
        return startOfCurrentWeek.isSame(startOfDisplayWeek, "day");
    }, [currentDate, viewMode]);

    // Handlers
    const handleDeleteAvailability = async (slot: LocalAvailabilitySlot) => {
        setDeletingSlotId(slot.apiId);
        try {
            await deleteAvailability(slot.apiId);
            toast.success("Đã xóa lịch rảnh thành công!");
            fetchAvailability();
        } catch {
            toast.error("Không thể xóa lịch rảnh. Vui lòng thử lại.");
        } finally {
            setDeletingSlotId(null);
        }
    };

    const handleEditAvailability = (slot: LocalAvailabilitySlot) => {
        setEditingAvailability({
            id: slot.apiId,
            dayOfWeek: slot.apiDayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
        });
        setIsEditAvailabilityModalOpen(true);
    };

    const handleCloseEditAvailabilityModal = () => {
        setIsEditAvailabilityModalOpen(false);
        setEditingAvailability(null);
    };

    // Navigation
    const navUnit = viewMode === "day" ? "day" : viewMode === "month" ? "month" : "week";
    const handlePrev = () => setCurrentDate(currentDate.subtract(1, navUnit));
    const handleNext = () => setCurrentDate(currentDate.add(1, navUnit));
    const handleToday = () => setCurrentDate(dayjs());

    // Day click in month view
    const handleMonthDayClick = (date: Dayjs) => {
        setCurrentDate(date);
        setViewMode("day");
    };

    // Helpers
    const getDayAvailability = (date: Dayjs): LocalAvailabilitySlot[] => {
        const isoDay = date.isoWeekday();
        return availability.filter(a => a.dayOfWeek === isoDay);
    };

    const getDayLessons = (date: Dayjs): CalendarLesson[] => {
        return lessons.filter(l => dayjs(l.scheduledStart).isSame(date, "day"));
    };

    const getAvailabilityStartingAtHour = (date: Dayjs, hour: number): LocalAvailabilitySlot | null => {
        const isoDay = date.isoWeekday();
        return availability.find(a => a.dayOfWeek === isoDay && a.startHour === hour) || null;
    };

    // Availability modal
    const handleAddAvailabilityClick = () => setIsAddAvailabilityModalOpen(true);
    const handleCloseAddAvailabilityModal = () => setIsAddAvailabilityModalOpen(false);

    // Mobile tap
    const handleTapSlot = (slotId: number, x: number, y: number) => {
        if (tappedSlotId === slotId) {
            setTappedSlotId(null);
        } else {
            setTapPosition({ x, y });
            setTappedSlotId(slotId);
        }
    };

    // Lesson popup
    const handleLessonClick = useCallback(async (e: React.MouseEvent, lesson: CalendarLesson) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const popupWidth = 340;
        const popupHeight = 320;
        let x = rect.right + 8;
        let y = rect.top;
        if (x + popupWidth > window.innerWidth) x = rect.left - popupWidth - 8;
        if (x < 8) x = 8;
        if (y + popupHeight > window.innerHeight) y = window.innerHeight - popupHeight - 8;
        if (y < 8) y = 8;
        setLessonPopupPosition({ x, y });
        setShowLessonPopup(true);
        setIsLoadingLessonDetail(true);
        setSelectedLessonDetail(null);

        try {
            const response = await getTutorLessonDetail(lesson.lessonId);
            setSelectedLessonDetail(response.content);
        } catch (error: unknown) {
            console.error("Error fetching lesson detail:", error);
            toast.error("Không thể tải chi tiết buổi học");
            setShowLessonPopup(false);
        } finally {
            setIsLoadingLessonDetail(false);
        }
    }, []);

    const handleCloseLessonPopup = useCallback(() => {
        setShowLessonPopup(false);
        setSelectedLessonDetail(null);
    }, []);

    const handleNavigateToClassDetail = useCallback(() => {
        if (selectedLessonDetail?.bookingId) {
            navigate(`/tutor-portal/classes/${selectedLessonDetail.bookingId}`);
        }
    }, [selectedLessonDetail, navigate]);

    // Close popup on outside click
    useEffect(() => {
        if (!showLessonPopup) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (lessonPopupRef.current && !lessonPopupRef.current.contains(e.target as Node)) {
                handleCloseLessonPopup();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showLessonPopup, handleCloseLessonPopup]);

    return (
        <div className={styles.schedulePage}>
            <MobileHeader
                currentDate={currentDate}
                activeTab={activeTab}
                viewMode={viewMode}
                isCurrentPeriod={isCurrentPeriod}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onTabChange={setActiveTab}
                onViewModeChange={setViewMode}
            />

            <div className={styles.mainContainer}>
                <DesktopHeader
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onAddAvailability={handleAddAvailabilityClick}
                />

                {activeTab === "settings" ? (
                    <div className={styles.calendarContainer}>
                        <CalendarControls
                            viewMode={viewMode}
                            dateRangeText={dateRangeText}
                            isCurrentPeriod={isCurrentPeriod}
                            onViewModeChange={setViewMode}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            onToday={handleToday}
                        />

                        <ScheduleLegend
                            activeTab={activeTab}
                            viewMode={viewMode}
                            rowHeight={rowHeight}
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onZoomReset={handleZoomReset}
                        />

                        {viewMode !== "month" && (
                            <div className={styles.mobileDragHint}>
                                ✦ Nhấn giữ trên lưới hoặc nút (+) góc dưới để tạo lịch rảnh
                            </div>
                        )}

                        {isLoadingAvailability && (
                            <div className={styles.loadingOverlay}>
                                <Spin size="large" />
                            </div>
                        )}

                        {!isLoadingAvailability && availability.length === 0 ? (
                            <EmptyState
                                icon="📅"
                                title="Chưa có lịch rảnh"
                                description="Thêm lịch rảnh để học viên có thể đặt lịch học với bạn"
                                actionLabel="Thêm lịch rảnh đầu tiên"
                                onAction={handleAddAvailabilityClick}
                            />
                        ) : viewMode === "month" ? (
                            <MonthView
                                mode="availability"
                                currentDate={currentDate}
                                monthDays={monthCalendarData}
                                onDayClick={handleMonthDayClick}
                                getDayAvailability={getDayAvailability}
                            />
                        ) : (
                            <AvailabilityGrid
                                viewMode={viewMode}
                                displayDates={displayDates}
                                rowHeight={rowHeight}
                                pxPerMinute={pxPerMinute}
                                calendarBodyRef={calendarBodyRef}
                                dragState={dragState}
                                ghostPreview={ghostPreview}
                                isLongPressActive={isLongPressActive}
                                tappedSlotId={tappedSlotId}
                                tapPosition={tapPosition}
                                deletingSlotId={deletingSlotId}
                                getAvailabilityStartingAtHour={getAvailabilityStartingAtHour}
                                getResizedSlotStyle={getResizedSlotStyle}
                                onCellMouseDown={handleCellMouseDown}
                                onCellTouchStart={handleCellTouchStart}
                                onResizeStart={handleResizeStart}
                                onTapSlot={handleTapSlot}
                                onEditAvailability={handleEditAvailability}
                                onDeleteAvailability={handleDeleteAvailability}
                            />
                        )}
                    </div>
                ) : (
                    <div className={styles.calendarContainer}>
                        <CalendarControls
                            viewMode={viewMode}
                            dateRangeText={dateRangeText}
                            isCurrentPeriod={isCurrentPeriod}
                            onViewModeChange={setViewMode}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            onToday={handleToday}
                        />

                        <ScheduleLegend
                            activeTab={activeTab}
                            viewMode={viewMode}
                            rowHeight={rowHeight}
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onZoomReset={handleZoomReset}
                        />

                        {isLoadingLessons ? (
                            <div className={styles.loadingOverlay}>
                                <Spin size="large" />
                            </div>
                        ) : lessons.length === 0 ? (
                            <EmptyState
                                icon="📚"
                                title="Chưa có lịch dạy"
                                description="Các buổi học đã được đặt sẽ hiển thị tại đây"
                            />
                        ) : viewMode === "month" ? (
                            <MonthView
                                mode="lessons"
                                currentDate={currentDate}
                                monthDays={monthCalendarData}
                                onDayClick={handleMonthDayClick}
                                getDayLessons={getDayLessons}
                            />
                        ) : (
                            <LessonsGrid
                                viewMode={viewMode}
                                displayDates={displayDates}
                                rowHeight={rowHeight}
                                lessons={lessons}
                                onLessonClick={handleLessonClick}
                            />
                        )}
                    </div>
                )}
            </div>

            {showLessonPopup && (
                <LessonDetailPopup
                    ref={lessonPopupRef}
                    position={lessonPopupPosition}
                    isLoading={isLoadingLessonDetail}
                    detail={selectedLessonDetail}
                    onClose={handleCloseLessonPopup}
                    onNavigateToClassDetail={handleNavigateToClassDetail}
                />
            )}

            <button className={styles.fab} onClick={handleAddAvailabilityClick}>
                <FabPlusIcon />
            </button>

            <AddAvailabilityModal
                isOpen={isAddAvailabilityModalOpen}
                onClose={handleCloseAddAvailabilityModal}
                onSuccess={fetchAvailability}
            />

            <EditAvailabilityModal
                isOpen={isEditAvailabilityModalOpen}
                onClose={handleCloseEditAvailabilityModal}
                onSuccess={fetchAvailability}
                availabilityData={editingAvailability}
            />
        </div>
    );
};

export default TutorPortalSchedule;
