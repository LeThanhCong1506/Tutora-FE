import styles from './styles.module.css';

const WalletBalanceHeroCard = () => {
    return (
        <section className={`${styles.card} ${styles.heroCard}`}>
            <div className={styles.heroTop}>
                <div className={styles.heroInfo}>
                    <span className={styles.label}>Current Balance</span>
                    <span className={styles.balance}>$240.00</span>
                    <span className={styles.subtle}>Approximately 6 lessons remaining</span>
                </div>
                <span className={styles.pill}>Sufficient</span>
            </div>

            <div className={styles.nextCharge}>
                <span className={styles.miniLabel}>Next Scheduled Charge</span>
                <div className={styles.nextChargeRow}>
                    <div className={styles.nextChargeInfo}>
                        <span className={styles.value}>Jan 30, 2025</span>
                        <span className={styles.meta}>Math with Sarah Mitchell • 4 lessons</span>
                    </div>
                    <span className={styles.amount}>$160.00</span>
                </div>
            </div>

            <div className={styles.actions}>
                <button className={styles.primaryButton} type="button">
                    Top Up
                </button>
                <button className={styles.secondaryButton} type="button">
                    View Transactions
                </button>
            </div>
        </section>
    );
};

export default WalletBalanceHeroCard;
