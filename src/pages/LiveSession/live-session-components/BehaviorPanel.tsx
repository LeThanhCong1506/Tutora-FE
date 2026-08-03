import { Eye, EyeOff, AlertTriangle, Moon, VideoOff, Video, EyeOff as AwayIcon } from 'lucide-react';
import type { LiveEmotionAlert } from './hooks/useAgoraCall';

/**
 * Tab "Theo dõi hành vi" trong SidePanel — CHỈ hiển thị cho gia sư.
 */

interface BehaviorPanelProps {
  trackingOn: boolean;
  onToggleTracking: () => void;
  alerts: LiveEmotionAlert[];
  disabled?: boolean;
}

const ICONS: Record<string, typeof AlertTriangle> = {
  away: AwayIcon,
  drowsy: Moon,
  distracted: AlertTriangle,
  stressed: AlertTriangle,
  camera_off: VideoOff,
  camera_on: Video,
};

const colorOf = (a: LiveEmotionAlert): string => {
  if (a.reason === 'camera_on') return '#10b981';
  return a.level === 'HIGH' ? '#ef4444' : '#3b82f6';
};

const timeOf = (ts: number): string =>
  new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const BehaviorPanel = ({ trackingOn, onToggleTracking, alerts, disabled }: BehaviorPanelProps) => {
  const ordered = [...alerts].reverse(); // mới nhất lên đầu

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, color: '#e2e8f0' }}>
      {/* Công tắc bật/tắt */}
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          type="button"
          onClick={onToggleTracking}
          disabled={disabled}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: trackingOn ? '#ef4444' : '#2563eb',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {trackingOn ? <EyeOff size={16} /> : <Eye size={16} />}
          {trackingOn ? 'Dừng theo dõi hành vi' : 'Bắt đầu theo dõi hành vi'}
        </button>
        <p style={{ margin: '10px 2px 0', fontSize: 12, lineHeight: 1.5, color: '#94a3b8' }}>
          {trackingOn
            ? 'Đang theo dõi mức độ tập trung của học viên. Cảnh báo sẽ hiện ở góc dưới bên phải.'
            : 'Bật để nhận cảnh báo khi học viên buồn ngủ, mất tập trung hoặc rời khỏi màn hình.'}
        </p>
      </div>

      {/* Lịch sử cảnh báo */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          Cảnh báo trong buổi ({ordered.length})
        </div>

        {ordered.length === 0 && (
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            {trackingOn ? 'Chưa có cảnh báo nào.' : 'Chưa bật theo dõi.'}
          </div>
        )}

        {ordered.map((a) => {
          const Icon = ICONS[a.reason] ?? AlertTriangle;
          const color = colorOf(a);
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '9px 10px',
                marginBottom: 6,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.message}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{timeOf(a.at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BehaviorPanel;
