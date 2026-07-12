import React from 'react';
import dayjs from 'dayjs';
import styles from '../../../styles/pages/tutor-portal-homework.module.css';

export interface HomeworkItem {
    classSessionId: number;
    scheduledStart: string;
    subjectName?: string;
    homework: string;
}

interface HomeworkTabProps {
    items: HomeworkItem[];
}

/**
 * BE không có domain "Assignment" riêng (không có due date/điểm/trạng thái
 * nộp) — chỉ có field tự do `ClassSessionDetailResponse.Homework`, được gia sư
 * điền khi nộp báo cáo buổi học (xem tab "Buổi học" → nút "Nộp báo cáo").
 * Tab này chỉ hiển thị lại field đó (đã tổng hợp sẵn ở component cha).
 */
const HomeworkTab: React.FC<HomeworkTabProps> = ({ items }) => {
    const homeworkItems = [...items].sort(
        (a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime(),
    );

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
                    {homeworkItems.map((item) => (
                        <div key={item.classSessionId} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>
                                    Buổi {dayjs(item.scheduledStart).format('DD/MM/YYYY')}
                                    {item.subjectName && ` · ${item.subjectName}`}
                                </span>
                            </div>
                            <p className={styles.cardDesc}>{item.homework}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomeworkTab;
