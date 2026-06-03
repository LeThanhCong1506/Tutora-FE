'use client';

/**
 * Header — Client Component.
 *
 * Port từ `src/components/Header/Header.tsx` với các thay đổi:
 *  - `useLocation` (react-router) → `usePathname` (next/navigation)
 *  - `<Link to>` → `<Link href>`
 *  - `useNavigate().navigate()` → chỉ cần redirect sau logout → dùng `window.location.href`
 *    (reload hẳn để đồng bộ storage giữa Next + Vite iframes nếu có)
 *  - `getCurrentUser`/`getUserInfoFromToken` (đụng storage adapter / Zalo SDK)
 *    → `readAuthInfo` trong `_lib/read-auth.ts` (thuần localStorage + typeof window guard)
 *
 * SSR note: auth state render sau mount (useEffect). Server render ra markup
 * "chưa login" để tránh hydration mismatch — sau mount, nếu có token thì rerender
 * thành UI logged-in. Đây là pattern dùng khi prerendered HTML khác client state.
 */

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Popconfirm } from 'antd';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { clearStoredUser, decodeJwtPayload, getPortalPath } from '../_lib/read-auth';

type AuthState = {
  isLoggedIn: boolean;
  displayName: string;
  portalPath: string;
};

const INITIAL_AUTH: AuthState = {
  isLoggedIn: false,
  displayName: 'User',
  portalPath: '/login',
};

const AUTH_STORAGE_KEY = 'TUTORA_user_data';

function subscribeAuthStorage(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', onStoreChange);
  window.addEventListener('tutora-auth-change', onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('tutora-auth-change', onStoreChange);
  };
}

function getAuthSnapshot() {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function getServerAuthSnapshot() {
  return '';
}

function parseAuthSnapshot(snapshot: string): AuthState {
  if (!snapshot) return INITIAL_AUTH;

  try {
    const user = JSON.parse(snapshot) as { accessToken?: string };
    if (!user.accessToken) return INITIAL_AUTH;

    const payload = decodeJwtPayload(user.accessToken);
    const displayName =
      payload?.fullname ||
      (payload?.firstName && payload?.lastName ? `${payload.firstName} ${payload.lastName}` : null) ||
      payload?.email?.split('@')[0] ||
      'User';

    return {
      isLoggedIn: true,
      displayName,
      portalPath: getPortalPath(payload?.role ?? null),
    };
  } catch {
    return INITIAL_AUTH;
  }
}

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authSnapshot = useSyncExternalStore(
    subscribeAuthStorage,
    getAuthSnapshot,
    getServerAuthSnapshot
  );
  const auth = useMemo(() => parseAuthSnapshot(authSnapshot), [authSnapshot]);

  // Ẩn user info trên trang đăng ký/đăng nhập (dù Next rewrite sang Vite,
  // user có thể landed trực tiếp nếu vào qua sai URL)
  const isAuthPage = pathname === '/register' || pathname === '/login';

  const confirmLogout = () => {
    clearStoredUser();
    window.dispatchEvent(new Event('tutora-auth-change'));
    setIsMenuOpen(false);
    // Reload về login (rewrite sang Vite xử lý)
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo-link">
          <div className="logo-icon">
            <Image src="/tutora-logo.png" alt="Tutora" width={38} height={38} priority />
          </div>
          <div className="logo-text">
            <span className="logo-name">TUTORA</span>
            <span className="logo-tagline">Nền tảng gia sư K-12</span>
          </div>
        </Link>
        <nav className="main-nav">
          <Link href="/tutor-search" className="nav-link">
            TÌM GIA SƯ
          </Link>
          <Link href="/#learning-path" className="nav-link">
            LỘ TRÌNH HỌC
          </Link>
          <Link href="/#lms" className="nav-link">
            THEO DÕI HỌC TẬP
          </Link>
          <Link href="/#about" className="nav-link">
            VỀ CHÚNG TÔI
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="auth-buttons">
          {auth.isLoggedIn && !isAuthPage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                href={auth.portalPath}
                className="btn-portal-icon"
                style={{
                  color: 'var(--color-navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Go to Portal"
              >
                <LayoutDashboard size={20} />
              </Link>

              <Popconfirm
                title="Đăng xuất"
                description="Bạn có chắc chắn muốn đăng xuất?"
                onConfirm={confirmLogout}
                okText="Đồng ý"
                cancelText="Hủy"
                placement="bottomRight"
              >
                <button
                  type="button"
                  className="btn-logout-icon"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  title="Đăng xuất"
                >
                  <LogOut size={20} />
                </button>
              </Popconfirm>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-login">
                LOG IN
              </Link>
              <Link href="/register" className="btn-signup">
                SIGN UP
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav">
            <Link href="/tutor-search" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              TÌM GIA SƯ
            </Link>
            <Link href="/#learning-path" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              LỘ TRÌNH HỌC
            </Link>
            <Link href="/#lms" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              THEO DÕI HỌC TẬP
            </Link>
            <Link href="/#about" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              VỀ CHÚNG TÔI
            </Link>
          </nav>

          {/* Mobile Auth */}
          <div className="mobile-auth">
            {auth.isLoggedIn && !isAuthPage ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #d4b483',
                      background: '#631b1b',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {auth.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{auth.displayName}</span>
                </div>

                <Link
                  href={auth.portalPath}
                  className="btn-signup"
                  style={{ width: '100%', textAlign: 'center' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  TRANG CÁ NHÂN
                </Link>

                <Popconfirm
                  title="Đăng xuất"
                  description="Bạn có muốn đăng xuất không?"
                  onConfirm={confirmLogout}
                  okText="Có"
                  cancelText="Không"
                >
                  <button
                    type="button"
                    className="btn-login"
                    style={{
                      width: '100%',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    LOG OUT
                  </button>
                </Popconfirm>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-login" onClick={() => setIsMenuOpen(false)}>
                  LOG IN
                </Link>
                <Link href="/register" className="btn-signup" onClick={() => setIsMenuOpen(false)}>
                  SIGN UP
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
