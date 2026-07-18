import { formatCurrency, formatDateTime } from '../../utils/formatters';
import type { WalletBalanceResponse } from '../../services/wallet.service';
import styles from './styles.module.css';

interface Props {
  balance: WalletBalanceResponse | null;
  loading: boolean;
}

const WalletSummaryCards = ({ balance, loading }: Props) => {
  const available = balance?.balance ?? 0;
  const frozen = balance?.frozenBalance ?? 0;

  return (
    <div className={styles.summaryRow}>
      <section className={`${styles.summaryCard} ${styles.summaryCardPrimary}`}>
        <div className={styles.summaryLabel}>
          <span className={`${styles.dot} ${styles.dotGreen}`} />
          Số tiền khả dụng
        </div>
        <div className={`${styles.summaryValue} ${styles.valueGreen}`}>
          {loading ? '—' : formatCurrency(available)}
        </div>
        <div className={styles.summaryFoot}>
          Số dư này được dùng để thanh toán các buổi học và được hoàn khi gia sư không nhận đặt lịch / bạn thắng tranh chấp.
        </div>
      </section>

      <section className={styles.summaryCard}>
        <div className={styles.summaryLabel}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          Đang tạm giữ
        </div>
        <div className={`${styles.summaryValue} ${styles.valueRed}`}>
          {loading ? '—' : formatCurrency(frozen)}
        </div>
        <div className={styles.summaryFoot}>
          Số tiền bị tạm giữ do đang có khiếu nại / tranh chấp chờ xử lý.
        </div>
        <div className={styles.summaryMeta}>
          {balance?.lastUpdated ? `Cập nhật: ${formatDateTime(balance.lastUpdated)}` : ' '}
        </div>
      </section>
    </div>
  );
};

export default WalletSummaryCards;
