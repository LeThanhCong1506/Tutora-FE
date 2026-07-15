// Danh sách "trọng tâm cụ thể" theo từng môn — kiểu Preply's Specialties picker.
// Đây LUÔN LÀ TÍN HIỆU MỀM (gộp vào text `preferences` cho AI đọc) vì DB không có field
// lưu chuyên đề/kỳ thi con của gia sư — chỉ Tutorsubjectgradeprices (subjectId) và
// Tutorcertificates (tên chứng chỉ tự do, không chuẩn hoá). Nhóm theo bối cảnh thị trường
// VN (thi vào 10/THPT QG/HSG + các chứng chỉ quốc tế phổ biến với PH Việt), không copy
// nguyên xi danh sách Mỹ của Preply (vd bỏ ASVAB/GED không liên quan).
export interface SpecialtyGroup {
    title: string;
    options: string[];
}

const MATH_GROUPS: SpecialtyGroup[] = [
    {
        title: "Chủ đề",
        options: ["Số học", "Đại số", "Hình học", "Lượng giác", "Giải tích", "Xác suất - Thống kê", "Toán tư duy (tiểu học)"],
    },
    {
        title: "Luyện thi",
        options: ["Thi vào lớp 10", "Thi tốt nghiệp THPT", "Học sinh giỏi", "SAT Math", "ACT Math", "IB Math", "A-Level Math", "IGCSE/GCSE Math", "AP Calculus", "GMAT Quantitative"],
    },
];

const PHYSICS_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Cơ học", "Điện học", "Quang học", "Nhiệt học", "Vật lý hạt nhân"] },
    { title: "Luyện thi", options: ["Thi vào lớp 10", "Thi tốt nghiệp THPT", "Học sinh giỏi", "SAT Physics", "AP Physics", "A-Level Physics", "IB Physics"] },
];

const CHEMISTRY_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Hóa vô cơ", "Hóa hữu cơ", "Hóa phân tích", "Hóa đại cương"] },
    { title: "Luyện thi", options: ["Thi vào lớp 10", "Thi tốt nghiệp THPT", "Học sinh giỏi", "SAT Chemistry", "AP Chemistry", "A-Level Chemistry"] },
];

const BIOLOGY_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Sinh học tế bào", "Di truyền học", "Sinh thái học", "Giải phẫu - Sinh lý"] },
    { title: "Luyện thi", options: ["Thi tốt nghiệp THPT", "Học sinh giỏi", "AP Biology", "IB Biology", "A-Level Biology"] },
];

const ENGLISH_GROUPS: SpecialtyGroup[] = [
    { title: "Kỹ năng", options: ["Ngữ pháp", "Từ vựng", "Phát âm", "Nghe (Listening)", "Nói (Speaking)", "Đọc (Reading)", "Viết (Writing)", "Giao tiếp thực tế"] },
    { title: "Chứng chỉ quốc tế", options: ["IELTS", "TOEFL", "TOEIC", "SAT English", "Cambridge (KET/PET/FCE)", "APTIS"] },
];

const OTHER_LANGUAGE_GROUPS: SpecialtyGroup[] = [
    { title: "Kỹ năng", options: ["Ngữ pháp", "Từ vựng", "Phát âm", "Nghe", "Nói", "Đọc", "Viết", "Giao tiếp thực tế"] },
    { title: "Chứng chỉ", options: ["HSK", "JLPT", "TOPIK", "DELF"] },
];

const LITERATURE_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Đọc hiểu", "Nghị luận văn học", "Nghị luận xã hội", "Cảm thụ văn học"] },
    { title: "Luyện thi", options: ["Thi vào lớp 10", "Thi tốt nghiệp THPT", "Học sinh giỏi"] },
];

const HISTORY_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Lịch sử Việt Nam", "Lịch sử thế giới"] },
    { title: "Luyện thi", options: ["Thi tốt nghiệp THPT", "Học sinh giỏi"] },
];

const GEOGRAPHY_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Địa lý tự nhiên", "Địa lý kinh tế - xã hội", "Kỹ năng biểu đồ"] },
    { title: "Luyện thi", options: ["Thi tốt nghiệp THPT", "Học sinh giỏi"] },
];

const IT_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Scratch (lập trình trẻ em)", "Python", "Cấu trúc dữ liệu & giải thuật", "Web Development", "Tin học văn phòng"] },
    { title: "Chứng chỉ", options: ["MOS", "ICDL"] },
];

const ART_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Kỹ thuật cơ bản", "Sáng tác", "Biểu diễn"] },
    { title: "Định hướng", options: ["Thi năng khiếu", "Luyện thi trường chuyên"] },
];

const GENERIC_GROUPS: SpecialtyGroup[] = [
    { title: "Chủ đề", options: ["Củng cố kiến thức nền", "Luyện đề, làm bài tập"] },
];

/** Trả về nhóm chuyên đề phù hợp với môn đã chọn — dùng cho cả preview lẫn modal đầy đủ. */
export function getSpecialtyGroupsForSubject(subjectName: string | null): SpecialtyGroup[] {
    if (!subjectName) return GENERIC_GROUPS;
    const name = subjectName.toLowerCase();

    if (name.includes("toán") || name.includes("math")) return MATH_GROUPS;
    if (name.includes("vật lý") || name.includes("physics")) return PHYSICS_GROUPS;
    if (name.includes("hóa") || name.includes("hoá") || name.includes("chemistry")) return CHEMISTRY_GROUPS;
    if (name.includes("sinh học") || name.includes("biology")) return BIOLOGY_GROUPS;
    if (name.includes("tiếng anh") || name.includes("english") || name.includes("ielts") || name.includes("toeic") || name.includes("toefl") || name.includes("sat")) {
        return ENGLISH_GROUPS;
    }
    if (name.includes("tiếng pháp") || name.includes("tiếng nhật") || name.includes("tiếng hàn") || name.includes("tiếng trung")) {
        return OTHER_LANGUAGE_GROUPS;
    }
    if (name.includes("ngữ văn") || name.includes("văn học")) return LITERATURE_GROUPS;
    if (name.includes("lịch sử")) return HISTORY_GROUPS;
    if (name.includes("địa lý")) return GEOGRAPHY_GROUPS;
    if (name.includes("tin học") || name.includes("lập trình") || name.includes("programming")) return IT_GROUPS;
    if (name.includes("âm nhạc") || name.includes("mỹ thuật") || name.includes("hội họa") || name.includes("vẽ")) return ART_GROUPS;

    return GENERIC_GROUPS;
}

/** Rút gọn ~5 mục đầu (theo thứ tự nhóm) để hiện inline trên bước wizard — bấm "Xem tất cả" mới mở modal đủ. */
export function getSpecialtyPreview(groups: SpecialtyGroup[], count = 5): string[] {
    const flat = groups.flatMap((g) => g.options);
    return flat.slice(0, count);
}
