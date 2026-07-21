import { useEffect, useRef } from 'react';
import type { ICameraVideoTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { analyzeFrame, initEmotionEngine } from './emotionEngine';
import { AlertEngine } from './alertEngine';
import {
  postEngagementSamples,
  postEngagementAlert,
  type EngagementSampleItem,
} from '../../../services/emotion.service';

/** Chu kỳ lấy & phân tích 1 frame (ms). */
const CAPTURE_INTERVAL_MS = 3000;
/** Chu kỳ gom mẫu điểm rồi gửi lên BE (ms). */
const FLUSH_INTERVAL_MS = 20000;

interface UseEmotionMonitorParams {
  /** True khi được phép chạy: role=student + gia sư đã bật theo dõi. */
  enabled: boolean;
  classSessionId: number | null;
  /** Camera track cục bộ của học viên (từ useAgoraCall). */
  localVideoTrack: ICameraVideoTrack | ILocalVideoTrack | null;
  /**
   * Camera đang bật hay không. Tắt cam → dừng tracking (không báo "rời màn hình" oan);
   * bật lại → gắn lại MediaStreamTrack MỚI (Agora tạo track mới sau setEnabled(true)).
   */
  camOn: boolean;
  /** Gọi khi học viên tắt/bật camera để gia sư biết (thay vì báo mất mặt). */
  onCameraStateChange?: (camOn: boolean) => void;
  /**
   * Bắn cảnh báo tới gia sư qua RTM (hiển thị tức thì). Backend vẫn được gọi song song để lưu.
   * Tách 2 đường: RTM lo hiển thị realtime, backend lo lưu trữ/báo cáo.
   */
  onAlert?: (alert: { reason: string; level?: string; message: string }) => void;
}

/**
 * Theo dõi cảm xúc / độ tập trung của HỌC VIÊN, chạy hoàn toàn cục bộ trên máy học viên.
 *
 * Mỗi CAPTURE_INTERVAL_MS: vẽ camera track ra canvas ẩn → analyzeFrame (MediaPipe + FER+ trong
 * trình duyệt) → AlertEngine. Khi có cảnh báo → POST alert (BE đẩy toast tới gia sư). Định kỳ
 * FLUSH_INTERVAL_MS: gửi lô mẫu điểm đã tổng hợp lên BE để lưu.
 *
 * ẢNH KHÔNG RỜI MÁY — chỉ điểm số/nhãn được gửi đi.
 */
export const useEmotionMonitor = ({
  enabled,
  classSessionId,
  localVideoTrack,
  camOn,
  onCameraStateChange,
  onAlert,
}: UseEmotionMonitorParams): void => {
  const alertEngineRef = useRef<AlertEngine | null>(null);
  const pendingSamplesRef = useRef<EngagementSampleItem[]>([]);
  const camStateRef = useRef(camOn);
  // Giữ callback trong ref để effect không phải re-run mỗi lần parent render lại.
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  // Báo cho gia sư khi học viên tắt/bật camera (chỉ khi đang theo dõi) — thay vì để engine
  // hiểu nhầm thành "rời khỏi màn hình".
  useEffect(() => {
    if (!enabled) {
      camStateRef.current = camOn;
      return;
    }
    if (camStateRef.current !== camOn) {
      camStateRef.current = camOn;
      onCameraStateChange?.(camOn);
    }
  }, [camOn, enabled, onCameraStateChange]);

  useEffect(() => {
    // Camera tắt → không chạy engine (tránh báo "rời màn hình" oan). Effect re-run khi bật lại,
    // lúc đó lấy MediaStreamTrack MỚI mà Agora vừa tạo.
    if (!enabled || !classSessionId || !localVideoTrack || !camOn) return;

    let cancelled = false;
    let captureTimer: ReturnType<typeof setInterval> | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    // Canvas + video ẩn để lấy frame từ MediaStreamTrack của Agora.
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement('canvas');

    alertEngineRef.current = new AlertEngine();
    pendingSamplesRef.current = [];

    const setup = async () => {
      try {
        const mediaTrack = localVideoTrack.getMediaStreamTrack();
        video.srcObject = new MediaStream([mediaTrack]);
        await video.play();
        // Nạp model trước (tải 1 lần) để lần capture đầu không bị kẹt.
        await initEmotionEngine();
      } catch {
        return; // không lấy được track / model → im lặng bỏ qua
      }
      if (cancelled) return;

      const tick = async () => {
        if (cancelled) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);

        let result;
        try {
          result = await analyzeFrame(canvas, w, h);
        } catch {
          return;
        }
        if (cancelled) return;

        // Chỉ gom mẫu khi thấy mặt (mẫu "no face" chỉ dùng cho alert away, không lưu điểm).
        if (result.faceDetected) {
          pendingSamplesRef.current.push({
            emotion: result.emotion,
            engagementScore: result.engagementScore,
            drowsy: result.drowsy,
          });
        }

        const alerts = alertEngineRef.current?.process(result) ?? [];
        for (const alert of alerts) {
          // Đường 1 — RTM: gia sư thấy toast tức thì (không phụ thuộc backend).
          onAlertRef.current?.({
            reason: alert.reason,
            level: alert.level,
            message: alert.message,
          });
          // Đường 2 — backend: lưu để làm báo cáo sau buổi.
          void postEngagementAlert(classSessionId, {
            reason: alert.reason,
            level: alert.level,
            message: alert.message,
            engagementScore: result.engagementScore,
          });
        }
      };

      /**
       * Gộp các frame trong cửa sổ thành MỘT mẫu tóm tắt rồi mới gửi — thay vì ghi từng frame.
       * 1 frame/3s ghi thô = ~1.200 dòng/buổi 60 phút; gộp theo cửa sổ 20s còn ~180 dòng (giảm ~85%)
       * mà vẫn đủ mịn để vẽ biểu đồ tập trung theo thời gian.
       */
      const flush = () => {
        const samples = pendingSamplesRef.current;
        if (samples.length === 0) return;
        pendingSamplesRef.current = [];

        const avg = samples.reduce((s, x) => s + x.engagementScore, 0) / samples.length;
        // Cảm xúc đại diện = nhãn xuất hiện nhiều nhất trong cửa sổ.
        const counts = new Map<string, number>();
        for (const s of samples) {
          const key = s.emotion ?? 'unknown';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        let dominant = 'unknown';
        let best = -1;
        for (const [emo, c] of counts) {
          if (c > best) {
            best = c;
            dominant = emo;
          }
        }

        void postEngagementSamples(classSessionId, [
          {
            emotion: dominant,
            engagementScore: Math.round(avg * 10000) / 10000,
            // Đánh dấu buồn ngủ nếu chiếm đa số cửa sổ (tránh 1 cái chớp mắt thành "buồn ngủ").
            drowsy: samples.filter((s) => s.drowsy).length > samples.length / 2,
          },
        ]);
      };

      captureTimer = setInterval(() => void tick(), CAPTURE_INTERVAL_MS);
      flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    };

    void setup();

    return () => {
      cancelled = true;
      if (captureTimer) clearInterval(captureTimer);
      if (flushTimer) clearInterval(flushTimer);
      // Gửi nốt mẫu còn lại trước khi rời.
      const samples = pendingSamplesRef.current;
      if (samples.length > 0) {
        pendingSamplesRef.current = [];
        void postEngagementSamples(classSessionId, samples);
      }
      video.srcObject = null;
    };
    // camOn nằm trong deps: tắt cam → cleanup (dừng engine); bật lại → chạy lại setup() và lấy
    // MediaStreamTrack mới của Agora (track cũ đã chết sau setEnabled(false)).
  }, [enabled, classSessionId, localVideoTrack, camOn]);
};
