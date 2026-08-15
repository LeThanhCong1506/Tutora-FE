import { formatCurrency, formatDateTime, formatWithdrawalStatusV2 } from '../../utils/formatters';
import type { WithdrawalItem } from '../../services/wallet.service';
import styles from './styles.module.css';

interface Props {
  withdrawal: WithdrawalItem;
  onViewDetail: () => void;
}

/**
 * Thay cho card danh sách "Yêu cầu rút tiền" cũ trên trang ví: phụ huynh gần như không bao giờ có
 * nhiều hơn 1 yêu cầu đang chạy (BE chặn tạo yêu cầu mới khi còn yêu cầu chưa xử lý xong —
 * WalletService.CreateWithdrawalAsync / PendingWithdrawalException), nên chỉ cần một dải trạng thái
 * gọn. Lịch sử đầy đủ nằm ở trang "Lịch sử rút tiền" và trong "Lịch sử giao dịch".
 */
const PendingWithdrawalCallout = ({ withdrawal, onViewDetail }: Props) => (
  <section className={styles.pendingStrip} aria-label="Yêu cầu rút tiền đang xử lý">
    <span className={styles.pendingIcon} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
    </span>

    <div className={styles.pendingBody}>
      <span className={styles.pendingTitle}>Yêu cầu rút tiền #{withdrawal.withdrawalId} đang được xử lý</span>
      <span className={styles.pendingMeta}>
        Gửi lúc {formatDateTime(withdrawal.requestedAt)} · Số tiền đã được tạm trừ khỏi số dư khả dụng
      </span>
    </div>

    <span className={styles.statusPill}>{formatWithdrawalStatusV2(withdrawal.status || '')}</span>
    <span className={styles.pendingAmount}>-{formatCurrency(withdrawal.amount)}</span>

    <button className={styles.pendingAction} type="button" onClick={onViewDetail}>
      Xem chi tiết →
    </button>
  </section>
);

export default PendingWithdrawalCallout;
