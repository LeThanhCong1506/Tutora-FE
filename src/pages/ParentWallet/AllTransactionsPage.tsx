import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getTransactions, type TransactionHistory } from '../../services/wallet.service';
import TransactionsCard from './TransactionsCard';
import styles from './styles.module.css';

const TransactionDetailModal = lazy(() => import('./TransactionDetailModal'));

const PAGE_SIZE = 20;

const AllTransactionsPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await getTransactions(targetPage, PAGE_SIZE);
      setTransactions(res.content.transactions);
      setTotal(res.content.totalCount);
    } catch {
      toast.error('Không thể tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} type="button" onClick={() => navigate('/parent-portal/wallet')}>
          ← Quay lại ví
        </button>
        <h1 className={styles.pageTitle}>Toàn bộ giao dịch</h1>
        <p className={styles.pageSubtitle}>Lịch sử tất cả giao dịch trong ví của bạn.</p>
      </div>

      <TransactionsCard
        variant="full"
        transactions={transactions}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSelect={(tx) => setSelectedTxId(tx.transactionId)}
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

export default AllTransactionsPage;
