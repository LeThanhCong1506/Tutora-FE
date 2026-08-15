import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createFastboard, createUI } from '@netless/fastboard';
import { X } from 'lucide-react';
import axios from 'axios';
import { getWhiteboardRoom } from '../../../services/agora.service';
import { getUserIdFromToken } from '../../../services/auth.service';

// Kiểu region đúng theo API fastboard (union "sg" | "cn-hz" | ...), suy ra trực tiếp từ SDK.
type FastboardRegion = Parameters<typeof createFastboard>[0]['sdkConfig']['region'];

interface WhiteboardOverlayProps {
  classSessionId: number;
  participationId: string;
  leaseId: string;
  /** Tên hiển thị của người dùng hiện tại — gắn vào userPayload để SDK hiện tên thay vì uid ở nhãn con trỏ. */
  displayName: string;
  onClose: () => void;
}

/**
 * Overlay bảng vẽ chung (Agora Interactive Whiteboard / Netless).
 * Tự lấy room token từ BE, khởi tạo fastboard (kèm toolbar) và dọn dẹp khi đóng.
 * Được lazy-load ở LiveSession để SDK nặng không nằm trong bundle chính.
 */
const WhiteboardOverlay = ({ classSessionId, participationId, leaseId, displayName, onClose }: WhiteboardOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let ui: { destroy(): void } | undefined;
    let app: Awaited<ReturnType<typeof createFastboard>> | undefined;

    void (async () => {
      try {
        const res = await getWhiteboardRoom(classSessionId, { participationId, leaseId });
        if (cancelled) return;
        const room = res.content;
        // Gắn thêm leaseId (mới hoàn toàn mỗi lần join lại buổi học) vào uid, không dùng thẳng
        // userId cố định. Rời buổi học rồi vào lại vẫn là CÙNG userId join lại CÙNG roomUuid —
        // Netless coi đó là cùng một "thành viên" quay lại, và trong một số trường hợp không đồng
        // bộ lại đúng nét vẽ cho các thành viên đã ở sẵn trong phòng (chỉ mới với bản thân bị lỗi,
        // "ai nấy vẽ"). Mỗi lượt vào lớp là một leaseId khác nhau nên uid cũng khác nhau, buộc
        // Netless coi đây là một thành viên mới thay vì một phiên cũ quay lại.
        const uid = `${getUserIdFromToken() ?? `guest-${classSessionId}`}-${leaseId}`;

        app = await createFastboard({
          sdkConfig: {
            appIdentifier: room.appIdentifier,
            region: room.region as FastboardRegion,
          },
          joinRoom: {
            uid,
            uuid: room.roomUuid,
            roomToken: room.roomToken,
            // SDK dùng userPayload.nickName để hiện tên cạnh con trỏ; không set thì rơi về hiện thẳng uid.
            userPayload: { nickName: displayName },
          },
        });

        if (cancelled || !containerRef.current) {
          void app.destroy();
          return;
        }
        ui = createUI(app, containerRef.current);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          // Log nguyên nhân thật để chẩn đoán (lỗi BE 4xx hay lỗi SDK Netless khi join).
          console.error('Mở bảng vẽ thất bại:', err);
          // Nếu là lỗi từ BE (axios) thì hiển thị luôn message của BE để biết lý do cụ thể
          // (vd "Buổi học đã kết thúc.", "…chưa thanh toán…"), thay vì thông báo chung chung.
          const backendMessage = axios.isAxiosError(err)
            ? (err.response?.data?.message as string | undefined)
            : undefined;
          setError(backendMessage || 'Không thể mở bảng vẽ. Vui lòng thử lại.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ui?.destroy();
      void app?.destroy();
    };
  }, [classSessionId, participationId, leaseId, displayName]);

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
