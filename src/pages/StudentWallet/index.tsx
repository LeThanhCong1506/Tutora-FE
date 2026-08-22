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
import TransactionsCard from '../ParentWallet/TransactionsCard';
import PendingWithdrawalCallout from '../ParentWallet/PendingWithdrawalCallout';
import parentStyles from '../ParentWallet/styles.module.css';

const TransactionDetailModal = lazy(() => import('../ParentWallet/TransactionDetailModal'));
const WithdrawModal = lazy(() => import('../ParentWallet/WithdrawModal'));
const WithdrawalDetailModal = lazy(() => import('../ParentWallet/WithdrawalDetailModal'));

const PREVIEW_SIZE = 6;

/** Yêu cầu chưa kết thúc — khớp điều kiện chặn tạo trùng ở BE (WalletService.CreateWithdrawalAsync). */
const IN_PROGRESS_STATUSES = ['pending', 'pending_review', 'approved', 'delayed'];

/**
 * Ví học sinh — KHÁC ví phụ huynh: không nạp tiền, chỉ rút tiền đã được hoàn.
 * WithdrawModal/PendingWithdrawalCallout/WithdrawalDetailModal dùng lại nguyên component của
 * ParentWallet — BE chấp nhận cả role Parent lẫn Student cho POST /api/wallet/withdrawals
 * (WalletController.CreateWithdrawal, [Authorize(Roles = UserRole.ParentOrStudent)]) và các
 * component đó vốn đã tự resolve portalBase từ pathname, không hardcode gì theo parent.
 * Bố cục cũng giữ chung với ví phụ huynh: xem chú thích ở ParentWallet/index.tsx về lý do bỏ
 * card danh sách "Yêu cầu rút tiền".
 */
const StudentWallet = () => {
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
    balanceLoading ? (
      <span className={`${parentStyles.skeleton} ${parentStyles.skeletonValue}`} />
    ) : (
      formatCurrency(value)
    );

  return (
    <div className={parentStyles.page}>
      <header className={parentStyles.walletHeader}>
        <div className={parentStyles.walletHeaderText}>
          <h1 className={parentStyles.pageTitle}>Ví của tôi</h1>
          <p className={parentStyles.pageSubtitle}>
            Số dư được hoàn khi buổi học bị hủy. Ví học sinh không nạp tiền.
          </p>
        </div>

        <div className={parentStyles.headerActions}>
          <button
            className={parentStyles.withdrawBtn}
            type="button"
            onClick={() => setWithdrawOpen(true)}
            disabled={!canWithdraw}
            data-tour="wallet-withdraw-btn"
          >
            Rút tiền
          </button>
          <button
            className={parentStyles.secondaryBtn}
            type="button"
            onClick={() => navigate(`${portalBase}/wallet/bank-account`)}
          >
            Tài khoản ngân hàng
          </button>
          <button
            className={parentStyles.ghostBtn}
            type="button"
            onClick={() => navigate(`${portalBase}/wallet/withdrawals`)}
          >
            Lịch sử rút tiền
          </button>
        </div>
      </header>

      {!balanceLoading && !canWithdraw && (
        <p className={parentStyles.headerHint}>
          Bạn cần có số dư khả dụng lớn hơn 0 ₫ mới tạo được yêu cầu rút tiền.
        </p>
      )}

      <div className={parentStyles.balanceGrid} data-tour="wallet-balance-cards">
        <section className={`${parentStyles.summaryCard} ${parentStyles.summaryCardPrimary}`}>
          <div className={parentStyles.summaryLabel}>
            <span className={`${parentStyles.dot} ${parentStyles.dotGreen}`} />
            Số tiền khả dụng
          </div>
          <div className={`${parentStyles.summaryValue} ${parentStyles.valueGreen}`}>{amount(available)}</div>
          <div className={parentStyles.summaryFoot}>
            Được hoàn khi gia sư không nhận đặt lịch, booking bị hủy hoặc bạn thắng tranh chấp.
          </div>
        </section>

        <section className={parentStyles.summaryCard}>
          <div className={parentStyles.summaryLabel}>
            <span className={`${parentStyles.dot} ${parentStyles.dotRed}`} />
            Đang tạm giữ
          </div>
          <div className={`${parentStyles.summaryValue} ${parentStyles.valueRed}`}>
            {amount(balance?.frozenBalance ?? 0)}
          </div>
          <div className={parentStyles.summaryFoot}>
            Số tiền bị tạm giữ do đang có khiếu nại / tranh chấp chờ xử lý.
          </div>
        </section>

        <section className={parentStyles.summaryCard}>
          <div className={parentStyles.summaryLabel}>
            <span className={`${parentStyles.dot} ${parentStyles.dotNavy}`} />
            Tổng số dư
          </div>
          <div className={parentStyles.summaryValue}>{amount(balance?.totalBalance ?? 0)}</div>
          <div className={parentStyles.summaryFoot}>Gồm cả số tiền khả dụng và số tiền đang tạm giữ.</div>
          <div className={parentStyles.summaryMeta}>
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
          <TransactionDetailModal
            transactionId={selectedTxId}
            onClose={() => setSelectedTxId(null)}
          />
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

export default StudentWallet;
