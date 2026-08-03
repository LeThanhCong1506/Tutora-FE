export type Lang = "vi" | "en";

// Toàn bộ nội dung wizard giữ tiếng Việt làm CHUỖI GỐC (khoá logic, vd focus.includes(f)
// so khớp đúng chuỗi này) — dictionary chỉ dịch NGƯỢC LẠI để hiển thị/gộp text khi lang
// = "en". Thiếu bản dịch thì tự fallback về tiếng Việt (không vỡ UI), nên có thể bổ sung
// dần mà không sợ crash.
const DICTIONARY: Record<string, string> = {
    // Subjects (dữ liệu thật từ GET /api/subjects — không có field tên tiếng Anh ở BE)
    "Toán Học": "Math", "Tiếng Anh": "English", "Vật Lý": "Physics", "Hóa Học": "Chemistry",
    "Ngữ văn": "Literature", "Sinh Học": "Biology", "Lịch Sử": "History", "Địa Lý": "Geography",
    "Tin Học": "IT / Computer Science",

    // Grades (GET /api/grade-levels)
    "Lớp 1": "Grade 1", "Lớp 2": "Grade 2", "Lớp 3": "Grade 3", "Lớp 4": "Grade 4",
    "Lớp 5": "Grade 5", "Lớp 6": "Grade 6", "Lớp 7": "Grade 7", "Lớp 8": "Grade 8",
    "Lớp 9": "Grade 9", "Lớp 10": "Grade 10", "Lớp 11": "Grade 11", "Lớp 12": "Grade 12",

    // Step titles
    "Bé cần học môn gì?": "What subject does your child need?",
    "Bé đang học lớp mấy?": "What grade is your child in?",
    "Lý do học lần này là gì?": "What's the reason for learning this time?",
    "Trình độ hiện tại của bé thế nào?": "What's your child's current level?",
    "Bé rảnh học vào lúc nào?": "When is your child available to study?",
    "Ngân sách mong muốn?": "What's your budget?",
    "Hình thức học?": "Learning format?",
    "Khu vực học tại nhà?": "Which area for in-person lessons?",
    "Có ưu tiên giới tính gia sư không?": "Any tutor gender preference?",
    "Bạn muốn gia sư tập trung vào điều gì?": "What should the tutor focus on?",
    "Sắp tới có cần tìm thêm gia sư môn khác không?": "Will you need a tutor for another subject soon?",
    "Còn điều gì khác nữa không?": "Anything else?",
    "Xác nhận thông tin": "Confirm your details",

    // UI chrome
    "Tiếp tục": "Continue",
    "Bỏ qua": "Skip",
    "Xem tất cả": "Show all",
    "Quay lại": "Back",
    "Đóng": "Close",
    "Không yêu cầu": "No preference",
    "Đang tải danh sách môn học...": "Loading subjects...",
    "Đang tải danh sách lớp...": "Loading grades...",
    "Chọn 1 hoặc nhiều — có thể bỏ qua nếu chưa rõ.": "Pick one or more — feel free to skip if unsure.",
    "Có thể bỏ qua nếu lịch học linh hoạt.": "Feel free to skip if your schedule is flexible.",
    "Có thể bỏ qua nếu chưa có nhu cầu.": "Feel free to skip if not needed yet.",
    "Ngày": "Days",
    "Buổi": "Time of day",
    "Có nhu cầu gì thêm mà chúng tôi có thể giúp bạn tìm gia sư phù hợp nhất không?":
        "Anything else that could help us find the best tutor match for you?",
    "VD: gia sư vui tính, có kinh nghiệm dạy trẻ tăng động, ưu tiên người miền Nam...":
        "E.g. a fun tutor, experienced with ADHD kids, prefers a Southern-Vietnamese tutor...",
    "Tìm gia sư": "Find a tutor",
    "Đang tìm gia sư phù hợp cho bé...": "Finding the best tutor for your child...",
    "Đã gửi yêu cầu!": "Request sent!",
    "Quay lại cuộc trò chuyện Zalo để xem gia sư phù hợp nhé.": "Head back to the Zalo chat to see your matched tutors.",
    "Không tìm thấy phiên làm việc — anh/chị mở lại từ tin nhắn Zalo giúp em nhé.":
        "Session not found — please reopen this from the Zalo message.",
    "Gửi chưa thành công, anh/chị thử lại giúp em nhé.": "Something went wrong — please try again.",

    // Results list (TutorResultsList.tsx)
    "Chỉnh sửa tiêu chí": "Edit criteria",
    "Gia sư phù hợp cho bé": "Tutors matched for your child",
    "Quay lại Zalo bất cứ lúc nào để hỏi thêm hoặc đặt lịch.":
        "Head back to Zalo anytime to ask more or book a session.",
    "đánh giá": "reviews",
    "Tìm gia sư khác": "Find other tutors",
    "Đang tìm...": "Finding...",
    "Hiện chưa có thêm gia sư khác phù hợp — anh/chị nhắn Zalo để em hỗ trợ thêm nhé.":
        "No more matching tutors right now — message us on Zalo and we'll help further.",
    "Không tìm được kết quả — anh/chị thử lại giúp em nhé.": "Couldn't load results — please try again.",

    // Goal options
    "Theo chương trình ở trường": "Following the school curriculum",
    "Ôn thi, kiểm tra": "Exam / test prep",
    "Mất gốc, cần củng cố lại": "Rebuilding weak foundations",
    "Nâng cao, bồi dưỡng giỏi": "Advanced / gifted-level enrichment",
    "Khác": "Other",
    "Nhập lý do khác...": "Enter your reason...",

    // Level options
    "Mới bắt đầu, chưa có nền tảng": "Just starting, no foundation yet",
    "Nắm kiến thức cơ bản": "Knows the basics",
    "Đã có một số kinh nghiệm": "Has some experience",
    "Nền tảng vững, muốn nâng cao": "Solid foundation, wants to go further",

    // Teaching mode
    "Online": "Online",
    "Tại nhà": "In person",
    "Không quan trọng": "No preference",

    // Gender
    "Gia sư nữ": "Female tutor",
    "Gia sư nam": "Male tutor",

    // Budget (utils/budgetRange.ts)
    "Mọi giá": "Any budget",
    "Dưới 100,000đ/giờ": "Under 100,000₫/hour",
    "100,000đ - 200,000đ/giờ": "100,000₫ - 200,000₫/hour",
    "Trên 200,000đ/giờ": "Over 200,000₫/hour",

    // Days
    "Thứ 2": "Mon", "Thứ 3": "Tue", "Thứ 4": "Wed", "Thứ 5": "Thu",
    "Thứ 6": "Fri", "Thứ 7": "Sat", "Chủ nhật": "Sun",

    // Times of day
    "Buổi sáng": "Morning", "Buổi chiều": "Afternoon", "Buổi tối": "Evening",

    // Specialty modal chrome
    "Chọn trọng tâm": "Select focus areas",
    "Bỏ chọn tất cả": "Clear all",
    "Tìm trọng tâm...": "Search focus areas...",
    "Không tìm thấy kết quả phù hợp.": "No matching results.",
    "Áp dụng": "Apply",

    // Specialty group titles
    "Chủ đề": "Topics",
    "Luyện thi": "Exam prep",
    "Kỹ năng": "Skills",
    "Chứng chỉ quốc tế": "International certificates",
    "Chứng chỉ": "Certificates",
    "Định hướng": "Direction",

    // Math
    "Số học": "Arithmetic", "Đại số": "Algebra", "Hình học": "Geometry",
    "Lượng giác": "Trigonometry", "Giải tích": "Calculus", "Xác suất - Thống kê": "Probability & Statistics",
    "Toán tư duy (tiểu học)": "Math for kids (primary)",
    "Thi vào lớp 10": "High school entrance exam", "Thi tốt nghiệp THPT": "National graduation exam",
    "Học sinh giỏi": "Gifted student exam", "SAT Math": "SAT Math", "ACT Math": "ACT Math",
    "IB Math": "IB Math", "A-Level Math": "A-Level Math", "IGCSE/GCSE Math": "IGCSE/GCSE Math",
    "AP Calculus": "AP Calculus", "GMAT Quantitative": "GMAT Quantitative",

    // Physics
    "Cơ học": "Mechanics", "Điện học": "Electricity", "Quang học": "Optics",
    "Nhiệt học": "Thermodynamics", "Vật lý hạt nhân": "Nuclear physics",
    "SAT Physics": "SAT Physics", "AP Physics": "AP Physics", "A-Level Physics": "A-Level Physics", "IB Physics": "IB Physics",

    // Chemistry
    "Hóa vô cơ": "Inorganic chemistry", "Hóa hữu cơ": "Organic chemistry",
    "Hóa phân tích": "Analytical chemistry", "Hóa đại cương": "General chemistry",
    "SAT Chemistry": "SAT Chemistry", "AP Chemistry": "AP Chemistry", "A-Level Chemistry": "A-Level Chemistry",

    // Biology
    "Sinh học tế bào": "Cell biology", "Di truyền học": "Genetics",
    "Sinh thái học": "Ecology", "Giải phẫu - Sinh lý": "Anatomy & Physiology",
    "AP Biology": "AP Biology", "IB Biology": "IB Biology", "A-Level Biology": "A-Level Biology",

    // English
    "Ngữ pháp": "Grammar", "Từ vựng": "Vocabulary", "Phát âm": "Pronunciation",
    "Nghe (Listening)": "Listening", "Nói (Speaking)": "Speaking", "Đọc (Reading)": "Reading",
    "Viết (Writing)": "Writing", "Giao tiếp thực tế": "Real-life conversation",
    "IELTS": "IELTS", "TOEFL": "TOEFL", "TOEIC": "TOEIC", "SAT English": "SAT English",
    "Cambridge (KET/PET/FCE)": "Cambridge (KET/PET/FCE)", "APTIS": "APTIS",

    // Other languages
    "Nghe": "Listening", "Nói": "Speaking", "Đọc": "Reading", "Viết": "Writing",
    "HSK": "HSK", "JLPT": "JLPT", "TOPIK": "TOPIK", "DELF": "DELF",

    // Literature
    "Đọc hiểu": "Reading comprehension", "Nghị luận văn học": "Literary essay",
    "Nghị luận xã hội": "Social essay", "Cảm thụ văn học": "Literary appreciation",

    // History / Geography
    "Lịch sử Việt Nam": "Vietnamese history", "Lịch sử thế giới": "World history",
    "Địa lý tự nhiên": "Physical geography", "Địa lý kinh tế - xã hội": "Socio-economic geography",
    "Kỹ năng biểu đồ": "Chart-reading skills",

    // IT
    "Scratch (lập trình trẻ em)": "Scratch (coding for kids)", "Python": "Python",
    "Cấu trúc dữ liệu & giải thuật": "Data structures & algorithms",
    "Web Development": "Web development", "Tin học văn phòng": "Office computing",
    "MOS": "MOS", "ICDL": "ICDL",

    // Art
    "Kỹ thuật cơ bản": "Basic technique", "Sáng tác": "Composition", "Biểu diễn": "Performance",
    "Thi năng khiếu": "Talent entrance exam", "Luyện thi trường chuyên": "Specialized-school exam prep",

    // Generic focus
    "Củng cố kiến thức nền": "Strengthening the fundamentals",
    "Luyện đề, làm bài tập": "Practice tests & exercises",
};

/** Dịch 1 chuỗi tiếng Việt gốc sang tiếng Anh nếu lang="en"; fallback về nguyên văn nếu chưa có bản dịch. */
export function tr(viText: string, lang: Lang): string {
    if (lang === "vi") return viText;
    return DICTIONARY[viText] ?? viText;
}
