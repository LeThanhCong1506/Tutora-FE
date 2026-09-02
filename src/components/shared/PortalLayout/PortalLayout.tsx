import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './PortalLayout.module.css';

import ProfileDropdown, { type ProfileMenuItem } from './ProfileDropdown';
import { ConfirmDialog } from '../ConfirmDialog';
import Header from '../../Header/Header';
import { clearUserFromStorage, getUserInfoFromToken, getUserProfile } from '../../../services/auth.service';
import { isZaloMiniApp } from '../../../services/zalo-env';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { getRoleLabel } from '../../../utils/roleLabel';

const HEADER_PROFILE_HIDDEN_BREAKPOINT = 1024;

// ─── Shared Icons (Logo, Menu, Close, Logout, Notification) ───

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
    </svg>
);

// ─── Types ───

export interface NavItem {
    path: string;
    label: string;
    /** React component icon (SVG) — used by Tutor, Parent, Student portals */
    icon?: React.ComponentType;
    /** Material Symbols icon name — used by Admin portal */
    materialIcon?: string;
    /** Show a numeric badge next to the label */
    badge?: number;
    /** data-tour attribute value */
    dataTour?: string;
}

export interface PortalLayoutProps {
    /** Navigation items for the sidebar */
    navItems: NavItem[];
    /** Role label displayed next to user name in header (fallback from token) */
    userRole?: string;
    /** Custom active-path matcher. Defaults to `location.pathname.startsWith(path)` */
    isActive?: (path: string, locationPathname: string) => boolean;
    /** Extra content rendered on the left side of the header (e.g., next lesson indicator) */
    headerLeft?: React.ReactNode;
    /** Extra items appended at the bottom of the nav list (e.g., tour replay button) */
    sidebarNavFooter?: React.ReactNode;
    /** Whether to show the user card at the bottom of sidebar. Default: true */
    showSidebarUserCard?: boolean;
    /** Whether to show avatar image (from profile API) or just initials. Default: true */
    showAvatarImage?: boolean;
    /** Whether to show notification dropdown (with SignalR). Default: true */
    showNotificationDropdown?: boolean;
    /** Quick actions listed in the header profile dropdown. */
    profileMenuItems?: ProfileMenuItem[];
    /** Additional content rendered after the layout (e.g., tour modal) */
    extras?: React.ReactNode;
    /** data-tour attribute on the sidebar element */
    sidebarDataTour?: string;
    /** Callback when sidebar opens (for tour integration) */
    onSidebarOpen?: () => void;
    /** Callback when sidebar closes (for tour integration) */
    onSidebarClose?: () => void;
    /** External sidebar open state control (for tour) */
    sidebarOpenExternal?: boolean;
    children?: React.ReactNode;
}

