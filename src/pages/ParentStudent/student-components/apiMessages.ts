import { getApiErrorMessage } from '../../../utils/apiError';

// BE cố tình giữ nguyên các message validate học sinh bằng tiếng Anh — FE tự dịch sang tiếng
// Việt trước khi hiển thị. Dùng "includes" (không so khớp tuyệt đối) vì có message BE gửi kèm
// tiền tố tiếng Việt có sẵn (vd "Dữ liệu không hợp lệ: Birthdate must be today or in past.").
const ENGLISH_TO_VIETNAMESE_MESSAGES: Array<[string, string]> = [
  ['Birthdate must be today or in past.', 'Ngày sinh không được ở tương lai.'],
  ['Birthdate must be a valid date in yyyy-MM-dd format.', 'Ngày sinh không đúng định dạng.'],
  ['Full name must not be empty.', 'Họ và tên không được để trống.'],
  ['Full name must contain between 2 and 100 characters.', 'Họ và tên phải có từ 2 đến 100 ký tự.'],
  ['School name must not exceed 255 characters.', 'Tên trường không được vượt quá 255 ký tự.'],
  ['Learning goals must not exceed 1000 characters.', 'Mục tiêu học tập không được vượt quá 1000 ký tự.'],
  ['Gender must be a valid value.', 'Giới tính không hợp lệ.'],
  ['Request body is required.', 'Vui lòng nhập đầy đủ thông tin.'],
  ['Invalid value format.', 'Định dạng dữ liệu không hợp lệ.'],
];

// Thay TẤT CẢ các câu khớp: helper chung có thể ghép nhiều lỗi field vào một chuỗi,
// nên dịch một câu duy nhất là không đủ.
const translateApiMessage = (message: string): string =>
  ENGLISH_TO_VIETNAMESE_MESSAGES.reduce((text, [en, vi]) => text.split(en).join(vi), message);

type ApiErrorBody = { message?: string; title?: string; error?: unknown };

const readErrorBody = (err: unknown): ApiErrorBody | undefined =>
  (err as { response?: { data?: ApiErrorBody } })?.response?.data;

/**
 * Như getApiErrorMessage nhưng dịch thêm các message validate học sinh mà BE cố tình để
 * tiếng Anh. Phần bóc lỗi (message / error theo field / errors / ModelState / lỗi mạng)
 * dùng chung helper để mọi nơi hành xử giống nhau.
 */
export const extractApiErrorMessage = (err: unknown, fallback: string): string =>
  translateApiMessage(getApiErrorMessage(err, fallback));

/** Mã lỗi machine-readable BE nhét trong `message` (vd "ACTIVE_BOOKING") — kiểm tra trên bản gốc. */
export const hasApiErrorCode = (err: unknown, code: string): boolean =>
  Boolean(readErrorBody(err)?.message?.includes(code));
