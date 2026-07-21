/**
 * Âm báo cho cảnh báo hành vi — tổng hợp bằng Web Audio API.
 */

let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
};

export const primeAlertSound = (): void => {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
};

/** Một nốt hình sin có fade-out mượt (tránh tiếng "tách" khi cắt sóng đột ngột). */
const beep = (ctx: AudioContext, freq: number, startAt: number, duration: number, gain: number) => {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, startAt);
  env.gain.linearRampToValueAtTime(gain, startAt + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
};

/**
 * Phát âm báo.
 * - HIGH (buồn ngủ, rời màn hình, mất tập trung): hai nốt đi xuống, nghe "khẩn" hơn.
 * - MED / thông tin (tắt-bật camera): một nốt ngắn, nhẹ.
 */
export const playAlertSound = (level?: string): void => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime;
  if (level === 'HIGH') {
    beep(ctx, 880, now, 0.16, 0.16);
    beep(ctx, 620, now + 0.17, 0.22, 0.16);
  } else {
    beep(ctx, 760, now, 0.14, 0.1);
  }
};
