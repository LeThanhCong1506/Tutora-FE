import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface DevicePreviewController {
  /** Gắn vào <video> để hiển thị hình camera của chính mình. */
  videoRef: RefObject<HTMLVideoElement | null>;
  camOn: boolean;
  micOn: boolean;
  /** true khi đã lấy được luồng camera/micro để hiển thị preview. */
  streaming: boolean;
  /** Thông báo lỗi quyền/thiết bị (nếu có). */
  error: string | null;
  toggleCam: () => void;
  toggleMic: () => void;
  /** Nhả camera/micro. Gọi TRƯỚC khi rời trang để phòng học (Agora) chiếm lại được thiết bị. */
  stop: () => void;
}

/**
 * Xem trước camera/micro ("phòng thay đồ") trước khi vào lớp. Dùng getUserMedia THUẦN
 * (không qua Agora) để không tranh chấp thiết bị với phòng học; luồng preview được nhả
 * trước khi điều hướng sang /live-session để Agora ở đó chiếm được camera/micro.
 *
 * Người dùng bật/tắt ở đây chỉ đổi trạng thái track cục bộ; lựa chọn cuối cùng (camOn/micOn)
 * được trang lobby truyền sang phòng học để khởi tạo đúng.
 *
 * `active = false` → hook không mở thiết bị (chưa ở bước chuẩn bị).
 */
export const useDevicePreview = (active: boolean): DevicePreviewController => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Giữ trạng thái mới nhất để áp lại nếu người dùng bấm tắt trong lúc luồng chưa kịp mở xong.
  const camOnRef = useRef(true);
  const micOnRef = useRef(true);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        stream.getVideoTracks().forEach((t) => (t.enabled = camOnRef.current));
        stream.getAudioTracks().forEach((t) => (t.enabled = micOnRef.current));
        if (videoRef.current) videoRef.current.srcObject = stream;
        setError(null);
        setStreaming(true);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        setStreaming(false);
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Vui lòng cấp quyền camera/micro để chuẩn bị vào lớp.'
            : 'Không tìm thấy hoặc không truy cập được camera/micro.',
        );
      }
    })();

    return () => {
      cancelled = true;
      const stream = streamRef.current;
      streamRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      // Không đụng videoRef.current ở đây: <video> unmount cùng lúc, và stop()/toggle đã lo srcObject.
      setStreaming(false);
    };
  }, [active]);

  // Gắn lại srcObject phòng khi <video> mount sau thời điểm luồng đã sẵn sàng.
  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [streaming]);

  const toggleCam = useCallback(() => {
    setCamOn((prev) => {
      const next = !prev;
      camOnRef.current = next;
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      micOnRef.current = next;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }, []);

  return { videoRef, camOn, micOn, streaming, error, toggleCam, toggleMic, stop };
};
