import React, { useEffect, useState } from 'react';
import { Button, Empty, Spin, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowDownOutlined, ArrowRightOutlined, ArrowUpOutlined, WalletOutlined } from '@ant-design/icons';
import { getEscrowStatus, getFinanceSummary, getTransactions } from '../../../services/tutorFinance.service';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../utils/formatters';
import type { EscrowStatusItem, FinanceSummary, TutorTransaction } from '../../../types/finance.types';
import FinancePageShell from '../components/FinancePageShell';
import FinanceOverviewCards from './components/FinanceOverviewCards';
import EarningsChart from './components/EarningsChart';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../../utils/apiError';

const MIN_WITHDRAWAL = 10000;

const TutorFinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TutorTransaction[]>([]);
  const [escrowItems, setEscrowItems] = useState<EscrowStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [summaryRes, transRes, escrowRes] = await Promise.all([
          getFinanceSummary(),
          getTransactions({ page: 1, pageSize: 5 }),
          getEscrowStatus(),
        ]);
        setSummary(summaryRes);
        setRecentTransactions(transRes.transactions);
        setEscrowItems(escrowRes.items);
      } catch (error) {
        console.error('Failed to fetch finance dashboard data:', error);
        toast.error(getApiErrorMessage(error, 'Không thể tải dữ liệu tổng quan tài chính'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const canWithdraw = (summary?.availableBalance ?? 0) >= MIN_WITHDRAWAL;

  return (
    <FinancePageShell
      title="Tài chính"
      titleInfo="Theo dõi số dư, thu nhập, giao dịch và các yêu cầu rút tiền."
      actions={
        <Tooltip
          title={!loading && !canWithdraw ? `Cần tối thiểu ${formatCurrency(MIN_WITHDRAWAL)} để rút tiền` : undefined}
        >
          <span>
            <Button
              type="primary"
              size="large"
              className="finance-primary-action"
              icon={<WalletOutlined />}
              onClick={() => navigate('/tutor-portal/finance/withdraw')}
              disabled={loading || !canWithdraw}
              data-tour="finance-withdraw-btn"
            >
              Rút tiền
            </Button>
          </span>
        </Tooltip>
      }
    >
      <FinanceOverviewCards summary={summary} loading={loading} />

      <div className="finance-dashboard-grid">
        <EarningsChart />

        <section className="finance-surface recent-transactions-section" data-tour="finance-transactions">
          <div className="finance-section-heading">
            <div>
              <h2>Giao dịch gần đây</h2>
            </div>
            <Button
              type="link"
              className="finance-text-action"
              onClick={() => navigate('/tutor-portal/finance/transactions')}
            >
              Xem tất cả <ArrowRightOutlined />
            </Button>
          </div>

          {loading ? (
            <div className="finance-list-loading" aria-label="Đang tải giao dịch">
              <Spin />
            </div>
          ) : recentTransactions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="finance-empty-copy">
                  <strong>Chưa có giao dịch</strong>
                  <span>Các biến động số dư sẽ xuất hiện tại đây.</span>
                </div>
              }
            />
          ) : (
            <div className="finance-transaction-list">
              {recentTransactions.map((transaction) => {
                const isDebit = transaction.amount < 0;

                return (
                  <article className="finance-transaction-item" key={transaction.transactionId}>
                    <div
                      className={`finance-transaction-icon finance-transaction-icon--${isDebit ? 'debit' : 'credit'}`}
                      aria-hidden="true"
                    >
                      {isDebit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    </div>
                    <div className="finance-transaction-copy">
                      <strong>{formatTransactionType(transaction.transactionType)}</strong>
                      <span title={transaction.description}>{transaction.description || 'Giao dịch hệ thống'}</span>
                    </div>
                    <time dateTime={transaction.createdAt}>{formatDateTime(transaction.createdAt)}</time>
                    <span
                      className={`finance-transaction-amount finance-transaction-amount--${isDebit ? 'debit' : 'credit'}`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="finance-surface recent-transactions-section" aria-label="Escrow đang giữ">
          <div className="finance-section-heading">
            <div>
              <h2>Escrow đang giữ</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7a8296' }}>
                Tiền đang treo trong ví, ứng với các booking chưa giải ngân hết — chưa cộng vào số dư khả dụng.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="finance-list-loading" aria-label="Đang tải escrow">
              <Spin />
            </div>
          ) : escrowItems.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="finance-empty-copy">
                  <strong>Không có escrow đang giữ</strong>
                  <span>Toàn bộ tiền đã được giải ngân hoặc chưa có booking nào đang treo.</span>
                </div>
              }
            />
          ) : (
            <div className="finance-transaction-list">
              {escrowItems.map((item) => (
                <article className="finance-transaction-item" key={item.bookingId}>
                  <div className="finance-transaction-icon finance-transaction-icon--debit" aria-hidden="true">
                    <WalletOutlined />
                  </div>
                  <div className="finance-transaction-copy">
                    <strong>Booking #{item.bookingId} — {item.studentName}</strong>
                    <span title={item.parentName}>
                      PHHS: {item.parentName}
                      {item.subjectName ? ` • ${item.subjectName}` : ''}
                    </span>
                  </div>
                  <span className="finance-transaction-amount finance-transaction-amount--debit">
                    {formatCurrency(item.heldAmount)}
                  </span>
                  <Button
                    type="link"
                    className="finance-text-action"
                    icon={<ArrowRightOutlined />}
                    onClick={() => navigate(`/tutor-portal/bookings/${item.bookingId}`)}
                  >
                    Xem booking
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </FinancePageShell>
  );
};

export default TutorFinanceDashboardPage;
