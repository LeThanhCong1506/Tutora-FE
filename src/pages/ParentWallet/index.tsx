import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getWalletBalance,
  getTransactions,
  getWithdrawals,
  type WalletBalanceResponse,
  type TransactionHistory,
  type WithdrawalItem,
} from '../../services/wallet.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import TransactionsCard from './TransactionsCard';
import PendingWithdrawalCallout from './PendingWithdrawalCallout';
import styles from './styles.module.css';

const TransactionDetailModal = lazy(() => import('./TransactionDetailModal'));
const WithdrawModal = lazy(() => import('./WithdrawModal'));
const WithdrawalDetailModal = lazy(() => import('./WithdrawalDetailModal'));

const PREVIEW_SIZE = 6;

/** Yêu cầu chưa kết thúc — khớp điều kiện chặn tạo trùng ở BE (WalletService.CreateWithdrawalAsync). */
const IN_PROGRESS_STATUSES = ['pending', 'pending_review', 'approved', 'delayed'];

/**
 * Trang ví phụ huynh. Không còn card danh sách "Yêu cầu rút tiền" riêng: mỗi yêu cầu rút tiền đã là
 * một dòng trong "Lịch sử giao dịch" (BE ghi kèm Wallettransaction referenceTable='withdrawal', bấm
 * vào là ra chi tiết đầy đủ) nên card cũ chỉ nhân đôi dữ liệu và chiếm nửa trang dù hầu hết phụ huynh
 * không bao giờ rút tiền. Phần còn thiếu — trạng thái của yêu cầu ĐANG chạy — được đưa lên dải
 * PendingWithdrawalCallout, còn lịch sử đầy đủ vào nút "Lịch sử rút tiền" ở header.
 */
const ParentWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';

  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(true);

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);

  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<number | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await getWalletBalance();
      setBalance(res.content);
    } catch {
      toast.error('Không thể tải số dư ví');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await getTransactions(1, PREVIEW_SIZE);
      setTransactions(res.content.transactions);
      setTransactionsTotal(res.content.totalCount);
    } catch {
      toast.error('Không thể tải lịch sử giao dịch');
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true);
    try {
      const res = await getWithdrawals(1, PREVIEW_SIZE);
      setWithdrawals(res.content.items);
    } catch {
      toast.error('Không thể tải danh sách yêu cầu rút tiền');
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
    void loadTransactions();
    void loadWithdrawals();
  }, [loadBalance, loadTransactions, loadWithdrawals]);

  const pendingWithdrawal = useMemo(
    () => withdrawals.find((item) => IN_PROGRESS_STATUSES.includes((item.status || '').toLowerCase())) ?? null,
    [withdrawals],
  );

  const available = balance?.balance ?? 0;
  const canWithdraw = !balanceLoading && available > 0;

  const amount = (value: number) =>
    balanceLoading ? <span className={`${styles.skeleton} ${styles.skeletonValue}`} /> : formatCurrency(value);

  return (
    <div className={styles.page}>
      <header className={styles.walletHeader}>
        <div className={styles.walletHeaderText}>
          <h1 className={styles.pageTitle}>Tài chính của tôi</h1>
          <p className={styles.pageSubtitle}>Quản lý số dư, rút tiền và xem lịch sử giao dịch của bạn.</p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.withdrawBtn} type="button" onClick={() => setWithdrawOpen(true)} disabled={!canWithdraw}>
            Rút tiền
          </button>
          <button
            className={styles.secondaryBtn}
            type="button"
            onClick={() => navigate(`${portalBase}/wallet/bank-account`)}
          >
            Tài khoản ngân hàng
          </button>
          <button
            className={styles.ghostBtn}
            type="button"
            onClick={() => navigate(`${portalBase}/wallet/withdrawals`)}
          >
            Lịch sử rút tiền
          </button>
        </div>
      </header>

      {!balanceLoading && !canWithdraw && (
        <p className={styles.headerHint}>
          Bạn cần có số dư khả dụng lớn hơn 0 ₫ mới tạo được yêu cầu rút tiền.
        </p>
      )}

      <div className={styles.balanceGrid}>
        <section className={`${styles.summaryCard} ${styles.summaryCardPrimary}`}>
          <div className={styles.summaryLabel}>
            <span className={`${styles.dot} ${styles.dotGreen}`} />
            Số tiền khả dụng
          </div>
          <div className={`${styles.summaryValue} ${styles.valueGreen}`}>{amount(available)}</div>
          <div className={styles.summaryFoot}>Số dư có thể dùng cho các giao dịch và yêu cầu rút tiền của bạn.</div>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            <span className={`${styles.dot} ${styles.dotRed}`} />
            Đang tạm giữ
          </div>
          <div className={`${styles.summaryValue} ${styles.valueRed}`}>{amount(balance?.frozenBalance ?? 0)}</div>
          <div className={styles.summaryFoot}>Số tiền đang chờ xử lý do có khiếu nại hoặc tranh chấp.</div>
        </section>

        <section className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            <span className={`${styles.dot} ${styles.dotNavy}`} />
            Tổng số dư
          </div>
          <div className={styles.summaryValue}>{amount(balance?.totalBalance ?? 0)}</div>
          <div className={styles.summaryFoot}>Gồm cả số tiền khả dụng và số tiền đang tạm giữ.</div>
          <div className={styles.summaryMeta}>
            {balance?.lastUpdated ? `Cập nhật: ${formatDateTime(balance.lastUpdated)}` : ' '}
          </div>
        </section>
      </div>

      {!withdrawalsLoading && pendingWithdrawal && (
        <PendingWithdrawalCallout
          withdrawal={pendingWithdrawal}
          onViewDetail={() => setSelectedWithdrawalId(pendingWithdrawal.withdrawalId)}
        />
      )}

      <TransactionsCard
        transactions={transactions}
        loading={txLoading}
        total={transactionsTotal}
        onSelect={(tx) => setSelectedTxId(tx.transactionId)}
        onViewAll={() => navigate(`${portalBase}/wallet/transactions`)}
      />

      {selectedTxId != null && (
        <Suspense fallback={null}>
          <TransactionDetailModal transactionId={selectedTxId} onClose={() => setSelectedTxId(null)} />
        </Suspense>
      )}

      {selectedWithdrawalId != null && (
        <Suspense fallback={null}>
          <WithdrawalDetailModal
            withdrawalId={selectedWithdrawalId}
            onClose={() => setSelectedWithdrawalId(null)}
          />
        </Suspense>
      )}

      {withdrawOpen && (
        <Suspense fallback={null}>
          <WithdrawModal
            availableBalance={available}
            onClose={() => setWithdrawOpen(false)}
            onSuccess={() => {
              setWithdrawOpen(false);
              void loadBalance();
              void loadTransactions();
              void loadWithdrawals();
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ParentWallet;
