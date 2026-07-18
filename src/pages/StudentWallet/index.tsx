import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getWalletBalance,
  getTransactions,
  type WalletBalanceResponse,
  type TransactionHistory,
} from '../../services/wallet.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import TransactionsCard from '../ParentWallet/TransactionsCard';
import parentStyles from '../ParentWallet/styles.module.css';

const TransactionDetailModal = lazy(() => import('../ParentWallet/TransactionDetailModal'));

const PREVIEW_SIZE = 20;

/**
 * Ví học sinh — KHÁC ví phụ huynh: không nạp tiền, thực hiện rút tiền sau.
 */
const StudentWallet = () => {
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

  const available = balance?.balance ?? 0;
  const frozen = balance?.frozenBalance ?? 0;

  return (
    <div className={parentStyles.page}>
      <div className={parentStyles.pageHeader}>
        <h1 className={parentStyles.pageTitle}>Ví của tôi</h1>
        <p className={parentStyles.pageSubtitle}>
          Số dư được hoàn khi buổi học bị hủy. Ví học sinh không nạp tiền.
        </p>
      </div>

      <div className={parentStyles.summaryRow}>
        <section className={`${parentStyles.summaryCard} ${parentStyles.summaryCardPrimary}`}>
          <div className={parentStyles.summaryLabel}>
            <span className={`${parentStyles.dot} ${parentStyles.dotGreen}`} />
            Số tiền khả dụng
          </div>
          <div className={`${parentStyles.summaryValue} ${parentStyles.valueGreen}`}>
            {balanceLoading ? '—' : formatCurrency(available)}
          </div>
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
            {balanceLoading ? '—' : formatCurrency(frozen)}
          </div>
          <div className={parentStyles.summaryFoot}>
            Số tiền bị tạm giữ do đang có khiếu nại / tranh chấp chờ xử lý.
          </div>
          <div className={parentStyles.summaryMeta}>
            {balance?.lastUpdated ? `Cập nhật: ${formatDateTime(balance.lastUpdated)}` : ' '}
          </div>
        </section>
      </div>

      <TransactionsCard
        variant="full"
        transactions={transactions}
        loading={txLoading}
        onSelect={(tx) => setSelectedTxId(tx.transactionId)}
        total={transactions.length}
        page={1}
        pageSize={PREVIEW_SIZE}
      />

      {selectedTxId != null && (
        <Suspense fallback={null}>
          <TransactionDetailModal
            transactionId={selectedTxId}
            onClose={() => setSelectedTxId(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default StudentWallet;
