import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Wifi, type LucideIcon } from 'lucide-react';
import { getCurrentUserRole } from '../../services/auth.service';
import { useSessionLobby, useDevicePreview, DevicePreview, type LobbyPhase } from './lobby-components';
import styles from './styles.module.css';

/** "học sinh" → "Học sinh" */
const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Format chuỗi ISO của BE thành "dd/MM/yyyy HH:mm" mà KHÔNG qua Date object,
 * tránh bị lệch múi giờ (BE trả giờ VN sẵn trong chuỗi).
 */
const formatSchedule = (isoStart?: string | null, isoEnd?: string | null): string => {
  if (!isoStart) return '';
  const m = isoStart.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return isoStart;
  const [, y, mo, d, h, mi] = m;
  let text = `${d}/${mo}/${y} · ${h}:${mi}`;
  const endMatch = isoEnd?.match(/T(\d{2}):(\d{2})/);
  if (endMatch) text += ` – ${endMatch[1]}:${endMatch[2]}`;
  return text;
};

const LobbyLoader = ({ icon: Icon }: { icon: LucideIcon }) => (
  <div className={styles.spinnerWrap} aria-hidden="true">
    <span className={styles.spinnerGlow} />
    <span className={styles.spinnerTrack} />
    <span className={styles.spinnerOrbit}>
      <span className={styles.spinnerOrbitDot} />
    </span>
    <span className={styles.spinnerIcon}>
      <Icon size={26} strokeWidth={1.8} />
    </span>
  </div>
);

/**
 * Phòng chờ (lobby) trước khi vào lớp học online.
 *
 * Người vào trước chờ ở đây; khi cả gia sư và học viên cùng có mặt, server phát
 * `sessionReady` và trang tự chuyển sang phòng học (/live-session/:id). Buổi đang
 * diễn ra (rớt mạng vào lại) sẽ được cho qua ngay không phải chờ.
 *
 * `?mock=1` — dựng UI tại chỗ, không kết nối hub thật (duyệt layout không cần BE).
 */
