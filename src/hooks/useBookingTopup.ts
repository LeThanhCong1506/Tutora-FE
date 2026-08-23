import { useCallback, useEffect, useRef, useState } from 'react';
import { applyBookingShortfallTopup, createTopup, getTopupStatus, type TopupResponse } from '../services/wallet.service';
import { getApiErrorMessage } from '../utils/apiError';

const POLL_INTERVAL_MS = 5000;
const MIN_TOPUP_VND = 10000; // PayOS yêu cầu tối thiểu 10,000đ
// PayWithWallet trả HTTP 409 cho NHIỀU lý do (đã trả / hết hạn / sai trạng thái). CHỈ 2 mã này nghĩa là
// "giai đoạn thanh toán đã hoàn tất rồi" → coi như thành công. Các 409 khác (BOOKING_EXPIRED,
// INVALID_BOOKING_STATUS) là lỗi thật — booking CHƯA trả được, tiền vẫn nằm an toàn trong ví.
const ALREADY_PAID_CODES = ['BOOKING_ALREADY_PAID', 'REMAINING_ALREADY_PAID'];

export type TopupPhase =
  | 'idle'
  | 'creating'
  | 'create_error'
  | 'awaiting_topup'
  | 'expired'
  | 'paying'
  | 'pay_error'
  | 'success';

export interface UseBookingTopupArgs {
  bookingId: number;
  amountDue: number;
  walletBalance: number;
  onPaymentSuccess: () => void;
}

export interface UseBookingTopupResult {
  phase: TopupPhase;
  isActive: boolean;
  topup: TopupResponse | null;
  shortfall: number;
  topupAmount: number;
  secondsRemaining: number;
  error: string | null;
  start: () => void;
  regenerate: () => void;
  retryPay: () => void;
  cancel: () => void;
}

interface ApiErrorLike {
  response?: { status?: number; data?: { errorCode?: string; message?: string } };
}

/**
 * Luồng "nạp bù phần thiếu rồi thanh toán booking bằng ví":
 * backend tự tính phần thiếu và tạo QR gắn booking/phase → poll trạng thái nạp
 * → khi ví đã được cộng tiền thì gọi endpoint apply của chính lệnh nạp bù đó.
 */
export const useBookingTopup = ({
  bookingId,
  amountDue,
  walletBalance,
  onPaymentSuccess,
}: UseBookingTopupArgs): UseBookingTopupResult => {
  const [phase, setPhase] = useState<TopupPhase>('idle');
  const [topup, setTopup] = useState<TopupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const creatingRef = useRef(false);
  const paidGuardRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Giữ callback mới nhất mà không đưa vào deps (tránh tạo lại effect/hàm liên tục).
  const onSuccessRef = useRef(onPaymentSuccess);
  onSuccessRef.current = onPaymentSuccess;

  const shortfall = Math.max(0, amountDue - walletBalance);
  // Làm tròn LÊN + tối thiểu 10k ⇒ sau khi nạp, số dư luôn ≥ số phải trả ⇒ auto-pay chắc chắn đủ.
  const topupAmount = Math.max(Math.ceil(shortfall), MIN_TOPUP_VND);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const doPay = useCallback(async () => {
    try {
      if (!topup) {
        throw new Error('Missing booking shortfall top-up.');
      }

      await applyBookingShortfallTopup(bookingId, topup.orderCode);
      clearPoll();
      setPhase('success');
      onSuccessRef.current();
    } catch (err) {
      const e = err as ApiErrorLike;
      const code = e.response?.data?.errorCode;
      // Booking (giai đoạn đã tạo QR) đã được thanh toán rồi (vd. gọi trùng) → coi như thành công.
      if (code && ALREADY_PAID_CODES.includes(code)) {
        clearPoll();
        setPhase('success');
        onSuccessRef.current();
        return;
      }
      // Các lỗi khác: tiền nạp bù đã ở trong ví và không bị tự động dùng cho phase khác.
      setError(getApiErrorMessage(err, 'Không hoàn tất được thanh toán. Số dư đã được nạp, vui lòng thử lại.'));
      setPhase('pay_error');
    }
  }, [bookingId, topup, clearPoll]);

  const start = useCallback(async () => {
    if (creatingRef.current) return; // chặn double-click
    setError(null);
    paidGuardRef.current = false;
    creatingRef.current = true;
    setPhase('creating');
    try {
      const res = await createTopup(bookingId);
      setTopup(res.content);
      setPhase('awaiting_topup');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không tạo được mã nạp tiền. Vui lòng thử lại.'));
      setPhase('create_error');
    } finally {
      creatingRef.current = false;
    }
  }, [bookingId]);

  const cancel = useCallback(() => {
    clearPoll();
    clearCountdown();
    creatingRef.current = false;
    paidGuardRef.current = false;
    setTopup(null);
    setError(null);
    setPhase('idle');
  }, [clearPoll, clearCountdown]);

  const retryPay = useCallback(() => {
    if (phase !== 'pay_error') return;
    setError(null);
    setPhase('paying');
    void doPay();
  }, [phase, doPay]);

  // Poll trạng thái nạp; khi ví đã cộng tiền → auto-pay (đúng 1 lần nhờ paidGuardRef).
  useEffect(() => {
    if (phase !== 'awaiting_topup' || !topup) return;

    const poll = async () => {
      try {
        const res = await getTopupStatus(bookingId, topup.orderCode);
        if (res.content.walletCredited && !paidGuardRef.current) {
          paidGuardRef.current = true;
          clearPoll();
          clearCountdown();
          setPhase('paying');
          void doPay();
        }
      } catch (err) {
        // Lỗi poll lẻ không fatal — cứ poll tiếp.
        console.error('[useBookingTopup] status poll failed', err);
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    void poll(); // poll ngay lần đầu, không đợi 5s
    return () => clearPoll();
  }, [phase, topup, bookingId, clearPoll, clearCountdown, doPay]);

  // Đếm ngược hết hạn QR; hết giờ → dừng poll, chuyển sang 'expired'.
  useEffect(() => {
    if (phase !== 'awaiting_topup' || !topup?.expiredAt) {
      setSecondsRemaining(0);
      return;
    }
    const expiry = new Date(topup.expiredAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearCountdown();
        clearPoll();
        setPhase('expired');
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearCountdown();
  }, [phase, topup?.expiredAt, clearCountdown, clearPoll]);

  // Dọn mọi timer khi unmount.
  useEffect(
    () => () => {
      clearPoll();
      clearCountdown();
    },
    [clearPoll, clearCountdown],
  );

  return {
    phase,
    isActive: phase !== 'idle',
    topup,
    shortfall,
    topupAmount: topup?.amount ?? topupAmount,
    secondsRemaining,
    error,
    start,
    regenerate: start,
    retryPay,
    cancel,
  };
};
