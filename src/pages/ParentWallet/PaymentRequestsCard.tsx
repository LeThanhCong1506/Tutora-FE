import styles from './styles.module.css';

const PaymentRequestsCard = () => {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.sectionTitle}>Payment Requests</h3>
            </div>
            <div className={styles.rowBetween}>
                <div className={styles.rowInfo}>
                    <span className={styles.value}>January Monthly Tuition</span>
                    <span className={styles.meta}>Math & Physics • Due Jan 25, 2025</span>
                </div>
                <div className={styles.rowActions}>
                    <div className={styles.amountBlock}>
                        <span className={styles.amount}>$320.00</span>
                        <span className={styles.status}>Pending</span>
                    </div>
                    <button className={styles.primaryButtonSmall} type="button">
                        Pay Now
                    </button>
                    <button className={styles.secondaryButtonSmall} type="button">
                        Review
                    </button>
                </div>
            </div>
        </section>
    );
};

export default PaymentRequestsCard;
