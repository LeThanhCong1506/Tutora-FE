import { formatCurrency, formatDateTime, formatTransactionType } from '../../utils/formatters';
import type { TransactionHistory } from '../../services/wallet.service';
import styles from './styles.module.css';

/**
 * Bản xem nhanh vài giao dịch gần nhất trên trang ví (Parent/Student). Danh sách đầy đủ có lọc +
 * phân trang nằm ở AllTransactionsPage và dùng AntD `TransactionTable`, nên component này cố tình
 * không có phân trang.
 */
interface Props {
  transactions: TransactionHistory[];
  loading: boolean;
  onSelect: (tx: TransactionHistory) => void;
  /** Điều hướng sang trang toàn bộ giao dịch. */
  onViewAll: () => void;
  /** Tổng số giao dịch của ví (không phải số dòng đang hiển thị). */
  total?: number;
}

const referenceLabel = (referenceTable: string | null): string => {
  switch ((referenceTable || '').toLowerCase()) {
    case 'booking':
      return 'Đặt lịch';
    case 'dispute':
      return 'Tranh chấp';
    case 'withdrawal':
      return 'Rút tiền';
    case 'topup':
      return 'Nạp tiền';
    default:
      return '';
  }
};

const TransactionsCard = ({ transactions, loading, onSelect, onViewAll, total = 0 }: Props) => {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.sectionTitle}>Lịch sử giao dịch</h3>
        <div className={styles.cardHeaderActions}>
          {total > 0 && <span className={styles.cardHeaderMeta}>{total} giao dịch</span>}
          <button className={styles.viewAllBtn} type="button" onClick={onViewAll}>
            Xem toàn bộ →
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Đang tải...</div>
      ) : transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
              <path d="M4 8h12M16 12.5h2" strokeLinecap="round" />
            </svg>
          </span>
          <p className={styles.emptyTitle}>Chưa có giao dịch nào</p>
          <p className={styles.emptyText}>
            Tiền thanh toán buổi học, khoản hoàn lại và yêu cầu rút tiền của bạn sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className={styles.txTable}>
          <div className={styles.txHead}>
            <span className={styles.txHeadContent}>Nội dung</span>
            <span className={styles.txHeadDate}>Ngày</span>
            <span className={styles.txHeadAmount}>Số tiền</span>
            <span className={styles.txHeadChevron} aria-hidden="true" />
          </div>
          <ul className={styles.txList}>
            {transactions.map((tx) => {
              const positive = tx.amount >= 0;
              const tag = referenceLabel(tx.referenceTable);
              return (
                <li key={tx.transactionId}>
                  <button className={styles.txRow} type="button" onClick={() => onSelect(tx)}>
                    <span
                      className={`${styles.txIcon} ${positive ? styles.txIconIn : styles.txIconOut}`}
                      aria-hidden="true"
                    >
                      {positive ? '+' : '−'}
                    </span>
                    <div className={styles.txInfo}>
                      <span className={styles.txTitle}>
                        {formatTransactionType(tx.transactionType)}
                        {tag && <span className={styles.txTag}>{tag}</span>}
                      </span>
                      <span className={styles.txMeta}>{tx.description || '—'}</span>
                    </div>
                    <span className={styles.txDate}>{formatDateTime(tx.createdAt)}</span>
                    <span className={`${styles.txAmount} ${positive ? styles.valueGreen : styles.valueRed}`}>
                      {positive ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className={styles.txChevron} aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default TransactionsCard;
