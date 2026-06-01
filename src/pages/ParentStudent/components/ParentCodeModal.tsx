import { useState } from 'react';
import { toast } from 'react-toastify';
import { generateParentCode } from '../../../services/student.service';

interface Props {
    onClose: () => void;
}

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="5" width="8" height="8" rx="1.5" />
        <path d="M3 11H2.5A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5V3" strokeLinecap="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M13 7.5A5.5 5.5 0 112.5 4" strokeLinecap="round" />
        <path d="M2 2v2.5H4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ParentCodeModal = ({ onClose }: Props) => {
    const [loading, setLoading] = useState(false);
    const [parentCode, setParentCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await generateParentCode();
            setParentCode(res.content.parentCode);
            toast.success('Đã tạo mã mời thành công!');
        } catch {
            toast.error('Không thể tạo mã mời');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!parentCode) return;
        navigator.clipboard.writeText(parentCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div style={overlay} onClick={onClose} />
            <div style={modal}>
                {/* Header */}
                <div style={header}>
                    <div>
                        <p style={subtitleText}>Mã mời liên kết</p>
                        <h2 style={titleText}>Mã cho học sinh tự liên kết</h2>
                    </div>
                    <button style={closeBtn} onClick={onClose} type="button"><CloseIcon /></button>
                </div>

                {/* Body */}
                <div style={body}>
                    {parentCode ? (
                        <>
                            <p style={desc}>
                                Chia sẻ mã này cho học sinh đã tự đăng ký tài khoản. Học sinh nhập mã tại trang{' '}
                                <strong>Liên kết tài khoản</strong> để liên kết với bạn. Mã có hiệu lực trong 24 giờ.
                            </p>

                            <div style={codeBox}>
                                <div style={codeChars}>
                                    {parentCode.split('').map((char, i) => (
                                        <span key={i} style={codeChar}>{char}</span>
                                    ))}
                                </div>
                                <button style={copyBtnStyle} onClick={handleCopy} type="button">
                                    <CopyIcon />
                                    <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                                </button>
                            </div>

                            <div style={noteBox}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="6" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" />
                                    <path d="M7 4v3M7 9v.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <p style={noteText}>
                                    Khác với <em>Mã liên kết học sinh</em> (gắn theo từng hồ sơ), mã này gắn theo <strong>tài khoản phụ huynh</strong>
                                    {' '}và dùng để học sinh <strong>tự đăng ký</strong> rồi liên kết với bạn.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div style={noCodeBox}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <circle cx="24" cy="24" r="22" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="1" />
                                <path d="M18 24a6 6 0 0112 0" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                                <path d="M24 18v6M24 30v1" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <p style={noCodeText}>
                                Nhấn <strong>"Tạo mã mời"</strong> để tạo mã 6 ký tự. Gửi mã cho học sinh đã có tài khoản để liên kết.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={footer}>
                    <button style={cancelBtnStyle} onClick={onClose} type="button">Đóng</button>
                    <button
                        style={{ ...generateBtnBase, ...(loading ? disabledStyle : {}) }}
                        onClick={handleGenerate}
                        disabled={loading}
                        type="button"
                    >
                        <RefreshIcon />
                        <span>{loading ? 'Đang tạo...' : parentCode ? 'Tạo mã mới' : 'Tạo mã mời'}</span>
                    </button>
                </div>
            </div>
        </>
    );
};

// ── Inline styles (matching LinkCodeModal design) ──
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
    width: 440, maxWidth: '90vw',
    zIndex: 1001,
    fontFamily: "'IBM Plex Sans', sans-serif",
};
const header: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f5f5f5',
};
const subtitleText: React.CSSProperties = { margin: 0, fontSize: 12, color: '#9ca3af', marginBottom: 2 };
const titleText: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2238' };
const closeBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, border: 'none',
    background: '#f5f5f5', borderRadius: 8, cursor: 'pointer', color: '#737373',
};
const body: React.CSSProperties = { padding: '20px 24px' };
const desc: React.CSSProperties = { margin: '0 0 20px', fontSize: 13, color: '#525252', lineHeight: 1.6 };
const codeBox: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, padding: '24px 16px',
    background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: 12,
};
const codeChars: React.CSSProperties = { display: 'flex', gap: 8 };
const codeChar: React.CSSProperties = {
    width: 44, height: 52,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', border: '2px solid #3b82f6', borderRadius: 10,
    fontSize: 24, fontWeight: 700, color: '#1e40af',
    fontFamily: "'IBM Plex Mono', monospace",
};
const copyBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', border: '1px solid #d1d5db',
    background: '#fff', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, color: '#374151', fontWeight: 500,
};
const noteBox: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '12px 14px', background: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: 10,
    marginTop: 16,
};
const noteText: React.CSSProperties = {
    margin: 0, fontSize: 12, color: '#1e40af', lineHeight: 1.6,
};
const noCodeBox: React.CSSProperties = {
    padding: '32px 16px', background: '#fafafa',
    border: '1px dashed #d1d5db', borderRadius: 12, textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
};
const noCodeText: React.CSSProperties = { margin: 0, fontSize: 13, color: '#737373', lineHeight: 1.6 };
const footer: React.CSSProperties = {
    display: 'flex', gap: 10, justifyContent: 'flex-end',
    padding: '16px 24px', borderTop: '1px solid #f5f5f5',
};
const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 18px', border: '1px solid #e5e5e5',
    background: '#fff', borderRadius: 10, cursor: 'pointer',
    fontSize: 13, color: '#737373', fontWeight: 500,
};
const generateBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', border: 'none',
    background: '#1a2238', color: '#fff',
    borderRadius: 10, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
};
const disabledStyle: React.CSSProperties = { opacity: 0.6, cursor: 'not-allowed' };

export default ParentCodeModal;
