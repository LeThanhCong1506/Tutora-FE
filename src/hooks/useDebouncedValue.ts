import { useEffect, useState } from 'react';

/**
 * Trả về `value` sau khi nó ngừng thay đổi trong `delay` ms — dùng cho ô tìm kiếm
 * gọi API server-side, tránh bắn request mỗi lần gõ phím.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default useDebouncedValue;
