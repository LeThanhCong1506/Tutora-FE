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

const translateApiMessage = (message: string): string => {
  const match = ENGLISH_TO_VIETNAMESE_MESSAGES.find(([en]) => message.includes(en));
  return match ? message.replace(match[0], match[1]) : message;
};

type ApiErrorBody = { message?: string; title?: string; error?: unknown };

const readErrorBody = (err: unknown): ApiErrorBody | undefined =>
  (err as { response?: { data?: ApiErrorBody } })?.response?.data;

/**
 * Bóc chi tiết lỗi từ envelope APIResponse của BE: ưu tiên field `error` — dict lỗi theo từng
 * trường do [ApiController] tự validate DataAnnotations (vd { fullName: [...], birthdate: [...] }) —
 * gộp lại thành 1 chuỗi để người dùng biết chính xác trường nào sai, thay vì chỉ hiện `message`
 * chung chung "Dữ liệu đầu vào không hợp lệ." không nói rõ sai ở đâu. Mỗi message được dịch
 * sang tiếng Việt qua translateApiMessage trước khi hiển thị.
 */
export const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = readErrorBody(err);
  if (!data) return fallback;

  if (data.error && typeof data.error === 'object') {
    const fieldMessages = Object.values(data.error as Record<string, string[]>).flat();
    if (fieldMessages.length > 0) return fieldMessages.map(translateApiMessage).join(' ');
  }

  const message = data.message || data.title;
  return message ? translateApiMessage(message) : fallback;
};

/** Mã lỗi machine-readable BE nhét trong `message` (vd "ACTIVE_BOOKING") — kiểm tra trên bản gốc. */
export const hasApiErrorCode = (err: unknown, code: string): boolean =>
  Boolean(readErrorBody(err)?.message?.includes(code));
