import styles from './styles.module.css';

const RecentTransactionsCard = () => {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
                <h3 className={styles.sectionTitle}>Recent Transactions</h3>
                <div className={styles.filterRow}>
                    <button className={styles.filterButton} type="button">
                        All types
                    </button>
                    <button className={styles.filterButton} type="button">
                        All status
                    </button>
                </div>
            </div>

            <div className={styles.transactionList}>
                <div className={styles.transactionRow}>
                    <div className={styles.transactionInfo}>
                        <span className={`${styles.transactionIcon} ${styles.transactionIconTopup}`} aria-hidden="true" />
                        <div>
                            <span className={styles.value}>Top Up via MoMo</span>
                            <span className={styles.meta}>Jan 20, 2025 • 2:34 PM</span>
                        </div>
                    </div>
                    <div className={styles.transactionAmount}>
                        <span className={styles.value}>+$500.00</span>
                        <span className={styles.statusPill}>Completed</span>
                    </div>
                    <span className={styles.chevron} aria-hidden="true" />
                </div>

                <div className={styles.transactionRow}>
                    <div className={styles.transactionInfo}>
                        <span className={`${styles.transactionIcon} ${styles.transactionIconLesson}`} aria-hidden="true" />
                        <div>
                            <span className={styles.value}>Math Lesson Payment</span>
                            <span className={styles.meta}>Jan 18, 2025 • with Sarah Mitchell</span>
                        </div>
                    </div>
                    <div className={styles.transactionAmount}>
                        <span className={styles.value}>-$40.00</span>
                        <span className={styles.statusPill}>Completed</span>
                    </div>
                    <span className={styles.chevron} aria-hidden="true" />
                </div>

                <div className={styles.transactionRow}>
                    <div className={styles.transactionInfo}>
                        <span className={`${styles.transactionIcon} ${styles.transactionIconLesson}`} aria-hidden="true" />
                        <div>
                            <span className={styles.value}>Physics Lesson Payment</span>
                            <span className={styles.meta}>Jan 16, 2025 • with Mr. Davis</span>
                        </div>
                    </div>
                    <div className={styles.transactionAmount}>
                        <span className={styles.value}>-$40.00</span>
                        <span className={styles.statusPill}>Completed</span>
                    </div>
                    <span className={styles.chevron} aria-hidden="true" />
                </div>

                <div className={styles.transactionRow}>
                    <div className={styles.transactionInfo}>
                        <span className={`${styles.transactionIcon} ${styles.transactionIconRefund}`} aria-hidden="true" />
                        <div>
                            <span className={styles.value}>Refund - Cancelled Lesson</span>
                            <span className={styles.meta}>Jan 14, 2025 • Math lesson</span>
                        </div>
                    </div>
                    <div className={styles.transactionAmount}>
                        <span className={styles.value}>+$40.00</span>
                        <span className={styles.statusPill}>Completed</span>
                    </div>
                    <span className={styles.chevron} aria-hidden="true" />
                </div>

                <div className={styles.transactionRow}>
                    <div className={styles.transactionInfo}>
                        <span className={`${styles.transactionIcon} ${styles.transactionIconTopup}`} aria-hidden="true" />
                        <div>
                            <span className={styles.value}>Top Up via ZaloPay</span>
                            <span className={styles.meta}>Jan 10, 2025 • 11:20 AM</span>
                        </div>
                    </div>
                    <div className={styles.transactionAmount}>
                        <span className={styles.value}>+$200.00</span>
                        <span className={styles.statusPill}>Completed</span>
                    </div>
                    <span className={styles.chevron} aria-hidden="true" />
                </div>
            </div>

            <button className={styles.linkButton} type="button">
                View all transactions
            </button>
        </section>
    );
};

export default RecentTransactionsCard;
