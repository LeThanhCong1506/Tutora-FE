import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import type { StudentType } from '../../../types/student.type';
import { generateLinkCode } from '../../../services/student.service';

interface Props {
  student: StudentType | null;
  onClose: () => void;
  onCodeGenerated: (updated: StudentType) => void;
}

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="5" width="8" height="8" rx="1.5" />
    <path d="M3 11H2.5A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5V3" strokeLinecap="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M13 7.5A5.5 5.5 0 112.5 4" strokeLinecap="round" />
    <path d="M2 2v2.5H4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
  </svg>
);

const formatExpiry = (expiresAt: string | null | undefined): string => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Đã hết hạn';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Hết hạn sau ${h}g ${m}p`;
  return `Hết hạn sau ${m} phút`;
};

const LinkCodeModal = ({ student, onClose, onCodeGenerated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentType | null>(student);
  const [expiryLabel, setExpiryLabel] = useState('');

  useEffect(() => {
    setCurrentStudent(student);
  }, [student]);

  useEffect(() => {
    if (!currentStudent?.studentCodeExpiresAt) return;
    setExpiryLabel(formatExpiry(currentStudent.studentCodeExpiresAt));
    const timer = setInterval(() => {
      setExpiryLabel(formatExpiry(currentStudent.studentCodeExpiresAt));
    }, 60000);
    return () => clearInterval(timer);
  }, [currentStudent?.studentCodeExpiresAt]);

  const handleGenerate = useCallback(async () => {
    if (!currentStudent) return;
    setLoading(true);
    try {
      const res = await generateLinkCode(currentStudent.studentId);
      const updated = res.content;
      setCurrentStudent(updated);
      onCodeGenerated(updated);
      toast.success('Đã tạo mã liên kết mới');
    } catch {
      toast.error('Không thể tạo mã liên kết');
    } finally {
      setLoading(false);
    }
  }, [currentStudent, onCodeGenerated]);

  const handleCopy = () => {
    if (!currentStudent?.studentCode) return;
    navigator.clipboard.writeText(currentStudent.studentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!student) return null;

  const hasCode = !!currentStudent?.studentCode;
  const isExpired = currentStudent?.studentCodeExpiresAt
    ? new Date(currentStudent.studentCodeExpiresAt).getTime() <= Date.now()
    : false;
  const codeValid = hasCode && !isExpired;

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div>
            <p style={subtitle}>Mã liên kết cho</p>
            <h2 style={title}>{currentStudent?.fullName}</h2>
          </div>
          <button style={closeBtn} onClick={onClose} type="button"><CloseIcon /></button>
        </div>

        {/* Body */}
        <div style={body}>
          {codeValid ? (
            <>
              <p style={desc}>Chia sẻ mã này cho học sinh để liên kết tài khoản. Mã có hiệu lực trong 24 giờ.</p>

              {/* Code display */}
              <div style={codeBox}>
                <div style={codeChars}>
                  {currentStudent!.studentCode!.split('').map((char, i) => (
                    <span key={i} style={codeChar}>{char}</span>
                  ))}
                </div>
                <button style={copyBtn} onClick={handleCopy} type="button">
                  <CopyIcon />
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>

              <p style={expiryText}>{expiryLabel}</p>

              <p style={noteText}>Học sinh vào <strong>/student/link-account</strong> và nhập mã trên để liên kết tài khoản.</p>
            </>
          ) : (
            <div style={noCodeBox}>
              <p style={noCodeText}>
                {hasCode && isExpired
                  ? 'Mã liên kết đã hết hạn. Tạo mã mới để tiếp tục.'
                  : 'Chưa có mã liên kết. Nhấn tạo mã để bắt đầu.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footer}>
          <button style={cancelBtn} onClick={onClose} type="button">Đóng</button>
          <button
            style={{ ...generateBtnBase, ...(loading ? disabledStyle : {}) }}
            onClick={handleGenerate}
            disabled={loading}
            type="button"
          >
            <RefreshIcon />
            <span>{loading ? 'Đang tạo...' : codeValid ? 'Tạo mã mới' : 'Tạo mã'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

// ── Inline styles (consistent with page design system) ──
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
  width: 420, maxWidth: '90vw',
  zIndex: 1001,
  fontFamily: "'IBM Plex Sans', sans-serif",
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '20px 24px',
  borderBottom: '1px solid #f5f5f5',
};
const subtitle: React.CSSProperties = { margin: 0, fontSize: 12, color: '#9ca3af', marginBottom: 2 };
const title: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2238' };
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
  background: '#f8f9fc', border: '1px solid #e5e7eb', borderRadius: 12,
};
const codeChars: React.CSSProperties = { display: 'flex', gap: 8 };
const codeChar: React.CSSProperties = {
  width: 44, height: 52,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#fff', border: '2px solid #1a2238', borderRadius: 10,
  fontSize: 24, fontWeight: 700, color: '#1a2238',
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: 0,
};
const copyBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', border: '1px solid #d1d5db',
  background: '#fff', borderRadius: 8, cursor: 'pointer',
  fontSize: 13, color: '#374151', fontWeight: 500,
  transition: 'background 0.15s',
};
const expiryText: React.CSSProperties = {
  margin: '12px 0 0', fontSize: 12, color: '#f59e0b',
  textAlign: 'center', fontWeight: 500,
};
const noteText: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12, color: '#9ca3af',
  lineHeight: 1.6, textAlign: 'center',
};
const noCodeBox: React.CSSProperties = {
  padding: '24px 16px', background: '#fafafa',
  border: '1px dashed #d1d5db', borderRadius: 12, textAlign: 'center',
};
const noCodeText: React.CSSProperties = { margin: 0, fontSize: 13, color: '#737373' };
const footer: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'flex-end',
  padding: '16px 24px', borderTop: '1px solid #f5f5f5',
};
const cancelBtn: React.CSSProperties = {
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

export default LinkCodeModal;
