import styles from './styles.module.css';

const QuickTopUpCard = () => {
    return (
        <section className={`${styles.card} ${styles.heroCard}`}>
            <h3 className={styles.sectionTitle}>Quick Top-Up</h3>

            <div className={styles.sectionBlock}>
                <span className={styles.label}>Choose Amount</span>
                <div className={styles.optionRow}>
                    <button className={styles.amountButton} type="button">
                        $200
                    </button>
                    <button className={`${styles.amountButton} ${styles.amountButtonActive}`} type="button">
                        $500
                    </button>
                    <button className={styles.amountButton} type="button">
                        $1,000
                    </button>
                    <button className={`${styles.amountButton} ${styles.amountButtonCustom}`} type="button">
                        <span className={styles.customIcon} aria-hidden="true" />
                        Custom
                    </button>
                </div>
            </div>

            <div className={styles.sectionBlock}>
                <span className={styles.label}>Payment Method</span>
                <div className={styles.methodRow}>
                    <button className={`${styles.methodCard} ${styles.methodCardActive}`} type="button">
                        <span className={`${styles.methodIcon} ${styles.methodIconMomo}`} aria-hidden="true" />
                        <span className={styles.methodLabel}>MoMo</span>
                    </button>
                    <button className={styles.methodCard} type="button">
                        <span className={`${styles.methodIcon} ${styles.methodIconZalo}`} aria-hidden="true" />
                        <span className={styles.methodLabelMuted}>ZaloPay</span>
                    </button>
                    <button className={styles.methodCard} type="button">
                        <span className={`${styles.methodIcon} ${styles.methodIconBank}`} aria-hidden="true" />
                        <span className={styles.methodLabelMuted}>Bank Transfer</span>
                    </button>
                    <button className={styles.methodCard} type="button">
                        <span className={`${styles.methodIcon} ${styles.methodIconCard}`} aria-hidden="true" />
                        <span className={styles.methodLabelMuted}>Card</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default QuickTopUpCard;
