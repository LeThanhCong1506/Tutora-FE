import React from 'react';
import dayjs from 'dayjs';
import type { LessonResponse } from '../../../services/lesson.service';
import styles from '../../../styles/pages/tutor-portal-homework.module.css';

interface HomeworkTabProps {
    lessons: LessonResponse[];
}

/**
 * BE không có domain "Assignment" riêng (không có due date/điểm/trạng thái
 * nộp) — chỉ có field tự do `ClassSession.Homework` được gia sư điền khi
 * nộp báo cáo buổi học (xem tab "Buổi học" → nút "Nộp báo cáo"). Tab này chỉ
 * đọc lại field đó, không có form tạo riêng — không cần mock data hay
 * migration DB mới.
 */
const HomeworkTab: React.FC<HomeworkTabProps> = ({ lessons }) => {
    const homeworkItems = [...lessons]
        .filter((l) => !!l.homework)
        .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());

    return (
        <div>
            <div className={styles.toolbar}>
                <div>
                    <h3 className={styles.heading}>Bài tập về nhà</h3>
                    <p className={styles.subheading}>
                        Tổng hợp bài tập đã giao qua báo cáo từng buổi học
                    </p>
                </div>
            </div>

            {homeworkItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📝</div>
                    <h4>Chưa có bài tập nào</h4>
                    <p>Giao bài tập bằng cách điền mục "Bài tập về nhà" khi nộp báo cáo ở tab Buổi học.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {homeworkItems.map((l) => (
                        <div key={l.lessonId} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>
                                    Buổi {dayjs(l.scheduledStart).format('DD/MM/YYYY')}
                                    {l.subject?.subjectName && ` · ${l.subject.subjectName}`}
                                </span>
                            </div>
                            <p className={styles.cardDesc}>{l.homework}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomeworkTab;
