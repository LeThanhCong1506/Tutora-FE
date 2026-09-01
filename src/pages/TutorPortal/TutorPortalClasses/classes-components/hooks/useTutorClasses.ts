import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../../../../utils/apiError';
import { getTutorClasses, type TutorClassSummary } from '../../../../../services/classSession.service';

const PAGE_SIZE = 6;

interface ClassesState {
    items: TutorClassSummary[];
    totalCount: number;
    loading: boolean;
}

const LOADING: ClassesState = { items: [], totalCount: 0, loading: true };

/**
 * Danh sách lớp (1 dòng = 1 booking) từ `GET /api/tutor/classes`.
 * Search/filter chạy server-side để khớp phân trang.
 */
export function useTutorClasses(status: string | undefined, search: string) {
    const [page, setPage] = useState(1);
    const [state, setState] = useState<ClassesState>(LOADING);
    // Tăng mỗi khi cần tải lại với cùng bộ tham số (ví dụ sau khi sửa dữ liệu trong modal).
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const trimmed = search.trim() || undefined;

        void (async () => {
            setState(LOADING);
            try {
                const res = await getTutorClasses(page, PAGE_SIZE, status, trimmed);
                if (cancelled) return;
                setState({
                    items: res.content?.items ?? [],
                    totalCount: res.content?.totalCount ?? 0,
                    loading: false,
                });
            } catch (error) {
                if (cancelled) return;
                toast.error(getApiErrorMessage(error, 'Không tải được danh sách lớp học.'));
                setState({ items: [], totalCount: 0, loading: false });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [page, status, search, reloadToken]);

    return {
        ...state,
        page,
        setPage,
        resetPage: useCallback(() => setPage(1), []),
        pageSize: PAGE_SIZE,
        refetch: useCallback(() => setReloadToken((n) => n + 1), []),
    };
}
