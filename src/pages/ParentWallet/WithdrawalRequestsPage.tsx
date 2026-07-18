import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWithdrawals, type WithdrawalItem } from '../../services/wallet.service';
import WithdrawalRequestsCard from './WithdrawalRequestsCard';
import styles from './styles.module.css';

const WithdrawalDetailModal = lazy(() => import('./WithdrawalDetailModal'));

const PAGE_SIZE = 20;

const WithdrawalRequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = useMemo(
    () => (location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal'),
    [location.pathname],
  );

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<number | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await getWithdrawals(targetPage, PAGE_SIZE);
      setWithdrawals(res.content.items);
      setTotal(res.content.total);
    } catch {
      toast.error('Không thể tải danh sách yêu cầu rút tiền');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} type="button" onClick={() => navigate(`${portalBase}/wallet`)}>
          ← Quay lại ví
        </button>
        <h1 className={styles.pageTitle}>Yêu cầu rút tiền</h1>
        <p className={styles.pageSubtitle}>Theo dõi trạng thái các yêu cầu rút tiền bạn đã gửi.</p>
      </div>

      <WithdrawalRequestsCard
        variant="full"
        withdrawals={withdrawals}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSelect={(item) => setSelectedWithdrawalId(item.withdrawalId)}
      />

      {selectedWithdrawalId != null && (
        <Suspense fallback={null}>
          <WithdrawalDetailModal
            withdrawalId={selectedWithdrawalId}
            onClose={() => setSelectedWithdrawalId(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WithdrawalRequestsPage;