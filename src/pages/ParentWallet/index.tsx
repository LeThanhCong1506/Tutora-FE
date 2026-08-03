import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
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
import WalletSummaryCards from './WalletSummaryCards';
import TransactionsCard from './TransactionsCard';
import WithdrawalRequestsCard from './WithdrawalRequestsCard';
import styles from './styles.module.css';

const TransactionDetailModal = lazy(() => import('./TransactionDetailModal'));
const WithdrawModal = lazy(() => import('./WithdrawModal'));
const WithdrawalDetailModal = lazy(() => import('./WithdrawalDetailModal'));

const PREVIEW_SIZE = 10;

const ParentWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';

  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tài chính của tôi</h1>
        <p className={styles.pageSubtitle}>Quản lý số dư, rút tiền và xem lịch sử giao dịch của bạn.</p>
        <button
          className={styles.withdrawBtn}
          type="button"
          onClick={() => setWithdrawOpen(true)}
          disabled={balanceLoading || (balance?.balance ?? 0) <= 0}
        >
          Rút tiền
        </button>
      </div>

      <WalletSummaryCards balance={balance} loading={balanceLoading} />

      <WithdrawalRequestsCard
        variant="preview"
        withdrawals={withdrawals}
        loading={withdrawalsLoading}
        onSelect={(item) => setSelectedWithdrawalId(item.withdrawalId)}
        onViewAll={() => navigate(`${portalBase}/wallet/withdrawals`)}
      />

      <TransactionsCard
        variant="preview"
        transactions={transactions}
        loading={txLoading}
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
            availableBalance={balance?.balance ?? 0}
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