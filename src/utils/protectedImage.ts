import axios from 'axios';
import { getAuthHeaders } from '../services/tutorProfile.service';

/**
 * Tải ảnh từ endpoint yêu cầu đăng nhập (/api/files/private) rồi đổi sang blob URL để hiển thị.
 *
 * Không dùng thẳng <img src={link}> được: thẻ img của trình duyệt không gửi header Authorization,
 * nên backend sẽ trả 401. Phải fetch bằng JS kèm token rồi tạo object URL.
 *
 * Nơi gọi PHẢI gọi releaseProtectedImage() khi không dùng nữa, nếu không blob sẽ nằm lại trong
 * bộ nhớ cho tới khi tải lại trang.
 */
export const fetchProtectedImage = async (url: string): Promise<string> => {
    const response = await axios.get<Blob>(url, {
        responseType: 'blob',
        headers: getAuthHeaders(),
    });
    return URL.createObjectURL(response.data);
};

export const releaseProtectedImage = (objectUrl: string | null | undefined): void => {
    if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
};
