import styles from "../styles.module.css";
import { noteIconWrap, noteText } from "./styles";

const AcademicInfoNote: React.FC = () => (
    <div className={styles.noteCard}>
        <div style={noteIconWrap}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#6366f1" strokeWidth="1.5" />
                <path d="M8 7v4M8 5v-.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </div>
        <p style={noteText}>
            Thông tin học tập (trường học, lớp, mục tiêu học tập) được quản lý bởi phụ huynh.
            Nếu cần cập nhật, hãy nhờ phụ huynh chỉnh sửa trong trang quản lý học sinh.
        </p>
    </div>
);

export default AcademicInfoNote;
