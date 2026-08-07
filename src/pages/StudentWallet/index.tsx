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
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import TransactionsCard from '../ParentWallet/TransactionsCard';
import WithdrawalRequestsCard from '../ParentWallet/WithdrawalRequestsCard';
import parentStyles from '../ParentWallet/styles.module.css';

const TransactionDetailModal = lazy(() => import('../ParentWallet/TransactionDetailModal'));
const WithdrawModal = lazy(() => import('../ParentWallet/WithdrawModal'));
const WithdrawalDetailModal = lazy(() => import('../ParentWallet/WithdrawalDetailModal'));

const PREVIEW_SIZE = 20;

/**
 * Ví học sinh — KHÁC ví phụ huynh: không nạp tiền, chỉ rút tiền đã được hoàn.
 * WithdrawModal/WithdrawalRequestsCard/WithdrawalDetailModal dùng lại nguyên component của
 * ParentWallet — BE chấp nhận cả role Parent lẫn Student cho POST /api/wallet/withdrawals
 * (WalletController.CreateWithdrawal, [Authorize(Roles = UserRole.ParentOrStudent)]) và các
 * component đó vốn đã tự resolve portalBase từ pathname, không hardcode gì theo parent.
 */
const StudentWallet = () => {
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
    loadBalance();
    loadTransactions();
    void loadWithdrawals();
  }, [loadBalance, loadTransactions, loadWithdrawals]);

  const available = balance?.balance ?? 0;
  const frozen = balance?.frozenBalance ?? 0;

  return (
    <div className={parentStyles.page}>
      <div className={parentStyles.pageHeader}>
        <h1 className={parentStyles.pageTitle}>Ví của tôi</h1>
        <p className={parentStyles.pageSubtitle}>
          Số dư được hoàn khi buổi học bị hủy. Ví học sinh không nạp tiền.
        </p>
        <button
          className={parentStyles.withdrawBtn}
          type="button"
          onClick={() => setWithdrawOpen(true)}
          disabled={balanceLoading || available <= 0}
        >
          Rút tiền
        </button>
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

      <WithdrawalRequestsCard
        variant="preview"
        withdrawals={withdrawals}
        loading={withdrawalsLoading}
        onSelect={(item) => setSelectedWithdrawalId(item.withdrawalId)}
        onViewAll={() => navigate(`${portalBase}/wallet/withdrawals`)}
      />

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
