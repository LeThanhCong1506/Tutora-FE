/**
 * Helpers tạo URL ảnh xem trước cho file chứng chỉ.
 *
 * File chứng chỉ lưu trên Cloudinary có thể là ảnh (jpg/png) hoặc PDF. Với PDF,
 * Cloudinary có thể render trang đầu thành ảnh thông qua transformation + đổi đuôi
 * sang .jpg. Dùng chung cho:
 *  - Trang chỉnh sửa hồ sơ gia sư (CertificateThumbnail trong TutorPortalProfile)
 *  - Section "Hồ sơ năng lực học thuật" của trang công khai / xem trước
 */

/** True nếu URL trỏ tới một file PDF (xét cả query/hash phía sau). */
export const isPdfUrl = (url?: string | null): boolean => Boolean(url && /\.pdf(?:$|[?#])/i.test(url));

/**
 * Chèn transformation Cloudinary và đổi .pdf → .jpg để lấy ảnh trang đầu của PDF.
 * Trả null nếu URL không phải ảnh upload trên Cloudinary (không thể biến đổi an toàn).
 */
const getCloudinaryPdfImageUrl = (url: string, transformation: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'res.cloudinary.com' || !parsedUrl.pathname.includes('/image/upload/')) {
      return null;
    }

    parsedUrl.pathname = parsedUrl.pathname
      .replace('/image/upload/', `/image/upload/${transformation}/`)
      .replace(/\.pdf$/i, '.jpg');
    parsedUrl.hash = '';

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

/**
 * URL ảnh để hiển thị cho một file chứng chỉ.
 * - Ảnh thường (jpg/png…): trả nguyên URL.
 * - PDF: ưu tiên `thumbnailUrl` backend tự render lúc upload (mọi chứng chỉ mới — không phụ thuộc
 *   nơi lưu file là Cloudinary hay VPS). Chỉ khi không có (chứng chỉ cũ, upload trước khi có tính
 *   năng thumbnail) mới thử cách cũ — nhờ Cloudinary tự render qua URL transformation.
 * - Không thể tạo ảnh: trả null (nơi gọi tự fallback sang icon).
 */
export const getCertificateImageUrl = (
  url?: string | null,
  fullSize = false,
  thumbnailUrl?: string | null,
): string | null => {
  if (!url) return null;
  if (!isPdfUrl(url)) return url;

  if (thumbnailUrl) return thumbnailUrl;

  const transformation = fullSize
    ? 'pg_1,w_1800,c_limit,q_auto,f_jpg'
    : 'pg_1,w_480,h_360,c_pad,b_white,q_auto,f_jpg';

  return getCloudinaryPdfImageUrl(url, transformation);
};