// ─── Helpers ───

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const generateAvatarUrl = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d4a3e&color=f2f0e4&size=128`;

// ─── Component ───

const PortalLayout: React.FC<PortalLayoutProps> = ({
    navItems,
    userRole,
    isActive: isActiveProp,
    sidebarNavFooter,
    showSidebarUserCard = true,
    showAvatarImage = true,
    profileMenuItems,
    extras,
    sidebarDataTour,
    onSidebarOpen,
    onSidebarClose,
    sidebarOpenExternal,
    children,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const inMiniApp = isZaloMiniApp();
    // Desktop: user card chỉ hiển thị tên — menu tài khoản đã có ở header.
    const userCardOpensMenu = useIsMobile(HEADER_PROFILE_HIDDEN_BREAKPOINT);

    // ── Sidebar state ──
    const [sidebarOpenInternal, setSidebarOpenInternal] = useState(false);
    const sidebarOpen = sidebarOpenExternal ?? sidebarOpenInternal;

    const setSidebarOpen = (open: boolean) => {
        setSidebarOpenInternal(open);
        if (open) onSidebarOpen?.();
        else onSidebarClose?.();
    };

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpenInternal(false);
    }, [location.pathname]);

    // Scroll lock when sidebar open on mobile
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    // ── User data ──
    const [userData, setUserData] = useState({
        name: 'User',
        initials: 'U',
        role: getRoleLabel(userRole),
        email: '',
        avatar: generateAvatarUrl('User'),
    });

    useEffect(() => {
        const user = getUserInfoFromToken();
        if (!user) return;

        const displayName = user.fullname ||
            (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
            user.email?.split('@')[0] ||
            'User';
        const initials = getInitials(displayName);

        setUserData({
            name: displayName,
            initials,
            role: getRoleLabel(userRole || user.role),
            email: user.email || '',
            avatar: generateAvatarUrl(displayName),
        });

        // Fetch real avatar from profile API
        if (showAvatarImage && user.userId) {
            getUserProfile().then((profile) => {
                const avatar = profile?.content?.avatarUrl || profile?.content?.avatarurl;
                if (avatar) {
                    setUserData(prev => ({ ...prev, avatar }));
                }
            }).catch(() => { /* keep fallback avatar */ });
        }
    }, [userRole, showAvatarImage]);

    // Listen for avatar updates dispatched by account pages after upload
    useEffect(() => {
        const handleAvatarUpdated = (e: Event) => {
            const newUrl = (e as CustomEvent<string>).detail;
            if (newUrl) {
                setUserData(prev => ({ ...prev, avatar: newUrl }));
            }
        };
        window.addEventListener('avatar-updated', handleAvatarUpdated);
        return () => window.removeEventListener('avatar-updated', handleAvatarUpdated);
    }, []);

    // Listen for name updates dispatched by account pages after profile save
    useEffect(() => {
        const handleNameUpdated = (e: Event) => {
            const newName = (e as CustomEvent<string>).detail;
            if (newName) {
                setUserData(prev => ({ ...prev, name: newName, initials: getInitials(newName) }));
            }
        };
        window.addEventListener('profile-name-updated', handleNameUpdated);
        return () => window.removeEventListener('profile-name-updated', handleNameUpdated);
    }, []);

    // Profile dropdown
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleConfirmLogout = async () => {
        setShowLogoutConfirm(false);
        await clearUserFromStorage();
        toast.success('Đăng xuất thành công!');
        navigate('/login');
    };

    // Portal shortcuts first, then the always-present account actions.
    const dropdownItems = useMemo<ProfileMenuItem[]>(() => [
        ...(profileMenuItems ?? []),
        {
            key: 'logout',
            label: 'Đăng xuất',
            materialIcon: 'logout',
            danger: true,
            startsGroup: true,
            onSelect: () => setShowLogoutConfirm(true),
        },
    ], [profileMenuItems]);

    // Phần nhìn của user card — dùng chung cho cả bản tĩnh (desktop) lẫn bản trigger (mobile).
    const userCardBody = (
        <>
            <div className={styles.userAvatar}>
                {showAvatarImage ? (
                    <>
                        <img
                            src={userData.avatar}
                            alt={userData.name}
                            className={styles.userAvatarImg}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const span = e.currentTarget.parentElement?.querySelector('span');
                                if (span) (span as HTMLElement).style.display = 'flex';
                            }}
                        />
                        <span className={styles.userInitials} style={{ display: 'none' }}>
                            {userData.initials}
                        </span>
                    </>
                ) : (
                    <span className={styles.userInitials}>{userData.initials}</span>
                )}
            </div>
            <div className={styles.userInfo}>
                <span className={styles.userName}>{userData.name}</span>
                <span className={styles.userRoleText}>{userData.role}</span>
            </div>
        </>
    );

    // ── Active path check ──
    const checkActive = (path: string) => {
        if (isActiveProp) return isActiveProp(path, location.pathname);
        return location.pathname.startsWith(path);
    };

    // ── Render ──
    return (
        <div className={`${styles.layout} portal-layout`}>
            {/* Mobile Sidebar Overlay — ẩn trong Mini App */}
            {!inMiniApp && sidebarOpen && (
                <div
                    className={styles.sidebarOverlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — ẩn trong Mini App (dùng bottom nav thay thế) */}
            {!inMiniApp && <aside
                className={`${styles.sidebar} portal-sidebar ${sidebarOpen ? styles.sidebarOpen : ''}`}
                {...(sidebarDataTour ? { 'data-tour': sidebarDataTour } : {})}
            >
                <button
                    className={styles.sidebarClose}
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Đóng menu"
                >
                    <CloseIcon />
                </button>

                {/* Navigation */}
                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => (
                        <div
                            key={item.path}
                            className={`${styles.navItem} ${checkActive(item.path) ? styles.navItemActive : ''}`}
                            title={item.label}
                            {...(item.dataTour ? { 'data-tour': item.dataTour } : {})}
                            onClick={() => {
                                navigate(item.path);
                                setSidebarOpen(false);
                            }}
                        >
                            {/* Render SVG component icon or Material Symbol */}
                            {item.icon ? (
                                <item.icon />
                            ) : item.materialIcon ? (
                                <span className={`material-symbols-outlined ${styles.materialIcon}`}>
                                    {item.materialIcon}
                                </span>
                            ) : null}
                            <span className={styles.navText}>{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                                <>
                                    {/* Floating dot — hiển thị khi sidebar collapsed */}
                                    <span className={styles.navBadgeDot}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                    {/* Inline badge — hiển thị khi sidebar expanded (hover) */}
                                    <span className={styles.navBadge}>{item.badge}</span>
                                </>
                            )}
                        </div>
                    ))}
                    {sidebarNavFooter}
                </nav>

                {/* User Card ở đáy sidebar. Desktop chỉ hiển thị tên/role — menu tài khoản
                    đã nằm ở header. Dưới 1024px header ẩn dropdown nên card thành trigger. */}
                {showSidebarUserCard && (
                    <div className={styles.sidebarUser}>
                        {userCardOpensMenu ? (
                            <ProfileDropdown
                                variant="sidebar"
                                name={userData.name}
                                role={userData.role}
                                initials={userData.initials}
                                avatarUrl={userData.avatar}
                                showAvatarImage={showAvatarImage}
                                items={dropdownItems}
                                onNavigate={(path) => navigate(path)}
                                renderTrigger={({ open, toggle, setTriggerNode }) => (
                                    <button
                                        type="button"
                                        ref={setTriggerNode}
                                        className={`${styles.userCard} ${open ? styles.userCardOpen : ''}`}
                                        onClick={toggle}
                                        aria-haspopup="menu"
                                        aria-expanded={open}
                                        aria-label="Mở menu tài khoản"
                                    >
                                        {userCardBody}
                                        <span
                                            className={`material-symbols-outlined ${styles.userCardChevron}`}
                                            aria-hidden="true"
                                        >
                                            unfold_more
                                        </span>
                                    </button>
                                )}
                            />
                        ) : (
                            <div className={`${styles.userCard} ${styles.userCardStatic}`}>
                                {userCardBody}
                            </div>
                        )}
                    </div>
                )}
            </aside>}

            {/* Main Content */}
            <main
                className={styles.main}
                style={inMiniApp ? { marginLeft: 0, paddingBottom: '60px' } : undefined}
            >
                {!inMiniApp && (
                    <Header
                        variant="portal"
                        profileMenuItems={dropdownItems}
                        onPortalMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                        portalMenuOpen={sidebarOpen}
                    />
                )}
                {/* Page Content */}
                <div className={styles.contentArea}>
                    {children || <Outlet />}
                </div>
            </main>

            {/* Portal-specific extras (tour modals, etc.) */}
            {extras}

            {/* Bottom Tab Navigation — chỉ hiển thị trong Zalo Mini App */}
            {inMiniApp && (
                <nav style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px',
                    backgroundColor: '#1a2238', display: 'flex', alignItems: 'stretch',
                    zIndex: 100, borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                    {navItems.slice(0, 5).map((item) => {
                        const active = checkActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3,
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    color: active ? '#d4b483' : 'rgba(242,240,228,0.55)',
                                    padding: '4px 2px',
                                }}
                            >
                                {item.icon ? <item.icon /> : item.materialIcon ? (
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        {item.materialIcon}
                                    </span>
                                ) : null}
                                <span style={{
                                    fontSize: 10, lineHeight: '13px', fontFamily: "'IBM Plex Sans', sans-serif",
                                    whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {item.label}
                                </span>
                                {item.badge != null && item.badge > 0 && (
                                    <span style={{
                                        position: 'absolute', top: 6, right: 'calc(50% - 14px)',
                                        backgroundColor: '#ef4444', color: '#fff',
                                        borderRadius: 9999, fontSize: 9, padding: '1px 4px',
                                        lineHeight: '12px',
                                    }}>{item.badge}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            )}

            <ConfirmDialog
                open={showLogoutConfirm}
                type="warning"
                title="Đăng xuất"
                message="Bạn có chắc muốn kết thúc phiên làm việc hiện tại không?"
                confirmText="Đăng xuất"
                onConfirm={handleConfirmLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </div>
    );
};

export default PortalLayout;
