/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { studentSelfLink, getMyLinkStatus, type LinkStatusResponse } from '../../services/student.service';

const CODE_LENGTH = 6;

const StudentLinkAccount = () => {
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkStatus, setLinkStatus] = useState<LinkStatusResponse | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Check link status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getMyLinkStatus();
        setLinkStatus(res.content);
      } catch {
        // Not linked or error, show form
        setLinkStatus({ linked: false, parentName: null, parentId: null, studentProfile: null });
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    const next = [...chars];
    next[index] = char;
    setChars(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...chars];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setChars(next);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const code = chars.join('');
  const isComplete = code.length === CODE_LENGTH;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      await studentSelfLink(code);
      message.success('Liên kết tài khoản thành công!');
      // Refresh status
      const res = await getMyLinkStatus();
      setLinkStatus(res.content);
    } catch (err: any) {
      const errorCode = err?.response?.data?.message || '';
      if (errorCode.includes('PARENT_CODE_NOT_FOUND')) {
        message.error('Mã mời không hợp lệ');
      } else if (errorCode.includes('PARENT_CODE_EXPIRED')) {
        message.error('Mã mời đã hết hạn. Yêu cầu phụ huynh tạo mã mới.');
      } else if (errorCode.includes('STUDENT_ALREADY_HAS_PARENT')) {
        message.error('Bạn đã được liên kết với một phụ huynh.');
      } else if (errorCode.includes('STUDENT_NOT_FOUND')) {
        message.error('Không tìm thấy hồ sơ học sinh. Vui lòng đăng ký trước.');
      } else {
        message.error('Liên kết thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking
  if (checking) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={spinnerWrap}>
            <div style={spinner} />
          </div>
          <p style={{ ...subheadingStyle, margin: 0 }}>Đang kiểm tra trạng thái liên kết...</p>
        </div>
      </div>
    );
  }

  // Already linked — show status
  if (linkStatus?.linked) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          {/* Success Icon */}
          <div style={linkedIconWrap}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="28" fill="#dcfce7" />
              <path d="M18 28l8 8 12-14" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 style={linkedTitle}>Đã liên kết thành công</h2>
          <p style={linkedDesc}>
            Tài khoản của bạn đã được liên kết với phụ huynh.
          </p>

          {/* Parent info card */}
          <div style={parentCard}>
            <div style={parentAvatarWrap}>
              <div style={parentAvatar}>
                {linkStatus.parentName?.charAt(0)?.toUpperCase() || 'P'}
              </div>
            </div>
            <div>
              <p style={parentLabel}>Phụ huynh</p>
              <h3 style={parentName}>{linkStatus.parentName || 'Phụ huynh'}</h3>
            </div>
            <div style={linkedBadge}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16a34a" strokeWidth="2">
                <path d="M3 7l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Đã liên kết</span>
            </div>
          </div>

          <button style={primaryBtn} onClick={() => navigate('/student-portal/dashboard')} type="button">
            Về trang Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Not linked — show code input form
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Icon */}
        <div style={iconWrap}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#1a2238" />
            <path d="M10 16a6 6 0 1112 0" stroke="#f2f0e4" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 10v6M16 22v.5" stroke="#f2f0e4" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 style={headingStyle}>Liên kết với phụ huynh</h1>
        <p style={subheadingStyle}>
          Nhập mã mời 6 ký tự từ phụ huynh để liên kết tài khoản.
        </p>

        <p style={modeDesc}>
          Nhờ phụ huynh vào trang quản lý, nhấn nút <strong>Mã mời</strong> để tạo mã và gửi cho bạn.
        </p>

        {/* OTP inputs */}
        <div style={otpRow}>
          {chars.map((char, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              style={{
                ...otpInput,
                ...(char ? otpInputFilled : {}),
              }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button
          style={{
            ...primaryBtn,
            ...((!isComplete || loading) ? disabledBtn : {}),
          }}
          onClick={handleSubmit}
          disabled={!isComplete || loading}
          type="button"
        >
          {loading ? 'Đang xác nhận...' : 'Xác nhận liên kết'}
        </button>

        <p style={helpText}>
          Chưa có mã? Nhờ phụ huynh vào trang <strong>Quản lý con</strong>, nhấn nút <strong>Mã mời</strong> để tạo mã 6 ký tự.
        </p>
      </div>
    </div>
  );
};

// ── Styles ──
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f8f9fc', padding: 24,
  fontFamily: "'IBM Plex Sans', sans-serif",
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  padding: '40px 36px',
  width: '100%', maxWidth: 440,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 0,
};
const iconWrap: React.CSSProperties = { marginBottom: 20 };
const headingStyle: React.CSSProperties = {
  fontSize: 24, fontWeight: 700, color: '#1a2238',
  margin: '0 0 8px', textAlign: 'center',
  fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
};
const subheadingStyle: React.CSSProperties = {
  fontSize: 14, color: '#737373', lineHeight: 1.6,
  textAlign: 'center', margin: '0 0 16px',
};
const modeDesc: React.CSSProperties = {
  fontSize: 12, color: '#9ca3af', textAlign: 'center',
  margin: '0 0 24px', lineHeight: 1.5,
};
const otpRow: React.CSSProperties = {
  display: 'flex', gap: 10, marginBottom: 28,
};
const otpInput: React.CSSProperties = {
  width: 50, height: 58,
  border: '2px solid #e5e5e5', borderRadius: 12,
  textAlign: 'center', fontSize: 22, fontWeight: 700,
  color: '#1a2238', background: '#fafafa',
  outline: 'none', cursor: 'text',
  fontFamily: "'IBM Plex Mono', monospace",
  transition: 'border-color 0.15s',
};
const otpInputFilled: React.CSSProperties = {
  borderColor: '#1a2238', background: '#fff',
};
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px 0',
  background: '#1a2238', color: '#fff',
  border: 'none', borderRadius: 12,
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
  marginBottom: 20,
};
const disabledBtn: React.CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const helpText: React.CSSProperties = {
  fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.7, margin: 0,
};

// Linked state styles
const linkedIconWrap: React.CSSProperties = { marginBottom: 20 };
const linkedTitle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: '#1a2238',
  margin: '0 0 8px', textAlign: 'center',
  fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
};
const linkedDesc: React.CSSProperties = {
  fontSize: 14, color: '#737373', textAlign: 'center',
  lineHeight: 1.6, margin: '0 0 24px',
};
const parentCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '16px 20px', width: '100%',
  background: '#f0fdf4', border: '1px solid #bbf7d0',
  borderRadius: 14, marginBottom: 28,
  position: 'relative',
};
const parentAvatarWrap: React.CSSProperties = { flexShrink: 0 };
const parentAvatar: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%',
  background: '#1a2238', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, fontWeight: 700,
  fontFamily: "'Bricolage Grotesque', sans-serif",
};
const parentLabel: React.CSSProperties = {
  margin: 0, fontSize: 11, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
};
const parentName: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#1a2238',
};
const linkedBadge: React.CSSProperties = {
  position: 'absolute', top: 12, right: 14,
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 600, color: '#16a34a',
};

// Spinner styles
const spinnerWrap: React.CSSProperties = { marginBottom: 16 };
const spinner: React.CSSProperties = {
  width: 32, height: 32,
  border: '3px solid #e5e7eb',
  borderTopColor: '#1a2238',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export default StudentLinkAccount;
