import React, { useEffect, useRef, useState } from 'react';
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

export interface ProfileDropdownProps {
    name: string;
    role: string;
    initials: string;
    avatarUrl?: string;
    /** Secondary line under the name inside the menu header (usually email) */
    subtitle?: string;
    /** Whether to render the avatar image; falls back to initials when false */
    showAvatarImage?: boolean;
    items: ProfileMenuItem[];
    onNavigate: (path: string) => void;
}

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
}) => {
    const [open, setOpen] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on outside click / Escape
    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
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

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                ref={triggerRef}
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                onClick={() => setOpen((prev) => !prev)}
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

            {open && (
                <div className={styles.menu} role="menu">
                    <div className={styles.menuHeader}>
                        <span className={styles.menuAvatar}>
                            {renderAvatar(styles.menuAvatarImg, styles.menuInitials)}
                        </span>
                        <div className={styles.menuIdentity}>
                            <span className={styles.menuName}>{name}</span>
                            <span className={styles.menuSubtitle}>{subtitle || role}</span>
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
            )}
        </div>
    );
};

export default ProfileDropdown;
