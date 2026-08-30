import { useEffect, useState } from 'react';

import styles from '../styles.module.css';

/**
 * Phải khớp với `AbandonedSessionService.LobbyPresenceMinimumMinutes` ở backend. Dưới ngưỡng này
 * một lượt vào phòng chờ không được tính là "đã có mặt" khi hệ thống rà lại buổi học bị bỏ quên —
 * mở ra liếc vài giây rồi đóng tạo ra một dòng dữ liệu y hệt một lượt chờ thật.
 */
const ATTENDANCE_MINUTES = 3;
const ATTENDANCE_SECONDS = ATTENDANCE_MINUTES * 60;

const formatClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

type Props = {
  /** Người mà mình đang chờ — "gia sư" hoặc "học sinh". */
  waitingForLabel: string;
};

/**
 * Đồng hồ ghi nhận có mặt, CHỈ hiện khi đang chờ một mình.
 *
 * Trước đây người chờ không có cách nào biết rằng ở lại là có lợi cho mình, nên họ đóng tab sau
 * vài chục giây và tự đánh mất bằng chứng để khiếu nại sau này. Hiện con số ra biến một quy tắc
 * ẩn thành thứ họ hành động được.
 *
 * Lưu ý: đây KHÔNG phải rào chặn vào lớp. Khi phía còn lại xuất hiện, server bắn `sessionReady`
 * ngay lập tức và component này biến mất — không ai phải chờ đủ 3 phút mới được vào học.
 */
export default function AttendanceTimer({ waitingForLabel }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Mốc bắt đầu nằm trong effect (không phải state khởi tạo) để đồng hồ chạy lại từ đầu mỗi
    // lần component được mount lại — tức là mỗi lượt chờ mới, khớp với cách server đếm từng lượt.
    const startedAt = Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));

    // setInterval bị trình duyệt bóp lại khi tab chạy nền, nên đừng cộng dồn theo số nhịp —
    // luôn tính lại từ mốc thật để con số vẫn đúng sau khi người dùng quay lại tab.
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const recorded = elapsed >= ATTENDANCE_SECONDS;
  const remaining = Math.max(0, ATTENDANCE_SECONDS - elapsed);

  return (
    <div
      className={`${styles.attendanceTimer} ${recorded ? styles.attendanceTimerDone : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.attendanceTimerClock}>{formatClock(elapsed)}</span>
      <span className={styles.attendanceTimerText}>
        {recorded ? (
          <>
            <strong>Đã ghi nhận bạn có mặt.</strong> Hệ thống đã lưu lại việc bạn chờ ở đây, kể cả khi{' '}
            {waitingForLabel} không vào lớp.
          </>
        ) : (
          <>
            Hãy ở lại thêm <strong>{formatClock(remaining)}</strong> để hệ thống ghi nhận bạn đã có mặt.
            Nếu {waitingForLabel} không vào lớp, đây là bằng chứng cho khiếu nại của bạn.
          </>
        )}
      </span>
    </div>
  );
}
