import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getWalletBalance,
  getTransactions,
  type WalletBalanceResponse,
  type TransactionHistory,
} from '../../services/wallet.service';
import WalletSummaryCards from './WalletSummaryCards';
import TransactionsCard from './TransactionsCard';
import styles from './styles.module.css';

const TransactionDetailModal = lazy(() => import('./TransactionDetailModal'));

const PREVIEW_SIZE = 10;

const ParentWallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

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

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, [loadBalance, loadTransactions]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tài chính của tôi</h1>
        <p className={styles.pageSubtitle}>
          Quản lý số dư, rút tiền và xem lịch sử giao dịch của bạn.
        </p>
      </div>

      <WalletSummaryCards
        balance={balance}
        loading={balanceLoading}
        // Rút tiền tạm chặn, đang được triển khai.
        // Giữ nguyên UI, chỉ báo toast.
        // Bật lại bằng: onWithdraw={() => setWithdrawOpen(true)}
        onWithdraw={() => toast.info('Chức năng rút tiền đang trong quá trình triển khai')}
      />

      <TransactionsCard
        variant="preview"
        transactions={transactions}
        loading={txLoading}
        onSelect={(tx) => setSelectedTxId(tx.transactionId)}
        onViewAll={() => navigate('/parent-portal/wallet/transactions')}
      />

      {selectedTxId != null && (
        <Suspense fallback={null}>
          <TransactionDetailModal
            transactionId={selectedTxId}
            onClose={() => setSelectedTxId(null)}
          />
        </Suspense>
      )}

      {/* Form rút tiền (WithdrawModal) tạm ẩn — chờ BE hỗ trợ tài khoản ngân hàng
          cho phụ huynh. */}
    </div>
  );
};

export default ParentWallet;
