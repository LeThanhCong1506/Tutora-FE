import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    disconnectGoogleCalendar,
    getGoogleAuthorizationUrl,
    getGoogleConnectionStatus,
    refreshGoogleMeetLinks,
    type GoogleConnectionStatus,
} from '../../../services/googleAuth.service';

interface GoogleCalendarSectionProps {
    /** Trigger refetch khi callback hoàn tất (do parent điều khiển). */
    refreshSignal?: number;
}

const GoogleCalendarSection = ({ refreshSignal }: GoogleCalendarSectionProps) => {
    const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getGoogleConnectionStatus();
            setStatus(data);
        } catch {
            // Im lặng — có thể tutor chưa login đúng role hoặc network lỗi.
            // Status sẽ hiện "chưa kết nối" để user có thể retry.
            setStatus({ isConnected: false, connectedEmail: null });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus, refreshSignal]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const url = await getGoogleAuthorizationUrl();
            // Redirect cùng tab — BE callback sẽ redirect lại /tutor-portal/account?googleConnected=...
            window.location.href = url;
        } catch {
            toast.error('Không lấy được URL đăng nhập Google. Vui lòng thử lại.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            await disconnectGoogleCalendar();
            toast.success('Đã ngắt kết nối Google Calendar.');
            setShowDisconnectConfirm(false);
            await fetchStatus();
        } catch {
            toast.error('Ngắt kết nối thất bại. Vui lòng thử lại.');
        } finally {
            setDisconnecting(false);
        }
    };

    const handleRefreshLinks = async () => {
        try {
            setRefreshing(true);
            await refreshGoogleMeetLinks();
            toast.success('Đã tạo lại Meet link cho các buổi học sắp tới.');
        } catch {
            toast.error('Không tạo lại được Meet link. Vui lòng thử lại.');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div style={sectionCard}>
            <div style={sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GoogleIcon />
                    <h3 style={sectionTitle}>Kết nối Google Calendar</h3>
                </div>
                {status?.isConnected && (
                    <span style={connectedBadge}>
                        <CheckIcon /> Đã kết nối
                    </span>
                )}
            </div>

            <p style={description}>
                Kết nối Google Calendar để tự động tạo Google Meet link và lịch học cho mỗi buổi. Nếu không kết nối, hệ
                thống sẽ dùng Jitsi Meet làm phương án dự phòng.
            </p>

            {loading ? (
                <div style={loadingBox}>
                    <Spinner />
                    <span>Đang kiểm tra trạng thái…</span>
                </div>
            ) : status?.isConnected ? (
                <div style={connectedBox}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={fieldLabel}>Tài khoản đã kết nối</div>
                        <div style={emailValue} title={status.connectedEmail ?? ''}>
                            {status.connectedEmail ?? '—'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            style={{ ...secondaryBtn, ...(refreshing ? disabledStyle : {}) }}
                            onClick={handleRefreshLinks}
                            disabled={refreshing}
                            title="Tạo lại Meet link cho mọi buổi học sắp tới chưa có link"
                        >
                            {refreshing ? 'Đang xử lý…' : 'Tạo lại Meet link'}
                        </button>
                        <button
                            type="button"
                            style={{ ...dangerBtn, ...(disconnecting ? disabledStyle : {}) }}
                            onClick={() => setShowDisconnectConfirm(true)}
                            disabled={disconnecting}
                        >
                            Ngắt kết nối
                        </button>
                    </div>
                </div>
            ) : (
                <div style={notConnectedBox}>
                    <button
                        type="button"
                        style={{ ...primaryBtn, ...(connecting ? disabledStyle : {}) }}
                        onClick={handleConnect}
                        disabled={connecting}
                    >
                        {connecting ? 'Đang chuyển hướng…' : 'Kết nối Google Calendar'}
                    </button>
                    <span style={hint}>
                        Bạn sẽ được chuyển sang trang đăng nhập Google. Lưu ý dùng đúng email đã đăng ký với Tutora.
                    </span>
                </div>
            )}

            {/* Disconnect confirm modal */}
            {showDisconnectConfirm && (
                <div style={modalOverlay} onClick={() => setShowDisconnectConfirm(false)}>
                    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
                        <h4 style={modalTitle}>Ngắt kết nối Google Calendar?</h4>
                        <p style={modalText}>
                            Các buổi học sắp tới sẽ không có Google Meet link mới. Hệ thống sẽ dùng Jitsi Meet làm dự
                            phòng. Bạn có chắc muốn ngắt kết nối?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button
                                type="button"
                                style={cancelBtn}
                                onClick={() => setShowDisconnectConfirm(false)}
                                disabled={disconnecting}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                style={{ ...dangerBtn, ...(disconnecting ? disabledStyle : {}) }}
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting ? 'Đang xử lý…' : 'Ngắt kết nối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoogleCalendarSection;

// ── Icons ────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const Spinner = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
);

// ── Styles ───────────────────────────────────────────────────────────────
const sectionCard: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: 28,
    border: '1px solid #f5f5f5',
    marginBottom: 20,
};

const sectionHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 16,
    borderBottom: '1px solid #f5f5f5',
};

const sectionTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a2238',
    margin: 0,
};

const connectedBadge: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#15803d',
    background: '#dcfce7',
    padding: '4px 10px',
    borderRadius: 999,
};

const description: React.CSSProperties = {
    fontSize: 13,
    color: '#737373',
    lineHeight: 1.6,
    margin: '0 0 20px',
};

const loadingBox: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    color: '#9ca3af',
    padding: '16px 0',
};

const connectedBox: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 16px',
    background: '#fafafa',
    borderRadius: 10,
    border: '1px solid #f0f0f0',
    flexWrap: 'wrap',
};

const notConnectedBox: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
};

const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
};

const emailValue: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: '#1a2238',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 320,
};

const hint: React.CSSProperties = {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 1.5,
};

const primaryBtn: React.CSSProperties = {
    padding: '10px 20px',
    background: '#1a2238',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
};

const secondaryBtn: React.CSSProperties = {
    padding: '8px 16px',
    background: '#fff',
    color: '#1a2238',
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
    padding: '8px 16px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
};

const cancelBtn: React.CSSProperties = {
    padding: '9px 20px',
    border: '1px solid #e5e5e5',
    background: '#fff',
    borderRadius: 8,
    fontSize: 13,
    color: '#737373',
    fontWeight: 500,
    cursor: 'pointer',
};

const disabledStyle: React.CSSProperties = {
    opacity: 0.6,
    cursor: 'not-allowed',
};

const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
};

const modalCard: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
};

const modalTitle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: '#1a2238',
    margin: '0 0 10px',
};

const modalText: React.CSSProperties = {
    fontSize: 13,
    color: '#525252',
    lineHeight: 1.6,
    margin: 0,
};
