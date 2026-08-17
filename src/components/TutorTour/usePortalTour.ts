import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { getTourStatus, completeTour } from '../../services/auth.service';
import type { TourStep } from './TutorTour';
import type { TourPageOption } from './TourPageMenu';

export interface PageTour {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    route: string;
    steps: TourStep[];
}

/**
 * Chỉ navigate khi ít nhất 1 param trong `updates` KHÁC giá trị hiện tại — đọc thẳng
 * `window.location` tại thời điểm gọi (không qua state/props có thể bị stale). Gộp vào
 * search params sẵn có thay vì thay hẳn (an toàn cho trang có nhiều param cùng lúc, vd
 * `?view=&status=&date=`), chỉ ghi đè đúng những key được truyền.
 *
 * Cần thiết vì gọi `navigate()` tới URL y hệt (kể cả kèm `{ replace: true }`) vẫn tạo ra
 * 1 `location` object mới trong React Router, có thể khiến các effect phụ thuộc location
 * re-run liên tục và làm giao diện chớp giật — đã gặp thật khi làm tour Tutor.
 */
export const guardedNavigate = (
    navigate: NavigateFunction,
    pathname: string,
    updates: Record<string, string>,
) => {
    const current = new URLSearchParams(window.location.search);
    const alreadyThere =
        window.location.pathname === pathname &&
        Object.entries(updates).every(([key, value]) => (current.get(key) ?? '') === value);
    if (alreadyThere) return;

    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) next.set(key, value);
    navigate(`${pathname}?${next.toString()}`, { replace: true });
};

const readCompletedPageTours = (storageKey: string): Set<string> => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
        return new Set();
    }
};

const markPageTourCompleted = (storageKey: string, key: string) => {
    const current = readCompletedPageTours(storageKey);
    current.add(key);
    try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(current)));
    } catch {
        /* private mode: bỏ qua, chỉ mất badge "đã xem" trong phiên sau */
    }
};

export interface UsePortalTourOptions {
    onSidebarOpen?: () => void;
    onSidebarClose?: () => void;
}

/**
 * Orchestration dùng chung cho hệ thống tour ở cả 3 portal (Tutor/Parent/Student) — mỗi
 * layout tự định nghĩa nội dung `pageTours` riêng, hook chỉ lo phần cơ chế: mở modal chọn
 * trang, điều hướng sang đúng trang rồi đợi mount xong mới bật tour, và theo dõi tiến trình
 * "đã xem" theo từng trang. `roleKey` namespace localStorage riêng cho từng role
 * (`tutorTourCompleted(Pages)`, `parentTourCompleted(Pages)`, ...) — tránh lẫn badge "đã
 * xem" nếu cùng 1 trình duyệt từng test nhiều role khác nhau.
 */
