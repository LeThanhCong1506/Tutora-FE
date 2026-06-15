// Helpers cho video giới thiệu dạng link YouTube.
// BE lưu intro video là 1 URL YouTube (PUT /api/tutors/{id}/profile/video → { videoUrl }),
// nên FE chỉ cần trích videoId rồi dựng link embed / thumbnail từ đó.

// Bắt videoId (11 ký tự) ở các dạng URL phổ biến: watch?v=, youtu.be/, embed/, shorts/, live/.
const YT_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  /youtu\.be\/([\w-]{11})/i,
  /youtube\.com\/embed\/([\w-]{11})/i,
  /youtube\.com\/shorts\/([\w-]{11})/i,
  /youtube\.com\/live\/([\w-]{11})/i,
];

/** Trích YouTube videoId từ URL (hoặc chính chuỗi 11 ký tự). Không khớp → null. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  for (const re of YT_PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  // Người dùng dán thẳng videoId.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

/** true nếu chuỗi là 1 link/ID YouTube hợp lệ. */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}

/** Link nhúng iframe (`/embed/{id}`); không hợp lệ → null. */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** Ảnh thumbnail độ phân giải cao của video; không hợp lệ → null. */
export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
