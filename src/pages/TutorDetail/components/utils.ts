import { formatVNDNumber } from '../../../utils/formatters';

export const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return "0đ";
    return `${formatVNDNumber(amount)} ₫`;
};

export const formatTeachingMode = (mode: string | null | undefined): string => {
    const m = (mode || '').toLowerCase();
    if (m === 'both' || m === 'hybrid') return 'Linh hoạt';
    if (m === 'online') return 'Online';
    if (m === 'offline') return 'Tại nhà';
    return mode || '—';
};

export const formatCity = (city: string | null | undefined): string => {
    const c = (city || '').toLowerCase();
    const map: Record<string, string> = {
        'hochiminh': 'TP. Hồ Chí Minh',
        'hanoi': 'Hà Nội',
        'danang': 'Đà Nẵng',
        'cantho': 'Cần Thơ',
        'haiphong': 'Hải Phòng',
        'binhduong': 'Bình Dương',
        'dongnai': 'Đồng Nai',
    };
    return map[c] || city || 'Toàn quốc';
};

/**
 * Số ký tự giữ lại cho dòng giới thiệu trên hero. Ô này rộng ~350px (desktop) / ~239px
 * (mobile), đo thực tế cả hai đều vào khoảng 40 ký tự một dòng, nên 2 dòng ≈ 80 ký tự;
 * để dư một chút cho sai số bề rộng từng con chữ.
 */
const HERO_HEADLINE_MAX_CHARS = 85;

/**
 * Rút headline về đúng phần vừa khung giới thiệu đè trên video.
 *
 * Headline cho nhập tới 200 ký tự (validateHeadline ở portal gia sư) nhưng ô trên hero chỉ
 * chứa gọn 2 dòng — cả 192 ký tự của một hồ sơ thật đo được là 5 dòng. Để CSS `line-clamp`
 * tự cắt thì chỗ đứt rơi vào giữa chữ ("...lớp 6,7,8 và 9. Mình...") nên trông như lỗi hiển
 * thị. Cắt theo RANH GIỚI CÂU thì dòng cuối kết thúc bằng dấu chấm, đọc ra một câu giới
 * thiệu trọn vẹn.
 *
 * Trả nguyên văn khi ngay câu đầu đã dài quá mức — lúc đó `-webkit-line-clamp` trong CSS vẫn
 * là lưới an toàn. Bản đầy đủ không mất: nằm ở mục "Về gia sư ..." ngay bên dưới, và ở
 * thuộc tính `title` của thẻ.
 */
export const toHeroHeadline = (headline: string): string => {
    const text = headline.trim();
    if (text.length <= HERO_HEADLINE_MAX_CHARS) return text;

    // Cố tình KHÔNG dùng lookbehind `(?<=...)`: Safari < 16.4 (vẫn gặp trong Zalo Mini App)
    // báo lỗi cú pháp ngay lúc parse, hỏng cả bundle chứ không riêng hàm này.
    const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g);
    if (!sentences) return text;

    let kept = '';
    for (const sentence of sentences) {
        const next = kept + sentence;
        if (next.trim().length > HERO_HEADLINE_MAX_CHARS) break;
        kept = next;
    }

    // kept rỗng = ngay câu đầu đã quá dài; nhường lại cho line-clamp.
    return kept.trim() || text;
};
