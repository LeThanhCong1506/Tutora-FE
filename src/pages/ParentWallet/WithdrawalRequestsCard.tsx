import { formatCurrency, formatDateTime, formatWithdrawalStatusV2 } from '../../utils/formatters';
import type { WithdrawalItem } from '../../services/wallet.service';
import styles from './styles.module.css';

interface Props {
  withdrawals: WithdrawalItem[];
  loading: boolean;
  onSelect: (withdrawal: WithdrawalItem) => void;
  variant: 'preview' | 'full';
  onViewAll?: () => void;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const WithdrawalRequestsCard = ({
  withdrawals,
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
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.sectionTitle}>Yêu cầu rút tiền</h3>
        {variant === 'preview' ? (
          <button className={styles.viewAllBtn} type="button" onClick={onViewAll}>
            Xem toàn bộ yêu cầu →
          </button>
        ) : (
          <span className={styles.cardHeaderMeta}>{total} yêu cầu</span>
        )}
      </div>

      {loading ? (
        <div className={styles.emptyState}>Đang tải...</div>
      ) : withdrawals.length === 0 ? (
        <div className={styles.emptyState}>Chưa có yêu cầu rút tiền nào.</div>
      ) : (
        <div className={styles.txTable}>
          <div className={styles.txHead}>
            <span className={styles.txHeadContent}>Yêu cầu</span>
            <span className={styles.txHeadMethod}>Trạng thái</span>
            <span className={styles.txHeadDate}>Ngày yêu cầu</span>
            <span className={styles.txHeadAmount}>Số tiền</span>
            <span className={styles.txHeadChevron} aria-hidden="true" />
          </div>
          <ul className={styles.txList}>
            {withdrawals.map((item) => (
              <li key={item.withdrawalId}>
                <button className={styles.txRow} type="button" onClick={() => onSelect(item)}>
                  <span className={`${styles.txIcon} ${styles.txIconOut}`} aria-hidden="true">
                    −
                  </span>
                  <div className={styles.txInfo}>
                    <span className={styles.txTitle}>
                      Rút tiền #{item.withdrawalId}
                      <span className={styles.txTag}>Rút tiền</span>
                    </span>
                    <span className={styles.txMeta}>
                      {item.processedAt ? `Xử lý lúc ${formatDateTime(item.processedAt)}` : 'Đang chờ xử lý'}
                    </span>
                  </div>
                  <span className={styles.txMethod}>{formatWithdrawalStatusV2(item.status || '')}</span>
                  <span className={styles.txDate}>{formatDateTime(item.requestedAt)}</span>
                  <span className={`${styles.txAmount} ${styles.valueRed}`}>-{formatCurrency(item.amount)}</span>
                  <span className={styles.txChevron} aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
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

export default WithdrawalRequestsCard;