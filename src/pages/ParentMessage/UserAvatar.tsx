import { useState } from 'react';
import styles from './styles.module.css';

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  variant: 'conversation' | 'header';
  loading?: 'eager' | 'lazy';
};

const getNameInitial = (name?: string | null) => {
  const normalizedName = name?.trim();
  return normalizedName ? Array.from(normalizedName)[0].toLocaleUpperCase('vi-VN') : '?';
};

const UserAvatar = ({ name, src, variant, loading = 'eager' }: UserAvatarProps) => {
  const normalizedSrc = src?.trim() || '';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const avatarClassName = variant === 'header' ? styles.chatAvatar : styles.messageAvatar;
  const shouldShowImage = Boolean(normalizedSrc) && failedSrc !== normalizedSrc;

  if (shouldShowImage) {
    return (
      <img
        alt=""
        className={avatarClassName}
        src={normalizedSrc}
        loading={loading}
        onError={() => setFailedSrc(normalizedSrc)}
      />
    );
  }

  return (
    <span className={`${avatarClassName} ${styles.avatarFallback}`} aria-hidden="true">
      {getNameInitial(name)}
    </span>
  );
};

export default UserAvatar;
