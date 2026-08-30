import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

/**
 * Ngưỡng rút tiền tối thiểu dùng khi chưa gọi được API — khớp với `WithdrawalLimitService.Fallback`
 * bên backend. Chỉ là giá trị đỡ lỗi hiển thị: mức thật do admin cấu hình và backend mới là nơi
 * chặn cuối cùng, nên tuyệt đối không hardcode một con số khác vào form.
 */
export const DEFAULT_MIN_WITHDRAWAL = 10000;

/**
 * Ngưỡng rút tiền tối thiểu admin đang áp dụng (dùng chung gia sư/phụ huynh/học sinh).
 * Không bao giờ throw: ngưỡng này chỉ để hiển thị và chặn sớm trên form, hỏng API không được
 * phép làm hỏng luôn cả trang ví — backend vẫn chặn lại khi tạo yêu cầu.
 */
export const getMinWithdrawalAmount = async (): Promise<number> => {
    try {
        const { data } = await api.get('/withdrawal-limit');
        const min = Number(data?.content?.minWithdrawalAmount);
        return Number.isFinite(min) && min > 0 ? min : DEFAULT_MIN_WITHDRAWAL;
    } catch (error) {
        console.error('Failed to load min withdrawal amount:', error);
        return DEFAULT_MIN_WITHDRAWAL;
    }
};
