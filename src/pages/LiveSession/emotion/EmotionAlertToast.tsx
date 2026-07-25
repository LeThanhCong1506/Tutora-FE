import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, VideoOff, Video, Moon, EyeOff, X } from 'lucide-react';
import { playAlertSound } from './alertSound';

/**
 * Toast cảnh báo hành vi học viên — component RIÊNG cho buổi học, không dùng react-toastify.
 * Neo ở GÓC DƯỚI BÊN PHẢI khung phòng học, xếp chồng, tự biến mất.
 * Chỉ hiển thị phía GIA SƯ.
 */

export interface EmotionToastItem {
  id: string;
  reason: string;
  level?: string;
  message: string;
  at: number;
}

const AUTO_DISMISS_MS = 6000;

const ICONS: Record<string, typeof AlertTriangle> = {
  away: EyeOff,
  drowsy: Moon,
  distracted: AlertTriangle,
  stressed: AlertTriangle,
  camera_off: VideoOff,
  camera_on: Video,
};

/** Màu theo mức độ: HIGH = đỏ cam (cần chú ý), còn lại = xanh dương trung tính. */
const toneOf = (item: EmotionToastItem): { bg: string; border: string; icon: string } => {
  if (item.reason === 'camera_on') {
    return { bg: 'rgba(16,185,129,0.96)', border: 'rgba(5,150,105,1)', icon: '#ecfdf5' };
  }
  if (item.level === 'HIGH') {
    return { bg: 'rgba(239,68,68,0.96)', border: 'rgba(185,28,28,1)', icon: '#fef2f2' };
  }
  return { bg: 'rgba(59,130,246,0.96)', border: 'rgba(29,78,216,1)', icon: '#eff6ff' };
};

interface EmotionAlertToastProps {
  items: EmotionToastItem[];
  onDismiss: (id: string) => void;
}

const EmotionAlertToast = ({ items, onDismiss }: EmotionAlertToastProps) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        // fixed = neo theo VIEWPORT (góc dưới phải toàn màn hình), không phụ thuộc khung camera
        // hay việc SidePanel đang mở/đóng.
        position: 'fixed',
        right: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        maxWidth: 340,
        pointerEvents: 'none',
      }}
    >
      {items.map((item) => (
        <ToastRow key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastRow = ({
  item,
  onDismiss,
}: {
  item: EmotionToastItem;
  onDismiss: (id: string) => void;
}) => {
  const [leaving, setLeaving] = useState(false);
  const tone = toneOf(item);
  const Icon = ICONS[item.reason] ?? AlertTriangle;

  const dismiss = useCallback(() => {
    setLeaving(true);
    // chờ hết animation rồi mới gỡ khỏi danh sách
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  // Phát âm báo đúng một lần khi toast xuất hiện, rồi hẹn giờ tự đóng.
  useEffect(() => {
    playAlertSound(item.level);
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: tone.bg,
        borderLeft: `4px solid ${tone.border}`,
        color: '#fff',
        boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(6px)',
        pointerEvents: 'auto',
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'translateX(16px)' : 'translateX(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
    >
      <Icon size={18} color={tone.icon} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.35, flex: 1 }}>{item.message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default EmotionAlertToast;
