import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProfileDropdown.module.css';

// Types
export interface ProfileMenuItem {
    /** Stable key — also used as the `to` target when `onSelect` is absent */
    key: string;
    label: string;
    /** Material Symbols icon name */
    materialIcon?: string;
    /** React component icon (SVG) — alternative to materialIcon */
    icon?: React.ComponentType;
    /** Small text on the right (shortcut hint, counter, …) */
    hint?: string;
    /** Route to navigate to when selected. Ignored when `onSelect` is set. */
    path?: string;
    /** Custom handler. Receives nothing; the menu closes right after. */
    onSelect?: () => void;
    /** Renders in the danger colour (logout, destructive actions) */
    danger?: boolean;
    /** Starts a new visual group — a hairline divider is drawn above this item */
    startsGroup?: boolean;
}

/**
 * `header` — pill trigger ở thanh header, menu thả xuống (mặc định).
 * `sidebar` — trigger tuỳ biến (user card đáy drawer), menu bật LÊN và render qua
 * portal: `<aside>` sidebar có `overflow: auto/hidden` + `z-index: 300` nên popup
 * `position: absolute` bên trong sẽ bị cắt mất.
 */
export type ProfileDropdownVariant = 'header' | 'sidebar';

export interface ProfileDropdownRenderTriggerArgs {
    open: boolean;
    toggle: () => void;
    /**
     * Callback ref — gắn vào phần tử trigger để menu biết vị trí neo.
     * Đặt tên khác `ref` để tránh false-positive của eslint rule `react-hooks/refs`
     * (rule pattern-match theo tên key, không phân biệt được đây là setter thuần,
     * không hề đọc `.current` lúc render).
     */
    setTriggerNode: (node: HTMLButtonElement | null) => void;
}

export interface ProfileDropdownProps {
    name: string;
    role: string;
    initials: string;
    avatarUrl?: string;
    /** Dòng phụ dưới tên trong menu header. Bỏ trống thì chỉ hiện tên. */
    subtitle?: string;
    /** Whether to render the avatar image; falls back to initials when false */
    showAvatarImage?: boolean;
    items: ProfileMenuItem[];
    onNavigate: (path: string) => void;
    variant?: ProfileDropdownVariant;
    /** Bắt buộc với variant `sidebar` — nơi gọi tự dựng trigger (vd user card). */
    renderTrigger?: (args: ProfileDropdownRenderTriggerArgs) => React.ReactNode;
}

interface MenuPosition {
    left: number;
    bottom: number;
    width: number;
}

const SIDEBAR_MENU_GAP = 10;
const SIDEBAR_MENU_MIN_WIDTH = 240;

// Component
const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
    name,
    role,
    initials,
    avatarUrl,
    subtitle,
    showAvatarImage = true,
    items,
    onNavigate,
    variant = 'header',
    renderTrigger,
}) => {
    const [open, setOpen] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isSidebar = variant === 'sidebar';

    // Menu bật lên phía trên trigger, bám mép trái của trigger và không tràn viewport.
    const updateMenuPosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        setMenuPosition({
            left: Math.max(8, rect.left),
            bottom: Math.max(8, window.innerHeight - rect.top + SIDEBAR_MENU_GAP),
            width: Math.max(SIDEBAR_MENU_MIN_WIDTH, Math.min(rect.width, window.innerWidth - 16)),
        });
    }, []);

    useLayoutEffect(() => {
        if (!isSidebar || !open) return undefined;

        updateMenuPosition();
        // `true` để bắt cả scroll bên trong sidebar (scroll không nổi bọt lên window).
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isSidebar, open, updateMenuPosition]);

    // Close on outside click / Escape
    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            // Menu ở variant sidebar nằm ngoài containerRef (portal) nên phải kiểm tra riêng.
            if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleSelect = (item: ProfileMenuItem) => {
        setOpen(false);
        if (item.onSelect) {
            item.onSelect();
            return;
        }
        const target = item.path ?? item.key;
        if (target.startsWith('/')) onNavigate(target);
    };

    const showImage = showAvatarImage && Boolean(avatarUrl) && !imageFailed;

    const renderAvatar = (className: string, initialsClassName: string) =>
        showImage ? (
            <img
                className={className}
                src={avatarUrl}
                alt={name}
                onError={() => setImageFailed(true)}
            />
        ) : (
            <span className={initialsClassName}>{initials}</span>
        );

    const toggle = () => setOpen((prev) => !prev);

    // Callback ref thay vì đưa thẳng ref object ra ngoài — nơi gọi chỉ cần gắn vào
    // element, không đọc `.current` trong lúc render.
    const setTriggerNode = useCallback((node: HTMLButtonElement | null) => {
        triggerRef.current = node;
    }, []);

    const menu = (
        <div
            ref={menuRef}
            className={`${styles.menu} ${isSidebar ? styles.menuSidebar : ''}`}
            role="menu"
            style={
                isSidebar && menuPosition
                    ? {
                          position: 'fixed',
                          left: menuPosition.left,
                          bottom: menuPosition.bottom,
                          top: 'auto',
                          right: 'auto',
                          width: menuPosition.width,
                      }
                    : undefined
            }
        >
            <div className={styles.menuHeader}>
                <span className={styles.menuAvatar}>
                    {renderAvatar(styles.menuAvatarImg, styles.menuInitials)}
                </span>
                <div className={styles.menuIdentity}>
                    <span className={styles.menuName}>{name}</span>
                    {subtitle && <span className={styles.menuSubtitle}>{subtitle}</span>}
                </div>
            </div>

            <div className={styles.menuList}>
                {items.map((item) => (
                    <React.Fragment key={item.key}>
                        {item.startsGroup && <div className={styles.menuDivider} />}
                        <button
                            type="button"
                            role="menuitem"
                            className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                            onClick={() => handleSelect(item)}
                        >
                            {item.icon ? (
                                <item.icon />
                            ) : item.materialIcon ? (
                                <span className={`material-symbols-outlined ${styles.menuIcon}`}>
                                    {item.materialIcon}
                                </span>
                            ) : (
                                <span className={styles.menuIcon} />
                            )}
                            <span className={styles.menuLabel}>{item.label}</span>
                            {item.hint && <span className={styles.menuHint}>{item.hint}</span>}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    return (
        <div className={`${styles.container} ${isSidebar ? styles.containerSidebar : ''}`} ref={containerRef}>
            {renderTrigger ? (
                // setTriggerNode chỉ GHI triggerRef.current (callback ref chuẩn), không đọc —
                // rule react-hooks/refs không phân biệt được ghi với đọc nên báo nhầm ở đây.
                // eslint-disable-next-line react-hooks/refs
                renderTrigger({ open, toggle, setTriggerNode })
            ) : (
                <button
                    type="button"
                    ref={triggerRef}
                    className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="Mở menu tài khoản"
                >
                    <span className={styles.triggerInfo}>
                        <span className={styles.triggerName}>{name}</span>
                        <span className={styles.triggerRole}>{role}</span>
                    </span>
                    <span className={styles.triggerAvatar}>
                        {renderAvatar(styles.triggerAvatarImg, styles.triggerInitials)}
                    </span>
                    <span className={`material-symbols-outlined ${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
                        expand_more
                    </span>
                </button>
            )}

            {open &&
                (isSidebar
                    ? // Chờ đo xong vị trí mới render, tránh nháy một frame ở góc trái trên.
                      menuPosition && createPortal(menu, document.body)
                    : menu)}
        </div>
    );
};

export default ProfileDropdown;
