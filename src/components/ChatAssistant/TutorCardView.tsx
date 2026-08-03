import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { TutorCard } from '../../services/assistant.service';
import styles from './ChatAssistant.module.css';

const formatPrice = (v?: number | null): string =>
  v == null ? '' : new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const TutorCardView: React.FC<{ card: TutorCard }> = ({ card }) => (
  <div className={`${styles.card} ${card.isBestMatch ? styles.cardBest : ''}`}>
    {card.isBestMatch && <span className={styles.bestBadge}>PHÙ HỢP NHẤT</span>}

    <div className={styles.cardHead}>
      {card.avatarUrl ? (
        <img className={styles.cardAvatar} src={card.avatarUrl} alt={card.name} />
      ) : (
        <div className={styles.cardAvatarPlaceholder} aria-hidden />
      )}
      <div>
        <div className={styles.cardName}>{card.name}</div>
        {card.rating != null && (
          <div className={styles.cardRating}>
            ⭐ {card.rating.toFixed(1)}
            {card.totalReviews != null ? ` (${card.totalReviews})` : ''}
          </div>
        )}
      </div>
    </div>

    {card.pricePerHour != null && (
      <div className={styles.cardPrice}>
        {formatPrice(card.pricePerHour)}
        <span className={styles.cardPriceUnit}> / giờ</span>
      </div>
    )}

    {card.highlights.length > 0 && (
      <ul className={styles.cardHighlights}>
        {card.highlights.map((h, i) => (
          <li key={i} className={styles.cardHighlight}>
            <Check size={15} className={styles.cardCheck} />
            {h}
          </li>
        ))}
      </ul>
    )}

    <Link className={styles.cardCta} to={card.profileUrl}>
      {card.ctaLabel} →
    </Link>
  </div>
);

export default TutorCardView;
