import { useEffect, useRef, useState } from 'react';
import { analyzeFrame, initEmotionEngine, type FrameAnalysis } from '../LiveSession/emotion/emotionEngine';
import { AlertEngine, type EngagementAlert } from '../LiveSession/emotion/alertEngine';

/**
 * Trang TEST độc lập cho engine cảm xúc / độ tập trung — KHÔNG cần lớp học, Agora, backend.
 * Truy cập: /classroom/:id/test-emotion (id chỉ để cho vui, không dùng).
 *
 * Mở camera trực tiếp của bạn → chạy emotionEngine mỗi ~2s → hiện realtime:
 *   - mặt phát hiện, cảm xúc trội, điểm tập trung, buồn ngủ, phân bố 8 cảm xúc
 *   - log cảnh báo từ AlertEngine (che mặt >10s, nhắm mắt, mất tập trung...)
 * Toàn bộ chạy CỤC BỘ trong trình duyệt — không gửi gì đi đâu.
 */
const CAPTURE_INTERVAL_MS = 2000;

const EMO_LABEL: Record<string, string> = {
  neutral: 'Bình thường',
  happy: 'Vui',
  surprise: 'Ngạc nhiên',
  fear: 'Sợ',
  sad: 'Buồn',
  disgust: 'Ghê tởm',
  angry: 'Giận',
  contempt: 'Khinh',
  drowsy: 'Buồn ngủ 😴',
  unknown: 'Không rõ',
};

const EmotionTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const alertEngineRef = useRef<AlertEngine>(new AlertEngine());

  const [status, setStatus] = useState('Đang khởi tạo…');
  const [analysis, setAnalysis] = useState<FrameAnalysis | null>(null);
  const [alerts, setAlerts] = useState<Array<{ at: string; alert: EngagementAlert }>>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      try {
        setStatus('Đang xin quyền camera…');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        setStatus('Đang tải model (lần đầu có thể lâu ~vài giây)…');
        await initEmotionEngine();
        if (cancelled) return;

        setStatus('Đang chạy — nhìn vào camera, thử che mặt / nhắm mắt / cười…');
        setRunning(true);

        const tick = async () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas) return;
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) return;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);

          let result: FrameAnalysis;
          try {
            result = await analyzeFrame(canvas, w, h);
          } catch (e) {
            setStatus('Lỗi phân tích frame: ' + String(e));
            return;
          }
          if (cancelled) return;
          setAnalysis(result);

          const fired = alertEngineRef.current.process(result);
          if (fired.length) {
            const at = new Date().toLocaleTimeString('vi-VN');
            setAlerts((prev) => [...fired.map((alert) => ({ at, alert })), ...prev].slice(0, 20));
          }
        };

        timer = setInterval(() => void tick(), CAPTURE_INTERVAL_MS);
      } catch (e) {
        setStatus('Không mở được camera: ' + String(e));
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const scores = analysis?.scores ?? {};
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const engagementPct = analysis ? Math.round(analysis.engagementScore * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>🧪 Test Engine Cảm xúc / Độ tập trung</h1>
      <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>
        Chạy cục bộ trong trình duyệt — không cần lớp học, không gửi ảnh đi đâu. {status}
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Camera */}
        <div style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: 480, maxWidth: '100%', borderRadius: 12, background: '#000', transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {analysis && (
            <div
              style={{
                position: 'absolute', top: 12, left: 12, padding: '6px 12px', borderRadius: 8,
                background: analysis.faceDetected ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)',
                fontWeight: 600, fontSize: 14,
              }}
            >
              {analysis.faceDetected ? '✓ Thấy mặt' : '✗ Không thấy mặt'}
            </div>
          )}
        </div>

        {/* Kết quả */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={card}>
              <div style={cardLabel}>Cảm xúc</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {analysis ? EMO_LABEL[analysis.emotion] ?? analysis.emotion : '—'}
              </div>
            </div>
            <div style={card}>
              <div style={cardLabel}>Độ tập trung</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: engagementPct >= 50 ? '#34d399' : engagementPct >= 30 ? '#fbbf24' : '#f87171' }}>
                {analysis ? `${engagementPct}%` : '—'}
              </div>
            </div>
            <div style={card}>
              <div style={cardLabel}>Buồn ngủ</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{analysis ? (analysis.drowsy ? 'Có 😴' : 'Không') : '—'}</div>
            </div>
          </div>

          {/* Phân bố cảm xúc */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...cardLabel, marginBottom: 8 }}>Phân bố 8 cảm xúc</div>
            {sortedScores.map(([emo, val]) => (
              <div key={emo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 90, fontSize: 13, color: '#94a3b8' }}>{EMO_LABEL[emo] ?? emo}</div>
                <div style={{ flex: 1, height: 14, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(val * 100)}%`, height: '100%', background: '#3b82f6' }} />
                </div>
                <div style={{ width: 44, textAlign: 'right', fontSize: 12, color: '#cbd5e1' }}>{Math.round(val * 100)}%</div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div>
            <div style={{ ...cardLabel, marginBottom: 8 }}>Cảnh báo ({alerts.length})</div>
            {alerts.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>Chưa có. Thử che mặt &gt;10s, nhắm mắt, hoặc nhìn đi chỗ khác.</div>}
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>{a.at}</span>
                <span style={{ color: a.alert.level === 'HIGH' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>[{a.alert.level}]</span>
                <span>{a.alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!running && <p style={{ marginTop: 16, color: '#fbbf24' }}>⏳ {status}</p>}
    </div>
  );
};

const card: React.CSSProperties = {
  background: '#1e293b', borderRadius: 10, padding: '12px 16px', minWidth: 100, flex: '0 0 auto',
};
const cardLabel: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginBottom: 4 };

export default EmotionTest;
