import { formatCurrency, formatDateTime, formatTransactionType } from '../../utils/formatters';
import type { TransactionHistory } from '../../services/wallet.service';
import styles from './styles.module.css';

interface Props {
  transactions: TransactionHistory[];
  loading: boolean;
  onSelect: (tx: TransactionHistory) => void;
  /** Chế độ preview (trang ví): hiện nút "Xem toàn bộ". Chế độ full (trang riêng): phân trang. */
  variant: 'preview' | 'full';
  /** preview: điều hướng sang trang toàn bộ giao dịch. */
  onViewAll?: () => void;
  /** full: dữ liệu phân trang. */
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
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

const TransactionsCard = ({
  transactions,
  loading,
  onSelect,
  variant,
  onViewAll,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
}: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className={`${styles.card} ${variant === 'full' ? styles.transactionCardFull : ''}`}>
      <div className={styles.cardHeader}>
        <h3 className={styles.sectionTitle}>Lịch sử giao dịch</h3>
        {variant === 'preview' ? (
          <button className={styles.viewAllBtn} type="button" onClick={onViewAll}>
            Xem toàn bộ giao dịch →
          </button>
        ) : (
          <span className={styles.cardHeaderMeta}>{total} giao dịch</span>
        )}
      </div>

      {loading ? (
        <div className={styles.emptyState}>Đang tải...</div>
      ) : transactions.length === 0 ? (
        <div className={styles.emptyState}>Chưa có giao dịch nào.</div>
      ) : (
        <div className={styles.txTable}>
          <div className={styles.txHead}>
            <span className={styles.txHeadContent}>Nội dung</span>
            <span className={styles.txHeadMethod}>Hình thức giao dịch</span>
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
                    {/* TODO: thay bằng dữ liệu thật khi BE bổ sung bảng transaction */}
                    <span className={styles.txMethod}>Ví hệ thống</span>
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

      {variant === 'full' && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            Trước
          </button>
          <span className={styles.pageInfo}>
            Trang {page} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </section>
  );
};

export default TransactionsCard;
