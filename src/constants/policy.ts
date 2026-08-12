/**
 * Nguồn duy nhất cho đường dẫn và tên các văn bản chính sách.
 *
 * Footer, ô tick đồng ý ở các luồng và chính trang chính sách đều đọc từ đây —
 * đổi slug một chỗ là mọi liên kết đi theo, không còn `href="#"` chết như trước.
 */

export const POLICY_DOC_SLUGS = ['terms', 'privacy', 'operating-rules'] as const;

export type PolicyDocSlug = (typeof POLICY_DOC_SLUGS)[number];

export const POLICY_ROUTES: Record<PolicyDocSlug, string> = {
  terms: '/terms',
  privacy: '/privacy',
  'operating-rules': '/operating-rules',
};

/** Nhãn ngắn dùng trong câu "Tôi đồng ý với ..." và trên thanh điều hướng của trang. */
export const POLICY_DOC_LABELS: Record<PolicyDocSlug, string> = {
  terms: 'Điều khoản sử dụng',
  privacy: 'Chính sách bảo mật',
  'operating-rules': 'Quy chế hoạt động',
};

/**
 * Phiên bản văn bản đang hiển thị. Hiện chỉ dùng để in ra trang; khi nào backend lưu
 * được bằng chứng đồng ý thì gửi kèm giá trị này để biết người dùng đã đồng ý với bản nào.
 */
export const POLICY_VERSION = '1.0';

/** Ngày hiệu lực của bản hiện tại, hiển thị ở đầu mỗi văn bản. */
export const POLICY_EFFECTIVE_DATE = '12/08/2026';
