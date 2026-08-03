/**
 * Máy trạng thái cảnh báo độ tập trung — port từ emotion-classroom-service/app/services/alert.py.
 * Chạy CỤC BỘ trên máy học viên: nhận kết quả phân tích từng frame (từ emotionEngine),
 */
import type { FrameAnalysis } from './emotionEngine';

export type AlertLevel = 'HIGH' | 'MED';
export type AlertReason = 'away' | 'drowsy' | 'distracted' | 'stressed';

export interface EngagementAlert {
  level: AlertLevel;
  reason: AlertReason;
  message: string;
}

const WINDOW_SECONDS = 120;
const LOW_ENGAGEMENT_THRESHOLD = 0.3;
const LOW_ENGAGEMENT_DURATION = 15; // giây liên tục mất tập trung mới báo
const AWAY_THRESHOLD = 10; // giây không thấy mặt
const DROWSY_FRAMES = 2; // số frame liên tiếp nhắm mắt mới báo

const nowSec = (): number => Date.now() / 1000;

class StudentState {
  history: Array<[number, FrameAnalysis]> = [];
  lastFaceTime = nowSec();
  awayAlerted = false;
  consecutiveDrowsy = 0;
  lowEngagementSince: number | null = null;

  record(result: FrameAnalysis): void {
    const now = nowSec();
    if (result.faceDetected) {
      this.lastFaceTime = now;
      this.awayAlerted = false;
    }

    if (result.drowsy) this.consecutiveDrowsy += 1;
    else this.consecutiveDrowsy = 0;

    if (result.faceDetected && result.engagementScore < LOW_ENGAGEMENT_THRESHOLD) {
      if (this.lowEngagementSince === null) this.lowEngagementSince = now;
    } else {
      this.lowEngagementSince = null;
    }

    this.history.push([now, result]);
    const cutoff = now - WINDOW_SECONDS;
    while (this.history.length && this.history[0][0] < cutoff) this.history.shift();
  }

  secondsSinceFace(): number {
    return nowSec() - this.lastFaceTime;
  }

  recentEngagementAvg(seconds = 60): number {
    const cutoff = nowSec() - seconds;
    const vals = this.history
      .filter(([t, r]) => t >= cutoff && r.faceDetected)
      .map(([, r]) => r.engagementScore);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
}

export class AlertEngine {
  private state = new StudentState();
  private lastAlert = new Map<AlertReason, number>();

  /** True nếu nên bỏ qua (vừa báo cùng loại gần đây). */
  private throttle(reason: AlertReason, cooldown = 60): boolean {
    const now = nowSec();
    if (now - (this.lastAlert.get(reason) ?? 0) < cooldown) return true;
    this.lastAlert.set(reason, now);
    return false;
  }

  process(result: FrameAnalysis): EngagementAlert[] {
    const state = this.state;
    state.record(result);
    const alerts: EngagementAlert[] = [];

    // 1. Rời màn hình
    if (!result.faceDetected && state.secondsSinceFace() > AWAY_THRESHOLD) {
      if (!state.awayAlerted && !this.throttle('away', 30)) {
        state.awayAlerted = true;
        alerts.push({ level: 'HIGH', reason: 'away', message: 'Học sinh rời khỏi màn hình' });
      }
    }

    // 2. Buồn ngủ (nhắm mắt liên tục)
    if (result.drowsy && state.consecutiveDrowsy >= DROWSY_FRAMES) {
      if (!this.throttle('drowsy', 30)) {
        alerts.push({ level: 'HIGH', reason: 'drowsy', message: 'Học sinh có dấu hiệu buồn ngủ' });
      }
    }

    // 3. Mất tập trung kéo dài
    if (
      result.faceDetected &&
      state.lowEngagementSince !== null &&
      nowSec() - state.lowEngagementSince > LOW_ENGAGEMENT_DURATION
    ) {
      if (!this.throttle('distracted', 30)) {
        alerts.push({
          level: 'HIGH',
          reason: 'distracted',
          message: `Học sinh mất tập trung kéo dài`,
        });
      }
    }

    // 4. Căng thẳng đột ngột (angry/fear spike cao)
    if (result.faceDetected && (result.emotion === 'angry' || result.emotion === 'fear')) {
      const score = result.scores[result.emotion] ?? 0;
      if (score > 0.5 && !this.throttle('stressed', 30)) {
        alerts.push({ level: 'MED', reason: 'stressed', message: 'Học sinh có dấu hiệu căng thẳng' });
      }
    }

    // KHÔNG alert cho neutral, happy, surprise — trạng thái bình thường.
    return alerts;
  }
}