export function usePortalTour(pageTours: PageTour[], roleKey: string, options: UsePortalTourOptions = {}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { onSidebarOpen, onSidebarClose } = options;

    const tourCompletedKey = `${roleKey}TourCompleted`;
    const tourCompletedPagesKey = `${roleKey}TourCompletedPages`;

    const [showTour, setShowTour] = useState(false);
    const [showTourPrompt, setShowTourPrompt] = useState(false);
    const [showTourMenu, setShowTourMenu] = useState(false);
    // Tour đang chạy (key trong pageTours) — 'dashboard' khi tự chạy lúc chào mừng lần đầu.
    const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
    // Đã chọn 1 tour ở TourPageMenu nhưng đang chờ điều hướng sang đúng trang trước khi bật tour.
    const [pendingTourKey, setPendingTourKey] = useState<string | null>(null);
    const [completedPageTours, setCompletedPageTours] = useState<Set<string>>(() =>
        readCompletedPageTours(tourCompletedPagesKey),
    );

    const tourPageOptions = useMemo<TourPageOption[]>(
        () =>
            pageTours.map((tour) => ({
                key: tour.key,
                label: tour.label,
                description: tour.description,
                icon: tour.icon,
            })),
        [pageTours],
    );
    const activeTour = useMemo(
        () => pageTours.find((tour) => tour.key === activeTourKey) ?? null,
        [pageTours, activeTourKey],
    );
    const dashboardRoute = useMemo(
        () => pageTours.find((tour) => tour.key === 'dashboard')?.route,
        [pageTours],
    );

    // Hiện modal chào mừng chỉ lúc mới ghé trang dashboard lần đầu (chưa từng xem tour).
    useEffect(() => {
        if (!dashboardRoute || location.pathname !== dashboardRoute) return;
        if (localStorage.getItem(tourCompletedKey)) return;
        let cancelled = false;
        getTourStatus().then((completed) => {
            if (cancelled) return;
            if (completed) {
                localStorage.setItem(tourCompletedKey, 'true');
            } else {
                const timer = setTimeout(() => setShowTourPrompt(true), 800);
                cancelled = true;
                return () => clearTimeout(timer);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [location.pathname, dashboardRoute, tourCompletedKey]);

    const handleAcceptTour = () => {
        setShowTourPrompt(false);
        setActiveTourKey('dashboard');
        setShowTour(true);
    };

    const handleSkipTour = () => {
        setShowTourPrompt(false);
        localStorage.setItem(tourCompletedKey, 'true');
        completeTour();
    };

    // Nút "Hướng dẫn" ở sidebar mở modal chọn trang thay vì chạy thẳng tour Dashboard.
    const handleOpenTourMenu = () => {
        onSidebarClose?.();
        setShowTourMenu(true);
    };

    const closeTourMenu = () => setShowTourMenu(false);

    const handleSelectPageTour = (tourKey: string) => {
        const tour = pageTours.find((item) => item.key === tourKey);
        if (!tour) return;
        setShowTourMenu(false);

        if (location.pathname === tour.route) {
            setActiveTourKey(tourKey);
            setShowTour(true);
            return;
        }
        // Chưa ở đúng trang — điều hướng tới rồi đợi trang mount xong mới bật tour
        // (xem useEffect theo dõi pendingTourKey bên dưới).
        setPendingTourKey(tourKey);
        navigate(tour.route);
    };

    // Khi đã điều hướng tới đúng trang của tour đang chờ, đợi 1 khoảng ngắn cho trang mới
    // mount xong (cùng tinh thần các setTimeout có sẵn trong TutorTour.tsx) rồi mới bật
    // tour — nếu bật ngay, querySelector có thể chưa tìm thấy target.
    useEffect(() => {
        if (!pendingTourKey) return;
        const tour = pageTours.find((item) => item.key === pendingTourKey);
        if (!tour || location.pathname !== tour.route) return;

        const timer = setTimeout(() => {
            setActiveTourKey(pendingTourKey);
            setShowTour(true);
            setPendingTourKey(null);
        }, 350);
        return () => clearTimeout(timer);
    }, [pendingTourKey, location.pathname, pageTours]);

    const handleTourComplete = () => {
        setShowTour(false);
        onSidebarClose?.();
        if (activeTourKey === 'dashboard') {
            // Luồng chào mừng lần đầu — có gọi API backend (cờ toàn cục theo user, dùng
            // chung cho cả 3 role vì backend không phân biệt role cho endpoint này).
            localStorage.setItem(tourCompletedKey, 'true');
            completeTour();
        } else if (activeTourKey) {
            // Tour trang khác chọn qua modal — chỉ đánh dấu local, không gọi backend.
            markPageTourCompleted(tourCompletedPagesKey, activeTourKey);
            setCompletedPageTours(readCompletedPageTours(tourCompletedPagesKey));
        }
        setActiveTourKey(null);
    };

    return {
        tourPageOptions,
        completedPageTours,
        showTourPrompt,
        showTourMenu,
        showTour,
        activeTour,
        handleAcceptTour,
        handleSkipTour,
        handleOpenTourMenu,
        closeTourMenu,
        handleSelectPageTour,
        handleTourComplete,
        onSidebarOpen,
        onSidebarClose,
    };
}