const SessionLobby = () => {
  const { classSessionId } = useParams<{ classSessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMock = searchParams.get('mock') === '1';

  const sessionIdNum = classSessionId ? parseInt(classSessionId, 10) : null;

  const role = (getCurrentUserRole() || '').toLowerCase();
  const isTutor = role === 'tutor';
  /** Phía mình chờ ai: gia sư chờ học sinh, học sinh/phụ huynh chờ gia sư. */
  const waitingForLabel = isTutor ? 'học sinh' : 'gia sư';

  const {
    phase: realPhase,
    info: realInfo,
    waitingState: realWaitingState,
    errorMessage,
    retry,
  } = useSessionLobby(isMock ? null : sessionIdNum);

  const phase: LobbyPhase = isMock ? 'waiting' : realPhase;
  const info = isMock
    ? {
        classSessionId: 0,
        tutorName: 'Gia sư Demo',
        studentName: 'Học sinh Demo',
        scheduledStart: '2026-07-18T19:00:00',
        scheduledEnd: '2026-07-18T20:30:00',
      }
    : realInfo;
  const waitingState = isMock
    ? { classSessionId: 0, tutorWaiting: isTutor, studentWaiting: !isTutor }
    : realWaitingState;

  // Xem trước camera/micro khi đang ở bước chuẩn bị (chờ / đã đủ người).
  const preview = useDevicePreview(phase === 'waiting' || phase === 'ready');

  // Tên & chữ cái đầu của chính mình — để hiển thị avatar khi tắt camera.
  const myName = (isTutor ? info?.tutorName : info?.studentName) || (isTutor ? 'Gia sư' : 'Học sinh');
  const myInitial = myName.trim().charAt(0).toUpperCase() || '?';

  // Chỉ cho vào lớp khi đã đủ người (hoặc mock để duyệt layout). Không còn auto-nhảy —
  // người dùng tự bấm xác nhận sau khi chỉnh camera/micro.
  const canEnter = phase === 'ready' || isMock;

  const handleEnter = () => {
    if (sessionIdNum == null || !canEnter) return;
    // Nhả camera/micro của preview trước, để Agora trong phòng học chiếm lại được thiết bị.
    preview.stop();
    const target = isMock ? `/live-session/${sessionIdNum}?mock=1` : `/live-session/${sessionIdNum}`;
    // replace:true để lobby không nằm trong history — back từ phòng học sẽ về trang trước lobby.
    navigate(target, {
      replace: true,
      state: { fromLobby: true, micOn: preview.micOn, camOn: preview.camOn },
    });
  };

  const handleBack = () => {
    preview.stop();
    navigate(-1);
  };

  const renderBody = () => {
    switch (phase) {
      case 'connecting':
        return (
          <>
            <LobbyLoader icon={Wifi} />
            <h1 className={`${styles.title} ${styles.waitingDots}`}>Đang kết nối phòng chờ</h1>
            <p className={styles.subtitle}>Vui lòng đợi trong giây lát.</p>
          </>
        );

      case 'waiting':
      case 'ready': {
        const isReady = phase === 'ready';
        return (
          <>
            <DevicePreview
              videoRef={preview.videoRef}
              camOn={preview.camOn}
              micOn={preview.micOn}
              streaming={preview.streaming}
              error={preview.error}
              myInitial={myInitial}
              onToggleCam={preview.toggleCam}
              onToggleMic={preview.toggleMic}
            />

            <h1 className={styles.title}>Chuẩn bị vào lớp</h1>
            <p className={styles.subtitle}>
              {isReady
                ? `${capitalize(waitingForLabel)} đã có mặt. Kiểm tra camera/micro rồi vào lớp nhé.`
                : `Kiểm tra camera và micro trong lúc chờ ${waitingForLabel} vào lớp.`}
            </p>

            {info && (
              <div className={styles.sessionMeta}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Thời gian</span>
                  <span className={styles.metaValue}>{formatSchedule(info.scheduledStart, info.scheduledEnd)}</span>
                </div>
              </div>
            )}

            <div className={styles.presenceRow}>
              <span className={`${styles.presenceChip} ${waitingState?.tutorWaiting ? styles.presenceChipActive : ''}`}>
                <span className={styles.presenceDot} />
                <span className={styles.chipName}>Gia sư · {info?.tutorName ?? 'Gia sư'}</span>
              </span>
              <span
                className={`${styles.presenceChip} ${waitingState?.studentWaiting ? styles.presenceChipActive : ''}`}
              >
                <span className={styles.presenceDot} />
                <span className={styles.chipName}>Học sinh · {info?.studentName ?? 'Học sinh'}</span>
              </span>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                Quay lại
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleEnter} disabled={!canEnter}>
                {canEnter ? 'Vào lớp học' : `Đang chờ ${waitingForLabel}…`}
              </button>
            </div>
          </>
        );
      }

      case 'ended':
        return (
          <>
            <div className={styles.stateIcon}>🏁</div>
            <h1 className={styles.title}>Buổi học đã kết thúc</h1>
            <p className={styles.subtitle}>Phòng học của buổi này đã đóng. Hẹn gặp lại ở buổi học tiếp theo!</p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={handleBack}>
                Quay lại
              </button>
            </div>
          </>
        );

      case 'unavailable':
        return (
          <>
            <div className={styles.stateIcon}>🚪</div>
            <h1 className={styles.title}>Phòng học không khả dụng</h1>
            <p className={styles.subtitle}>Buổi học này hiện không thể tham gia. Vui lòng kiểm tra lại lịch học.</p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={handleBack}>
                Quay lại
              </button>
            </div>
          </>
        );

      case 'blocked-payment':
        return (
          <>
            <div className={styles.stateIcon}>💳</div>
            <h1 className={styles.title}>Chưa thể vào lớp</h1>
            <p className={styles.subtitle}>
              Phụ huynh chưa thanh toán các buổi học còn lại. Vui lòng hoàn tất thanh toán trước khi vào buổi học tiếp
              theo.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={handleBack}>
                Quay lại
              </button>
            </div>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <div className={styles.stateIcon}>⚠️</div>
            <h1 className={styles.title}>Không thể vào phòng chờ</h1>
            <p className={styles.subtitle}>{errorMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                Quay lại
              </button>
              <button type="button" className={styles.btnPrimary} onClick={retry}>
                Thử lại
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>{renderBody()}</div>
    </div>
  );
};

export default SessionLobby;
