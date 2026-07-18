import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createFastboard, createUI } from '@netless/fastboard';
import { X } from 'lucide-react';
import { getWhiteboardRoom } from '../../../services/agora.service';
import { getUserIdFromToken } from '../../../services/auth.service';

// Kiểu region đúng theo API fastboard (union "sg" | "cn-hz" | ...), suy ra trực tiếp từ SDK.
type FastboardRegion = Parameters<typeof createFastboard>[0]['sdkConfig']['region'];

interface WhiteboardOverlayProps {
  classSessionId: number;
  onClose: () => void;
}

/**
 * Overlay bảng vẽ chung (Agora Interactive Whiteboard / Netless).
 * Tự lấy room token từ BE, khởi tạo fastboard (kèm toolbar) và dọn dẹp khi đóng.
 * Được lazy-load ở LiveSession để SDK nặng không nằm trong bundle chính.
 */
const WhiteboardOverlay = ({ classSessionId, onClose }: WhiteboardOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let ui: { destroy(): void } | undefined;
    let app: Awaited<ReturnType<typeof createFastboard>> | undefined;

    void (async () => {
      try {
        const res = await getWhiteboardRoom(classSessionId);
        if (cancelled) return;
        const room = res.content;
        const uid = getUserIdFromToken() ?? `guest-${classSessionId}`;

        app = await createFastboard({
          sdkConfig: {
            appIdentifier: room.appIdentifier,
            region: room.region as FastboardRegion,
          },
          joinRoom: {
            uid,
            uuid: room.roomUuid,
            roomToken: room.roomToken,
          },
        });

        if (cancelled || !containerRef.current) {
          void app.destroy();
          return;
        }
        ui = createUI(app, containerRef.current);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Không thể mở bảng vẽ. Vui lòng thử lại.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ui?.destroy();
      void app?.destroy();
    };
  }, [classSessionId]);

  return (
    <div style={overlayStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>Bảng vẽ chung</span>
        <button style={closeBtnStyle} onClick={onClose} title="Đóng bảng vẽ" aria-label="Đóng bảng vẽ">
          <X size={18} />
        </button>
      </div>
      <div style={bodyStyle}>
        {error ? (
          <div style={stateStyle}>{error}</div>
        ) : (
          <>
            {loading && <div style={stateStyle}>Đang mở bảng vẽ…</div>}
            <div ref={containerRef} style={canvasStyle} />
          </>
        )}
      </div>
    </div>
  );
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  flexDirection: 'column',
  background: '#1a2238',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.25)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  flexShrink: 0,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const closeBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 8,
  border: 'none',
  color: '#fff',
  background: 'rgba(255, 255, 255, 0.1)',
  cursor: 'pointer',
};

const bodyStyle: CSSProperties = { position: 'relative', flex: 1, minHeight: 0, background: '#fff' };
const canvasStyle: CSSProperties = { position: 'absolute', inset: 0 };
const stateStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#1a2238',
  fontFamily: "'IBM Plex Sans', sans-serif",
  zIndex: 1,
};

export default WhiteboardOverlay;
