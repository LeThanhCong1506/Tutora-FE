import { useState } from 'react';
import type { StudentCredentials } from '../../../services/student.service';

interface Props {
    credentials: StudentCredentials | null;
    onClose: () => void;
    title?: string;
}

const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="5" width="8" height="8" rx="1.5" />
        <path d="M3 11H2.5A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5V3" strokeLinecap="round" />
    </svg>
);

const CredentialsModal = ({ credentials, onClose, title }: Props) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!credentials) return null;

    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback cho môi trường không hỗ trợ Clipboard API (non-HTTPS)
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <>
            <div style={overlay} onClick={onClose} />
            <div style={modal}>
                {/* Header */}
                <div style={header}>
                    <div style={headerIconWrap}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <circle cx="14" cy="14" r="14" fill="#dcfce7" />
                            <path d="M9 14l4 4 6-7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2 style={titleStyle}>{title || 'Tạo tài khoản thành công!'}</h2>
                    <p style={subtitleStyle}>
                        Hãy lưu lại thông tin đăng nhập cho <strong>{credentials.fullName}</strong>.
                        Mật khẩu chỉ hiển thị <strong>một lần duy nhất</strong>.
                    </p>
                </div>

                {/* Credentials */}
                <div style={bodyStyle}>
                    <div style={credentialBox}>
                        <div style={credentialRow}>
                            <div style={credentialLabel}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6b7280" strokeWidth="1.5">
                                    <circle cx="7" cy="5" r="3" />
                                    <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" strokeLinecap="round" />
                                </svg>
                                <span>Tên đăng nhập</span>
                            </div>
                            <div style={credentialValueWrap}>
                                <span style={credentialValue}>{credentials.username}</span>
                                <button
                                    style={copyBtn}
                                    onClick={() => handleCopy(credentials.username, 'username')}
                                    type="button"
                                >
                                    <CopyIcon />
                                    <span>{copiedField === 'username' ? '✓' : 'Sao chép'}</span>
                                </button>
                            </div>
                        </div>

                        <div style={divider} />

                        <div style={credentialRow}>
                            <div style={credentialLabel}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6b7280" strokeWidth="1.5">
                                    <rect x="2" y="5" width="10" height="7" rx="2" />
                                    <path d="M4 5V4a3 3 0 016 0v1" strokeLinecap="round" />
                                </svg>
                                <span>Mật khẩu tạm</span>
                            </div>
                            <div style={credentialValueWrap}>
                                <span style={{ ...credentialValue, fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {credentials.temporaryPassword}
                                </span>
                                <button
                                    style={copyBtn}
                                    onClick={() => handleCopy(credentials.temporaryPassword, 'password')}
                                    type="button"
                                >
                                    <CopyIcon />
                                    <span>{copiedField === 'password' ? '✓' : 'Sao chép'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={warningBox}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                            <path d="M8 5v3M8 10v.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <p style={warningText}>
                            Hãy gửi thông tin này cho con bạn. Sau khi đăng nhập lần đầu, học sinh nên đổi mật khẩu ngay.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={footer}>
                    <button
                        style={copyAllBtn}
                        onClick={async () => {
                            const text = `Tên đăng nhập: ${credentials.username}\nMật khẩu: ${credentials.temporaryPassword}`;
                            await handleCopy(text, 'all');
                        }}
                        type="button"
                    >
                        <CopyIcon />
                        <span>{copiedField === 'all' ? 'Đã sao chép!' : 'Sao chép tất cả'}</span>
                    </button>
                    <button style={doneBtn} onClick={onClose} type="button">
                        Đã lưu, đóng
                    </button>
                </div>
            </div>
        </>
    );
};

// ── Inline styles ──
const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(23,23,23,0.55)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
};
const modal: React.CSSProperties = {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: '#fff', borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: 460, maxWidth: '92vw',
    zIndex: 1001,
    fontFamily: "'IBM Plex Sans', sans-serif",
};
const header: React.CSSProperties = {
    padding: '28px 28px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
};
const headerIconWrap: React.CSSProperties = { marginBottom: 16 };
const titleStyle: React.CSSProperties = {
    margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1a2238',
};
const subtitleStyle: React.CSSProperties = {
    margin: 0, fontSize: 13, color: '#737373', lineHeight: 1.6,
};
const bodyStyle: React.CSSProperties = { padding: '20px 28px' };
const credentialBox: React.CSSProperties = {
    background: '#f8f9fc', border: '1px solid #e5e7eb',
    borderRadius: 12, padding: '16px 20px',
    marginBottom: 16,
};
const credentialRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
};
const credentialLabel: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#6b7280', fontWeight: 500, minWidth: 100,
};
const credentialValueWrap: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
    justifyContent: 'flex-end',
};
const credentialValue: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: '#1a2238',
    wordBreak: 'break-all',
};
const divider: React.CSSProperties = {
    height: 1, background: '#e5e7eb', margin: '12px 0',
};
const copyBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', border: '1px solid #d1d5db',
    background: '#fff', borderRadius: 6, cursor: 'pointer',
    fontSize: 11, color: '#374151', fontWeight: 500,
    whiteSpace: 'nowrap',
};
const warningBox: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px', background: '#fffbeb',
    border: '1px solid #fde68a', borderRadius: 10,
};
const warningText: React.CSSProperties = {
    margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6,
};
const footer: React.CSSProperties = {
    display: 'flex', gap: 10, justifyContent: 'flex-end',
    padding: '16px 28px', borderTop: '1px solid #f5f5f5',
};
const copyAllBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', border: '1px solid #d1d5db',
    background: '#fff', borderRadius: 10, cursor: 'pointer',
    fontSize: 13, color: '#374151', fontWeight: 500,
};
const doneBtn: React.CSSProperties = {
    padding: '9px 20px', border: 'none',
    background: '#1a2238', color: '#fff',
    borderRadius: 10, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
};

export default CredentialsModal;
